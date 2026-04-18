/**
 * Cross-Case Analysis Types
 * 
 * Shared types for cross-case/cross-investigation analysis
 * Used by both the API route and the UI page
 */

export interface CrossCaseEntity {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    investigationCount: number;
    appearances: Array<{
        investigationId: string;
        investigationTitle: string;
        role: string;
        relationType: string;
        relationIcon: string;
        details: string;
    }>;
    insight: string;
}
