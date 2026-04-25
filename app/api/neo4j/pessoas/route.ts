/**
 * GET /api/neo4j/pessoas
 * Lista paginada de pessoas do grafo Neo4j com filtros.
 */

import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const hasCpf = searchParams.get('has_cpf') === '1';
    const hasPhoto = searchParams.get('has_photo') === '1';
    const source = searchParams.get('source') ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    try {
        // Build WHERE clause dynamically
        const conditions: string[] = [];
        const params: Record<string, unknown> = {
            limit: neo4j.int(limitParam),
            skip: neo4j.int(offset),
        };

        if (q) {
            conditions.push('(toLower(p.name) CONTAINS toLower($q) OR toLower(p.nome_original) CONTAINS toLower($q) OR p.cpf CONTAINS $q OR p.rg CONTAINS $q)');
            params.q = q;
        }
        if (hasCpf) conditions.push('p.cpf IS NOT NULL AND p.cpf <> ""');
        if (source) { conditions.push('p.source = $source'); params.source = source; }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // For has_photo, use a separate query path
        const baseCypher = hasPhoto
            ? `MATCH (ph:Photo)-[:PHOTO_OF]->(p:Person) ${where} WITH DISTINCT p`
            : `MATCH (p:Person) ${where}`;

        const [rows, countRows] = await Promise.all([
            runQuery<{ p: { properties: Record<string, unknown>; elementId: string } }>(
                `${baseCypher}
                 OPTIONAL MATCH (p)-[:PHOTO_OF]-(:Photo)
                 OPTIONAL MATCH (p)-[:ENVOLVIDO_EM|VICTIM_IN]->(:Occurrence)
                 WITH p, count(DISTINCT _) as vinculos
                 RETURN p
                 ORDER BY p.name
                 SKIP $skip LIMIT $limit`,
                params
            ),
            runQuery<{ total: number }>(
                `${baseCypher} RETURN count(p) AS total`,
                params
            ),
        ]);

        const pessoas = rows.map(row => {
            const props = row.p?.properties ?? {};
            const name = Array.isArray(props.nome_original ?? props.name)
                ? ((props.nome_original ?? props.name) as string[])[0]
                : String(props.nome_original ?? props.name ?? '');
            return {
                id: row.p?.elementId ?? '',
                name,
                cpf: props.cpf ? String(props.cpf) : null,
                rg: props.rg ? String(props.rg) : null,
                mae: props.nome_mae ? String(props.nome_mae) : null,
                bairro: props.bairro ? String(props.bairro) : null,
                municipio: props.municipio ? String(props.municipio) : null,
                source: props.source ? String(props.source) : null,
                data_nascimento: props.data_nascimento ? String(props.data_nascimento) : null,
                sexo: props.sexo ? String(props.sexo) : null,
            };
        });

        const total = Number(countRows[0]?.total ?? 0);

        return NextResponse.json({ pessoas, total, limit: limitParam, offset });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Pessoas]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}
