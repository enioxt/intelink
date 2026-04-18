/**
 * Comando /buscar - Busca REDS (Neo4j) + entidades (Supabase)
 * UX-001: template rico · UX-004: botões portáveis · UX-007: footer web link
 */

import neo4j from 'neo4j-driver';
import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';
import { personButtons, toTelegramKeyboard } from '@/lib/intelink/buttons';
import { createClient } from '@supabase/supabase-js';

function fmt(d: unknown): string {
    if (!d) return '';
    try { return new Date(String(d)).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

function str(v: unknown): string {
    if (Array.isArray(v)) return String(v[0] ?? '');
    return String(v ?? '');
}

function toInt(v: unknown): number {
    if (typeof v === 'object' && v !== null && 'low' in v) return (v as { low: number }).low;
    return Number(v);
}

/** Escapa caracteres especiais do Telegram Markdown v1 em dados do usuário */
function esc(s: string): string {
    return s.replace(/[*_`[]/g, '\\$&');
}

type PersonRow = {
    p: { properties: Record<string, unknown>; elementId: string };
    occ_count: unknown;
    latest_bo: unknown;
    latest_date: unknown;
};

export const buscarCommand: Command = {
    name: 'buscar',
    aliases: ['search', 'find', 'reds', 'cpf'],
    description: 'Busca REDS por nome ou CPF no grafo local',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { supabase, sendMessage, sendMessageWithButtons, sendPhoto } = deps;
        const { chatId, args } = ctx;

        const query = args?.trim();

        if (!query) {
            await sendMessage(chatId, `🔍 *BUSCA REDS — GRAFO LOCAL*
${VISUAL.separator}

📝 *Como usar:*
\`/buscar [nome ou CPF]\`

💡 *Exemplos:*
• \`/buscar João Silva\` — busca por nome
• \`/buscar 12345678900\` — busca por CPF (11 dígitos)
• \`/buscar Maria\` — parte do nome

📊 Grafo local: ~12.730 pessoas · 2.092 ocorrências REDS`);
            return;
        }

        await sendMessage(chatId, `🔍 Buscando *${query}* no grafo REDS...`);

        const isCpf = /^\d{10,11}$/.test(query.replace(/\D/g, ''));
        const cleanCpf = query.replace(/\D/g, '');

        try {
            let rows: PersonRow[] = [];

            if (isCpf) {
                rows = await runQuery<PersonRow>(
                    `MATCH (p:Person) WHERE p.cpf = $cpf
                     OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                     RETURN p,
                            count(o) AS occ_count,
                            max(o.reds_number) AS latest_bo,
                            max(o.data_fato) AS latest_date
                     LIMIT 5`,
                    { cpf: cleanCpf }
                );
            } else {
                rows = await runQuery<PersonRow>(
                    `CALL db.index.fulltext.queryNodes('personSearch', $q + '~') YIELD node AS p, score
                     OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
                     RETURN p,
                            count(o) AS occ_count,
                            max(o.reds_number) AS latest_bo,
                            max(o.data_fato) AS latest_date
                     ORDER BY score DESC, occ_count DESC
                     LIMIT $limit`,
                    { q: query, limit: neo4j.int(8) }
                );
            }

            if (!rows.length) {
                await sendMessage(chatId, `🔍 Nenhum resultado REDS para *"${query}"*

💡 Dicas:
• Tente com menos palavras
• CPF deve ter 11 dígitos
• Verifique a grafia`);
                return;
            }

            await sendMessage(chatId, `🔍 *REDS — ${rows.length} pessoa(s)*\n${VISUAL.separator}`);

            for (const row of rows) {
                const p = row.p.properties;
                const photoUrl = p.photo_url ? String(p.photo_url) : null;
                const name = str(p.nome_original ?? p.name) || 'Sem nome';
                const cpf  = p.cpf   ? String(p.cpf)   : null;
                const rg   = p.rg    ? String(p.rg)     : (p.rg_mg ? String(p.rg_mg) : null);
                const nasc = fmt(p.data_nascimento);
                const mae  = p.nome_mae ? str(p.nome_mae) : null;
                const sexo = p.sexo  ? String(p.sexo)  : null;
                const src  = p.source ? String(p.source) : 'REDS';
                const upd  = fmt(p.updated_at ?? p.created_at);
                const key  = cpf ?? str(p.reds_person_key ?? '');

                const occCount  = toInt(row.occ_count);
                const latestBo  = row.latest_bo  ? String(row.latest_bo)  : null;
                const latestDt  = fmt(row.latest_date);

                // CONTRIB-017: confidence badge helper
                const conf = (field: string): string => {
                    const c = p[`_confidence_${field}`];
                    if (!c) return '';
                    if (c === 'CONFIRMADO') return ' 🟢';
                    if (c === 'PROVAVEL') return ' 🟡';
                    if (c === 'NAO_CONFIRMADO') return ' 🟠';
                    return '';
                };

                let card = `\n👤 *${esc(name.toUpperCase())}*\n`;
                if (cpf)  card += `   CPF: \`${cpf}\`${conf('cpf')}\n`;
                if (rg)   card += `   RG: ${esc(rg)}${conf('rg')}\n`;
                if (nasc) card += `   📅 Nasc: ${nasc}${sexo ? ` · ${esc(sexo)}` : ''}${conf('data_nascimento')}\n`;
                if (mae)  card += `   👩 Mãe: ${esc(str(mae).toUpperCase())}${conf('nome_mae')}\n`;

                const bairro = p.bairro ? String(p.bairro) : null;
                const cidade = p.cidade ? String(p.cidade) : null;
                if (bairro || cidade) card += `   📍 ${esc([bairro, cidade].filter(Boolean).join(', '))}\n`;

                if (occCount > 0) {
                    card += `   ⚠️ *${occCount} ocorrência(s) REDS*`;
                    if (latestBo)  card += ` · último BO: ${esc(latestBo)}`;
                    if (latestDt)  card += ` (${latestDt})`;
                    card += '\n';
                } else {
                    card += `   ✅ Sem ocorrências REDS\n`;
                }

                card += `   📂 Fonte: ${esc(src)}${upd ? ` · ${upd}` : ''}\n`;
                card += `   🔗 intelink.ia.br/p/${encodeURIComponent(key)}\n`;

                // Check pending proposals for this CPF
                if (cpf) {
                    try {
                        const sb = createClient(
                            process.env.NEXT_PUBLIC_SUPABASE_URL!,
                            process.env.SUPABASE_SERVICE_ROLE_KEY!
                        );
                        const { count } = await sb
                            .from('intelink_proposals')
                            .select('id', { count: 'exact', head: true })
                            .eq('person_cpf', cpf)
                            .eq('status', 'pending');
                        if (count && count > 0) {
                            card += `   ⚠️ *${count} proposta(s) de edição pendente(s)* — clique em ✏️ para votar\n`;
                        }
                    } catch { /* não bloqueia busca se Supabase falhar */ }
                }

                // PHOTO-007: send photo before card if Person.photo_url is set
                if (photoUrl && sendPhoto) {
                    await sendPhoto(chatId, photoUrl);
                }

                const btns = personButtons(cpf, str(p.reds_person_key ?? key));
                const kb   = toTelegramKeyboard(btns);

                await sendMessage(chatId, card, kb);
            }

            await sendMessage(chatId, `${VISUAL.separatorShort}\n💡 Clique nos botões para ver BOs, envolvidos ou abrir no Intelink web.`);

        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);

            // Fallback Supabase
            const { data: entities } = await supabase
                .from('intelink_entities')
                .select('id, name, type, properties')
                .or(`name.ilike.%${query}%,properties->cpf.ilike.%${query}%`)
                .limit(5);

            if (entities?.length) {
                let msg = `🔍 *Resultados (Supabase):*\n${VISUAL.separator}\n`;
                for (const e of entities) {
                    msg += `\n📌 *${e.name}*\n   Tipo: ${e.type}\n`;
                }
                await sendMessage(chatId, msg);
            } else {
                await sendMessage(chatId, `❌ Erro na busca: ${errMsg}\n\n_Verifique a conexão com o Neo4j_`);
            }
        }
    }
};
