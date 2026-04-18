/**
 * REST API: GET /api/intelligence/grupos?tipo=roubo&minWeight=2&limit=10
 *
 * Clustering de grupos criminais por co-ocorrência (WCC Union-Find).
 * Auth: Supabase session cookie OU x-intelink-bot-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';

interface Edge { cpfA: string; nameA: string; cpfB: string; nameB: string; weight: number }

function unionFind(edges: Edge[]) {
    const parent = new Map<string, string>();
    const nameOf = new Map<string, string>();

    function find(x: string): string {
        if (!parent.has(x)) parent.set(x, x);
        if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
        return parent.get(x)!;
    }

    for (const e of edges) {
        nameOf.set(e.cpfA, e.nameA);
        nameOf.set(e.cpfB, e.nameB);
        const ra = find(e.cpfA), rb = find(e.cpfB);
        if (ra !== rb) parent.set(ra, rb);
    }

    const groups = new Map<string, { members: { cpf: string; name: string }[]; totalWeight: number }>();
    for (const [cpf] of nameOf) {
        const root = find(cpf);
        if (!groups.has(root)) groups.set(root, { members: [], totalWeight: 0 });
        groups.get(root)!.members.push({ cpf, name: nameOf.get(cpf)! });
    }
    for (const e of edges) {
        const root = find(e.cpfA);
        if (groups.has(root)) groups.get(root)!.totalWeight += e.weight;
    }

    return [...groups.values()]
        .filter(g => g.members.length >= 2)
        .sort((a, b) => b.totalWeight - a.totalWeight);
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

export async function GET(req: NextRequest) {
    if (!await checkAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo      = searchParams.get('tipo') ?? '';
    const minWeight = parseInt(searchParams.get('minWeight') ?? '2', 10);
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

    const rows = await runQuery(
        `MATCH (a:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(b:Person)
         WHERE a.cpf < b.cpf
           AND ($tipo = '' OR toLower(o.tipo) CONTAINS toLower($tipo))
         WITH a.cpf AS cpfA, a.nome_original AS nameA,
              b.cpf AS cpfB, b.nome_original AS nameB, count(o) AS weight
         WHERE weight >= $minWeight
         RETURN cpfA, nameA, cpfB, nameB, weight
         ORDER BY weight DESC LIMIT 500`,
        { tipo, minWeight }
    );

    const edges: Edge[] = (rows as any[]).map(r => ({
        cpfA: r.get('cpfA'), nameA: r.get('nameA'),
        cpfB: r.get('cpfB'), nameB: r.get('nameB'),
        weight: Number(r.get('weight')),
    }));

    const groups = unionFind(edges).slice(0, limit);

    return NextResponse.json({
        filter: { tipo: tipo || null, minWeight },
        totalEdges: edges.length,
        groups: groups.map((g, i) => ({
            id: i + 1,
            size: g.members.length,
            totalWeight: g.totalWeight,
            members: g.members,
        })),
    });
}
