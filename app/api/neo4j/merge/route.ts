/**
 * POST /api/neo4j/merge
 * MERGE-002: Mesclar dois Person nodes em um único.
 *
 * Estratégia:
 * 1. Mantém o nó com mais dados (maior fonte de confiança)
 * 2. Transfere todos os relacionamentos do nó secundário para o principal
 * 3. Cria SAME_AS entre eles com reason: 'manual_merge'
 * 4. Seta merged_into no nó secundário para rastreabilidade
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';
import { withSecurity, AuthContext } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

async function handlePost(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
    if (!auth.isAuthenticated) {
        return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }

    const { primary_id, secondary_id, reason } = await req.json();

    if (!primary_id || !secondary_id) {
        return NextResponse.json({ error: 'primary_id e secondary_id obrigatórios' }, { status: 400 });
    }
    if (primary_id === secondary_id) {
        return NextResponse.json({ error: 'IDs devem ser diferentes' }, { status: 400 });
    }

    try {
        // 1. Verify both nodes exist
        const check = await runQuery<{ pid: string; sid: string }>(
            `MATCH (p:Person) WHERE elementId(p) = $pid
             MATCH (s:Person) WHERE elementId(s) = $sid
             RETURN elementId(p) AS pid, elementId(s) AS sid`,
            { pid: primary_id, sid: secondary_id }
        );
        if (!check.length) {
            return NextResponse.json({ error: 'Um ou ambos os nós não encontrados' }, { status: 404 });
        }

        // 2. Reroute all outgoing relationships from secondary → primary (except SAME_AS)
        const outgoing = await runQuery<{ count: number }>(
            `MATCH (s:Person)-[r]->(target) WHERE elementId(s) = $sid AND type(r) <> 'SAME_AS'
             MATCH (p:Person) WHERE elementId(p) = $pid
             WITH s, r, target, p, type(r) AS rtype, properties(r) AS rprops
             CALL apoc.create.relationship(p, rtype, rprops, target) YIELD rel
             DELETE r
             RETURN count(rel) AS count`,
            { pid: primary_id, sid: secondary_id }
        ).catch(() => [{ count: 0 }]);

        // 3. Reroute all incoming relationships to secondary → primary (except SAME_AS)
        const incoming = await runQuery<{ count: number }>(
            `MATCH (source)-[r]->(s:Person) WHERE elementId(s) = $sid AND type(r) <> 'SAME_AS'
             MATCH (p:Person) WHERE elementId(p) = $pid
             WITH s, r, source, p, type(r) AS rtype, properties(r) AS rprops
             CALL apoc.create.relationship(source, rtype, rprops, p) YIELD rel
             DELETE r
             RETURN count(rel) AS count`,
            { pid: primary_id, sid: secondary_id }
        ).catch(() => [{ count: 0 }]);

        // 4. Create SAME_AS + mark secondary as merged
        await runQuery(
            `MATCH (p:Person) WHERE elementId(p) = $pid
             MATCH (s:Person) WHERE elementId(s) = $sid
             MERGE (s)-[:SAME_AS {reason: $reason, merged_by: $user, merged_at: datetime(), confidence: 1.0}]->(p)
             SET s.merged_into = $pid, s.merged_at = datetime()`,
            {
                pid: primary_id,
                sid: secondary_id,
                reason: reason || 'manual_merge',
                user: auth.memberName || auth.memberId,
            }
        );

        // 5. Copy fields from secondary to primary (if primary is missing them)
        await runQuery(
            `MATCH (p:Person) WHERE elementId(p) = $pid
             MATCH (s:Person) WHERE elementId(s) = $sid
             SET p.cpf = coalesce(p.cpf, s.cpf),
                 p.rg = coalesce(p.rg, s.rg),
                 p.nome_mae = coalesce(p.nome_mae, s.nome_mae),
                 p.data_nascimento = coalesce(p.data_nascimento, s.data_nascimento),
                 p.municipio = coalesce(p.municipio, s.municipio),
                 p.bairro = coalesce(p.bairro, s.bairro),
                 p.telefone = coalesce(p.telefone, s.telefone)`,
            { pid: primary_id, sid: secondary_id }
        );

        return NextResponse.json({
            ok: true,
            primary_id,
            secondary_id,
            outgoing_rerouted: Number(outgoing[0]?.count ?? 0),
            incoming_rerouted: Number(incoming[0]?.count ?? 0),
            message: `Nó secundário mesclado no principal. ${reason || 'manual_merge'}.`,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Merge]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}

/**
 * GET /api/neo4j/merge/candidates
 * Retorna pares de Person com alta probabilidade de serem o mesmo indivíduo.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100);

    try {
        // Candidatos: conectados por SAME_AS (CPF normalizado identificou)
        const rows = await runQuery<{
            a_id: string; a_name: string; a_cpf: string; a_source: string;
            b_id: string; b_name: string; b_cpf: string; b_source: string;
            confidence: number; reason: string;
        }>(
            `MATCH (a:Person)-[r:SAME_AS]->(b:Person)
             WHERE a.merged_into IS NULL AND b.merged_into IS NULL
             RETURN
               elementId(a) AS a_id, coalesce(a.name, a.nome_original, '') AS a_name,
               coalesce(a.cpf,'') AS a_cpf, coalesce(a.source,'') AS a_source,
               elementId(b) AS b_id, coalesce(b.name, b.nome_original, '') AS b_name,
               coalesce(b.cpf,'') AS b_cpf, coalesce(b.source,'') AS b_source,
               coalesce(r.confidence, 0.9) AS confidence,
               coalesce(r.reason, 'unknown') AS reason
             ORDER BY confidence DESC
             LIMIT $limit`,
            { limit }
        );

        return NextResponse.json({ candidates: rows, total: rows.length });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}

export const POST = withSecurity(handlePost, { requiredRole: 'contributor' });
