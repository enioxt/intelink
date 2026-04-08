import { IntelinkEntityDraft, IntelinkRelationshipDraft } from '@/lib/intelligence/etl-normalizer';

export interface AnomalyDetectionResult {
    detectorName: string;
    confidence: number; // 0.0 to 1.0 (e.g. 0.94 -> 94% critical)
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    entitiesInvolved: string[]; // Entity IDs
    evidenceRelationships: IntelinkRelationshipDraft[];
}

/**
 * Detector: Employees registered in private companies (RAIS) who also appear in Municipal Payrolls concurrently.
 * This pattern detects double-dipping or ghost employees.
 * Pattern: RAIS COMPANY X MUNICIPAL PAYROLL = DUAL RELATIONSHIP
 */
export async function detectGhostEmployees(
    entities: IntelinkEntityDraft[],
    relationships: IntelinkRelationshipDraft[]
): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    // In a real database like GraphDB:
    // MATCH (p:Person)-[:EMPLOYED_BY]->(c:Company), (p)-[:MUNICIPAL_SERVANT]->(gov:Government)
    // WHERE c.hours + gov.hours > 60 OR gov.is_fulltime = true
    // RETURN p, c, gov

    // Filtering for persons that have both a private connection and a public connection in the mock data
    const groupedRelationships = relationships.reduce((acc, rel) => {
        if (!acc[rel.source_id]) acc[rel.source_id] = [];
        acc[rel.source_id].push(rel);
        return acc;
    }, {} as Record<string, IntelinkRelationshipDraft[]>);

    for (const personId in groupedRelationships) {
        const personRels = groupedRelationships[personId];

        // Simplification for the mock demo: Check if the person is employed by > 1 distinct entities,
        // and one of them is "GOVERNMENT" related or labeled accordingly.
        const employers = personRels.filter(r => r.type === 'EMPLOYED_BY' || r.type === 'MUNICIPAL_SERVANT');

        if (employers.length > 1) {
            // Possible anomaly
            const person = entities.find(e => e.id === personId);
            const isPublicServant = employers.some(r => r.type === 'MUNICIPAL_SERVANT');

            if (isPublicServant && employers.some(r => r.type === 'EMPLOYED_BY')) {
                anomalies.push({
                    detectorName: 'GhostEmployeeDetector',
                    confidence: 0.94,
                    severity: 'CRITICAL',
                    title: '34 Funcionários Fantasma (Example Demo)',
                    description: `Identified dual-link pattern: ${person?.name} is registered in a private company and concurrently holds a public office.`,
                    entitiesInvolved: [personId, ...employers.map(e => e.target_id)],
                    evidenceRelationships: employers,
                });
            }
        }
    }

    return anomalies;
}
