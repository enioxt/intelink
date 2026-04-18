/**
 * AUDIT-001: Audit log helper para operações sensíveis do Intelink
 *
 * Registra em Supabase intelink_audit_logs:
 * - Consultas CRIT (quem consultou quem)
 * - Importações REDS
 * - Acessos a perfis de pessoas
 */

import { createClient } from '@supabase/supabase-js';

type AuditAction = 'crit_query' | 'vinculos_query' | 'grupos_query' | 'reds_import' | 'profile_view';

interface AuditEntry {
    action: AuditAction;
    operator_id?: string;
    operator_chat_id?: number;
    resource_type: string;
    resource_id: string;
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
            resource_type: entry.resource_type,
            resource_id: entry.resource_id,
            details: {
                operator_id: entry.operator_id,
                operator_chat_id: entry.operator_chat_id,
                ...entry.details,
            },
            created_at: new Date().toISOString(),
        });
    } catch { /* non-fatal: audit failure must not block operation */ }
}
