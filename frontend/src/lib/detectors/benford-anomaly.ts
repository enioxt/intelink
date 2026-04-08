/**
 * Benford's Law Anomaly Detector
 *
 * Applies Benford's Law (first-digit distribution) to financial datasets
 * to detect statistical anomalies in public spending data.
 *
 * Reference: CEAP-Playbook (jpvss/CEAP-Playbook) — adapted from
 * their Jupyter notebook implementation to a real-time TypeScript detector.
 *
 * How it works:
 * 1. Extract leading digits from all monetary values in relationships
 * 2. Compare observed distribution against Benford's expected distribution
 * 3. Use chi-squared test to determine if deviation is statistically significant
 * 4. Flag entities with abnormal spending patterns
 *
 * @see https://en.wikipedia.org/wiki/Benford%27s_law
 */

interface BenfordAnomaly {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    confidence: number;
    entitiesInvolved: string[];
    metadata: {
        chiSquared: number;
        pValue: number;
        observedDistribution: number[];
        expectedDistribution: number[];
        sampleSize: number;
        deviatingDigits: number[];
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

// Benford's Law expected frequencies for first digits 1-9
const BENFORD_EXPECTED = [
    0.301, // digit 1
    0.176, // digit 2
    0.125, // digit 3
    0.097, // digit 4
    0.079, // digit 5
    0.067, // digit 6
    0.058, // digit 7
    0.051, // digit 8
    0.046, // digit 9
];

/**
 * Extract the first significant digit from a number.
 * Returns 0 for zero or negative values (excluded from analysis).
 */
function firstDigit(value: number): number {
    const abs = Math.abs(value);
    if (abs < 1) return 0; // skip sub-unit values
    const str = abs.toString().replace(/[^0-9]/g, '');
    const first = parseInt(str[0], 10);
    return first >= 1 && first <= 9 ? first : 0;
}

/**
 * Calculate chi-squared statistic for observed vs expected distributions.
 */
function chiSquared(observed: number[], expected: number[], n: number): number {
    let chi2 = 0;
    for (let i = 0; i < 9; i++) {
        const exp = expected[i] * n;
        if (exp > 0) {
            chi2 += Math.pow(observed[i] - exp, 2) / exp;
        }
    }
    return chi2;
}

/**
 * Approximate p-value for chi-squared with 8 degrees of freedom.
 * Uses Wilson-Hilferty approximation.
 */
function chiSquaredPValue(chi2: number, df: number = 8): number {
    // Wilson-Hilferty approximation
    const z = Math.pow(chi2 / df, 1 / 3) - (1 - 2 / (9 * df));
    const denom = Math.sqrt(2 / (9 * df));
    const standardNormal = z / denom;
    // Approximate CDF of standard normal
    const t = 1 / (1 + 0.2316419 * Math.abs(standardNormal));
    const d = 0.3989422804014327;
    const p = d * Math.exp(-standardNormal * standardNormal / 2) *
        (0.3193815 * t + -0.3565638 * t * t + 1.781478 * t * t * t +
            -1.821256 * t * t * t * t + 1.330274 * t * t * t * t * t);
    return standardNormal > 0 ? p : 1 - p;
}

/**
 * Detect Benford's Law anomalies in financial transaction data.
 *
 * @param entities - All entities in the graph
 * @param relationships - All relationships (transactions, contracts, payments)
 * @param options - Configuration options
 * @returns Array of detected anomalies
 */
export async function detectBenfordAnomalies(
    entities: FinancialEntity[],
    relationships: FinancialRelationship[],
    options: {
        /** Minimum sample size for reliable Benford analysis */
        minSampleSize?: number;
        /** Significance level for flagging (default: 0.05) */
        significanceLevel?: number;
        /** Which relationship types contain financial data */
        financialTypes?: string[];
        /** Which metadata fields contain monetary values */
        valueFields?: string[];
    } = {},
): Promise<BenfordAnomaly[]> {
    const {
        minSampleSize = 30,
        significanceLevel = 0.05,
        financialTypes = ['PAYMENT', 'CONTRACT', 'EXPENSE', 'CEAP_EXPENSE', 'EMENDA', 'TRANSFER', 'PURCHASE'],
        valueFields = ['value', 'amount', 'salary', 'vlrLiquido', 'vlrDocumento', 'vlrGlosa'],
    } = options;

    const anomalies: BenfordAnomaly[] = [];

    // 1. Filter financial relationships
    const financialRels = relationships.filter(r =>
        financialTypes.includes(r.type) || r.weight > 0,
    );

    if (financialRels.length < minSampleSize) {
        return anomalies; // Not enough data for reliable analysis
    }

    // 2. Extract monetary values
    const allValues: number[] = [];
    const entityValues: Map<string, number[]> = new Map();

    for (const rel of financialRels) {
        const values: number[] = [];

        // Check weight
        if (rel.weight > 0) values.push(rel.weight);

        // Check metadata fields
        for (const field of valueFields) {
            const val = rel.metadata?.[field];
            if (typeof val === 'number' && val > 0) values.push(val);
        }

        for (const v of values) {
            allValues.push(v);

            // Track per entity
            if (!entityValues.has(rel.source_id)) entityValues.set(rel.source_id, []);
            entityValues.get(rel.source_id)!.push(v);
        }
    }

    // 3. Global Benford analysis
    const globalResult = analyzeBenford(allValues, minSampleSize);
    if (globalResult && globalResult.pValue < significanceLevel) {
        anomalies.push({
            severity: globalResult.pValue < 0.01 ? 'CRITICAL' : 'HIGH',
            title: 'Distribuição financeira viola Lei de Benford',
            description:
                `A distribuição dos dígitos iniciais em ${globalResult.sampleSize} transações ` +
                `não segue a Lei de Benford (χ²=${globalResult.chiSquared.toFixed(2)}, p=${globalResult.pValue.toFixed(4)}). ` +
                `Dígitos mais desviantes: ${globalResult.deviatingDigits.join(', ')}. ` +
                `Isso pode indicar fabricação de valores, arredondamentos artificiais ou fraude.`,
            confidence: Math.min(0.95, 1 - globalResult.pValue),
            entitiesInvolved: [],
            metadata: globalResult,
        });
    }

    // 4. Per-entity Benford analysis
    for (const [entityId, values] of entityValues.entries()) {
        const result = analyzeBenford(values, minSampleSize);
        if (result && result.pValue < significanceLevel) {
            const entity = entities.find(e =>
                e.metadata?.id === entityId || e.name === entityId,
            );

            anomalies.push({
                severity: result.pValue < 0.01 ? 'HIGH' : 'MEDIUM',
                title: `Padrão irregular nos gastos de ${entity?.name || entityId}`,
                description:
                    `Os valores financeiros associados a ${entity?.name || entityId} ` +
                    `(${result.sampleSize} transações) não seguem a distribuição esperada pela Lei de Benford ` +
                    `(χ²=${result.chiSquared.toFixed(2)}, p=${result.pValue.toFixed(4)}). ` +
                    `Dígitos com maior desvio: ${result.deviatingDigits.join(', ')}.`,
                confidence: Math.min(0.90, 1 - result.pValue),
                entitiesInvolved: [entityId],
                metadata: result,
            });
        }
    }

    return anomalies;
}

/**
 * Perform Benford analysis on an array of monetary values.
 */
function analyzeBenford(
    values: number[],
    minSampleSize: number,
): BenfordAnomaly['metadata'] | null {
    if (values.length < minSampleSize) return null;

    // Count first digits
    const digitCounts = new Array(9).fill(0);
    let validCount = 0;

    for (const v of values) {
        const d = firstDigit(v);
        if (d >= 1 && d <= 9) {
            digitCounts[d - 1]++;
            validCount++;
        }
    }

    if (validCount < minSampleSize) return null;

    // Calculate observed frequencies
    const observed = digitCounts.map(c => c);
    const observedFreq = digitCounts.map(c => c / validCount);

    // Chi-squared test
    const chi2 = chiSquared(observed, BENFORD_EXPECTED, validCount);
    const pValue = chiSquaredPValue(chi2);

    // Find most deviating digits
    const deviations = observedFreq.map((freq, i) => ({
        digit: i + 1,
        deviation: Math.abs(freq - BENFORD_EXPECTED[i]),
    }));
    deviations.sort((a, b) => b.deviation - a.deviation);
    const deviatingDigits = deviations
        .filter(d => d.deviation > 0.05)
        .map(d => d.digit);

    return {
        chiSquared: chi2,
        pValue,
        observedDistribution: observedFreq,
        expectedDistribution: BENFORD_EXPECTED,
        sampleSize: validCount,
        deviatingDigits,
    };
}

export { BENFORD_EXPECTED, firstDigit, chiSquared };
export type { BenfordAnomaly, FinancialRelationship, FinancialEntity };
