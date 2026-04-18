import { NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const rows = await runQuery<{ label: string; count: number }>(
            `MATCH (n)
             WHERE NOT n:_SchemaMeta
             RETURN labels(n)[0] AS label, count(n) AS count
             ORDER BY count DESC`
        );

        const stats: Record<string, number> = {};
        let total = 0;
        for (const row of rows) {
            if (row.label) {
                // neo4j integers come as Neo4j Integer objects
                const count = typeof row.count === 'object'
                    ? (row.count as { toNumber?: () => number }).toNumber?.() ?? Number(row.count)
                    : Number(row.count);
                stats[row.label] = count;
                total += count;
            }
        }

        const [relRow] = await runQuery<{ count: number }>(
            'MATCH ()-[r]->() RETURN count(r) AS count'
        );
        const relationships = typeof relRow?.count === 'object'
            ? (relRow.count as { toNumber?: () => number }).toNumber?.() ?? 0
            : Number(relRow?.count ?? 0);

        return NextResponse.json({
            nodes: stats,
            total_nodes: total,
            total_relationships: relationships,
            persons: stats['Person'] ?? 0,
            occurrences: stats['Occurrence'] ?? 0,
            vehicles: stats['Vehicle'] ?? 0,
            documents: stats['Document'] ?? 0,
            locations: stats['Location'] ?? 0,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Neo4j connection error';
        console.error('[Neo4j Stats]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}
