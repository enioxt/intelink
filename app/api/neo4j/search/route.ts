import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

function onlyNumbers(s: string) { return s.replace(/\D/g, ''); }

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const limit = neo4j.int(limitParam);

    if (q.length < 2) return NextResponse.json({ results: [], query: q });

    try {
        const digits = onlyNumbers(q);
        let cypher: string;
        let params: Record<string, unknown>;

        if (digits.length >= 11) {
            // CPF search
            const cpfFormatted = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
            cypher = `
                MATCH (p:Person)
                WHERE p.cpf = $cpf OR p.cpf CONTAINS $digits
                OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                RETURN p, collect(o)[0..3] AS occurrences
                LIMIT $limit`;
            params = { cpf: cpfFormatted, digits, limit };
        } else {
            // Name fulltext search (handles both string and list properties)
            cypher = `
                CALL db.index.fulltext.queryNodes('personSearch', $query)
                YIELD node AS p, score
                OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                RETURN p, collect(o)[0..3] AS occurrences, score
                ORDER BY score DESC
                LIMIT $limit`;
            // Escape special chars for Lucene
            const safeQ = q.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
            params = { query: safeQ, limit };
        }

        const rows = await runQuery<{ p: { properties: Record<string, unknown>; elementId: string }; occurrences: Array<{ properties: Record<string, unknown> }> }>(
            cypher, params
        );

        const results = rows.map(row => {
            const props = row.p?.properties ?? {};
            const nameRaw = props.nome_original ?? props.name ?? '';
            const name = Array.isArray(nameRaw) ? (nameRaw as string[])[0] : String(nameRaw);
            return {
                id: String(row.p?.elementId ?? ''),
                name,
                cpf: String(props.cpf ?? ''),
                bairro: String(props.bairro ?? ''),
                cidade: String(props.cidade ?? ''),
                delegacia: String(props.delegacia ?? ''),
                source: props.source,
                occurrence_count: Array.isArray(row.occurrences) ? row.occurrences.length : 0,
                occurrences: (row.occurrences ?? []).map(o => {
                    const op = o?.properties ?? {};
                    return {
                        reds: op.reds_number,
                        type: op.type,
                        data: op.data_fato,
                        bairro: op.bairro,
                    };
                }),
            };
        });

        return NextResponse.json({ results, query: q, total: results.length });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Search]', error);
        return NextResponse.json({ error: msg, results: [] }, { status: 503 });
    }
}
