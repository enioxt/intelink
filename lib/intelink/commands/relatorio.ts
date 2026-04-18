/**
 * Relatorio Command - INTELINK Bot
 * 
 * Gera ou mostra relatório estatístico do dia
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';

async function relatorioSemanal(
    chatId: number,
    sendMessage: (chatId: number, text: string) => Promise<void>
): Promise<void> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const hoje  = new Date().toISOString().slice(0, 10);

    try {
        const [statsRows, topCritRows, groupRows] = await Promise.all([
            runQuery(`
                MATCH (o:Occurrence)
                WHERE o.data_fato >= $since
                RETURN count(o) AS total_occs,
                       count(DISTINCT o.municipio) AS municipios,
                       count(DISTINCT o.tipo) + count(DISTINCT o.type) AS tipos
            `, { since }),

            runQuery(`
                MATCH (p:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)
                WHERE o.data_fato >= $since
                WITH p, count(o) AS n ORDER BY n DESC LIMIT 5
                RETURN p.nome_original AS nome, p.cpf AS cpf, n
            `, { since }),

            runQuery(`
                MATCH (a:Person)-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(b:Person)
                WHERE o.data_fato >= $since AND a.cpf < b.cpf
                WITH a.cpf AS cpfA, b.cpf AS cpfB, count(o) AS weight
                WHERE weight >= 2
                RETURN count(*) AS elos_recorrentes
            `, { since }),
        ]);

        const sr = statsRows[0] as any;
        const totalOccs = Number(sr?.get?.('total_occs') ?? 0);
        const municipios = Number(sr?.get?.('municipios') ?? 0);

        const topCrit = (topCritRows as any[]).map((r, i) =>
            `${i + 1}. ${r.get('nome') ?? '?'} (${r.get('n')} ocorrências)`
        ).join('\n');

        const elosRecorrentes = Number((groupRows[0] as any)?.get?.('elos_recorrentes') ?? 0);

        const msg =
            `📊 *RELATÓRIO SEMANAL INTELINK*\n` +
            `${VISUAL.separator}\n` +
            `📅 ${since} → ${hoje}\n\n` +
            `*Ocorrências no período:* ${totalOccs}\n` +
            `*Municípios afetados:* ${municipios}\n` +
            `*Pares com 2+ ocorrências em comum:* ${elosRecorrentes}\n\n` +
            `👥 *Top 5 com mais ocorrências no período:*\n${topCrit || 'Sem dados'}\n\n` +
            `_Use /grupos para ver grupos criminais ativos_\n` +
            `_Use /crit <cpf> para analisar ameaça individual_`;

        await sendMessage(chatId, msg);
    } catch (err) {
        await sendMessage(chatId, `❌ Erro ao gerar relatório semanal: ${(err as Error).message}`);
    }
}


export const relatorioCommand: Command = {
    name: 'relatorio',
    aliases: ['report', 'stats'],
    description: 'Ver estatísticas do dia',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { supabase, sendMessage } = deps;

        // REPORT-001: /relatorio semanal — Neo4j weekly intelligence digest
        if (args.trim().toLowerCase() === 'semanal') {
            await relatorioSemanal(chatId, sendMessage);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00`;
        const todayEnd = `${today}T23:59:59`;

        // Buscar estatísticas do dia
        const [entities, relationships, investigations] = await Promise.all([
            supabase
                .from('intelink_entities')
                .select('type', { count: 'exact' })
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd),
            supabase
                .from('intelink_relationships')
                .select('id', { count: 'exact' })
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd),
            supabase
                .from('intelink_investigations')
                .select('id', { count: 'exact' })
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd)
        ]);

        // Contar por tipo de entidade
        const typeCounts: Record<string, number> = {};
        if (entities.data) {
            for (const e of entities.data) {
                typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
            }
        }

        const msg = `📊 **RELATÓRIO DO DIA**
${VISUAL.separator}
📅 ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

**📈 ESTATÍSTICAS:**

👥 Entidades Adicionadas: **${entities.count || 0}**
   • 👤 Pessoas: ${typeCounts['PERSON'] || 0}
   • 🚗 Veículos: ${typeCounts['VEHICLE'] || 0}
   • 📍 Locais: ${typeCounts['LOCATION'] || 0}
   • 🔫 Armas: ${typeCounts['FIREARM'] || 0}

🔗 Relacionamentos: **${relationships.count || 0}**
📂 Operações Criadas: **${investigations.count || 0}**

${VISUAL.separatorShort}
🤖 _Relatório gerado automaticamente pelo INTELINK_

🌐 [Ver Analytics Completo](http://localhost:3001/analytics)`;

        await sendMessage(chatId, msg);
    }
};
