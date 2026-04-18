/**
 * POST /api/auth/pin/recover
 * PIN-004: envia magic link Supabase para o e-mail do usuário.
 * O magic link redireciona para /settings/pin?recovery=1 onde o usuário cria novo PIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const body = await request.json().catch(() => ({})) as { email?: string };
    const { email } = body;

    if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists and has a PIN
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (!user) {
        // Return ok anyway to avoid user enumeration
        return NextResponse.json({ ok: true });
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'https://intelink.ia.br'}/settings/pin?recovery=1`;

    await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo }
    });

    // Reset lockout for this user
    await supabase
        .from('intelink_member_pins')
        .update({ attempts: 0, locked_until: null })
        .eq('user_id', user.id);

    return NextResponse.json({ ok: true, message: 'Link de recuperação enviado para o e-mail' });
}
