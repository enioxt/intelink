/**
 * REST API: GET /api/intelligence/mapa?days=30&tipo=
 *
 * Distribuição de ocorrências por município + tipo de crime.
 * Usado pelo painel /inteligencia/mapa.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';

async function checkAuth(req: NextRequest): Promise<boolean> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && req.headers.get('x-intelink-bot-token') === botToken) return true;
    try {
        const anon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { cookie: req.headers.get('cookie') || '' } } }
        );
        const { data: { user } } = await anon.auth.getUser();
        return !!user;
    } catch { return false; }
}

export async function GET(req: NextRequest) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') ?? '30', 10);
    const tipo = searchParams.get('tipo') ?? '';

    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
        .toISOString().slice(0, 10);

    const [municipioRows, tipoRows, timelineRows] = await Promise.all([
        // Occurrences per município
        runQuery(`
            MATCH (o:Occurrence)
            WHERE o.data_fato >= $since
              AND ($tipo = '' OR toLower(coalesce(o.type, o.tipo, '')) CONTAINS toLower($tipo))
            WITH o.municipio AS municipio, count(o) AS n
            WHERE municipio IS NOT NULL AND municipio <> ''
            RETURN municipio, n ORDER BY n DESC LIMIT 20
        `, { since, tipo }),

        // Occurrences per tipo de crime
        runQuery(`
            MATCH (o:Occurrence)
            WHERE o.data_fato >= $since
              AND ($tipo = '' OR toLower(coalesce(o.type, o.tipo, '')) CONTAINS toLower($tipo))
            WITH coalesce(o.type, o.tipo, 'DESCONHECIDO') AS tipo, count(o) AS n
            RETURN tipo, n ORDER BY n DESC LIMIT 10
        `, { since, tipo }),

        // Timeline: occurrences per month
        runQuery(`
            MATCH (o:Occurrence)
            WHERE o.data_fato >= $since
              AND ($tipo = '' OR toLower(coalesce(o.type, o.tipo, '')) CONTAINS toLower($tipo))
            WITH o.data_fato AS d, count(o) AS n
            WHERE d IS NOT NULL
            RETURN substring(d, 0, 7) AS mes, sum(n) AS n
            ORDER BY mes ASC
        `, { since, tipo }),
    ]);

    return NextResponse.json({
        period: { since, days },
        municipios: (municipioRows as any[]).map(r => ({
            name: r.get('municipio'),
            count: Number(r.get('n')),
        })),
        tipos: (tipoRows as any[]).map(r => ({
            name: r.get('tipo'),
            count: Number(r.get('n')),
        })),
        timeline: (timelineRows as any[]).map(r => ({
            mes: r.get('mes'),
            count: Number(r.get('n')),
        })),
    });
}
