/**
 * POST /api/propostas
 * CONTRIB-007: cria proposta de edição com itens. Proposer = voto 1 automático.
 * Body: { person_cpf, person_name?, items: [{field_path, old_value?, new_value, source?, source_url?, justification?}] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const anonClient = createClient(
        SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');
    const status = searchParams.get('status') || 'pending';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let query = supabase
        .from('intelink_proposals')
        .select('*, intelink_proposal_items(*), intelink_proposal_votes(voter_id, vote)')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(50);

    if (cpf) query = query.eq('person_cpf', cpf);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const anonClient = createClient(
        SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({})) as {
        person_cpf?: string;
        person_name?: string;
        notes?: string;
        items?: Array<{
            field_path: string;
            old_value?: string;
            new_value: string;
            source?: string;
            source_url?: string;
            justification?: string;
        }>;
    };

    const { person_cpf, person_name, notes, items } = body;

    if (!person_cpf || !items?.length) {
        return NextResponse.json({ error: 'person_cpf e items[] são obrigatórios' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check for duplicate pending proposals on same CPF by same user
    const { data: existing } = await supabase
        .from('intelink_proposals')
        .select('id')
        .eq('person_cpf', person_cpf)
        .eq('proposer_id', user.id)
        .eq('status', 'pending')
        .single();

    if (existing) {
        return NextResponse.json({
            error: 'Já existe uma proposta pendente sua para este CPF',
            proposal_id: existing.id
        }, { status: 409 });
    }

    // Create proposal
    const { data: proposal, error: pErr } = await supabase
        .from('intelink_proposals')
        .insert({ person_cpf, person_name, proposer_id: user.id, notes, vote_count: 1 })
        .select()
        .single();

    if (pErr || !proposal) {
        return NextResponse.json({ error: pErr?.message || 'Erro ao criar proposta' }, { status: 500 });
    }

    // Insert items
    const itemRows = items.map(it => ({
        proposal_id: proposal.id,
        field_path: it.field_path,
        old_value: it.old_value ?? null,
        new_value: it.new_value,
        source: it.source ?? null,
        source_url: it.source_url ?? null,
        justification: it.justification ?? null,
        votes_for: 1, // proposer auto-votes approve
    }));

    const { data: insertedItems, error: iErr } = await supabase
        .from('intelink_proposal_items')
        .insert(itemRows)
        .select();

    if (iErr) {
        await supabase.from('intelink_proposals').delete().eq('id', proposal.id);
        return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    // Register proposer's vote on each item
    const voteRows = (insertedItems ?? []).map(item => ({
        proposal_id: proposal.id,
        item_id: item.id,
        voter_id: user.id,
        vote: 'approve',
        pin_verified_at: new Date().toISOString(),
    }));

    if (voteRows.length) {
        await supabase.from('intelink_proposal_votes').insert(voteRows);
    }

    // Audit log
    await supabase.from('intelink_audit_logs').insert({
        action: 'proposal.created',
        actor_id: user.id,
        target_type: 'proposal',
        target_id: proposal.id,
        details: { person_cpf, item_count: items.length },
    });

    // CONTRIB-014: Notificar membros via Telegram (fire-and-forget)
    notifyMembersNewProposal(supabase, proposal.id, person_cpf, person_name, items.length).catch(() => {});

    return NextResponse.json({ ok: true, proposal_id: proposal.id, items: insertedItems }, { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyMembersNewProposal(
    supabase: any,
    proposalId: string,
    cpf: string,
    name: string | undefined,
    itemCount: number
): Promise<void> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) return;

    const webUrl = `https://intelink.ia.br/propostas/${proposalId}`;
    const text = `⚠️ *Nova proposta aguarda seus votos*

👤 ${name || cpf}
CPF: \`${cpf}\`
📋 ${itemCount} campo(s) para revisar

${webUrl}`;

    const { data: members } = await supabase
        .from('intelink_unit_members')
        .select('telegram_chat_id')
        .not('telegram_chat_id', 'is', null)
        .limit(50) as { data: Array<{ telegram_chat_id: number | null }> | null };

    if (!members?.length) return;

    const keyboard = { inline_keyboard: [[{ text: '📋 Votar agora', url: webUrl }]] };

    await Promise.allSettled(members.map(m =>
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: m.telegram_chat_id, text, parse_mode: 'Markdown', reply_markup: keyboard }),
        })
    ));
}
