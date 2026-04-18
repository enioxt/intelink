/**
 * POST /api/members/passkey-pref
 * AUTH-015d: saves passkey_preference + optional snooze timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED = new Set(['enabled', 'skipped', 'deferred']);

export async function POST(request: NextRequest): Promise<NextResponse> {
    const body = await request.json().catch(() => ({}));
    const { member_id, preference, snooze_days } = body as {
        member_id?: string;
        preference?: string;
        snooze_days?: number;
    };

    if (!member_id || !preference || !ALLOWED.has(preference)) {
        return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const update: Record<string, unknown> = { passkey_preference: preference };
    if (preference === 'deferred' && snooze_days) {
        const until = new Date();
        until.setDate(until.getDate() + snooze_days);
        update.passkey_nudge_snoozed_until = until.toISOString();
    }

    const { error } = await sb
        .from('intelink_unit_members')
        .update(update)
        .eq('id', member_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
