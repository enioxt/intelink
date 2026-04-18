/**
 * Comandos de revisão de fotos — PHOTO-008
 * /fotos-pendentes — lista fila de fotos aguardando revisão
 * /foto-revisar <id> — exibe foto e botões aprovar/rejeitar
 * /foto-merge <id> <cpf> — vincula foto aprovada a Person no Neo4j
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';

function toInt(v: unknown): number {
    if (typeof v === 'object' && v !== null && 'low' in v) return (v as { low: number }).low;
    return Number(v);
}

export const fotosPendentesCommand: Command = {
    name: 'fotos-pendentes',
    aliases: ['fotos', 'foto-fila'],
    description: 'Lista fotos aguardando revisão na fila',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId } = ctx;

        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: rows, error } = await sb
            .from('intelink_photo_queue')
            .select('id, filename, caption, status, match_tier, match_confidence, notes, created_at, person_cpf')
            .in('status', ['manual_review', 'pending'])
            .order('created_at', { ascending: true })
            .limit(10);

        if (error) {
            await sendMessage(chatId, `❌ Erro ao buscar fila: ${error.message}`);
            return;
        }

        if (!rows?.length) {
            await sendMessage(chatId, `✅ *Fila de fotos vazia*\n\nNenhuma foto aguardando revisão.`);
            return;
        }

        let msg = `🖼️ *FOTOS PENDENTES* (${rows.length})\n${VISUAL.separator}\n`;

        for (const r of rows) {
            const conf = r.match_confidence ? ` · conf: ${(r.match_confidence * 100).toFixed(0)}%` : '';
            const cpf  = r.person_cpf ? `\n   CPF sugerido: \`${r.person_cpf}\`` : '';
            const cap  = r.caption ? `\n   _"${r.caption}"_` : '';
            msg += `\n🔹 *ID ${r.id}* — ${r.filename || 'sem nome'}\n`;
            msg += `   Tier: ${r.match_tier ?? '?'}${conf}${cpf}${cap}\n`;
            msg += `   /foto\\-revisar ${r.id}\n`;
        }

        msg += `\n${VISUAL.separatorShort}\n💡 Use \`/foto-revisar <id>\` para ver e decidir.`;

        await sendMessage(chatId, msg);
    },
};

export const fotoRevisarCommand: Command = {
    name: 'foto-revisar',
    aliases: ['foto-ver'],
    description: 'Exibe foto pendente com opções de aprovar/rejeitar',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage, sendPhoto } = deps;
        const { chatId, args } = ctx;

        const id = args?.trim();
        if (!id || isNaN(Number(id))) {
            await sendMessage(chatId, `🖼️ *Revisar foto*\n\nUso: \`/foto-revisar <id>\`\n\nObtenha IDs com \`/fotos-pendentes\``);
            return;
        }

        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: row } = await sb
            .from('intelink_photo_queue')
            .select('id, filename, filepath, caption, status, match_tier, match_confidence, notes, person_cpf, created_at')
            .eq('id', id)
            .single();

        if (!row) {
            await sendMessage(chatId, `❌ Foto #${id} não encontrada na fila.`);
            return;
        }

        // Build public URL from Supabase storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const photoUrl = row.filepath
            ? `${supabaseUrl}/storage/v1/object/public/intelink-photos/${row.filepath}`
            : null;

        // Try to find matching person in Neo4j if CPF is set
        let personInfo = '';
        if (row.person_cpf) {
            try {
                type PersonRow = { nome: unknown; occ: unknown };
                const rows = await runQuery<PersonRow>(
                    `MATCH (p:Person {cpf: $cpf}) OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o) RETURN p.nome_original AS nome, count(o) AS occ LIMIT 1`,
                    { cpf: row.person_cpf.replace(/\D/g, '') }
                );
                if (rows[0]) {
                    personInfo = `\n   👤 ${String(rows[0].nome ?? '').toUpperCase()} · ${toInt(rows[0].occ)} ocorrência(s)`;
                }
            } catch { /* non-critical */ }
        }

        const statusEmoji = row.status === 'manual_review' ? '⏳' : row.status === 'approved' ? '✅' : '❌';
        const conf = row.match_confidence ? `${(row.match_confidence * 100).toFixed(0)}%` : '?';

        const card = `🖼️ *FOTO #${id}*\n${VISUAL.separator}\n` +
            `   Arquivo: ${row.filename || 'sem nome'}\n` +
            `   Status: ${statusEmoji} ${row.status}\n` +
            `   Tier: ${row.match_tier ?? '?'} · Confiança: ${conf}` +
            (row.person_cpf ? `\n   CPF sugerido: \`${row.person_cpf}\`${personInfo}` : '') +
            (row.caption ? `\n   Legenda: _"${row.caption}"_` : '') +
            (row.notes ? `\n   Notas: ${row.notes}` : '') +
            `\n${VISUAL.separatorShort}\n` +
            `✅ \`/foto-merge ${id} <cpf>\` — vincular ao CPF\n` +
            `❌ \`/foto-rejeitar ${id}\` — rejeitar foto`;

        if (photoUrl && sendPhoto) {
            try {
                await sendPhoto(chatId, photoUrl);
            } catch { /* photo might be inaccessible */ }
        }

        await sendMessage(chatId, card, {
            inline_keyboard: [
                [
                    { text: '✅ Vincular ao CPF sugerido', callback_data: row.person_cpf ? `foto_merge:${id}:${row.person_cpf}` : `noop` },
                ],
                [
                    { text: '❌ Rejeitar', callback_data: `foto_rejeitar:${id}` },
                    { text: '🔍 Buscar CPF', callback_data: `noop` },
                ],
            ],
        });
    },
};

export const fotoMergeCommand: Command = {
    name: 'foto-merge',
    aliases: ['foto-vincular'],
    description: 'Vincula foto aprovada a uma pessoa via CPF',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId, args } = ctx;

        const parts = args?.trim().split(/\s+/);
        const id  = parts?.[0];
        const cpf = parts?.[1]?.replace(/\D/g, '');

        if (!id || !cpf || cpf.length !== 11) {
            await sendMessage(chatId,
                `🖼️ *Vincular foto*\n\nUso: \`/foto-merge <id> <cpf>\`\n\nExemplo: \`/foto-merge 42 12345678900\``
            );
            return;
        }

        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: row } = await sb
            .from('intelink_photo_queue')
            .select('id, filepath, status')
            .eq('id', id)
            .single();

        if (!row) {
            await sendMessage(chatId, `❌ Foto #${id} não encontrada.`);
            return;
        }

        // Build storage URL for Neo4j
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const photoUrl = `${supabaseUrl}/storage/v1/object/public/intelink-photos/${row.filepath}`;

        // Write to Neo4j
        try {
            const result = await runQuery<{ nome: unknown }>(
                `MATCH (p:Person {cpf: $cpf})
                 SET p.photo_url = $photoUrl,
                     p._photo_queue_id = $queueId,
                     p._photo_linked_at = $linkedAt
                 RETURN p.nome_original AS nome`,
                { cpf, photoUrl, queueId: String(id), linkedAt: new Date().toISOString() }
            );

            if (!result.length) {
                await sendMessage(chatId, `❌ Nenhuma pessoa encontrada com CPF \`${cpf}\` no grafo.`);
                return;
            }

            const nome = String(result[0].nome ?? '').toUpperCase();

            // Mark as linked in Supabase
            await sb
                .from('intelink_photo_queue')
                .update({ status: 'linked', person_cpf: cpf })
                .eq('id', id);

            await sendMessage(chatId,
                `✅ *Foto vinculada com sucesso*\n${VISUAL.separator}\n\n` +
                `🖼️ Foto #${id} → 👤 *${nome}*\n   CPF: \`${cpf}\`\n\n` +
                `A foto aparecerá no próximo \`/buscar\` desta pessoa.`
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await sendMessage(chatId, `❌ Erro ao vincular no Neo4j: ${msg}`);
        }
    },
};

export const fotoRejeitarCommand: Command = {
    name: 'foto-rejeitar',
    aliases: [],
    description: 'Rejeita uma foto da fila de revisão',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId, args } = ctx;

        const id = args?.trim();
        if (!id || isNaN(Number(id))) {
            await sendMessage(chatId, `❌ Uso: \`/foto-rejeitar <id>\``);
            return;
        }

        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await sb
            .from('intelink_photo_queue')
            .update({ status: 'rejected' })
            .eq('id', id);

        if (error) {
            await sendMessage(chatId, `❌ Erro: ${error.message}`);
            return;
        }

        await sendMessage(chatId, `🗑️ Foto #${id} rejeitada e removida da fila.`);
    },
};
