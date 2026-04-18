/**
 * HHI (Herfindahl-Hirschman Index) Supplier Concentration Detector
 *
 * Detects abnormal concentration of public spending with specific suppliers.
 * Uses the same metric that CADE (Brazil's antitrust authority) uses to
 * evaluate monopolies.
 *
 * Reference: CEAP-Playbook (jpvss/CEAP-Playbook) — adapted from
 * their HHI notebook to a real-time TypeScript detector.
 *
 * How it works:
 * 1. Group all financial transactions by supplier (target entity)
 * 2. Calculate market share of each supplier
 * 3. Compute HHI = sum of squared market shares
 * 4. Flag entities with HHI > threshold (over-concentrated spending)
 *
 * HHI Scale:
 * - 0-1500: Competitive (many suppliers)
 * - 1500-2500: Moderate concentration
 * - 2500-10000: High concentration (potential collusion)
 *
 * @see https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index
 */

interface HHIAnomaly {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    confidence: number;
    entitiesInvolved: string[];
    metadata: {
        hhi: number;
        classification: 'competitive' | 'moderate' | 'concentrated';
        topSuppliers: Array<{ id: string; name: string; share: number; total: number }>;
        totalSpending: number;
        supplierCount: number;
    };
}

interface FinancialRelationship {
    source_id: string;
    target_id: string;
    type: string;
    weight: number;
    metadata: Record<string, unknown>;
}

interface FinancialEntity {
    type: string;
    name: string;
    metadata: Record<string, unknown>;
}

/**
 * Detect supplier concentration anomalies using HHI.
 *
 * @param entities - All entities in the graph
 * @param relationships - All financial relationships
 * @param options - Configuration
 */
export async function detectSupplierConcentration(
    entities: FinancialEntity[],
    relationships: FinancialRelationship[],
    options: {
        /** HHI threshold for flagging (default: 2500 = highly concentrated) */
        hhiThreshold?: number;
        /** Minimum number of transactions to analyze */
        minTransactions?: number;
        /** Financial relationship types */
        financialTypes?: string[];
        /** Value fields in metadata */
        valueFields?: string[];
    } = {},
): Promise<HHIAnomaly[]> {
    const {
        hhiThreshold = 2500,
        minTransactions = 10,
        financialTypes = ['PAYMENT', 'CONTRACT', 'EXPENSE', 'CEAP_EXPENSE', 'PURCHASE', 'EMENDA'],
        valueFields = ['value', 'amount', 'vlrLiquido', 'vlrDocumento'],
    } = options;

    const anomalies: HHIAnomaly[] = [];

    // 1. Group spending by source entity (the spender)
    const spenderData: Map<string, Map<string, number>> = new Map();

    const financialRels = relationships.filter(r => financialTypes.includes(r.type));

    for (const rel of financialRels) {
        let value = rel.weight;
        for (const field of valueFields) {
            const v = rel.metadata?.[field];
            if (typeof v === 'number' && v > 0) { value = v; break; }
        }
        if (value <= 0) continue;

        if (!spenderData.has(rel.source_id)) spenderData.set(rel.source_id, new Map());
        const suppliers = spenderData.get(rel.source_id)!;
        suppliers.set(rel.target_id, (suppliers.get(rel.target_id) || 0) + value);
    }

    // 2. Calculate HHI per spender
    for (const [spenderId, suppliers] of spenderData.entries()) {
        const totalTransactions = Array.from(suppliers.values()).length;
        if (totalTransactions < minTransactions) continue;

        const totalSpending = Array.from(suppliers.values()).reduce((a, b) => a + b, 0);
        if (totalSpending <= 0) continue;

        // Calculate market shares and HHI
        const shares: Array<{ id: string; share: number; total: number }> = [];
        let hhi = 0;

        for (const [supplierId, amount] of suppliers.entries()) {
            const share = (amount / totalSpending) * 100; // percentage
            shares.push({ id: supplierId, share, total: amount });
            hhi += share * share;
        }

        // Classify
        let classification: 'competitive' | 'moderate' | 'concentrated';
        if (hhi < 1500) classification = 'competitive';
        else if (hhi < 2500) classification = 'moderate';
        else classification = 'concentrated';

        // Flag if above threshold
        if (hhi >= hhiThreshold) {
            // Sort suppliers by share
            shares.sort((a, b) => b.share - a.share);
            const topSuppliers = shares.slice(0, 5).map(s => {
                const entity = entities.find(e => e.metadata?.id === s.id || e.name === s.id);
                return { id: s.id, name: entity?.name || s.id, share: s.share, total: s.total };
            });

            const spenderEntity = entities.find(e => e.metadata?.id === spenderId || e.name === spenderId);

            anomalies.push({
                severity: hhi > 5000 ? 'CRITICAL' : hhi > 3500 ? 'HIGH' : 'MEDIUM',
                title: `Alta concentração de fornecedores — ${spenderEntity?.name || spenderId}`,
                description:
                    `O HHI de ${spenderEntity?.name || spenderId} é ${hhi.toFixed(0)} (${classification}). ` +
                    `O fornecedor principal (${topSuppliers[0]?.name}) concentra ${topSuppliers[0]?.share.toFixed(1)}% ` +
                    `do total de R$ ${(totalSpending / 1000).toFixed(0)}k em gastos. ` +
                    `${suppliers.size} fornecedores no total. ` +
                    `Isso pode indicar direcionamento de contratos ou cartel.`,
                confidence: Math.min(0.95, hhi / 10000),
                entitiesInvolved: [spenderId, ...topSuppliers.map(s => s.id)],
                metadata: {
                    hhi,
                    classification,
                    topSuppliers,
                    totalSpending,
                    supplierCount: suppliers.size,
                },
            });
        }
    }

    return anomalies;
}

export type { HHIAnomaly };
