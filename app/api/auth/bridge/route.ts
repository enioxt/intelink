import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertSameOrigin, createSession, setAuthCookies } from '@/lib/auth';
import { isRateLimited, retryAfterSeconds } from '@/lib/auth/rate-limit';
import type { Member } from '@/lib/auth';

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
            try {
                const userSupabase = createClient(supabaseUrl, anonKey);
                const { data: { user } } = await userSupabase.auth.getUser(authHeader.slice(7));
                callerEmail = user?.email ?? null;
            } catch {
                // Invalid token, treat as unauthenticated
            }
        } else if (sbTokenMatch) {
            // Verify via cookie session — just use the token as-is
            try {
                const userSupabase = createClient(supabaseUrl, anonKey);
                const { data: { user } } = await userSupabase.auth.getUser(sbTokenMatch[1]);
                callerEmail = user?.email ?? null;
            } catch {
                // Invalid token, treat as unauthenticated
            }
        }

        // Require verified Supabase identity — reject anonymous callers.
        // Before: callerEmail=null (no Bearer + no cookie) was silently allowed,
        // meaning any request with a valid CSRF origin could bridge any email.
        if (callerEmail === null) {
            return NextResponse.json({ error: 'Sessão Supabase obrigatória' }, { status: 401 });
        }

        if (callerEmail.toLowerCase() !== email.toLowerCase()) {
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

        // Create JWT session in app's auth system (bridge from Supabase → app session)
        const memberData: Member = {
            id: member.id,
            name: member.name,
            phone: member.phone || '',
            email: member.email || '',
            role: member.role,
            systemRole: member.system_role || 'member',
            unitId: member.unit_id || '',
            telegramChatId: member.telegram_chat_id,
            telegramUsername: member.telegram_username,
        };

        const sessionResult = await createSession({
            member: memberData,
            deviceInfo: {
                userAgent: request.headers.get('user-agent') || 'Supabase Bridge',
                ip: request.headers.get('x-forwarded-for')?.split(',')[0],
            },
        });

        if (!sessionResult.success || !sessionResult.session) {
            console.error('[Auth Bridge] Failed to create session:', sessionResult.error);
            return NextResponse.json({ error: 'Falha ao criar sessão' }, { status: 500 });
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
            session: {
                id: sessionResult.session.id,
                expiresAt: sessionResult.session.expiresAt,
            },
        });

        // Set JWT session cookies so /api/v2/auth/verify can find them
        if (sessionResult.accessToken && sessionResult.refreshToken) {
            setAuthCookies(response, sessionResult.accessToken, sessionResult.refreshToken);
        }

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

        // AUTH-PUB-016: audit login success (non-blocking, hash-chain trigger)
        serviceSupabase
            .from('intelink_audit_logs')
            .insert({
                action: 'auth.login.bridge',
                actor_id: String(member.id),
                actor_name: member.name,
                target_type: 'member',
                target_id: String(member.id),
                ip_address: ip,
                details: {
                    verified: !!member.verified_at,
                    via: callerEmail ? 'supabase-session' : 'email-lookup',
                },
            })
            .then(() => {}, () => {});

        return response;
    } catch (e) {
        console.error('[Auth Bridge] Exception:', {
            error: e instanceof Error ? e.message : String(e),
            stack: e instanceof Error ? e.stack : undefined,
        });
        return NextResponse.json({ error: 'Bridge error' }, { status: 500 });
    }
}
