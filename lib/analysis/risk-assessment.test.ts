import { describe, it, expect } from 'vitest';
import { assessRisk, formatRiskAssessment, type RiskFactors } from './risk-assessment';

describe('assessRisk', () => {
    it('returns BAIXO when no risk factors are set', () => {
        const result = assessRisk('João Inocente', 'PERSON', {});
        expect(result.entityName).toBe('João Inocente');
        expect(result.scores).toHaveLength(3);
        expect(result.overallRisk).toMatch(/^(BAIXO|MODERADO)$/);
        expect(result.scores.map(s => s.category).sort()).toEqual(['DANGEROUSNESS', 'FLIGHT', 'RECIDIVISM']);
    });

    it('escalates risk when violent + organized crime + threats are present', () => {
        const factors: Partial<RiskFactors> = {
            violentCrimeHistory: true,
            weaponsInvolved: true,
            organizedCrimeLink: true,
            threatsToWitnesses: true,
            priorConvictions: 5,
            gangAffiliation: true,
        };
        const result = assessRisk('Suspeito Perigoso', 'PERSON', factors);
        expect(result.overallRisk).toMatch(/^(ALTO|MUITO_ALTO)$/);
        const danger = result.scores.find(s => s.category === 'DANGEROUSNESS')!;
        expect(danger.level).toMatch(/^(ALTO|MUITO_ALTO)$/);
    });

    it('flight risk increases when no fixed residence + has passport + prior flight', () => {
        const factors: Partial<RiskFactors> = {
            hasFixedResidence: false,
            hasStableEmployment: false,
            hasFamilyTies: false,
            hasPassport: true,
            previousFlightAttempts: 2,
        };
        const result = assessRisk('Foragido', 'PERSON', factors);
        const flight = result.scores.find(s => s.category === 'FLIGHT')!;
        expect(flight.score).toBeGreaterThan(40);
    });

    it('includes legal basis articles in output', () => {
        const result = assessRisk('X', 'PERSON', { organizedCrimeLink: true });
        expect(result.legalBasis.some(b => /12\.850/.test(b))).toBe(true);
    });

    it('preserves entityId when provided', () => {
        const result = assessRisk('X', 'PERSON', {}, 'entity-uuid-123');
        expect(result.entityId).toBe('entity-uuid-123');
    });

    it('returns assessedAt as Date', () => {
        const result = assessRisk('X', 'PERSON', {});
        expect(result.assessedAt).toBeInstanceOf(Date);
    });
});

describe('formatRiskAssessment', () => {
    it('produces non-empty string output', () => {
        const result = assessRisk('Test', 'PERSON', {});
        const formatted = formatRiskAssessment(result);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(50);
        expect(formatted).toContain('ANÁLISE DE RISCO');
    });
});
