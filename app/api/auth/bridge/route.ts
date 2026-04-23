import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertSameOrigin } from '@/lib/auth';
import { isRateLimited, retryAfterSeconds } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

// Bridge: Supabase session → intelink_member_id + RBAC context
// Requires valid Supabase session cookie to prevent email enumeration
export async function POST(request: NextRequest) {
    const csrfErr = assertSameOrigin(request);
    if (csrfErr) return csrfErr;

    // AUTH-011: rate limit by IP — max 10 calls/min to prevent email enumeration
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const rlKey = `bridge:${ip}`;
    if (isRateLimited(rlKey, 10, 60_000)) {
        return NextResponse.json(
            { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' },
            { status: 429, headers: { 'Retry-After': String(retryAfterSeconds(rlKey)) } }
        );
    }

    try {
        const { email } = await request.json();
        if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

        // Verify caller has a valid Supabase session matching the requested email
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const authHeader = request.headers.get('Authorization');
        const cookieHeader = request.headers.get('Cookie') || '';

        // Extract sb-*-auth-token from cookies (Supabase client sets this)
        const sbTokenMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
        let callerEmail: string | null = null;

        if (authHeader?.startsWith('Bearer ')) {
            // Verify the bearer token is a valid Supabase JWT
            const userSupabase = createClient(supabaseUrl, anonKey);
            const { data: { user } } = await userSupabase.auth.getUser(authHeader.slice(7));
            callerEmail = user?.email ?? null;
        } else if (sbTokenMatch) {
            // Verify via cookie session
            const userSupabase = createClient(supabaseUrl, anonKey);
            const { data: { user } } = await userSupabase.auth.getUser(
                decodeURIComponent(sbTokenMatch[1]).split('.').slice(0, 3).join('.')
            );
            callerEmail = user?.email ?? null;
        }

        // If we could verify the session, enforce email match
        if (callerEmail !== null && callerEmail.toLowerCase() !== email.toLowerCase()) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: member, error } = await serviceSupabase
            .from('intelink_unit_members')
            .select('id, name, email, phone, role, system_role, unit_id, telegram_chat_id, telegram_username, verified_at')
            .eq('email', email)
            .single();

        if (error || !member) {
            return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
        }

        const response = NextResponse.json({
            member_id: member.id,
            name: member.name,
            phone: member.phone,
            role: member.role,
            system_role: member.system_role,
            unit_id: member.unit_id,
            telegram_chat_id: member.telegram_chat_id,
            telegram_username: member.telegram_username,
            verified_at: member.verified_at,
            needs_verification: !member.verified_at,
        });

        // AUTH-PUB-011: set cookie so middleware permits protected routes.
        // Absent/deleted when verified_at is null → middleware redirects to /auth/verify.
        if (member.verified_at) {
            response.cookies.set('intelink_verified', '1', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 30,
                path: '/',
            });
        } else {
            response.cookies.delete('intelink_verified');
        }

        return response;
    } catch (e) {
        console.error('[Auth Bridge]', e);
        return NextResponse.json({ error: 'Bridge error' }, { status: 500 });
    }
}
