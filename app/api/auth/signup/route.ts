/**
 * AUTH-PUB-003 — POST /api/auth/signup
 *
 * Creates Supabase auth user + intelink_unit_members row (verified_at=NULL).
 * Unicity check on email/phone/telegram_chat_id (AUTH-PUB-004).
 * Rate-limited at 3/hour/IP to prevent abuse.
 *
 * Next step for client: redirect to /auth/verify?email=... to pick channel + OTP.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getSupabaseAdmin,
    errorResponse,
    validationError,
    createdResponse,
} from '@/lib/api-utils';
import { checkRateLimit, tooManyRequestsResponse } from '@/lib/security/rate-limit';

const SIGNUP_RATE_LIMIT = {
    name: 'auth-signup',
    requests: 3,
    windowSeconds: 3600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{8,20}$/;

interface SignupBody {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    phone?: unknown;
}

export async function POST(req: NextRequest) {
    const rateCheck = checkRateLimit(req, SIGNUP_RATE_LIMIT);
    if (!rateCheck.allowed) {
        return tooManyRequestsResponse(rateCheck.retryAfter ?? 3600);
    }

    let body: SignupBody;
    try {
        body = await req.json();
    } catch {
        return validationError('JSON inválido');
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : '';
    const phone = phoneRaw || null;

    if (!name || name.length < 2 || name.length > 120) {
        return validationError('Nome deve ter entre 2 e 120 caracteres');
    }
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
        return validationError('Email inválido');
    }
    if (!password || password.length < 8 || password.length > 128) {
        return validationError('Senha deve ter entre 8 e 128 caracteres');
    }
    if (phone && !PHONE_RE.test(phone)) {
        return validationError('Telefone inválido');
    }

    const supabase = getSupabaseAdmin();

    // Unicity: email
    const { data: existingByEmail } = await supabase
        .from('intelink_unit_members')
        .select('id, verified_at')
        .eq('email', email)
        .maybeSingle();

    if (existingByEmail) {
        return errorResponse(
            'Email já cadastrado. Tente fazer login ou recuperar a senha.',
            409,
            'EMAIL_EXISTS',
        );
    }

    // Unicity: phone (if provided)
    if (phone) {
        const { data: existingByPhone } = await supabase
            .from('intelink_unit_members')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();
        if (existingByPhone) {
            return errorResponse(
                'Telefone já cadastrado.',
                409,
                'PHONE_EXISTS',
            );
        }
    }

    // Create Supabase auth user (password-protected)
    // email_confirm=false so the Intelink verify flow is the source of truth.
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { name },
    });

    if (authErr || !authUser?.user) {
        return errorResponse(
            authErr?.message === 'A user with this email address has already been registered'
                ? 'Email já cadastrado no sistema de autenticação'
                : (authErr?.message || 'Erro ao criar usuário'),
            authErr?.status && typeof authErr.status === 'number' ? authErr.status : 500,
            'AUTH_CREATE_FAILED',
        );
    }

    // Create intelink_unit_members row (verified_at=NULL intentionally)
    const { data: member, error: memberErr } = await supabase
        .from('intelink_unit_members')
        .insert({
            name,
            email,
            phone,
            role: 'member',
            system_role: 'member',
            active: true,
            verified_at: null,
        })
        .select('id')
        .single();

    if (memberErr || !member) {
        // Rollback: remove Supabase auth user to avoid orphan
        await supabase.auth.admin.deleteUser(authUser.user.id).catch(() => {});
        return errorResponse(
            'Erro ao criar perfil de membro',
            500,
            'MEMBER_CREATE_FAILED',
            memberErr?.message,
        );
    }

    // Audit log (non-blocking — hash-chain trigger fills prev_hash/hash/sequence_number)
    supabase
        .from('intelink_audit_logs')
        .insert({
            action: 'auth.signup',
            actor_id: String(member.id),
            actor_name: name,
            target_type: 'member',
            target_id: String(member.id),
            details: { email, channel_offered: 'email+telegram' },
        })
        .then(() => {}, () => {});

    return createdResponse({
        memberId: member.id,
        email,
        nextStep: 'verify',
        verifyUrl: `/auth/verify?email=${encodeURIComponent(email)}`,
    });
}
