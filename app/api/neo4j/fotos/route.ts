/**
 * GET /api/neo4j/fotos
 * Lista fotos do grafo com filtros (vinculada, fonte, pessoa).
 */

import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source')?.trim() ?? '';
    const linked = searchParams.get('linked'); // '1' | '0' | null
    const personId = searchParams.get('person_id')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '60'), 300);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    try {
        const conditions: string[] = [];
        const params: Record<string, unknown> = {
            limit: neo4j.int(limitParam),
            skip: neo4j.int(offset),
        };

        if (source) { conditions.push('ph.source = $source'); params.source = source; }
        if (personId) { conditions.push('elementId(person) = $pid'); params.pid = personId; }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        let cypher: string;

        if (linked === '0') {
            // Orphan photos only
            cypher = `
                MATCH (ph:Photo) ${where}
                WHERE NOT (ph)-[:PHOTO_OF]->()
                RETURN ph, null AS person
                ORDER BY ph.telegram_id DESC
                SKIP $skip LIMIT $limit`;
        } else if (linked === '1' || personId) {
            cypher = `
                MATCH (ph:Photo)-[:PHOTO_OF]->(person:Person) ${where}
                RETURN ph, person
                ORDER BY ph.telegram_id DESC
                SKIP $skip LIMIT $limit`;
        } else {
            cypher = `
                MATCH (ph:Photo) ${where}
                OPTIONAL MATCH (ph)-[:PHOTO_OF]->(person:Person)
                RETURN ph, person
                ORDER BY ph.telegram_id DESC
                SKIP $skip LIMIT $limit`;
        }

        const [rows, countRow] = await Promise.all([
            runQuery<{
                ph: { properties: Record<string, unknown>; elementId: string };
                person: { properties: Record<string, unknown>; elementId: string } | null;
            }>(cypher, params),
            runQuery<{ total: number }>(
                linked === '0'
                    ? `MATCH (ph:Photo) WHERE NOT (ph)-[:PHOTO_OF]->() RETURN count(ph) AS total`
                    : `MATCH (ph:Photo) RETURN count(ph) AS total`,
                {}
            ),
        ]);

        const fotos = rows.map(row => {
            const pp = row.ph?.properties ?? {};
            const personProps = row.person?.properties ?? null;
            const personName = personProps
                ? Array.isArray(personProps.nome_original ?? personProps.name)
                    ? ((personProps.nome_original ?? personProps.name) as string[])[0]
                    : String(personProps.nome_original ?? personProps.name ?? '')
                : null;

            return {
                id: row.ph?.elementId ?? '',
                filename: pp.filename ? String(pp.filename) : null,
                caption: pp.caption ? String(pp.caption) : null,
                source: pp.source ? String(pp.source) : null,
                source_doc: pp.source_doc ? String(pp.source_doc) : null,
                telegram_id: pp.telegram_id != null ? Number(pp.telegram_id) : null,
                linked: row.person != null,
                person_id: row.person?.elementId ?? null,
                person_name: personName,
            };
        });

        return NextResponse.json({
            fotos,
            total: Number(countRow[0]?.total ?? 0),
            limit: limitParam,
            offset,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Fotos]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}
