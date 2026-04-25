import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim() ?? '';
    const cpf = searchParams.get('cpf')?.trim().replace(/\D/g, '') ?? '';

    if (!id && !cpf) return NextResponse.json({ error: 'id or cpf required' }, { status: 400 });

    try {
        // Fetch person by elementId (local DHPP) or CPF (cross-ref from br-acc search results)
        const personRows = await runQuery<{ p: { properties: Record<string, unknown>; elementId: string; labels: string[] } }>(
            id
                ? `MATCH (p:Person) WHERE elementId(p) = $id RETURN p LIMIT 1`
                : `MATCH (p:Person) WHERE p.cpf = $cpf RETURN p LIMIT 1`,
            id ? { id } : { cpf }
        );

        if (!personRows.length) {
            return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 });
        }

        // Use actual elementId for subsequent queries
        const resolvedId = personRows[0].p?.elementId ?? '';
        const props = personRows[0].p?.properties ?? {};
        const nameRaw = props.nome_original ?? props.name ?? '';
        const nameFull = Array.isArray(nameRaw) ? (nameRaw as string[])[0] : String(nameRaw);
        // Strip padding dashes/underscores some sources insert
        const name = nameFull.replace(/^[-_\s]+|[-_\s]+$/g, '').trim() || nameFull;

        // Fetch all linked occurrences
        const occRows = await runQuery<{
            o: { properties: Record<string, unknown>; elementId: string };
            rel_type: string;
        }>(
            `MATCH (p:Person)-[r]->(o:Occurrence) WHERE elementId(p) = $id
             RETURN o, type(r) AS rel_type
             ORDER BY o.data_fato DESC
             LIMIT $limit`,
            { id: resolvedId, limit: neo4j.int(100) }
        );

        // Fetch co-involved persons (same occurrences)
        const coRows = await runQuery<{
            co: { properties: Record<string, unknown>; elementId: string };
            shared: number;
        }>(
            `MATCH (p:Person)-[:ENVOLVIDO_EM|VICTIM_IN]->(o:Occurrence)<-[:ENVOLVIDO_EM|VICTIM_IN]-(co:Person)
             WHERE elementId(p) = $id AND elementId(co) <> $id
             WITH co, count(o) AS shared
             ORDER BY shared DESC
             RETURN co, shared
             LIMIT $limit`,
            { id: resolvedId, limit: neo4j.int(10) }
        );

        const occurrences = occRows.map(row => {
            const op = row.o?.properties ?? {};
            return {
                id: String(row.o?.elementId ?? ''),
                reds_number: op.reds_number ?? op.numero_reds ?? null,
                type: op.type ?? op.tipo ?? null,
                data_fato: op.data_fato ?? null,
                bairro: op.bairro ?? null,
                cidade: op.cidade ?? null,
                delegacia: op.delegacia ?? null,
                descricao: op.descricao ?? null,
                rel_type: row.rel_type,
            };
        });

        const coInvolved = coRows.map(row => {
            const cp = (row.co?.properties ?? {}) as Record<string, unknown>;
            const coName = Array.isArray(cp.nome_original ?? cp.name)
                ? ((cp.nome_original ?? cp.name) as string[])[0]
                : String(cp.nome_original ?? cp.name ?? '');
            return {
                id: String(row.co?.elementId ?? ''),
                name: coName,
                cpf: String(cp.cpf ?? ''),
                shared_occurrences: Number(row.shared),
            };
        });

        return NextResponse.json({
            person: {
                id: resolvedId,
                name,
                cpf: String(props.cpf ?? ''),
                rg: String(props.rg ?? ''),
                bairro: String(props.bairro ?? ''),
                cidade: String(props.cidade ?? ''),
                delegacia: String(props.delegacia ?? ''),
                source: props.source,
                telefone: props.telefone ?? props.phone ?? null,
                labels: personRows[0].p?.labels ?? [],
            },
            occurrences,
            co_involved: coInvolved,
            stats: {
                total_occurrences: occurrences.length,
                as_suspect: occurrences.filter(o => o.rel_type === 'ENVOLVIDO_EM').length,
                as_victim: occurrences.filter(o => o.rel_type === 'VICTIM_IN').length,
                co_involved_count: coInvolved.length,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Pessoa]', error);
        return NextResponse.json({ error: msg }, { status: 503 });
    }
}
