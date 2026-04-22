/**
 * INTELINK-003: GET /api/chat/[sessionId]/provenance
 *
 * Returns the immutable tool-call audit trail for a chat session.
 * Source: intelink_audit_logs (action='tool_call'), hash-chained for
 * judicial admissibility (audit_log_hash_trigger fills sequence + hash).
 *
 * See: docs/modules/CHATBOT_SSOT.md §17.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurityParams, type AuthContext } from '@/lib/api-security';
import { getProvenance } from '@/lib/intelligence/provenance';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

async function handleGet(_req: NextRequest, _auth: AuthContext, params: RouteParams['params']): Promise<NextResponse> {
    const { sessionId } = await params;
    if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const trail = await getProvenance(sessionId);

    return NextResponse.json({
        sessionId,
        count: trail.length,
        provenance: trail.map((row: any) => ({
            sequence: row.sequence_number,
            tool: row.target_name,
            timestamp: row.created_at,
            args_hash: row.details?.args_hash,
            result_hash: row.details?.result_hash,
            result_size: row.details?.result_size,
            duration_ms: row.details?.duration_ms,
            cost_usd: row.details?.cost_usd,
            error: row.details?.error,
            chain_hash: row.hash,
        })),
    });
}

export const GET = withSecurityParams<RouteParams>(handleGet, { requiredRole: 'visitor' });
