/**
 * AUDIT-001: Audit log helper para operações sensíveis do Intelink
 *
 * Registra em Supabase intelink_audit_logs (hash-chained via audit_log_hash_trigger):
 * - Consultas CRIT (quem consultou quem)
 * - Importações REDS
 * - Acessos a perfis de pessoas
 *
 * 2026-04-22 (INTELINK-012): schema fix — colunas renomeadas de resource_* para target_*
 * para alinhar com schema real da tabela. Versão anterior gravava em colunas inexistentes
 * e perdia metadata silenciosamente.
 */

import { createClient } from '@supabase/supabase-js';

type AuditAction = 'crit_query' | 'vinculos_query' | 'grupos_query' | 'reds_import' | 'profile_view' | 'tool_call';

export interface AuditEntry {
    action: AuditAction;
    operator_id?: string;
    operator_chat_id?: number;
    /** Tipo do alvo da operação (ex: 'Person', 'Investigation', 'chat_session') */
    target_type: string;
    /** Identificador único do alvo */
    target_id: string;
    details?: Record<string, unknown>;
}

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
    if (!_client) {
        _client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
            process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
        );
    }
    return _client;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (getClient().from('intelink_audit_logs') as any).insert({
            action: entry.action,
            actor_id: entry.operator_id ?? 'unknown',
            target_type: entry.target_type,
            target_id: entry.target_id,
            details: {
                operator_chat_id: entry.operator_chat_id,
                ...entry.details,
            },
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[audit] log failed (non-fatal):', err);
    }
}
