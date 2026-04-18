/**
 * ALERT-002 + FRAME-001: /alerta — Sistema de alertas automáticos para supervisores
 *
 * /alerta on  — ativa alertas CRIT >= threshold para este chat
 * /alerta off — desativa alertas
 * /alerta status — mostra configuração atual
 *
 * Persistência: Supabase intelink_audit_logs (action='alert_subscription')
 * + in-memory cache para performance (sincronizado no boot e em cada mudança).
 *
 * Config via env: ALERT_CRIT_THRESHOLD (default: 8), ALERT_WEBHOOK_URL (opcional)
 */

import { Command, CommandContext, CommandDependencies } from './types';
import { createClient } from '@supabase/supabase-js';

const THRESHOLD = parseInt(process.env.ALERT_CRIT_THRESHOLD ?? '8', 10);
const AUDIT_TABLE = 'intelink_audit_logs';

// In-memory cache (populated at bot startup + on each toggle)
const alertChats = new Set<number>(
    process.env.ALERT_CHAT_IDS
        ? process.env.ALERT_CHAT_IDS.split(',').map(Number).filter(Boolean)
        : []
);
let _supabaseLoaded = false;

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );
}

/** Load persisted alert subscriptions from Supabase on first call */
async function loadPersistedAlerts(): Promise<void> {
    if (_supabaseLoaded) return;
    _supabaseLoaded = true;
    try {
        const sb = getSupabase();
        const { data } = await sb
            .from(AUDIT_TABLE)
            .select('details')
            .eq('action', 'alert_subscription')
            .eq('resource_type', 'active');
        for (const row of data ?? []) {
            const chatId = Number(row.details?.chat_id);
            if (chatId) alertChats.add(chatId);
        }
    } catch { /* non-fatal */ }
}

async function persistAlert(chatId: number, active: boolean): Promise<void> {
    try {
        const sb = getSupabase();
        if (active) {
            await sb.from(AUDIT_TABLE).upsert({
                action: 'alert_subscription',
                resource_type: 'active',
                resource_id: String(chatId),
                details: { chat_id: chatId },
                created_at: new Date().toISOString(),
            }, { onConflict: 'resource_id,action' });
        } else {
            await sb.from(AUDIT_TABLE)
                .delete()
                .eq('action', 'alert_subscription')
                .eq('resource_id', String(chatId));
        }
    } catch { /* non-fatal */ }
}

export function isAlertEnabled(chatId: number): boolean {
    return alertChats.has(chatId);
}

export function getAlertChats(): number[] {
    return [...alertChats];
}

/** Dispara alerta para todos os chats inscritos + webhook opcional */
export async function dispatchAlert(
    subject: string,
    message: string,
    sendMessage: (chatId: number, text: string) => Promise<void>
): Promise<void> {
    await loadPersistedAlerts();
    const text = `🚨 *ALERTA INTELINK*\n\n${subject}\n\n${message}`;

    await Promise.all([
        ...[...alertChats].map(id => sendMessage(id, text).catch(() => {})),
        process.env.ALERT_WEBHOOK_URL
            ? fetch(process.env.ALERT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message, timestamp: new Date().toISOString() }),
              }).catch(() => {})
            : Promise.resolve(),
    ]);
}

export const alertaCommand: Command = {
    name: 'alerta',
    aliases: ['alert', 'alertas'],
    description: 'Gerencia alertas automáticos de CRIT crítico para supervisores',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, args } = ctx;
        const { sendMessage } = deps;

        await loadPersistedAlerts();
        const sub = args.trim().toLowerCase();

        if (sub === 'on' || sub === 'ativar') {
            alertChats.add(chatId);
            await persistAlert(chatId, true);
            await sendMessage(chatId,
                `✅ *Alertas ativados* para este chat.\n\n` +
                `Você receberá notificações quando:\n` +
                `• Análise CRIT retornar risco *CRÍTICO* (≥ ${THRESHOLD})\n\n` +
                `Use /alerta off para desativar.`
            );
        } else if (sub === 'off' || sub === 'desativar') {
            alertChats.delete(chatId);
            await persistAlert(chatId, false);
            await sendMessage(chatId, `🔕 Alertas *desativados* para este chat.`);
        } else if (sub === 'status' || sub === '') {
            const enabled  = alertChats.has(chatId);
            const total    = alertChats.size;
            const webhook  = process.env.ALERT_WEBHOOK_URL ? '✅ configurado' : '⚠️ não configurado';
            await sendMessage(chatId,
                `📡 *Status de Alertas*\n\n` +
                `Este chat: ${enabled ? '✅ ATIVO' : '❌ inativo'}\n` +
                `Threshold CRIT: *${THRESHOLD}*\n` +
                `Total de chats inscritos: *${total}*\n` +
                `Webhook externo: ${webhook}\n\n` +
                `/alerta on — ativar\n` +
                `/alerta off — desativar`
            );
        } else {
            await sendMessage(chatId, `⚠️ Uso: /alerta [on|off|status]`);
        }
    },
};
