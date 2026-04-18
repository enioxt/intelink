/**
 * Neo4j Router — dual driver
 * DATA-003f: intelinkDriver (REDS policial) + braccDriver (público 83.7M nós)
 *
 * Uso:
 *   runRedsQuery(cypher, params)  — dados policiais (intelink-neo4j)
 *   runPublicQuery(cypher, params) — dados públicos (bracc-neo4j)
 *   enrichPerson(cpf)             — busca nos dois, merge em memória
 */

import neo4j, { Driver } from 'neo4j-driver';

let redsDriver: Driver | null = null;
let braccDriver: Driver | null = null;

function getRedsDriver(): Driver {
    if (!redsDriver) {
        const uri  = process.env.NEO4J_REDS_URI  || process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_REDS_USER || process.env.NEO4J_USER || 'neo4j';
        const pass = process.env.NEO4J_REDS_PASSWORD || process.env.NEO4J_PASSWORD || '';
        redsDriver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
    }
    return redsDriver;
}

function getBraccDriver(): Driver {
    if (!braccDriver) {
        const uri  = process.env.NEO4J_URI  || 'bolt://bracc-neo4j:7687';
        const user = process.env.NEO4J_USER || 'neo4j';
        const pass = process.env.NEO4J_PASSWORD || '';
        braccDriver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
    }
    return braccDriver;
}

async function runWith<T>(driver: Driver, cypher: string, params: Record<string, unknown> = {}): Promise<T[]> {
    const session = driver.session();
    try {
        const result = await session.run(cypher, params);
        return result.records.map(r => r.toObject() as T);
    } finally {
        await session.close();
    }
}

export function runRedsQuery<T = Record<string, unknown>>(
    cypher: string, params: Record<string, unknown> = {}
): Promise<T[]> {
    return runWith<T>(getRedsDriver(), cypher, params);
}

export function runPublicQuery<T = Record<string, unknown>>(
    cypher: string, params: Record<string, unknown> = {}
): Promise<T[]> {
    return runWith<T>(getBraccDriver(), cypher, params);
}

/** Busca Person nos 2 DBs por CPF e combina os dados */
export async function enrichPerson(cpf: string): Promise<{
    reds: Record<string, unknown> | null;
    public: Record<string, unknown> | null;
}> {
    const cleanCpf = cpf.replace(/\D/g, '');

    type PersonRow = { p: { properties: Record<string, unknown> } };

    const [redsRows, publicRows] = await Promise.all([
        runRedsQuery<PersonRow>(
            'MATCH (p:Person) WHERE p.cpf = $cpf RETURN p LIMIT 1',
            { cpf: cleanCpf }
        ).catch(() => [] as PersonRow[]),
        runPublicQuery<PersonRow>(
            'MATCH (p:Person) WHERE p.cpf = $cpf RETURN p LIMIT 1',
            { cpf: cleanCpf }
        ).catch(() => [] as PersonRow[]),
    ]);

    return {
        reds:   redsRows[0]?.p?.properties   ?? null,
        public: publicRows[0]?.p?.properties ?? null,
    };
}
