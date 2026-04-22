import { NextRequest, NextResponse } from 'next/server';

// AUTH-008: Server-side route protection via Next.js middleware.
// Previously only client-side guards existed — trivial to bypass.
// Now: every protected route is checked before the page renders.

const PUBLIC_PATHS = [
    '/login',
    '/api/auth',       // login, bridge, refresh endpoints
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

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

function hasAuth(request: NextRequest): boolean {
    // Accept either intelink JWT cookie or active Supabase session cookie
    const intelinkToken = request.cookies.get('intelink_access');
    if (intelinkToken?.value) return true;

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
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
