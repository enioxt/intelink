/**
 * Roteador de callbacks Telegram (inline_keyboard) e respostas numéricas.
 * Portável: mesma lógica serve WhatsApp button_reply.id no futuro.
 */

import { VISUAL, CommandDependencies } from './commands/types';
import { runQuery } from '@/lib/neo4j/server';
import { toTelegramKeyboard, personButtons } from './buttons';

function toInt(v: unknown): number {
    if (typeof v === 'object' && v !== null && 'low' in v) return (v as { low: number }).low;
    return Number(v);
}

function fmt(d: unknown): string {
    if (!d) return '';
    try { return new Date(String(d)).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

/** Rota callback_data para o handler correto */
export async function routeCallback(
    callbackData: string,
    chatId: number,
    sendMessage: (chatId: number, text: string, markup?: unknown) => Promise<void>
): Promise<boolean> {

    const [action, ...rest] = callbackData.split(':');
    const param = rest.join(':');

    switch (action) {
        case 'show_bos':
            await handleShowBos(chatId, param, sendMessage);
            return true;
        case 'show_links':
            await handleShowLinks(chatId, param, sendMessage);
            return true;
        case 'open_web':
            // URL buttons não geram callback — ignorar silenciosamente
            return true;
        case 'suggest_edit':
            await handleSuggestEdit(chatId, param, sendMessage);
            return true;
        // ARCH-001c: legacy menu navigation callbacks
        case 'search_prompt':
            await sendMessage(chatId, '🔍 *Busca Semântica*\n\nDigite:\n`/buscar [termo]`\n\nExemplo: `/buscar suspeito ameaça`');
            return true;
        case 'search_whois':
            await sendMessage(chatId, '👤 *Consulta de Entidade*\n\nDigite:\n`/quem [nome]`\n\nExemplo: `/quem João Silva`');
            return true;
        case 'noop':
            return true;
        case 'foto_merge':
            await handleFotoMerge(chatId, param, sendMessage);
            return true;
        case 'foto_rejeitar':
            await handleFotoRejeitar(chatId, param, sendMessage);
            return true;
        default:
            // Dynamic legacy patterns
            if (callbackData.startsWith('prompt_') || callbackData.startsWith('select_inv_') ||
                callbackData.startsWith('entity_') || callbackData.startsWith('ver_') ||
                ['menu_main', 'menu_prompts', 'case_select', 'analyze_bridge',
                 'enable_ai_chat', 'disable_ai_chat', 'case_back', 'search_graph',
                 'confirm_cleanup'].includes(callbackData)) {
                await sendMessage(chatId, '⚙️ Esta ação não está disponível na versão atual.');
                return true;
            }
            return false;
    }
}

async function handleShowBos(chatId: number, id: string, sendMessage: CommandDependencies['sendMessage']): Promise<void> {
    await sendMessage(chatId, `📋 Buscando ocorrências REDS...`);

    const isCpf = /^\d{10,11}$/.test(id.replace(/\D/g, ''));
    const where = isCpf ? 'p.cpf = $id' : 'p.reds_person_key = $id';

    try {
        type OccRow = { o: { properties: Record<string, unknown> } };
        const rows = await runQuery<OccRow>(
            `MATCH (p:Person) WHERE ${where}
             MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)
             RETURN o ORDER BY o.data_fato DESC LIMIT 10`,
            { id }
        );

        if (!rows.length) {
            await sendMessage(chatId, `📋 Nenhuma ocorrência REDS encontrada para este registro.`);
            return;
        }

        let msg = `📋 *OCORRÊNCIAS REDS* (${rows.length})\n${VISUAL.separator}\n`;

        for (const row of rows) {
            const o = row.o.properties;
            const reds = o.reds_number ? String(o.reds_number) : '—';
            const data = fmt(o.data_fato);
            const tipo = o.type ? String(o.type) : '';
            const mun = o.municipio ? String(o.municipio) : '';
            const bairro = o.bairro ? String(o.bairro) : '';
            const modo = o.modo_acao ? String(o.modo_acao) : '';
            const consumado = o.consumado === true ? 'consumado' : o.consumado === false ? 'tentativa' : '';
            const fonte = o.source ? String(o.source) : 'REDS';

            msg += `\n🚨 *BO ${reds}* · ${data}\n`;
            if (tipo) msg += `   Tipo: ${tipo}${consumado ? ` · ${consumado}` : ''}\n`;
            if (bairro || mun) msg += `   📍 ${[bairro, mun].filter(Boolean).join(', ')}\n`;
            if (modo) msg += `   🔎 Modo: ${modo}\n`;
            msg += `   📂 Fonte: ${fonte}\n`;
        }

        await sendMessage(chatId, msg);
    } catch {
        await sendMessage(chatId, `❌ Erro ao buscar ocorrências. Verifique a conexão Neo4j.`);
    }
}

async function handleShowLinks(chatId: number, id: string, sendMessage: CommandDependencies['sendMessage']): Promise<void> {
    await sendMessage(chatId, `🔗 Buscando envolvidos e vínculos...`);

    const isCpf = /^\d{10,11}$/.test(id.replace(/\D/g, ''));
    const where = isCpf ? 'p.cpf = $id' : 'p.reds_person_key = $id';

    try {
        type LinkRow = { other: { properties: Record<string, unknown> }; rel: string; shared_occ: number };
        const rows = await runQuery<LinkRow>(
            `MATCH (p:Person) WHERE ${where}
             MATCH (p)-[:ENVOLVIDO_EM]->(o:Occurrence)<-[:ENVOLVIDO_EM]-(other:Person)
             WHERE other <> p
             RETURN other, count(o) AS shared_occ
             ORDER BY shared_occ DESC LIMIT 10`,
            { id }
        );

        // Also get SAME_AS
        type SameRow = { other: { properties: Record<string, unknown> } };
        const sameRows = await runQuery<SameRow>(
            `MATCH (p:Person) WHERE ${where}
             MATCH (p)-[:SAME_AS]-(other:Person)
             RETURN other LIMIT 5`,
            { id }
        );

        if (!rows.length && !sameRows.length) {
            await sendMessage(chatId, `🔗 Nenhum envolvido encontrado em ocorrências compartilhadas.`);
            return;
        }

        let msg = `🔗 *ENVOLVIDOS — CO-OCORRÊNCIAS*\n${VISUAL.separator}\n`;

        for (const row of rows) {
            const props = row.other.properties;
            const name = String(props.nome_original ?? props.name ?? 'Sem nome').toUpperCase();
            const cpf = props.cpf ? String(props.cpf) : null;
            const shared = toInt(row.shared_occ);
            msg += `\n👤 *${name}*\n`;
            if (cpf) msg += `   CPF: \`${cpf}\`\n`;
            msg += `   Ocorrências em comum: *${shared}*\n`;

            const btns = personButtons(cpf, String(props.reds_person_key ?? cpf ?? ''));
            const kb = toTelegramKeyboard(btns.slice(0, 2)); // só BOs + Envolvidos (sem web novamente)
            await sendMessage(chatId, msg, kb);
            msg = '';
        }

        if (sameRows.length) {
            let sameMsg = `\n🔄 *REGISTROS DUPLICADOS (SAME_AS)*\n`;
            for (const row of sameRows) {
                const props = row.other.properties;
                const name = String(props.nome_original ?? props.name ?? 'Sem nome').toUpperCase();
                const cpf = props.cpf ? `\`${props.cpf}\`` : '';
                sameMsg += `• ${name} ${cpf}\n`;
            }
            await sendMessage(chatId, sameMsg);
        }

        if (msg) await sendMessage(chatId, msg);
    } catch {
        await sendMessage(chatId, `❌ Erro ao buscar envolvidos. Verifique a conexão Neo4j.`);
    }
}

async function handleSuggestEdit(chatId: number, id: string, sendMessage: CommandDependencies['sendMessage']): Promise<void> {
    const webUrl = `https://intelink.ia.br/propostas/nova?cpf=${encodeURIComponent(id)}`;
    await sendMessage(chatId,
        `✏️ *SUGERIR EDIÇÃO DE DADOS*\n${VISUAL.separator}\n\n` +
        `Você pode propor alterações para o registro \`${id}\`.\n\n` +
        `📱 *Via web* (recomendado):\n${webUrl}\n\n` +
        `💬 *Via Telegram*:\n\`/sugerir ${id}\` — inicia o assistente de edição\n\n` +
        `_Propostas passam por quórum 3/3 antes de serem aplicadas._`,
        {
            inline_keyboard: [[
                { text: '🌐 Abrir formulário web', url: webUrl },
                { text: '💬 /sugerir', callback_data: `start_sugerir:${id}` }
            ]]
        }
    );
}

async function handleFotoMerge(chatId: number, param: string, sendMessage: CommandDependencies['sendMessage']): Promise<void> {
    // param = "<id>:<cpf>"
    const [id, cpf] = param.split(':');
    if (!id || !cpf) {
        await sendMessage(chatId, `❌ Dados inválidos para vincular foto. Use \`/foto-merge <id> <cpf>\``);
        return;
    }
    const { createClient } = await import('@supabase/supabase-js');
    const { runQuery } = await import('@/lib/neo4j/server');
    const cleanCpf = cpf.replace(/\D/g, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const sb = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: row } = await sb.from('intelink_photo_queue').select('id, filepath').eq('id', id).single();
    if (!row) { await sendMessage(chatId, `❌ Foto #${id} não encontrada.`); return; }
    const photoUrl = `${supabaseUrl}/storage/v1/object/public/intelink-photos/${row.filepath}`;
    try {
        const result = await runQuery<{ nome: unknown }>(
            `MATCH (p:Person {cpf: $cpf}) SET p.photo_url = $photoUrl, p._photo_queue_id = $queueId, p._photo_linked_at = $linkedAt RETURN p.nome_original AS nome`,
            { cpf: cleanCpf, photoUrl, queueId: String(id), linkedAt: new Date().toISOString() }
        );
        if (!result.length) { await sendMessage(chatId, `❌ CPF \`${cleanCpf}\` não encontrado no grafo.`); return; }
        await sb.from('intelink_photo_queue').update({ status: 'linked', person_cpf: cleanCpf }).eq('id', id);
        await sendMessage(chatId, `✅ Foto #${id} vinculada a *${String(result[0].nome ?? '').toUpperCase()}* (CPF: \`${cleanCpf}\`)`);
    } catch (err) {
        await sendMessage(chatId, `❌ Erro Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function handleFotoRejeitar(chatId: number, id: string, sendMessage: CommandDependencies['sendMessage']): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await sb.from('intelink_photo_queue').update({ status: 'rejected' }).eq('id', id);
    if (error) { await sendMessage(chatId, `❌ Erro: ${error.message}`); return; }
    await sendMessage(chatId, `🗑️ Foto #${id} rejeitada.`);
}
