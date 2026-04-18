/**
 * CONTRIB-016: sistema de confiança de dados.
 * 4 níveis por campo: REDS OFICIAL > CONFIRMADO > PROVÁVEL > NÃO CONFIRMADO
 */

export type ConfidenceLevel = 'REDS_OFICIAL' | 'CONFIRMADO' | 'PROVAVEL' | 'NAO_CONFIRMADO';

export interface FieldConfidence {
    level: ConfidenceLevel;
    badge: string;
    emoji: string;
    votes_for?: number;
    proposal_id?: string;
}

export function getConfidenceBadge(level: ConfidenceLevel): string {
    switch (level) {
        case 'REDS_OFICIAL':    return '🔵 REDS OFICIAL';
        case 'CONFIRMADO':      return '🟢 CONFIRMADO';
        case 'PROVAVEL':        return '🟡 PROVÁVEL';
        case 'NAO_CONFIRMADO':  return '🟠 NÃO CONFIRMADO';
    }
}

export function getConfidenceEmoji(level: ConfidenceLevel): string {
    const map: Record<ConfidenceLevel, string> = {
        REDS_OFICIAL: '🔵',
        CONFIRMADO: '🟢',
        PROVAVEL: '🟡',
        NAO_CONFIRMADO: '🟠',
    };
    return map[level];
}

/** Resolve level from vote counts (quorum = 3) */
export function levelFromVotes(votes_for: number, from_reds: boolean): ConfidenceLevel {
    if (from_reds) return 'REDS_OFICIAL';
    if (votes_for >= 3) return 'CONFIRMADO';
    if (votes_for === 2) return 'PROVAVEL';
    return 'NAO_CONFIRMADO';
}

/**
 * Fetches pending proposal count for a CPF from Supabase.
 * Used in buscar.ts to show ⚠️ badge.
 */
export async function getPendingProposalCount(
    cpf: string,
    supabaseClient: { from: (t: string) => unknown }
): Promise<number> {
    type SupabaseQuery = {
        select: (cols: string) => {
            eq: (col: string, val: string) => {
                eq: (col: string, val: string) => Promise<{ count: number | null; error: unknown }>;
            };
        };
    };
    const { count } = await (supabaseClient.from('intelink_proposals') as SupabaseQuery)
        .select('id')
        .eq('person_cpf', cpf)
        .eq('status', 'pending') as unknown as { count: number | null; error: unknown };
    return count ?? 0;
}
