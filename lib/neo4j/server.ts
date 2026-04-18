import neo4j, { Driver } from 'neo4j-driver';

// Aponta para Neo4j REDS (dados policiais isolados).
// Para dados públicos use lib/neo4j/router.ts runPublicQuery.
let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
    if (!driver) {
        const uri = process.env.NEO4J_REDS_URI || process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_REDS_USER || process.env.NEO4J_USER || 'neo4j';
        const password = process.env.NEO4J_REDS_PASSWORD || process.env.NEO4J_PASSWORD || '';
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }
    return driver;
}

export async function runQuery<T = Record<string, unknown>>(
    cypher: string,
    params: Record<string, unknown> = {}
): Promise<T[]> {
    const d = getNeo4jDriver();
    const session = d.session();
    try {
        const result = await session.run(cypher, params);
        return result.records.map(r => r.toObject() as T);
    } finally {
        await session.close();
    }
}
