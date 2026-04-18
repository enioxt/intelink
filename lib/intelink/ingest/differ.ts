/**
 * INGEST-004: Cross-referência com Neo4j e geração de diff.
 * Para cada pessoa extraída: busca no grafo → classifica mudanças como NEW/EXISTING/MERGE/CONFLICT.
 */

import { runQuery } from '@/lib/neo4j/server';
import type { ExtractedPerson } from './extractor';

export type DiffStatus = 'NEW' | 'EXISTING' | 'MERGE' | 'CONFLICT';

export interface FieldDiff {
    field: string;
    current_value: string | null;
    proposed_value: string;
    status: 'new_field' | 'same' | 'changed' | 'conflict';
}

export interface PersonDiff {
    extracted: ExtractedPerson;
    neo4j_match: Record<string, unknown> | null;
    neo4j_id: string | null;
    overall_status: DiffStatus;
    field_diffs: FieldDiff[];
}

const PERSON_FIELDS: Array<keyof ExtractedPerson & string> = [
    'nome', 'cpf', 'rg', 'data_nascimento', 'nome_mae', 'nome_pai',
    'sexo', 'endereco', 'bairro', 'cidade', 'estado', 'telefone',
];

const NEO4J_FIELD_MAP: Record<string, string> = {
    nome: 'nome_original',
    data_nascimento: 'data_nascimento',
    nome_mae: 'nome_mae',
    nome_pai: 'nome_pai',
    sexo: 'sexo',
    bairro: 'bairro',
    cidade: 'cidade',
    rg: 'rg',
    cpf: 'cpf',
    endereco: 'endereco',
    telefone: 'telefone',
};

export async function diffAgainstNeo4j(persons: ExtractedPerson[]): Promise<PersonDiff[]> {
    const results: PersonDiff[] = [];

    for (const person of persons) {
        let neo4jRecord: Record<string, unknown> | null = null;
        let neo4jId: string | null = null;

        // Try CPF match first (most reliable)
        if (person.cpf) {
            type Row = { p: { properties: Record<string, unknown>; elementId: string } };
            const rows = await runQuery<Row>(
                'MATCH (p:Person) WHERE p.cpf = $cpf RETURN p LIMIT 1',
                { cpf: person.cpf }
            ).catch(() => []);

            if (rows.length) {
                neo4jRecord = rows[0].p.properties;
                neo4jId = rows[0].p.elementId;
            }
        }

        // Fall back to name search if no CPF match
        if (!neo4jRecord && person.nome) {
            type Row = { p: { properties: Record<string, unknown>; elementId: string }; score: number };
            const rows = await runQuery<Row>(
                `CALL db.index.fulltext.queryNodes('personSearch', $q) YIELD node AS p, score
                 RETURN p, score LIMIT 1`,
                { q: person.nome }
            ).catch(() => []);

            if (rows.length && rows[0].score > 1.0) {
                neo4jRecord = rows[0].p.properties;
                neo4jId = rows[0].p.elementId;
            }
        }

        const fieldDiffs: FieldDiff[] = [];
        let hasNew = false;
        let hasConflict = false;

        for (const field of PERSON_FIELDS) {
            const proposed = person[field as keyof ExtractedPerson];
            if (!proposed) continue;

            const neo4jField = NEO4J_FIELD_MAP[field] ?? field;
            const current = neo4jRecord ? String(neo4jRecord[neo4jField] ?? '') : null;
            const proposedStr = String(proposed);

            let status: FieldDiff['status'];
            if (!neo4jRecord || !current) {
                status = 'new_field';
                hasNew = true;
            } else if (current.toLowerCase() === proposedStr.toLowerCase()) {
                status = 'same';
            } else if (!current) {
                status = 'new_field';
                hasNew = true;
            } else {
                status = 'conflict';
                hasConflict = true;
            }

            if (status !== 'same') {
                fieldDiffs.push({ field, current_value: current, proposed_value: proposedStr, status });
            }
        }

        let overallStatus: DiffStatus;
        if (!neo4jRecord) {
            overallStatus = 'NEW';
        } else if (hasConflict) {
            overallStatus = 'CONFLICT';
        } else if (hasNew) {
            overallStatus = 'MERGE';
        } else {
            overallStatus = 'EXISTING';
        }

        results.push({
            extracted: person,
            neo4j_match: neo4jRecord,
            neo4j_id: neo4jId,
            overall_status: overallStatus,
            field_diffs: fieldDiffs,
        });
    }

    return results;
}
