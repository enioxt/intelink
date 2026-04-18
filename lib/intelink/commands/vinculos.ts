/**
 * ML-001: /vinculos <cpf|nome> — Predição de vínculos criminais
 *
 * Sem Neo4j GDS: usa heurística Adamic-Adar sobre ocorrências compartilhadas.
 * Identifica pessoas com alta probabilidade de ligação não documentada:
 * - Co-envolvidos dos co-envolvidos (2º grau)
 * - Score ponderado por raridade dos elos (ocorrências com poucos envolvidos = elo mais forte)
 */

import { Command, CommandContext, CommandDependencies } from './types';
import { runQuery } from '@/lib/neo4j/server';

function scorebar(score: number, max = 10): string {
    const filled = Math.min(8, Math.round((score / max) * 8));
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

// Adamic-Adar via Cypher: peso = Σ 1/log(|vizinhos(ocorrência)|) para cada ocorrência partilhada
const QUERY_ADAMIC_ADAR = `
MATCH (target:Person)
WHERE target.cpf = $cpf OR toLower(target.name) CONTAINS toLower($name)
WITH target LIMIT 1

MATCH (target)-[:ENVOLVIDO_EM]->(o1:Occurrence)<-[:ENVOLVIDO_EM]-(direct:Person)
WHERE direct.cpf <> target.cpf

MATCH (direct)-[:ENVOLVIDO_EM]->(o2:Occurrence)<-[:ENVOLVIDO_EM]-(candidate:Person)
WHERE candidate.cpf <> target.cpf
  AND NOT (target)-[:ENVOLVIDO_EM]->(:Occurrence)<-[:ENVOLVIDO_EM]-(candidate)
  AND candidate.cpf <> direct.cpf

MATCH (o2)<-[:ENVOLVIDO_EM]-(nv:Person)
WITH target, candidate, o2, count(nv) AS occDegree,
     collect(direct.name)[0] AS via

WITH target, candidate, collect(DISTINCT via)[0..3] AS vias,
     sum(1.0 / log(occDegree + 1)) AS adamicAdar
WHERE adamicAdar > 0

RETURN
    target.name AS targetName,
    candidate.cpf AS cpf,
    candidate.name AS name,
    round(adamicAdar * 100) / 100 AS score,
    vias
ORDER BY score DESC
LIMIT 8
`;

const QUERY_FIND_CPF = `
MATCH (p:Person)
WHERE p.cpf = $cpf OR toLower(p.name) CONTAINS toLower($name)
RETURN p.cpf AS cpf, p.name AS name LIMIT 1
`;

export const vinculosCommand: Command = {
    name: 'vinculos',
    aliases: ['links', 'rede2'],
    description: 'Predição de vínculos criminais (2º grau) para um CPF ou nome',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        const query = args.trim();
        if (!query) {
            await sendMessage(chatId, `⚠️ Uso: /vinculos <cpf ou nome>\nEx: /vinculos 12345678900`);
            return;
        }

        const isDigits = /^\d{8,11}$/.test(query.replace(/\D/g, ''));
        const cpf  = isDigits ? query.replace(/\D/g, '') : '';
        const name = isDigits ? '' : query;

        await sendMessage(chatId, `🔍 Calculando vínculos para *${query}*...`);

        try {
            const found = await runQuery(QUERY_FIND_CPF, { cpf, name });
            if (!found.length) {
                await sendMessage(chatId, `⚠️ Nenhuma pessoa encontrada para *${query}*`);
                return;
            }
            const targetName = (found[0] as any).get('name') as string;
            const targetCpf  = (found[0] as any).get('cpf') as string;

            const rows = await runQuery(QUERY_ADAMIC_ADAR, { cpf: targetCpf, name });

            if (!rows.length) {
                await sendMessage(chatId,
                    `⚠️ Sem vínculos de 2º grau para *${targetName}*.\n` +
                    `_(rede pode ser muito pequena ou isolada)_`
                );
                return;
            }

            const maxScore = ((rows[0] as any).get('score') as number) || 1;

            const lines = rows.map((r: any, i: number) => {
                const cname = r.get('name') as string;
                const ccpf  = r.get('cpf') as string;
                const score = r.get('score') as number;
                const vias  = r.get('vias') as string[];
                const bar   = scorebar(score, maxScore);
                const via   = vias?.slice(0, 2).join(', ') || '?';
                return `${i + 1}. *${cname}*\n` +
                       `   CPF: \`${ccpf}\` | Score: ${score}\n` +
                       `   ${bar}\n` +
                       `   Via: _${via}_`;
            });

            await sendMessage(chatId,
                `🔗 *Vínculos previstos — ${targetName}*\n` +
                `CPF: \`${targetCpf}\`\n` +
                `Método: Adamic-Adar (elos de 2º grau)\n\n` +
                lines.join('\n\n') +
                `\n\n_Score alto = elo via parceiros em comum em ocorrências raramente partilhadas_\n` +
                `Use /buscar para ver perfil de cada candidato.`
            );
        } catch (err) {
            console.error('[vinculos]', err);
            await sendMessage(chatId, `❌ Erro ao calcular vínculos.`);
        }
    },
};
