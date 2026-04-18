/**
 * POST /api/propostas/[id]/apply
 * CONTRIB-018: Applies an approved proposal's items to Neo4j.
 * Sets Person.<field> + _confidence_<field> + _proposal_id_<field>.
 * Only runs when proposal.status = 'approved'.
 * Requires authenticated user (admin or proposer).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runQuery } from '@/lib/neo4j/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fields that can be applied to Neo4j Person nodes
const ALLOWED_FIELDS = new Set([
    'nome', 'cpf', 'rg', 'data_nascimento', 'nome_mae', 'nome_pai',
    'sexo', 'endereco', 'bairro', 'cidade', 'estado', 'telefone',
    'email', 'apelido', 'naturalidade',
]);

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
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: proposal } = await supabase
        .from('intelink_proposals')
        .select('*, intelink_proposal_items(*)')
        .eq('id', proposalId)
        .single();

    if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    if (proposal.status !== 'approved') {
        return NextResponse.json({ error: 'Proposta não está aprovada' }, { status: 400 });
    }

    const cpf = proposal.person_cpf?.replace(/\D/g, '');
    if (!cpf || cpf.length !== 11) {
        return NextResponse.json({ error: 'CPF inválido na proposta' }, { status: 400 });
    }

    // Build Neo4j SET clauses for approved items
    const approvedItems = (proposal.intelink_proposal_items ?? []).filter(
        (item: { item_status: string; field_path: string }) =>
            item.item_status === 'approved' && ALLOWED_FIELDS.has(item.field_path)
    );

    if (!approvedItems.length) {
        return NextResponse.json({ error: 'Nenhum item aprovado para aplicar' }, { status: 400 });
    }

    // Build dynamic SET clause: p.<field> = $val, p._confidence_<field> = 'CONFIRMADO', ...
    const setClauses: string[] = [];
    const params2: Record<string, string> = { cpf };

    for (const item of approvedItems as Array<{ field_path: string; new_value: string; id: string }>) {
        const field = item.field_path;
        const paramKey = `val_${field}`;
        setClauses.push(`p.${field} = $${paramKey}`);
        setClauses.push(`p._confidence_${field} = 'CONFIRMADO'`);
        setClauses.push(`p._proposal_id_${field} = $pid_${field}`);
        params2[paramKey] = item.new_value;
        params2[`pid_${field}`] = proposalId;
    }

    const setStr = setClauses.join(', ');
    const query = `MATCH (p:Person {cpf: $cpf}) SET ${setStr} RETURN p.nome AS nome`;

    try {
        const rows = await runQuery<{ nome: unknown }>(query, params2);
        const matched = rows.length;

        if (matched === 0) {
            return NextResponse.json({ error: 'Pessoa não encontrada no grafo' }, { status: 404 });
        }

        // Update proposal status to 'applied'
        await supabase
            .from('intelink_proposals')
            .update({ status: 'applied' } as Record<string, string>)
            .eq('id', proposalId);

        await supabase.from('intelink_audit_logs').insert({
            action: 'proposal.applied',
            actor_id: user.id,
            target_type: 'proposal',
            target_id: proposalId,
            details: { person_cpf: cpf, fields_applied: approvedItems.length, neo4j_matched: matched },
        });

        return NextResponse.json({
            ok: true,
            fields_applied: approvedItems.length,
            person_cpf: cpf,
        });
    } catch (err) {
        console.error('[Apply Proposal] Neo4j error:', err);
        return NextResponse.json({ error: 'Erro ao aplicar ao Neo4j' }, { status: 500 });
    }
}
