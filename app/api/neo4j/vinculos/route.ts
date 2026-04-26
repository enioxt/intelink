/**
 * GET /api/neo4j/vinculos
 * Lista relacionamentos do grafo com filtros.
 */
import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo')?.trim() ?? '';
    const personId = searchParams.get('person_id')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    try {
        const params: Record<string, unknown> = { limit: neo4j.int(limitParam), skip: neo4j.int(offset) };

        let cypher: string;
        if (personId) {
            cypher = `MATCH (a)-[r]->(b) WHERE elementId(a) = $pid OR elementId(b) = $pid
                      ${tipo ? 'AND type(r) = $tipo' : ''}
                      RETURN elementId(a) AS a_id, coalesce(a.name, a.nome_original, labels(a)[0]) AS a_name,
                             type(r) AS tipo, properties(r) AS props,
                             elementId(b) AS b_id, coalesce(b.name, b.nome_original, b.placa, b.reds_number, labels(b)[0]) AS b_name,
                             labels(a)[0] AS a_type, labels(b)[0] AS b_type
                      SKIP $skip LIMIT $limit`;
            params.pid = personId;
            if (tipo) params.tipo = tipo;
        } else {
            cypher = `MATCH (a:Person)-[r${tipo ? ':' + tipo : ''}]->(b)
                      ${tipo === 'SAME_AS' ? 'WHERE a.merged_into IS NULL' : ''}
                      RETURN elementId(a) AS a_id, coalesce(a.name, a.nome_original, '') AS a_name,
                             type(r) AS tipo, properties(r) AS props,
                             elementId(b) AS b_id, coalesce(b.name, b.nome_original, b.placa, b.reds_number, '') AS b_name,
                             labels(a)[0] AS a_type, labels(b)[0] AS b_type
                      SKIP $skip LIMIT $limit`;
        }

        const [rows, tiposRows] = await Promise.all([
            runQuery<{
                a_id: string; a_name: string; a_type: string;
                tipo: string; props: Record<string, unknown>;
                b_id: string; b_name: string; b_type: string;
            }>(cypher, params),
            runQuery<{ tipo: string; count: number }>(
                'MATCH ()-[r]->() RETURN type(r) AS tipo, count(r) AS count ORDER BY count DESC LIMIT 15',
                {}
            ),
        ]);

        return NextResponse.json({
            vinculos: rows,
            tipos: tiposRows.map(t => ({ tipo: String(t.tipo), count: Number(t.count) })),
            limit: limitParam,
            offset,
        });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Neo4j error' }, { status: 503 });
    }
}
