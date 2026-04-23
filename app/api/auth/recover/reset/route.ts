/**
 * AUTH-PUB-014 — POST /api/auth/recover/reset
 *
 * Final step of recovery flow. Requires prior successful
 * POST /api/auth/verify/confirm?purpose=recovery (validates OTP).
 *
 * Body: { email, code, newPassword }
 * Re-validates OTP (defense in depth — not trusting session cookies only),
 * then updates Supabase auth user password via admin API.
 */

import { NextRequest } from 'next/server';
import { errorResponse, validationError, successResponse, getSupabaseAdmin } from '@/lib/api-utils';
import { checkRateLimit, tooManyRequestsResponse } from '@/lib/security/rate-limit';
import { confirmVerification } from '@/lib/auth/verification';

const RECOVER_RESET_RL = {
    name: 'auth-recover-reset',
    requests: 5,
    windowSeconds: 3600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export async function POST(req: NextRequest) {
    const rateCheck = checkRateLimit(req, RECOVER_RESET_RL);
    if (!rateCheck.allowed) {
        return tooManyRequestsResponse(rateCheck.retryAfter ?? 3600);
    }

    let body: { email?: unknown; code?: unknown; newPassword?: unknown };
    try {
        body = await req.json();
    } catch {
        return validationError('JSON inválido');
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!email || !EMAIL_RE.test(email)) {
        return validationError('Email inválido');
    }
    if (!CODE_RE.test(code)) {
        return validationError('Código deve ter 6 dígitos');
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
        return validationError('Nova senha deve ter entre 8 e 128 caracteres');
    }

    // Re-validate OTP server-side (defense in depth — /auth/verify/confirm
    // already validated but we can't trust the client to have not tampered).
    const verify = await confirmVerification(email, code, 'recovery');
    if (!verify.ok) {
        return errorResponse(verify.error ?? 'Código inválido', 400, 'OTP_INVALID');
    }

    const supabase = getSupabaseAdmin();

    // Find Supabase auth user id by email
    const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
        return errorResponse('Erro ao localizar conta', 500, 'AUTH_LOOKUP_FAILED');
    }
    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email);
    if (!authUser) {
        return errorResponse('Conta de autenticação não encontrada', 404, 'AUTH_USER_NOT_FOUND');
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
    });
    if (updateErr) {
        return errorResponse('Falha ao atualizar senha', 500, 'PASSWORD_UPDATE_FAILED');
    }

    // Audit
    try {
        await supabase.from('intelink_audit_logs').insert({
            action: 'auth.password_reset.success',
            actor_id: authUser.id,
            actor_name: authUser.email ?? email,
            target_type: 'member',
            target_id: verify.memberId ?? authUser.id,
            details: { channel: verify.channel },
        });
    } catch {
        // audit is best-effort
    }

    return successResponse({ reset: true });
}
