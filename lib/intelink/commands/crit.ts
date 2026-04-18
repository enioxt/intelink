/**
 * FEAT-005: /crit <cpf|nome> — Análise CRIT (Capacidade, Recurso, Intenção, Tipo)
 *
 * Framework de inteligência policial para avaliação de ameaça:
 * C — Capacidade operacional (histórico de ocorrências, gravidade, recência)
 * R — Recurso relacional (rede de co-envolvidos, tamanho do grupo)
 * I — Intenção (padrão de reincidência, consumados vs tentativas)
 * T — Tipo criminológico (classificação dominante por natureza dos crimes)
 *
 * Score: 0–10 por dimensão → risco geral BAIXO/MÉDIO/ALTO/CRÍTICO
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { dispatchAlert } from './alerta';
import { runQuery } from '@/lib/neo4j/server';
import neo4j from 'neo4j-driver';

function toInt(v: unknown): number {
    if (typeof v === 'object' && v !== null && 'low' in v) return (v as { low: number }).low;
    return Number(v ?? 0);
}

function fmt(d: unknown): string {
    if (!d) return '?';
    try { return new Date(String(d)).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

// Crime types → threat weight (higher = more dangerous)
const CRIME_WEIGHTS: Record<string, number> = {
    homicidio: 10, homicídio: 10,
    latrocinio: 10, latrocínio: 10,
    estupro: 9,
    trafico: 9, tráfico: 9,
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
    return 3; // unknown = medium-low
}

function scoreBar(score: number, max = 10): string {
    const filled = Math.round(score / max * 8);
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

function riskLabel(avg: number): { label: string; emoji: string } {
    if (avg >= 8) return { label: 'CRÍTICO', emoji: '🔴' };
    if (avg >= 6) return { label: 'ALTO',    emoji: '🟠' };
    if (avg >= 4) return { label: 'MÉDIO',   emoji: '🟡' };
    return              { label: 'BAIXO',    emoji: '🟢' };
}

export const critCommand: Command = {
    name: 'crit',
    aliases: ['analise-crit', 'threat', 'risco'],
    description: 'Análise CRIT — Capacidade/Recurso/Intenção/Tipo para um CPF ou nome',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId, args } = ctx;

        const query = args?.trim();
        if (!query) {
            await sendMessage(chatId,
                `🔍 *ANÁLISE CRIT*\n${VISUAL.separator}\n\n` +
                `Uso: \`/crit [cpf ou nome]\`\n\n` +
                `Avalia:\n` +
                `*C* — Capacidade (histórico, gravidade)\n` +
                `*R* — Recurso (rede de contatos)\n` +
                `*I* — Intenção (reincidência, padrão)\n` +
                `*T* — Tipo (natureza dominante)\n\n` +
                `Exemplo: \`/crit 12345678900\``
            );
            return;
        }

        await sendMessage(chatId, `🔍 Calculando CRIT para *${query}*…`);

        const isCpf = /^\d{10,11}$/.test(query.replace(/\D/g, ''));
        const cleanQ = isCpf ? query.replace(/\D/g, '') : query;

        try {
            // 1. Fetch person + occurrences
            type OccRow = {
                nome: unknown; cpf: unknown;
                reds_number: unknown; data_fato: unknown;
                tipo: unknown; consumado: unknown;
                municipio: unknown; bairro: unknown;
            };

            const occRows = isCpf
                ? await runQuery<OccRow>(
                    `MATCH (p:Person {cpf: $q})
                     OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                     RETURN p.nome_original AS nome, p.cpf AS cpf,
                            o.reds_number AS reds_number, o.data_fato AS data_fato,
                            o.type AS tipo, o.consumado AS consumado,
                            o.municipio AS municipio, o.bairro AS bairro
                     ORDER BY o.data_fato DESC`,
                    { q: cleanQ }
                )
                : await runQuery<OccRow>(
                    `CALL db.index.fulltext.queryNodes('personSearch', $q + '~') YIELD node AS p, score
                     OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                     RETURN p.nome_original AS nome, p.cpf AS cpf,
                            o.reds_number AS reds_number, o.data_fato AS data_fato,
                            o.type AS tipo, o.consumado AS consumado,
                            o.municipio AS municipio, o.bairro AS bairro
                     ORDER BY score DESC, o.data_fato DESC
                     LIMIT 50`,
                    { q: cleanQ }
                );

            if (!occRows.length || !occRows[0].nome) {
                await sendMessage(chatId, `❌ Pessoa não encontrada para *"${query}"*`);
                return;
            }

            const nome = String(occRows[0].nome ?? '').toUpperCase();
            const cpf  = occRows[0].cpf ? String(occRows[0].cpf) : null;
            const occs = occRows.filter(r => r.reds_number);

            // 2. Fetch co-network (RECURSO)
            type NetRow = { co_count: unknown; co_persons: unknown };
            const netRows = cpf ? await runQuery<NetRow>(
                `MATCH (p:Person {cpf: $cpf})-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(other:Person)
                 WHERE other <> p
                 RETURN count(DISTINCT other) AS co_count,
                        count(DISTINCT o) AS co_persons`,
                { cpf }
            ) : [];

            const coPersons = toInt(netRows[0]?.co_count ?? 0);

            // ── C: Capacidade ─────────────────────────────────────────────
            // Score factors: total occurrences (0-10), recency (last 12mo), gravity
            const totalOccs = occs.length;
            const now = Date.now();
            const recentOccs = occs.filter(r => {
                if (!r.data_fato) return false;
                const dt = new Date(String(r.data_fato)).getTime();
                return (now - dt) < 365 * 24 * 3600 * 1000;
            });

            const maxGravity = occs.reduce((acc, r) => Math.max(acc, crimeWeight(String(r.tipo ?? ''))), 0);
            const avgGravity = occs.length
                ? occs.reduce((acc, r) => acc + crimeWeight(String(r.tipo ?? '')), 0) / occs.length
                : 0;

            const scoreC = Math.min(10, Math.round(
                (Math.min(totalOccs, 15) / 15) * 4 +   // volume (0-4)
                (Math.min(recentOccs.length, 5) / 5) * 3 + // recency (0-3)
                (maxGravity / 10) * 3                   // peak gravity (0-3)
            ));

            // ── R: Recurso ────────────────────────────────────────────────
            // Score: size of co-occurrence network
            const scoreR = Math.min(10, Math.round(
                (Math.min(coPersons, 20) / 20) * 10
            ));

            // ── I: Intenção ───────────────────────────────────────────────
            // Reincidência + consumado ratio
            const consumados = occs.filter(r => String(r.consumado) !== 'false').length;
            const consumadoRatio = occs.length ? consumados / occs.length : 0;
            const reincidencia = totalOccs > 1 ? Math.min((totalOccs - 1) / 10, 1) : 0;

            const scoreI = Math.min(10, Math.round(
                consumadoRatio * 5 + reincidencia * 5
            ));

            // ── T: Tipo ───────────────────────────────────────────────────
            // Dominant crime type + weight
            const typeCounts = new Map<string, number>();
            for (const r of occs) {
                const t = String(r.tipo ?? 'DESCONHECIDO');
                typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
            }
            const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
            const dominantType = topTypes[0]?.[0] ?? 'DESCONHECIDO';
            const scoreT = crimeWeight(dominantType);

            // ── Overall risk ──────────────────────────────────────────────
            const avgScore = (scoreC + scoreR + scoreI + scoreT) / 4;
            const { label: riskLbl, emoji: riskEmoji } = riskLabel(avgScore);

            // ── Format output ─────────────────────────────────────────────
            let msg = `🎯 *ANÁLISE CRIT*\n${VISUAL.separator}\n\n`;
            msg += `👤 *${nome}*\n`;
            if (cpf) msg += `   CPF: \`${cpf}\`\n`;
            msg += `   Ocorrências: *${totalOccs}* (${recentOccs.length} últimos 12 meses)\n\n`;

            msg += `${VISUAL.separatorShort}\n`;
            msg += `*C* Capacidade    ${scoreBar(scoreC)} ${scoreC}/10\n`;
            msg += `   ${totalOccs} ocorrência(s) · gravidade máx: ${maxGravity}/10\n\n`;

            msg += `*R* Recurso       ${scoreBar(scoreR)} ${scoreR}/10\n`;
            msg += `   ${coPersons} co-envolvido(s) em ocorrências\n\n`;

            msg += `*I* Intenção      ${scoreBar(scoreI)} ${scoreI}/10\n`;
            msg += `   ${consumados}/${totalOccs} consumados · reincidência: ${(reincidencia * 100).toFixed(0)}%\n\n`;

            msg += `*T* Tipo          ${scoreBar(scoreT)} ${scoreT}/10\n`;
            msg += `   Tipo dominante: *${dominantType}*\n`;
            if (topTypes.length > 1) {
                msg += `   Outros: ${topTypes.slice(1).map(([t, n]) => `${t} (${n})`).join(', ')}\n`;
            }

            msg += `\n${VISUAL.separator}\n`;
            msg += `${riskEmoji} *RISCO GERAL: ${riskLbl}* (${avgScore.toFixed(1)}/10)\n\n`;

            // Contextual alerts
            if (scoreC >= 8) msg += `⚠️ Histórico extenso com crimes graves\n`;
            if (scoreR >= 7) msg += `⚠️ Rede ampla — possível organização criminosa\n`;
            if (scoreI >= 8) msg += `⚠️ Alta taxa de consumação — perfil determinado\n`;
            if (recentOccs.length > 0) msg += `⚠️ Ativo nos últimos 12 meses\n`;

            const oldest = occs[occs.length - 1]?.data_fato;
            const newest = occs[0]?.data_fato;
            if (oldest && newest) {
                msg += `\n📅 Histórico: ${fmt(oldest)} → ${fmt(newest)}`;
            }

            await sendMessage(chatId, msg);

            // Auto-alert supervisors on CRÍTICO
            if (avgScore >= parseInt(process.env.ALERT_CRIT_THRESHOLD ?? '8', 10)) {
                dispatchAlert(
                    `CRIT ${riskEmoji} ${riskLbl} — ${nome}`,
                    `Score: ${Math.round(avgScore * 10) / 10}/10 | CPF: ${cpf ?? 'N/A'}`,
                    sendMessage
                ).catch(() => {});
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await sendMessage(chatId, `❌ Erro na análise CRIT: ${msg}`);
        }
    },
};
