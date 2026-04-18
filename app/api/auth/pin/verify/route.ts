/**
 * POST /api/auth/pin/verify
 * PIN-003: verifica PIN do usuário autenticado.
 * Lockout após 5 tentativas (15 min). Retorna { valid: true } ou erro.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest): Promise<NextResponse> {
    const anonClient = createClient(
        SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await request.json().catch(() => ({})) as { pin?: string };
    const { pin } = body;

    if (!pin || !/^\d{6}$/.test(pin)) {
        return NextResponse.json({ error: 'PIN inválido' }, { status: 400 });
    }

    const { data: record } = await supabase
        .from('intelink_member_pins')
        .select('pin_hash, attempts, locked_until')
        .eq('user_id', user.id)
        .single();

    if (!record) {
        return NextResponse.json({ error: 'PIN não configurado. Acesse /settings/pin para criar.' }, { status: 404 });
    }

    if (record.locked_until && new Date(record.locked_until) > new Date()) {
        const unlockAt = new Date(record.locked_until).toLocaleTimeString('pt-BR');
        return NextResponse.json({ error: `Conta bloqueada até ${unlockAt}` }, { status: 429 });
    }

    const valid = await bcrypt.compare(pin, record.pin_hash);

    if (!valid) {
        const attempts = record.attempts + 1;
        const locked_until = attempts >= 5
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null;
        await supabase
            .from('intelink_member_pins')
            .update({ attempts, locked_until })
            .eq('user_id', user.id);

        const remaining = Math.max(0, 5 - attempts);
        return NextResponse.json({
            error: remaining > 0
                ? `PIN incorreto. ${remaining} tentativa(s) restante(s)`
                : 'Conta bloqueada por 15 minutos'
        }, { status: 403 });
    }

    // Reset attempts on success
    await supabase
        .from('intelink_member_pins')
        .update({ attempts: 0, locked_until: null })
        .eq('user_id', user.id);

    return NextResponse.json({ valid: true, verified_at: new Date().toISOString() });
}
