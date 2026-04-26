/**
 * GET /api/neo4j/veiculos
 * Lista veículos do grafo com filtros e paginação.
 */
import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0);

    try {
        const conds: string[] = [];
        const params: Record<string, unknown> = { limit: neo4j.int(limitParam), skip: neo4j.int(offset) };

        if (q) {
            conds.push('(toUpper(v.plate) CONTAINS toUpper($q) OR toLower(v.model) CONTAINS toLower($q) OR toLower(v.make) CONTAINS toLower($q))');
            params.q = q;
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

        const [rows, cnt] = await Promise.all([
            runQuery<{ v: { properties: Record<string, unknown>; elementId: string }; envolvidos: number }>(
                `MATCH (v:Vehicle) ${where}
                 OPTIONAL MATCH (:Person)-[:USES_VEHICLE|OWNS|ENVOLVIDO_EM]->(v)
                 RETURN v, count(*) AS envolvidos
                 ORDER BY v.plate
                 SKIP $skip LIMIT $limit`,
                params
            ),
            runQuery<{ total: number }>(
                `MATCH (v:Vehicle) ${where} RETURN count(v) AS total`,
                params
            ),
        ]);

        const veiculos = rows.map(r => {
            const p = r.v?.properties ?? {};
            return {
                id: r.v?.elementId ?? '',
                placa: p.plate ? String(p.plate) : (p.placa ? String(p.placa) : null),
                marca: p.make ? String(p.make) : (p.marca ? String(p.marca) : null),
                modelo: p.model ? String(p.model) : (p.modelo ? String(p.modelo) : null),
                cor: p.color ? String(p.color) : (p.cor ? String(p.cor) : null),
                ano: p.year ? String(p.year) : (p.ano ? String(p.ano) : null),
                chassi: p.vin ? String(p.vin) : (p.chassi ? String(p.chassi) : null),
                source: p.source ? String(p.source) : null,
                envolvidos: Number(r.envolvidos ?? 0),
            };
        });

        return NextResponse.json({ veiculos, total: Number(cnt[0]?.total ?? 0), limit: limitParam, offset });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Neo4j error' }, { status: 503 });
    }
}
