/**
 * AUTH-PUB-005 — POST /api/auth/verify/request
 *
 * Body: { email, channel: 'email'|'telegram'|'whatsapp', purpose?: 'signup'|'recovery' }
 * Generates 6-digit OTP, bcrypts, sends via selected channel.
 * Rate limit: 5/hour/email (via AUTH-PUB-015 lib/security/rate-limit).
 */

import { NextRequest } from 'next/server';
import { errorResponse, validationError, successResponse } from '@/lib/api-utils';
import { checkRateLimit, tooManyRequestsResponse } from '@/lib/security/rate-limit';
import { requestVerification, type VerificationChannel, type VerificationPurpose } from '@/lib/auth/verification';

const VERIFY_REQUEST_RL = {
    name: 'auth-verify-request',
    requests: 5,
    windowSeconds: 3600,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHANNELS: ReadonlySet<VerificationChannel> = new Set(['email', 'telegram', 'whatsapp']);
const PURPOSES: ReadonlySet<VerificationPurpose> = new Set(['signup', 'recovery']);

export async function POST(req: NextRequest) {
    const rateCheck = checkRateLimit(req, VERIFY_REQUEST_RL);
    if (!rateCheck.allowed) {
        return tooManyRequestsResponse(rateCheck.retryAfter ?? 3600);
    }

    let body: { email?: unknown; channel?: unknown; purpose?: unknown };
    try {
        body = await req.json();
    } catch {
        return validationError('JSON inválido');
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const channel = typeof body.channel === 'string' ? body.channel : '';
    const purpose = typeof body.purpose === 'string' ? body.purpose : 'signup';

    if (!email || !EMAIL_RE.test(email)) {
        return validationError('Email inválido');
    }
    if (!CHANNELS.has(channel as VerificationChannel)) {
        return validationError('Canal inválido. Use email ou telegram.');
    }
    if (!PURPOSES.has(purpose as VerificationPurpose)) {
        return validationError('Finalidade inválida');
    }

    const result = await requestVerification(
        email,
        channel as VerificationChannel,
        purpose as VerificationPurpose,
    );

    if (!result.ok) {
        return errorResponse(
            result.error ?? 'Falha ao enviar código',
            400,
            'VERIFY_REQUEST_FAILED',
        );
    }

    return successResponse({
        channel: result.channelUsed,
        expiresAt: result.expiresAt,
    });
}
