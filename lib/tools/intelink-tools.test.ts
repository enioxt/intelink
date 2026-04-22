import { describe, it, expect } from 'vitest';
import {
    INTELINK_TOOLS,
    executeToolCall,
    executeDetectCriminalArticles,
    executeAssessRisk,
    executeSuggestDiligences,
} from './intelink-tools';

describe('INTELINK_TOOLS registry', () => {
    it('exports an array of OpenAI-format tools', () => {
        expect(Array.isArray(INTELINK_TOOLS)).toBe(true);
        expect(INTELINK_TOOLS.length).toBeGreaterThan(0);
    });

    it('every tool has function.name and function.parameters', () => {
        for (const tool of INTELINK_TOOLS) {
            expect((tool as any).type).toBe('function');
            expect((tool as any).function?.name).toBeTruthy();
            expect((tool as any).function?.description).toBeTruthy();
            expect((tool as any).function?.parameters).toBeDefined();
        }
    });

    it('tool names are unique', () => {
        const names = INTELINK_TOOLS.map((t: any) => t.function.name);
        expect(new Set(names).size).toBe(names.length);
    });
});

describe('executeDetectCriminalArticles (pure)', () => {
    it('returns string for empty input', () => {
        const out = executeDetectCriminalArticles('texto sem termos jurídicos');
        expect(typeof out).toBe('string');
        expect(out).toContain('NENHUMA TIPIFICAÇÃO');
    });

    it('returns formatted detection for criminal text', () => {
        const out = executeDetectCriminalArticles('homicídio doloso com arma de fogo', 0.1);
        expect(typeof out).toBe('string');
        expect(out).not.toContain('NENHUMA TIPIFICAÇÃO');
    });
});

describe('executeAssessRisk (pure)', () => {
    it('returns formatted risk assessment string', () => {
        const out = executeAssessRisk('Suspeito X', { violentCrimeHistory: true });
        expect(typeof out).toBe('string');
        expect(out).toContain('ANÁLISE DE RISCO');
    });

    it('handles missing factors gracefully', () => {
        const out = executeAssessRisk('Sem dados', {});
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);
    });
});

describe('executeSuggestDiligences (pure)', () => {
    it('returns string suggestions', () => {
        const out = executeSuggestDiligences('Investigação de tráfico de drogas com 3 suspeitos');
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);
    });
});

describe('executeToolCall dispatcher', () => {
    it('routes pure tools without DB access', async () => {
        const out = await executeToolCall('detect_criminal_articles', { text: 'roubo qualificado', min_confidence: 0.1 }, 'test-inv');
        expect(typeof out).toBe('string');
    });

    it('returns error string for unknown tool name', async () => {
        const out = await executeToolCall('does_not_exist', {}, 'test-inv');
        expect(typeof out).toBe('string');
        expect(out.toLowerCase()).toMatch(/desconhec|unknown|erro|error|nao reconhec|não reconhec/i);
    });
});
