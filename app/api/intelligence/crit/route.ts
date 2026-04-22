/**
 * REST API: POST /api/intelligence/crit
 *
 * Análise CRIT policial (Capacidade / Recurso / Intenção / Tipo)
 * para integração com sistemas legados de delegacia.
 *
 * Auth: Supabase session cookie OU x-intelink-bot-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';
import { auditLog } from '@/lib/intelink/audit';

const CRIME_WEIGHTS: Record<string, number> = {
    homicidio: 10, homicídio: 10, latrocinio: 10, latrocínio: 10,
    estupro: 9, trafico: 9, tráfico: 9,
    roubo: 8, sequestro: 8,
    extorsao: 7, extorsão: 7,
    furto: 4, estelionato: 4,
    ameaca: 3, ameaça: 3,
    vias_de_fato: 2, lesao: 2, lesão: 2,
};

function crimeWeight(tipo: string): number {
    const t = tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [k, w] of Object.entries(CRIME_WEIGHTS)) {
        if (t.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return w;
    }
    return 3;
}

function toInt(v: unknown): number {
    if (typeof v === 'object' && v !== null && 'low' in v) return (v as { low: number }).low;
    return Number(v ?? 0);
}

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

export async function POST(req: NextRequest) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cpf, name } = await req.json().catch(() => ({}));
    if (!cpf && !name) {
        return NextResponse.json({ error: 'cpf or name required' }, { status: 400 });
    }

    const isCpf = !!cpf;
    const q = cpf ?? name;

    const occRows = await runQuery(
        isCpf
            ? `MATCH (p:Person {cpf: $q})
               OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
               RETURN p.nome_original AS nome, p.cpf AS cpf,
                      o.reds_number AS reds_number, o.data_fato AS data_fato,
                      coalesce(o.type, o.tipo) AS tipo, o.consumado AS consumado
               ORDER BY o.data_fato DESC`
            : `MATCH (p:Person)
               WHERE toLower(p.nome_original) CONTAINS toLower($q)
               OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
               RETURN p.nome_original AS nome, p.cpf AS cpf,
                      o.reds_number AS reds_number, o.data_fato AS data_fato,
                      coalesce(o.type, o.tipo) AS tipo, o.consumado AS consumado
               ORDER BY o.data_fato DESC LIMIT 50`,
        { q }
    );

    if (!occRows.length || !(occRows[0] as any).get('nome')) {
        return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const personCpf = (occRows[0] as any).get('cpf') as string;
    const nome      = String((occRows[0] as any).get('nome') ?? '');
    const occs      = (occRows as any[]).filter(r => r.get('reds_number'));

    const netRows = personCpf
        ? await runQuery(
            `MATCH (p:Person {cpf: $cpf})-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(other:Person)
             WHERE other <> p
             RETURN count(DISTINCT other) AS co_count`,
            { cpf: personCpf }
        )
        : [];

    const coPersons = toInt((netRows[0] as any)?.get?.('co_count') ?? 0);

    const now = Date.now();
    const totalOccs  = occs.length;
    const recentOccs = occs.filter(r => {
        const dt = r.get('data_fato');
        if (!dt) return false;
        return (now - new Date(String(dt)).getTime()) < 365 * 24 * 3600 * 1000;
    }).length;

    const maxGravity = occs.reduce((acc: number, r: any) => Math.max(acc, crimeWeight(String(r.get('tipo') ?? ''))), 0);

    const scoreC = Math.min(10, Math.round(
        (Math.min(totalOccs, 15) / 15) * 4 +
        (Math.min(recentOccs, 5) / 5) * 3 +
        (maxGravity / 10) * 3
    ));

    const scoreR = Math.min(10, Math.round((Math.min(coPersons, 20) / 20) * 10));

    const consumados = occs.filter((r: any) => String(r.get('consumado')) !== 'false').length;
    const consumadoRatio = totalOccs ? consumados / totalOccs : 0;
    const reincidencia   = totalOccs > 1 ? Math.min((totalOccs - 1) / 10, 1) : 0;
    const scoreI = Math.min(10, Math.round(consumadoRatio * 5 + reincidencia * 5));

    const typeCounts = new Map<string, number>();
    for (const r of occs as any[]) {
        const t = String(r.get('tipo') ?? 'DESCONHECIDO');
        typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    }
    const dominantType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DESCONHECIDO';
    const scoreT = crimeWeight(dominantType);

    const avgScore = (scoreC + scoreR + scoreI + scoreT) / 4;
    const riskLabel = avgScore >= 8 ? 'CRÍTICO' : avgScore >= 6 ? 'ALTO' : avgScore >= 4 ? 'MÉDIO' : 'BAIXO';

    // AUDIT-001: log CRIT query
    auditLog({
        action: 'crit_query',
        target_type: 'Person',
        target_id: personCpf ?? String(name ?? cpf ?? ''),
        details: { queried_name: nome, risk: riskLabel, avg: Math.round(avgScore * 100) / 100 },
    }).catch(() => {});

    return NextResponse.json({
        person: { nome, cpf: personCpf },
        scores: { C: scoreC, R: scoreR, I: scoreI, T: scoreT },
        avg: Math.round(avgScore * 100) / 100,
        risk: riskLabel,
        stats: { totalOccs, recentOccs, coPersons, dominantType, consumados },
    });
}
