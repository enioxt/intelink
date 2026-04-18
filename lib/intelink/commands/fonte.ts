/**
 * Comando /fonte - Audit metadata de uma entidade Person
 * UX-008: quando/como o registro foi ingerido
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';

function fmt(d: unknown): string {
    if (!d) return '—';
    try { return new Date(String(d)).toLocaleString('pt-BR'); } catch { return String(d); }
}

type AuditRow = { p: { properties: Record<string, unknown> } };

export const fonteCommand: Command = {
    name: 'fonte',
    aliases: ['audit', 'origem'],
    description: 'Mostra metadados de auditoria de um registro REDS',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId, args } = ctx;

        const id = args?.trim().replace(/\D/g, '');

        if (!id) {
            await sendMessage(chatId, `📂 *AUDITORIA DE REGISTRO*\n${VISUAL.separator}\n\nUso: \`/fonte <CPF ou reds_person_key>\`\n\nExemplo: \`/fonte 12345678900\``);
            return;
        }

        const isCpf = id.length >= 10;
        const where = isCpf ? 'p.cpf = $id' : 'p.reds_person_key = $id';

        try {
            const rows = await runQuery<AuditRow>(
                `MATCH (p:Person) WHERE ${where} RETURN p LIMIT 1`,
                { id }
            );

            if (!rows.length) {
                await sendMessage(chatId, `❌ Registro não encontrado para: \`${id}\``);
                return;
            }

            const p = rows[0].p.properties;

            const msg = `📂 *AUDITORIA — METADADOS DO REGISTRO*
${VISUAL.separator}

🔑 *Identificadores:*
   CPF: \`${p.cpf ?? '—'}\`
   RG: ${p.rg ?? p.rg_mg ?? '—'}
   Chave REDS: \`${p.reds_person_key ?? '—'}\`

📂 *Origem:*
   Fonte: ${p.source ?? '—'}
   Delegacia: ${p.delegacia ?? '—'}

📅 *Timestamps:*
   Criado: ${fmt(p.created_at)}
   Atualizado: ${fmt(p.updated_at)}

🔍 *Chave de busca:*
   intelink.ia.br/p/${encodeURIComponent(String(p.cpf ?? p.reds_person_key ?? id))}

${VISUAL.separatorShort}
💡 Use \`/buscar <CPF>\` para ver o registro completo`;

            await sendMessage(chatId, msg);
        } catch (err) {
            await sendMessage(chatId, `❌ Erro: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
