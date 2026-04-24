/**
 * AUTH-010: CSRF protection via Origin header check.
 *
 * Bearer token auth is inherently CSRF-safe (cross-site forms can't set headers),
 * but cookie-based paths need an additional check. Use on any POST/DELETE/PATCH
 * route that accepts cookie-based sessions.
 */

import { NextRequest, NextResponse } from 'next/server';

// Hardcoded canonical domains. Intentionally not derived from
// NEXT_PUBLIC_APP_URL: Next.js inlines NEXT_PUBLIC_* at BUILD time, and our
// Docker build doesn't receive .env vars, so the inlined value was undefined
// and the Set lost the production origin. See prod-403 incident (2026-04-23).
//
// ALLOWED_ORIGINS (server-only env, no NEXT_PUBLIC_ prefix) can append extras
// at runtime, e.g. for preview deploys or custom domains.
function buildAllowedOrigins(): Set<string> {
    const origins = new Set<string>([
        'https://intelink.ia.br',
        'https://www.intelink.ia.br',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3009',
    ]);
    const extra = (process.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    extra.forEach(o => origins.add(o));
    return origins;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

/**
 * Returns a 403 NextResponse if the request Origin doesn't match the app,
 * or null if the request is safe to proceed.
 *
 * Skip this check when the request already carries a Bearer token (CSRF-safe).
 */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
    const authorization = request.headers.get('authorization');
    if (authorization?.startsWith('Bearer ')) return null; // token auth — safe

    const origin = request.headers.get('origin');
    if (!origin) return null; // same-origin requests don't send Origin header in all browsers

    if (!ALLOWED_ORIGINS.has(origin)) {
        return NextResponse.json(
            { success: false, error: 'Origin não permitida' },
            { status: 403 }
        );
    }
    return null;
}
