/**
 * AUTH-013b+c: GET /api/auth/telegram/callback
 * Validates Telegram Login Widget hash (HMAC-SHA256 with bot token).
 * If telegram_chat_id is linked → generates magic link session.
 * If not linked → redirects to bot with claim nonce (AUTH-013e).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://intelink.ia.br';

function validateTelegramHash(data: Record<string, string>, botToken: string): boolean {
    const { hash, ...rest } = data;
    if (!hash) return false;
    const checkString = Object.keys(rest)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(hash, 'hex'));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return NextResponse.redirect(new URL('/login?error=config', request.url));
    }

    // AUTH-013b: validate HMAC-SHA256
    if (!validateTelegramHash(params, botToken)) {
        return NextResponse.redirect(new URL('/login?error=invalid_hash', request.url));
    }

    // Reject stale auth (>1 hour)
    const authDate = parseInt(params.auth_date || '0', 10);
    if (Date.now() / 1000 - authDate > 3600) {
        return NextResponse.redirect(new URL('/login?error=expired', request.url));
    }

    const telegramId = params.id;
    if (!telegramId) {
        return NextResponse.redirect(new URL('/login?error=missing_id', request.url));
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // AUTH-013c: look up member by telegram_chat_id
    const { data: member } = await supabase
        .from('intelink_unit_members')
        .select('id, email, name, system_role')
        .eq('telegram_chat_id', telegramId)
        .single();

    if (!member?.email) {
        // AUTH-013e: unlinked — store nonce and redirect to bot
        const nonce = crypto.randomBytes(16).toString('hex');
        await supabase.from('intelink_audit_logs').insert({
            action: 'telegram.unlinked_login_attempt',
            target_type: 'telegram',
            target_id: telegramId,
            details: {
                nonce,
                telegram_id: telegramId,
                first_name: params.first_name,
                username: params.username,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
        });
        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'intelink_bot';
        return NextResponse.redirect(`https://t.me/${botUsername}?start=claim-${nonce}`);
    }

    // AUTH-013c: generate magic link to create session
    // INTELINK-AUTH-015 (2026-04-22): redirect MUST go through /auth/callback so the browser-side
    // Supabase client can consume the URL fragment and persist the session (storageKey=intelink-auth-token).
    // Landing at '/' directly leaks #access_token to egos.ia.br if Supabase Site URL isn't intelink.ia.br.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: member.email,
        options: { redirectTo: `${APP_URL}/auth/callback?returnUrl=%2F` },
    });

    if (linkErr || !linkData?.properties?.action_link) {
        console.error('[TG Auth] generateLink error:', linkErr?.message);
        return NextResponse.redirect(new URL('/login?error=session_error', request.url));
    }

    await supabase.from('intelink_audit_logs').insert({
        action: 'telegram.login_success',
        target_type: 'member',
        target_id: member.id,
        details: { telegram_id: telegramId, name: params.first_name },
    });

    return NextResponse.redirect(linkData.properties.action_link);
}
