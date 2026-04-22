/**
 * INTELINK-003: Tool-call provenance logging.
 *
 * Writes every tool execution to `intelink_audit_logs` (action='tool_call').
 * The table has a trigger `audit_log_hash_trigger` that auto-fills
 * `prev_hash`, `hash`, `sequence_number` — making the chain immutable
 * for judicial admissibility.
 *
 * Failures are non-fatal (audit logging must never block chat operation).
 */

import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/api-utils';

export interface ToolCallProvenance {
    toolName: string;
    args: unknown;
    result: string;
    sessionId?: string;
    investigationId?: string;
    actorId: string;
    actorName?: string;
    actorRole?: string;
    durationMs?: number;
    costUsd?: number;
    error?: string;
}

const STABLE_REPLACER = (_key: string, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((acc, k) => {
                acc[k] = (value as Record<string, unknown>)[k];
                return acc;
            }, {});
    }
    return value;
};

function sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

export async function logToolCall(p: ToolCallProvenance): Promise<void> {
    try {
        const argsJson = JSON.stringify(p.args, STABLE_REPLACER);
        const argsHash = sha256(argsJson);
        const resultHash = sha256(p.result);

        await (getSupabaseAdmin().from('intelink_audit_logs') as any).insert({
            action: 'tool_call',
            actor_id: p.actorId,
            actor_name: p.actorName ?? null,
            actor_role: p.actorRole ?? null,
            target_type: 'chat_session',
            target_id: p.sessionId ?? p.investigationId ?? 'unknown',
            target_name: p.toolName,
            details: {
                tool: p.toolName,
                args_hash: argsHash,
                args_preview: argsJson.length > 500 ? argsJson.slice(0, 500) + '…' : argsJson,
                result_hash: resultHash,
                result_size: p.result.length,
                investigation_id: p.investigationId,
                duration_ms: p.durationMs,
                cost_usd: p.costUsd,
                error: p.error,
            },
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[provenance] log failed (non-fatal):', err);
    }
}

export async function getProvenance(sessionId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await (getSupabaseAdmin()
        .from('intelink_audit_logs') as any)
        .select('id, action, target_name, details, created_at, sequence_number, hash')
        .eq('target_type', 'chat_session')
        .eq('target_id', sessionId)
        .eq('action', 'tool_call')
        .order('sequence_number', { ascending: true });

    if (error) {
        console.error('[provenance] read failed:', error);
        return [];
    }
    return data ?? [];
}
