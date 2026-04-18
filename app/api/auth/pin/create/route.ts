/**
 * POST /api/auth/pin/create
 * PIN-002: cria ou atualiza PIN de 6 dígitos para o usuário autenticado.
 * Requer sessão Supabase válida. PIN é armazenado como bcrypt hash (rounds=12).
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve session via cookie
    const anonClient = createClient(
        SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { pin?: string; current_pin?: string };
    const { pin, current_pin } = body;

    if (!pin || !/^\d{6}$/.test(pin)) {
        return NextResponse.json({ error: 'PIN deve ter exatamente 6 dígitos' }, { status: 400 });
    }

    // Check if user already has a PIN — if so, require current_pin to change
    const { data: existing } = await supabase
        .from('intelink_member_pins')
        .select('pin_hash, attempts, locked_until')
        .eq('user_id', user.id)
        .single();

    if (existing) {
        if (!current_pin) {
            return NextResponse.json({ error: 'PIN atual obrigatório para alteração' }, { status: 400 });
        }
        // Check lockout
        if (existing.locked_until && new Date(existing.locked_until) > new Date()) {
            return NextResponse.json({ error: 'Conta bloqueada temporariamente. Tente mais tarde.' }, { status: 429 });
        }
        const valid = await bcrypt.compare(current_pin, existing.pin_hash);
        if (!valid) {
            const attempts = existing.attempts + 1;
            const locked_until = attempts >= 5
                ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
                : null;
            await supabase
                .from('intelink_member_pins')
                .update({ attempts, locked_until })
                .eq('user_id', user.id);
            return NextResponse.json({ error: 'PIN atual incorreto' }, { status: 403 });
        }
    }

    const pin_hash = await bcrypt.hash(pin, 12);

    await supabase
        .from('intelink_member_pins')
        .upsert({
            user_id: user.id,
            pin_hash,
            attempts: 0,
            locked_until: null,
            last_rotated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    return NextResponse.json({ ok: true, message: existing ? 'PIN alterado com sucesso' : 'PIN criado com sucesso' });
}
