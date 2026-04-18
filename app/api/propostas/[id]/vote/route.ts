/**
 * POST /api/propostas/[id]/vote
 * CONTRIB-012: registra voto em item(s) de uma proposta.
 * Requer PIN verificado no body. Voto único por votante por item (UNIQUE constraint).
 * Body: { pin, votes: [{item_id, vote: 'approve'|'reject'}] }
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const QUORUM = 3;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const anonClient = createClient(
        SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: proposalId } = await params;
    const body = await request.json().catch(() => ({})) as {
        pin?: string;
        votes?: Array<{ item_id: string; vote: 'approve' | 'reject' }>;
    };

    const { pin, votes } = body;

    if (!pin || !votes?.length) {
        return NextResponse.json({ error: 'pin e votes[] são obrigatórios' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify PIN
    const { data: pinRecord } = await supabase
        .from('intelink_member_pins')
        .select('pin_hash, attempts, locked_until')
        .eq('user_id', user.id)
        .single();

    if (!pinRecord) {
        return NextResponse.json({ error: 'Configure seu PIN em /settings/pin antes de votar' }, { status: 403 });
    }

    if (pinRecord.locked_until && new Date(pinRecord.locked_until) > new Date()) {
        return NextResponse.json({ error: 'PIN bloqueado temporariamente' }, { status: 429 });
    }

    const pinValid = await bcrypt.compare(pin, pinRecord.pin_hash);
    if (!pinValid) {
        const attempts = pinRecord.attempts + 1;
        await supabase
            .from('intelink_member_pins')
            .update({ attempts, locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null })
            .eq('user_id', user.id);
        return NextResponse.json({ error: 'PIN incorreto' }, { status: 403 });
    }

    // Reset attempts
    await supabase.from('intelink_member_pins').update({ attempts: 0, locked_until: null }).eq('user_id', user.id);

    // Verify proposal exists and is pending
    const { data: proposal } = await supabase
        .from('intelink_proposals')
        .select('id, status, proposer_id')
        .eq('id', proposalId)
        .single();

    if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    if (proposal.status !== 'pending') return NextResponse.json({ error: 'Proposta não está mais pendente' }, { status: 409 });

    const pin_verified_at = new Date().toISOString();
    const results = [];

    for (const { item_id, vote } of votes) {
        // Check item belongs to this proposal
        const { data: item } = await supabase
            .from('intelink_proposal_items')
            .select('id, votes_for, votes_against, item_status')
            .eq('id', item_id)
            .eq('proposal_id', proposalId)
            .single();

        if (!item || item.item_status !== 'pending') {
            results.push({ item_id, error: 'Item inválido ou já decidido' });
            continue;
        }

        // Insert vote (UNIQUE constraint prevents double-voting)
        const { error: vErr } = await supabase
            .from('intelink_proposal_votes')
            .insert({ proposal_id: proposalId, item_id, voter_id: user.id, vote, pin_verified_at });

        if (vErr) {
            results.push({ item_id, error: vErr.code === '23505' ? 'Já votou neste item' : vErr.message });
            continue;
        }

        // Update vote counters on item
        const updateField = vote === 'approve' ? { votes_for: item.votes_for + 1 } : { votes_against: item.votes_against + 1 };
        await supabase.from('intelink_proposal_items').update(updateField).eq('id', item_id);

        // Resolve item if quorum reached
        const newVotesFor = vote === 'approve' ? item.votes_for + 1 : item.votes_for;
        const newVotesAgainst = vote === 'reject' ? item.votes_against + 1 : item.votes_against;

        let item_status = 'pending';
        if (newVotesFor >= QUORUM) {
            item_status = 'approved';
            await supabase.from('intelink_proposal_items').update({ item_status: 'approved' }).eq('id', item_id);
        } else if (newVotesAgainst > 0) {
            item_status = 'rejected';
            await supabase.from('intelink_proposal_items').update({ item_status: 'rejected' }).eq('id', item_id);
        }

        results.push({ item_id, vote, item_status });
    }

    // Check if all items resolved → update proposal status
    const { data: allItems } = await supabase
        .from('intelink_proposal_items')
        .select('item_status')
        .eq('proposal_id', proposalId);

    if (allItems) {
        const pending = allItems.filter(i => i.item_status === 'pending').length;
        const approved = allItems.filter(i => i.item_status === 'approved').length;
        const rejected = allItems.filter(i => i.item_status === 'rejected').length;

        if (pending === 0) {
            const finalStatus = rejected === 0 ? 'approved' : approved > 0 ? 'partial' : 'rejected';
            await supabase
                .from('intelink_proposals')
                .update({ status: finalStatus, updated_at: new Date().toISOString() })
                .eq('id', proposalId);
        }
    }

    // Audit
    await supabase.from('intelink_audit_logs').insert({
        action: 'proposal.voted',
        actor_id: user.id,
        target_type: 'proposal',
        target_id: proposalId,
        details: { votes: results },
    });

    return NextResponse.json({ ok: true, results });
}
