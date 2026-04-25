/**
 * GET /api/neo4j/ocorrencias
 * Lista de ocorrências REDS com filtros e paginação.
 */

import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const tipo = searchParams.get('tipo')?.trim() ?? '';
    const municipio = searchParams.get('municipio')?.trim() ?? '';
    const anoMin = searchParams.get('ano_min')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    try {
        const conditions: string[] = [];
        const params: Record<string, unknown> = {
            limit: neo4j.int(limitParam),
            skip: neo4j.int(offset),
        };

        if (q) {
            conditions.push('(o.reds_number CONTAINS $q OR toLower(o.bairro) CONTAINS toLower($q) OR toLower(o.municipio) CONTAINS toLower($q))');
            params.q = q;
        }
        if (tipo) { conditions.push('o.type = $tipo'); params.tipo = tipo; }
        if (municipio) { conditions.push('toLower(o.municipio) CONTAINS toLower($mun)'); params.mun = municipio; }
        if (anoMin) { conditions.push('o.data_fato >= $anoMin'); params.anoMin = anoMin; }

        const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [rows, countRows, tiposRows] = await Promise.all([
            runQuery<{
                o: { properties: Record<string, unknown>; elementId: string };
                envolvidos: number;
                vitimas: number;
            }>(
                `MATCH (o:Occurrence) ${where}
                 OPTIONAL MATCH (p:Person)-[:ENVOLVIDO_EM]->(o)
                 OPTIONAL MATCH (v:Person)-[:VICTIM_IN]->(o)
                 WITH o, count(DISTINCT p) AS envolvidos, count(DISTINCT v) AS vitimas
                 RETURN o, envolvidos, vitimas
                 ORDER BY o.data_fato DESC
                 SKIP $skip LIMIT $limit`,
                params
            ),
            runQuery<{ total: number }>(
                `MATCH (o:Occurrence) ${where} RETURN count(o) AS total`,
                params
            ),
            runQuery<{ tipo: string; count: number }>(
                `MATCH (o:Occurrence) WHERE o.type IS NOT NULL
                 RETURN o.type AS tipo, count(o) AS count
                 ORDER BY count DESC LIMIT 20`,
                {}
            ),
        ]);

        const ocorrencias = rows.map(row => {
            const op = row.o?.properties ?? {};
            return {
                id: row.o?.elementId ?? '',
                reds_number: op.reds_number ? String(op.reds_number) : null,
                tipo: op.type ? String(op.type) : null,
                data_fato: op.data_fato ? String(op.data_fato) : null,
                municipio: op.municipio ? String(op.municipio) : null,
                bairro: op.bairro ? String(op.bairro) : null,
                logradouro: op.logradouro ? String(op.logradouro) : null,
                consumado: op.consumado ? String(op.consumado) : null,
                modo_acao: op.modo_acao ? String(op.modo_acao) : null,
                latitude: op.latitude ? Number(op.latitude) : null,
                longitude: op.longitude ? Number(op.longitude) : null,
                envolvidos: Number(row.envolvidos ?? 0),
                vitimas: Number(row.vitimas ?? 0),
            };
        });

        const tipos = tiposRows.map(r => ({ tipo: String(r.tipo), count: Number(r.count) }));

        return NextResponse.json({
            ocorrencias,
            total: Number(countRows[0]?.total ?? 0),
            tipos,
            limit: limitParam,
            offset,
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Ocorrências]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}
