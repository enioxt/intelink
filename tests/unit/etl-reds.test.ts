/**
 * TEST-001: Unit tests for REDS ETL column detection + data cleaning
 */

import { describe, it, expect } from 'vitest';

// ── Pure helpers duplicated from etl-reds.ts / api/ingest/reds/route.ts ───────

const COL_MAP: Record<string, string[]> = {
    reds_number:     ['numero_reds', 'num_reds', 'reds', 'bo', 'numero_bo', 'numero_ocorrencia'],
    data_fato:       ['data_fato', 'data_ocorrencia', 'data', 'dt_fato'],
    tipo:            ['tipo_ocorrencia', 'tipo', 'natureza', 'especie'],
    municipio:       ['municipio', 'cidade_ocorrencia'],
    cpf:             ['cpf', 'cpf_envolvido'],
    nome:            ['nome', 'nome_envolvido', 'nome_completo'],
};

function findCol(headers: string[], cands: string[]): string | null {
    const norm = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
    for (const c of cands) {
        const i = norm.findIndex(h => h.includes(c));
        if (i >= 0) return headers[i];
    }
    return null;
}

function cleanCpf(s: string): string | null {
    const d = s.replace(/\D/g, '');
    return d.length >= 11 ? d.slice(0, 11) : null;
}

function cleanDate(s: string): string {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('findCol — REDS column detection', () => {
    it('finds reds_number by "numero_reds" header', () => {
        const headers = ['Numero_REDS', 'Data Fato', 'CPF'];
        expect(findCol(headers, COL_MAP.reds_number)).toBe('Numero_REDS');
    });

    it('finds reds_number by "BO" alias', () => {
        const headers = ['Bo', 'Nome', 'CPF'];
        expect(findCol(headers, COL_MAP.reds_number)).toBe('Bo');
    });

    it('finds CPF column case-insensitively', () => {
        const headers = ['NOME COMPLETO', 'CPF_ENVOLVIDO', 'DATA'];
        expect(findCol(headers, COL_MAP.cpf)).toBe('CPF_ENVOLVIDO');
    });

    it('returns null when column not found', () => {
        const headers = ['coluna_estranha', 'outra'];
        expect(findCol(headers, COL_MAP.cpf)).toBeNull();
    });

    it('handles headers with spaces', () => {
        const headers = ['Tipo Ocorrencia', 'Data Fato'];
        expect(findCol(headers, COL_MAP.tipo)).toBe('Tipo Ocorrencia');
    });
});

describe('cleanCpf', () => {
    it('strips formatting', () => {
        expect(cleanCpf('123.456.789-00')).toBe('12345678900');
    });

    it('accepts plain 11-digit string', () => {
        expect(cleanCpf('12345678900')).toBe('12345678900');
    });

    it('returns null for short string', () => {
        expect(cleanCpf('1234567')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(cleanCpf('')).toBeNull();
    });

    it('truncates to 11 digits if longer', () => {
        expect(cleanCpf('1234567890123')).toBe('12345678901');
    });
});

describe('cleanDate', () => {
    it('converts DD/MM/YYYY to ISO', () => {
        expect(cleanDate('25/04/2024')).toBe('2024-04-25');
    });

    it('passes through ISO dates', () => {
        expect(cleanDate('2024-04-25')).toBe('2024-04-25');
    });

    it('preserves unknown formats as-is', () => {
        expect(cleanDate('abril 2024')).toBe('abril 2024');
    });

    it('handles empty string', () => {
        expect(cleanDate('')).toBe('');
    });
});
