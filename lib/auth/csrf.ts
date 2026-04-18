/**
 * AUTH-010: CSRF protection via Origin header check.
 *
 * Bearer token auth is inherently CSRF-safe (cross-site forms can't set headers),
 * but cookie-based paths need an additional check. Use on any POST/DELETE/PATCH
 * route that accepts cookie-based sessions.
 */

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = new Set([
    process.env.NEXT_PUBLIC_APP_URL ?? '',
    'http://localhost:3000',
    'http://localhost:3001',
]);

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
