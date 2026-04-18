/**
 * CONTRIB-009: Telegram /sugerir <cpf> — wizard interativo de proposta de edição.
 * Estado de sessão em memória (per chat_id), timeout 10min.
 * Fluxo: CPF → escolhe campo → valor atual → novo valor → fonte → confirma → envia
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';
import { createClient } from '@supabase/supabase-js';

// ── Session state ─────────────────────────────────────────────────────────────
interface SugerirItem {
    field_path: string;
    old_value: string;
    new_value: string;
    source: string;
}

interface SugerirSession {
    step: 'choose_field' | 'enter_new_value' | 'enter_source' | 'confirm';
    cpf: string;
    person_name: string;
    supabase_user_id: string;
    items: SugerirItem[];
    current_item: Partial<SugerirItem>;
    last_activity: number;
}

const sessions = new Map<number, SugerirSession>();
const SESSION_TTL = 10 * 60 * 1000;

export function hasSugerirSession(chatId: number): boolean {
    const s = sessions.get(chatId);
    if (!s) return false;
    if (Date.now() - s.last_activity > SESSION_TTL) { sessions.delete(chatId); return false; }
    return true;
}

export async function handleSugerirMessage(
    chatId: number,
    text: string,
    sendMessage: CommandDependencies['sendMessage']
): Promise<void> {
    const session = sessions.get(chatId);
    if (!session) return;
    session.last_activity = Date.now();

    const t = text.trim();

    if (t === '/cancelar' || t === 'cancelar') {
        sessions.delete(chatId);
        await sendMessage(chatId, '❌ Proposta cancelada.');
        return;
    }

    switch (session.step) {
        case 'choose_field': {
            const num = parseInt(t);
            if (isNaN(num) || num < 1 || num > CAMPOS.length) {
                await sendMessage(chatId, `❓ Escolha um número entre 1 e ${CAMPOS.length}, ou /cancelar`);
                return;
            }
            session.current_item = { field_path: CAMPOS[num - 1].key };
            session.step = 'enter_new_value';
            await sendMessage(chatId,
                `✏️ *${CAMPOS[num - 1].label}*\n\nQual o novo valor correto?\n\n_/cancelar para desistir_`
            );
            break;
        }

        case 'enter_new_value': {
            session.current_item.new_value = t;
            session.step = 'enter_source';
            await sendMessage(chatId,
                `📂 *Fonte do dado:*\nEx: "BO 2024/001", "documento RG", "declaração verbal"\n\nOu envie \`-\` para pular.`
            );
            break;
        }

        case 'enter_source': {
            session.current_item.source = t === '-' ? '' : t;
            // Finalize item
            session.items.push(session.current_item as SugerirItem);
            session.current_item = {};
            session.step = 'choose_field';

            await sendMessage(chatId,
                `✅ Campo adicionado! Total: *${session.items.length}* campo(s).\n\n` +
                `O que deseja fazer?\n` +
                `1-${CAMPOS.length} — adicionar outro campo\n` +
                `*enviar* — confirmar e enviar proposta\n` +
                `*/cancelar* — desistir`,
                {
                    inline_keyboard: [
                        [
                            { text: '✅ Enviar proposta', callback_data: `sugerir_enviar:${chatId}` },
                            { text: '➕ Mais campos', callback_data: `sugerir_mais:${chatId}` },
                        ]
                    ]
                }
            );
            break;
        }

        case 'confirm': {
            if (t.toLowerCase() === 'enviar' || t.toLowerCase() === 's' || t === '1') {
                await enviarProposta(chatId, session, sendMessage);
            } else {
                session.step = 'choose_field';
                await sendFieldMenu(chatId, session, sendMessage);
            }
            break;
        }
    }
}

export async function handleSugerirCallback(
    chatId: number,
    callbackData: string,
    sendMessage: CommandDependencies['sendMessage']
): Promise<boolean> {
    const session = sessions.get(chatId);
    if (!session) return false;

    if (callbackData === `sugerir_enviar:${chatId}`) {
        await enviarProposta(chatId, session, sendMessage);
        return true;
    }
    if (callbackData === `sugerir_mais:${chatId}`) {
        session.step = 'choose_field';
        await sendFieldMenu(chatId, session, sendMessage);
        return true;
    }
    return false;
}

async function enviarProposta(
    chatId: number,
    session: SugerirSession,
    sendMessage: CommandDependencies['sendMessage']
): Promise<void> {
    if (!session.items.length) {
        await sendMessage(chatId, '❓ Nenhum campo adicionado. Use os números do menu para adicionar campos.');
        return;
    }

    await sendMessage(chatId, '📤 Enviando proposta...');

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find Supabase user by telegram chat_id via intelink_unit_members
        const { data: member } = await supabase
            .from('intelink_unit_members')
            .select('id')
            .eq('telegram_chat_id', chatId)
            .single();

        if (!member) {
            await sendMessage(chatId, `❌ Conta não vinculada ao Telegram. Use /start para vincular.`);
            sessions.delete(chatId);
            return;
        }

        // Insert proposal via internal fetch (reuses the route logic)
        const r = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3009'}/api/propostas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Use service role to bypass auth for telegram calls
                'x-supabase-service': 'telegram',
                'x-proposer-id': session.supabase_user_id || member.id,
            },
            body: JSON.stringify({
                person_cpf: session.cpf,
                person_name: session.person_name,
                items: session.items.map(it => ({
                    field_path: it.field_path,
                    new_value: it.new_value,
                    source: it.source || undefined,
                })),
                _telegram_proposer_id: session.supabase_user_id || member.id,
            }),
        });

        const data = await r.json();

        if (r.ok) {
            sessions.delete(chatId);
            const webUrl = `https://intelink.ia.br/propostas/${data.proposal_id}`;
            await sendMessage(chatId,
                `✅ *Proposta enviada com sucesso!*\n\n` +
                `📋 ${session.items.length} campo(s) propostos para \`${session.cpf}\`.\n\n` +
                `🔗 ${webUrl}\n\n` +
                `_Aguardando 2 aprovações adicionais (3/3 total)_`,
                { inline_keyboard: [[{ text: '📋 Ver proposta', url: webUrl }]] }
            );
        } else if (r.status === 409) {
            await sendMessage(chatId, `⚠️ Já existe uma proposta pendente sua para este CPF.\n\nVeja: https://intelink.ia.br/propostas/${data.proposal_id}`);
            sessions.delete(chatId);
        } else {
            await sendMessage(chatId, `❌ Erro ao enviar: ${data.error || 'tente novamente'}`);
        }
    } catch (err) {
        await sendMessage(chatId, `❌ Erro de conexão: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function sendFieldMenu(
    chatId: number,
    session: SugerirSession,
    sendMessage: CommandDependencies['sendMessage']
): Promise<void> {
    const list = CAMPOS.map((c, i) =>
        `${i + 1}. ${c.label}${session.items.some(it => it.field_path === c.key) ? ' ✅' : ''}`
    ).join('\n');

    await sendMessage(chatId,
        `✏️ *CAMPOS DISPONÍVEIS*\n${VISUAL.separator}\n\n${list}\n\n` +
        `Digite o número do campo que deseja corrigir.\n` +
        `_/cancelar para desistir_`
    );
}

const CAMPOS = [
    { key: 'nome',             label: 'Nome completo' },
    { key: 'data_nascimento',  label: 'Data de nascimento' },
    { key: 'nome_mae',         label: 'Nome da mãe' },
    { key: 'nome_pai',         label: 'Nome do pai' },
    { key: 'rg',               label: 'RG' },
    { key: 'sexo',             label: 'Sexo (M/F)' },
    { key: 'bairro',           label: 'Bairro' },
    { key: 'cidade',           label: 'Cidade' },
    { key: 'telefone',         label: 'Telefone' },
];

// ── Command ───────────────────────────────────────────────────────────────────

export const sugerirCommand: Command = {
    name: 'sugerir',
    aliases: ['editar', 'corrigir'],
    description: 'Propõe correção de dados de uma pessoa no grafo REDS',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        const cpf = args?.replace(/\D/g, '').trim();
        if (!cpf || cpf.length !== 11) {
            await sendMessage(chatId,
                `✏️ *SUGERIR EDIÇÃO DE DADOS*\n${VISUAL.separator}\n\n` +
                `Uso: \`/sugerir <cpf>\`\n\n` +
                `Exemplo: \`/sugerir 12345678900\``
            );
            return;
        }

        await sendMessage(chatId, `🔍 Buscando CPF ${cpf}...`);

        // Validate CPF exists in Neo4j
        type Row = { p: { properties: Record<string, unknown> } };
        const rows = await runQuery<Row>(
            'MATCH (p:Person {cpf: $cpf}) RETURN p LIMIT 1',
            { cpf }
        ).catch(() => [] as Row[]);

        if (!rows.length) {
            await sendMessage(chatId, `❌ CPF \`${cpf}\` não encontrado no grafo REDS.\n\nVerifique o número e tente novamente.`);
            return;
        }

        const props = rows[0].p.properties;
        const name = String(props.nome_original ?? props.name ?? 'Sem nome').toUpperCase();

        // Create session
        sessions.set(chatId, {
            step: 'choose_field',
            cpf,
            person_name: name,
            supabase_user_id: '',
            items: [],
            current_item: {},
            last_activity: Date.now(),
        });

        await sendMessage(chatId,
            `✏️ *PROPOSTA DE EDIÇÃO*\n${VISUAL.separator}\n\n` +
            `👤 *${name}*\n   CPF: \`${cpf}\`\n\n` +
            `Qual campo deseja corrigir?`
        );

        const session = sessions.get(chatId)!;
        await sendFieldMenu(chatId, session, sendMessage);
    }
};
