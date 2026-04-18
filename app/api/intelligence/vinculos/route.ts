/**
 * REST API: POST /api/intelligence/vinculos
 *
 * Predição de vínculos criminais via Adamic-Adar (2º grau).
 * Auth: Supabase session cookie OU x-intelink-bot-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';

const QUERY = `
MATCH (target:Person)
WHERE target.cpf = $cpf OR toLower(target.nome_original) CONTAINS toLower($name)
WITH target LIMIT 1

MATCH (target)-[:ENVOLVIDO_EM]->(o1:Occurrence)<-[:ENVOLVIDO_EM]-(direct:Person)
WHERE direct.cpf <> target.cpf

MATCH (direct)-[:ENVOLVIDO_EM]->(o2:Occurrence)<-[:ENVOLVIDO_EM]-(candidate:Person)
WHERE candidate.cpf <> target.cpf
  AND NOT (target)-[:ENVOLVIDO_EM]->(:Occurrence)<-[:ENVOLVIDO_EM]-(candidate)
  AND candidate.cpf <> direct.cpf

MATCH (o2)<-[:ENVOLVIDO_EM]-(nv:Person)
WITH target, candidate, o2, count(nv) AS occDegree, collect(direct.nome_original)[0] AS via

WITH target, candidate,
     collect(DISTINCT via)[0..3] AS vias,
     sum(1.0 / log(occDegree + 1)) AS score
WHERE score > 0

RETURN
    target.nome_original AS targetName,
    target.cpf AS targetCpf,
    candidate.cpf AS cpf,
    candidate.nome_original AS name,
    round(score * 100) / 100 AS score,
    vias
ORDER BY score DESC
LIMIT 10
`;

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

    const { cpf, name, limit = 10 } = await req.json().catch(() => ({}));
    if (!cpf && !name) {
        return NextResponse.json({ error: 'cpf or name required' }, { status: 400 });
    }

    const rows = await runQuery(QUERY, { cpf: cpf ?? '', name: name ?? '' });

    return NextResponse.json({
        query: { cpf, name },
        method: 'adamic-adar',
        results: (rows as any[]).slice(0, limit).map(r => ({
            targetName: r.get('targetName'),
            targetCpf: r.get('targetCpf'),
            cpf: r.get('cpf'),
            name: r.get('name'),
            score: r.get('score'),
            via: r.get('vias'),
        })),
    });
}
