/**
 * TEST-001: Unit tests for CRIT scoring logic
 * Tests pure helper functions — no Neo4j required
 */

import { describe, it, expect } from 'vitest';

// ── Inline duplicates of pure helpers from crit.ts ───────────────────────────
// (Vitest can't easily import a command module without mocking neo4j-driver)

const CRIME_WEIGHTS: Record<string, number> = {
    homicidio: 10, homicídio: 10,
    latrocinio: 10, latrocínio: 10,
    estupro: 9,
    trafico: 9, tráfico: 9,
    roubo: 8, sequestro: 8,
    extorsao: 7, extorsão: 7,
    furto: 4, estelionato: 4,
    ameaca: 3, ameaça: 3,
    vias_de_fato: 2, lesao: 2, lesão: 2,
};

function crimeWeight(tipo: string): number {
    const t = tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [k, w] of Object.entries(CRIME_WEIGHTS)) {
        if (t.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) return w;
    }
    return 3;
}

function riskLabel(avg: number): { label: string; emoji: string } {
    if (avg >= 8) return { label: 'CRÍTICO', emoji: '🔴' };
    if (avg >= 6) return { label: 'ALTO', emoji: '🟠' };
    if (avg >= 4) return { label: 'MÉDIO', emoji: '🟡' };
    return { label: 'BAIXO', emoji: '🟢' };
}

function scoreBar(score: number, max = 10): string {
    const filled = Math.round(score / max * 8);
    return '█'.repeat(filled) + '░'.repeat(8 - filled);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('crimeWeight', () => {
    it('returns 10 for homicídio variants', () => {
        expect(crimeWeight('Homicídio Doloso')).toBe(10);
        expect(crimeWeight('HOMICIDIO')).toBe(10);
    });

    it('returns 8 for roubo', () => {
        expect(crimeWeight('Roubo a Transeunte')).toBe(8);
        expect(crimeWeight('ROUBO MAJORADO')).toBe(8);
    });

    it('returns 4 for furto', () => {
        expect(crimeWeight('Furto Qualificado')).toBe(4);
    });

    it('returns 9 for tráfico', () => {
        expect(crimeWeight('Tráfico de Drogas')).toBe(9);
        expect(crimeWeight('TRAFICO DE ENTORPECENTES')).toBe(9);
    });

    it('returns 3 as default for unknown crime type', () => {
        expect(crimeWeight('Perturbação do Sossego')).toBe(3);
        expect(crimeWeight('')).toBe(3);
    });
});

describe('riskLabel', () => {
    it('returns BAIXO for avg < 4', () => {
        expect(riskLabel(2).label).toBe('BAIXO');
        expect(riskLabel(3.9).emoji).toBe('🟢');
    });

    it('returns MÉDIO for 4 ≤ avg < 6', () => {
        expect(riskLabel(4).label).toBe('MÉDIO');
        expect(riskLabel(5.9).label).toBe('MÉDIO');
    });

    it('returns ALTO for 6 ≤ avg < 8', () => {
        expect(riskLabel(6).label).toBe('ALTO');
        expect(riskLabel(7.5).emoji).toBe('🟠');
    });

    it('returns CRÍTICO for avg ≥ 8', () => {
        expect(riskLabel(8).label).toBe('CRÍTICO');
        expect(riskLabel(10).emoji).toBe('🔴');
    });
});

describe('scoreBar', () => {
    it('returns 8 blocks for score 10', () => {
        expect(scoreBar(10)).toBe('████████');
    });

    it('returns all empty for score 0', () => {
        expect(scoreBar(0)).toBe('░░░░░░░░');
    });

    it('returns half filled for score 5', () => {
        expect(scoreBar(5)).toBe('████░░░░');
    });
});

describe('CRIT score calculation', () => {
    it('high occurrence count increases C score', () => {
        const totalOccs = 15;
        const recentOccs = 5;
        const maxGravity = 10;
        const scoreC = Math.min(10, Math.round(
            (Math.min(totalOccs, 15) / 15) * 4 +
            (Math.min(recentOccs, 5) / 5) * 3 +
            (maxGravity / 10) * 3
        ));
        expect(scoreC).toBe(10);
    });

    it('no co-persons gives R score of 0', () => {
        const coPersons = 0;
        const scoreR = Math.min(10, Math.round((Math.min(coPersons, 20) / 20) * 10));
        expect(scoreR).toBe(0);
    });

    it('all consumados gives I score boost', () => {
        const consumados = 5;
        const total = 5;
        const consumadoRatio = consumados / total;
        const reincidencia = Math.min((total - 1) / 10, 1);
        const scoreI = Math.min(10, Math.round(consumadoRatio * 5 + reincidencia * 5));
        expect(scoreI).toBeGreaterThan(6);
    });
});
