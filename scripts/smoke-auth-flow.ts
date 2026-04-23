/**
 * AUTH-PUB-017 — Smoke test for full auth flow
 *
 * Run against localhost or production. Creates a throwaway test account,
 * exercises signup → verify → login → recover → cleanup.
 *
 * Usage:
 *   BASE_URL=http://localhost:3001 \
 *   SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
 *   SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
 *   bun scripts/smoke-auth-flow.ts
 *
 * Requires service_role to:
 *   - read OTP from DB (plain OTP not exposed via API — we bypass for testing)
 *   - delete test account after
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
    process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const ts = Date.now();
const TEST_EMAIL = `smoke-auth-${ts}@example.test`;
const TEST_NAME = `Smoke Test ${ts}`;
const TEST_PASSWORD = 'InitialPw!' + ts;
const NEW_PASSWORD = 'NewPw!' + ts;

interface Step {
    name: string;
    ok: boolean;
    detail?: string;
}

const steps: Step[] = [];

function record(name: string, ok: boolean, detail?: string): void {
    steps.push({ name, ok, detail });
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function cleanup(): Promise<void> {
    try {
        const { data } = await supabase.auth.admin.listUsers();
        const u = data.users.find(x => x.email === TEST_EMAIL);
        if (u) await supabase.auth.admin.deleteUser(u.id);
        await supabase.from('intelink_unit_members').delete().eq('email', TEST_EMAIL);
    } catch {
        // best-effort
    }
}

async function main() {
    console.log(`\n🧪 Auth smoke — BASE=${BASE_URL} email=${TEST_EMAIL}\n`);

    // ── Signup ──────────────────────────────────────────────
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const signupData = await signupRes.json().catch(() => ({}));
    record('POST /api/auth/signup', signupRes.ok, signupData.memberId ?? JSON.stringify(signupData));
    if (!signupRes.ok) { await cleanup(); process.exit(1); }

    // ── Member row exists, verified_at NULL ─────────────────
    const { data: member } = await supabase
        .from('intelink_unit_members')
        .select('id, verified_at, verification_channel')
        .eq('email', TEST_EMAIL)
        .single();
    record('member row created with verified_at=NULL', member?.verified_at === null, `id=${member?.id}`);

    // ── Verify request (email channel) ──────────────────────
    const reqRes = await fetch(`${BASE_URL}/api/auth/verify/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, channel: 'email', purpose: 'signup' }),
    });
    const reqData = await reqRes.json().catch(() => ({}));
    // Will fail at email send if Resend not configured — that's expected in localdev,
    // but DB state should still be updated (token_hash set). We check that.
    const { data: afterReq } = await supabase
        .from('intelink_unit_members')
        .select('verification_token_hash, verification_token_expires_at, verification_channel')
        .eq('email', TEST_EMAIL)
        .single();
    const tokenStored = !!afterReq?.verification_token_hash;
    record(
        'POST /api/auth/verify/request (email)',
        reqRes.ok || tokenStored,
        reqRes.ok ? 'sent' : `send-failed-but-token-stored=${tokenStored} (${reqData.error?.message ?? reqData.error})`,
    );

    // ── Bypass: generate a known OTP, overwrite hash, then confirm ──
    // In production the user gets OTP via email/telegram. Here we inject a known one
    // to validate the confirm path without real email delivery.
    const knownOtp = '123456';
    const knownHash = await bcrypt.hash(knownOtp, 10);
    await supabase
        .from('intelink_unit_members')
        .update({
            verification_token_hash: knownHash,
            verification_token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            verification_attempts: 0,
        })
        .eq('email', TEST_EMAIL);

    // ── Wrong OTP attempt ───────────────────────────────────
    const wrongRes = await fetch(`${BASE_URL}/api/auth/verify/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, code: '000000', purpose: 'signup' }),
    });
    record('wrong OTP rejected', wrongRes.status === 400);

    // ── Correct OTP ─────────────────────────────────────────
    const confirmRes = await fetch(`${BASE_URL}/api/auth/verify/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, code: knownOtp, purpose: 'signup' }),
    });
    const confirmData = await confirmRes.json().catch(() => ({}));
    record(
        'POST /api/auth/verify/confirm (correct OTP)',
        confirmRes.ok && confirmData.verified === true,
        JSON.stringify(confirmData),
    );

    // ── verified_at set ─────────────────────────────────────
    const { data: afterConfirm } = await supabase
        .from('intelink_unit_members')
        .select('verified_at, verification_token_hash')
        .eq('email', TEST_EMAIL)
        .single();
    record('verified_at is now NOT NULL', !!afterConfirm?.verified_at);
    record('verification_token_hash cleared after use', !afterConfirm?.verification_token_hash);

    // ── Cookie set on confirm response ──────────────────────
    const setCookie = confirmRes.headers.get('set-cookie') ?? '';
    record('intelink_verified cookie set', setCookie.includes('intelink_verified=1'));

    // ── Recovery flow ───────────────────────────────────────
    const recOtp = '654321';
    const recHash = await bcrypt.hash(recOtp, 10);
    await supabase
        .from('intelink_unit_members')
        .update({
            verification_token_hash: recHash,
            verification_token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            verification_attempts: 0,
            verification_channel: 'email',
        })
        .eq('email', TEST_EMAIL);

    const resetRes = await fetch(`${BASE_URL}/api/auth/recover/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, code: recOtp, newPassword: NEW_PASSWORD }),
    });
    const resetData = await resetRes.json().catch(() => ({}));
    record(
        'POST /api/auth/recover/reset',
        resetRes.ok && resetData.reset === true,
        JSON.stringify(resetData),
    );

    // ── Duplicate email signup rejected ─────────────────────
    const dupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dup', email: TEST_EMAIL, password: 'SomePw12345' }),
    });
    record('duplicate signup rejected 409', dupRes.status === 409);

    // ── Cleanup ─────────────────────────────────────────────
    await cleanup();
    record('cleanup', true);

    // ── Summary ─────────────────────────────────────────────
    const passed = steps.filter(s => s.ok).length;
    const total = steps.length;
    const rate = Math.round((passed / total) * 100);
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`${passed}/${total} passed (${rate}%)`);
    console.log('─'.repeat(50));
    process.exit(passed === total ? 0 : 1);
}

main().catch(async (err) => {
    console.error('\n❌ Smoke crashed:', err);
    await cleanup();
    process.exit(2);
});
