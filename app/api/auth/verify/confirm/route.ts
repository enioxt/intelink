/**
 * AUTH-PUB-010 — POST /api/auth/verify/confirm
 *
 * Body: { email, code, purpose?: 'signup'|'recovery' }
 * Validates OTP + marks verified_at (signup) or returns ok to allow password reset (recovery).
 * Rate limit: 10/hour/IP — defends against brute force; attempt counter in DB is per-account.
 */

import { NextRequest } from 'next/server';
import { errorResponse, validationError, successResponse } from '@/lib/api-utils';
import { checkRateLimit, tooManyRequestsResponse } from '@/lib/security/rate-limit';
import { confirmVerification, type VerificationPurpose } from '@/lib/auth/verification';

const VERIFY_CONFIRM_RL = {
    name: 'auth-verify-confirm',
    requests: 10,
    windowSeconds: 3600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;
const PURPOSES: ReadonlySet<VerificationPurpose> = new Set(['signup', 'recovery']);

export async function POST(req: NextRequest) {
    const rateCheck = checkRateLimit(req, VERIFY_CONFIRM_RL);
    if (!rateCheck.allowed) {
        return tooManyRequestsResponse(rateCheck.retryAfter ?? 3600);
    }

    let body: { email?: unknown; code?: unknown; purpose?: unknown };
    try {
        body = await req.json();
    } catch {
        return validationError('JSON inválido');
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const purpose = typeof body.purpose === 'string' ? body.purpose : 'signup';

    if (!email || !EMAIL_RE.test(email)) {
        return validationError('Email inválido');
    }
    if (!CODE_RE.test(code)) {
        return validationError('Código deve ter 6 dígitos');
    }
    if (!PURPOSES.has(purpose as VerificationPurpose)) {
        return validationError('Finalidade inválida');
    }

    const result = await confirmVerification(email, code, purpose as VerificationPurpose);

    if (!result.ok) {
        return errorResponse(
            result.error ?? 'Falha ao confirmar código',
            400,
            'VERIFY_CONFIRM_FAILED',
        );
    }

    return successResponse({
        memberId: result.memberId,
        channel: result.channel,
        verified: true,
    });
}
