/**
 * OBS-002: /observacao <cpf> <texto> — adiciona observação textual.
 * Requer 1 aprovação de outro membro (simplificado vs quórum 3/3).
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { createClient } from '@supabase/supabase-js';

export const observacaoCommand: Command = {
    name: 'observacao',
    aliases: ['obs', 'nota'],
    description: 'Adiciona observação a uma pessoa no grafo',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        const parts = args?.trim().split(/\s+/);
        const cpf = parts?.[0]?.replace(/\D/g, '');
        const texto = parts?.slice(1).join(' ').trim();

        if (!cpf || cpf.length !== 11 || !texto) {
            await sendMessage(chatId,
                `📝 *OBSERVAÇÃO*\n${VISUAL.separator}\n\n` +
                `Uso: \`/observacao <cpf> <texto>\`\n\n` +
                `Exemplo:\n\`/observacao 12345678900 Suspeito de tráfico na região sul\``
            );
            return;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find member by telegram_chat_id
        const { data: member } = await supabase
            .from('intelink_unit_members')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .single();

        if (!member) {
            await sendMessage(chatId, `❌ Conta não vinculada. Use /start para vincular seu Telegram.`);
            return;
        }

        const { data: obs, error } = await supabase
            .from('intelink_observations')
            .insert({
                person_cpf: cpf,
                text: texto,
                author_id: member.id,
                status: 'pending',
            })
            .select('id')
            .single();

        if (error || !obs) {
            await sendMessage(chatId, `❌ Erro ao salvar observação: ${error?.message || 'tente novamente'}`);
            return;
        }

        // Notify other members for approval
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (BOT_TOKEN) {
            const { data: others } = await supabase
                .from('intelink_unit_members')
                .select('telegram_chat_id')
                .not('telegram_chat_id', 'is', null)
                .neq('id', member.id)
                .limit(20);

            if (others?.length) {
                const notifText = `📝 *Nova observação aguarda aprovação*\n\nCPF: \`${cpf}\`\n"${texto.slice(0, 100)}${texto.length > 100 ? '...' : ''}"\n\n_Responda com /aprovar-obs ${obs.id} para aprovar_`;

                await Promise.allSettled(others.map(o =>
                    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: o.telegram_chat_id, text: notifText, parse_mode: 'Markdown' }),
                    })
                ));
            }
        }

        await sendMessage(chatId,
            `✅ *Observação registrada!*\n\nID: \`${obs.id}\`\nStatus: aguardando 1 aprovação de outro membro.`
        );
    }
};

export const aprovarObsCommand: Command = {
    name: 'aprovar-obs',
    aliases: ['aprovar_obs', 'aprova-obs'],
    description: 'Aprova uma observação pendente',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        const obsId = args?.trim();
        if (!obsId) {
            await sendMessage(chatId, `Uso: \`/aprovar-obs <id>\``);
            return;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: member } = await supabase
            .from('intelink_unit_members')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .single();

        if (!member) {
            await sendMessage(chatId, `❌ Conta não vinculada.`);
            return;
        }

        const { data: obs } = await supabase
            .from('intelink_observations')
            .select('id, author_id, status, person_cpf')
            .eq('id', obsId)
            .single();

        if (!obs) { await sendMessage(chatId, `❌ Observação não encontrada.`); return; }
        if (obs.status !== 'pending') { await sendMessage(chatId, `❌ Observação já ${obs.status}.`); return; }
        if (obs.author_id === member.id) { await sendMessage(chatId, `❌ Você não pode aprovar sua própria observação.`); return; }

        await supabase
            .from('intelink_observations')
            .update({ status: 'approved', approved_by: member.id, approved_at: new Date().toISOString() })
            .eq('id', obsId);

        await sendMessage(chatId, `✅ Observação \`${obsId}\` aprovada!\n\nCPF: \`${obs.person_cpf}\``);
    }
};
