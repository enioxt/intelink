import { NextRequest, NextResponse } from 'next/server';

// AUTH-008: Server-side route protection via Next.js middleware.
// Previously only client-side guards existed — trivial to bypass.
// Now: every protected route is checked before the page renders.

const PUBLIC_PATHS = [
    '/login',
    '/signup',
    '/auth/verify',    // public verification page (user may not have session yet)
    '/auth/callback',  // Supabase auth callback
    '/recover',        // password recovery page
    '/api/auth',       // login, bridge, refresh, signup, verify, recover endpoints
    '/api/telegram',   // Telegram webhook (no auth — verified by bot token)
    '/_next',          // Next.js assets
    '/favicon.ico',
    '/favicon.svg',
    '/manifest.json',  // PWA manifest must be public
    '/sw.js',          // Service worker must be public
    '/icons/',         // PWA icons
    '/public',
    '/api/health',          // healthcheck must be public
    '/api/internal',        // gateway discovery — no auth. NOTE: `_internal` = Next.js private folder (not routed), so path is `/api/internal`.
];

// UI-POLISH-005: `/` is public — landing page renders marketing for unauthenticated
// visitors and dashboard for authenticated users. Handled at page level, not middleware.
const PUBLIC_EXACT_PATHS = new Set(['/']);

// AUTH-PUB-011: routes that require account verification (verified_at IS NOT NULL).
// If user has auth but no `intelink_verified` cookie → redirect to /auth/verify.
// The cookie is set by /api/auth/verify/confirm and /api/auth/bridge when member.verified_at is present.
// Tampering the cookie only grants page access; sensitive API routes re-check DB.
function needsVerification(request: NextRequest): boolean {
    const verifiedCookie = request.cookies.get('intelink_verified')?.value;
    return verifiedCookie !== '1';
}

function isPublic(pathname: string): boolean {
    if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
    return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hasAuth(request: NextRequest): boolean {
    // Accept intelink JWT cookie
    const intelinkToken = request.cookies.get('intelink_access');
    if (intelinkToken?.value) return true;

    // Accept intelink_member_id cookie (UUID; route handler validates against DB)
    const memberIdCookie = request.cookies.get('intelink_member_id')?.value;
    if (memberIdCookie && UUID_RE.test(memberIdCookie)) return true;

    // Accept intelink_session cookie (route handler validates against intelink_sessions table)
    const sessionCookie = request.cookies.get('intelink_session')?.value;
    if (sessionCookie) return true;

    // Accept Authorization: Bearer for API clients (route handler validates token)
    const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return true;

    // Supabase sets sb-<project>-auth-token
    const sbCookie = [...request.cookies.getAll()].find(c =>
        c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    return !!sbCookie?.value;
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isPublic(pathname)) return NextResponse.next();

    if (!hasAuth(request)) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        loginUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // AUTH-PUB-011: account must be verified before accessing protected routes.
    if (needsVerification(request)) {
        const verifyUrl = request.nextUrl.clone();
        verifyUrl.pathname = '/auth/verify';
        verifyUrl.searchParams.set('returnUrl', pathname);
        return NextResponse.redirect(verifyUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
