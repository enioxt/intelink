/**
 * Normalização de identificadores — SSOT
 *
 * CPF SSOT: 11 dígitos sem separadores — "11122233300"
 * Telefone SSOT brasileiro: DDD com 0 + dígito 9 + 8 dígitos — "034999999999"
 * Telefone internacional: E.164 sem + — "15551234567" (EUA)
 */

// ─── CPF ─────────────────────────────────────────────────────────────────────

/** Normaliza CPF para 11 dígitos sem pontos/traços. Retorna null se inválido. */
export function normalizeCPF(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 11) return null;
    // Rejeitar CPFs com todos os dígitos iguais (inválidos mas passam no regex)
    if (/^(\d)\1+$/.test(digits)) return null;
    return digits;
}

/** Formata CPF normalizado para exibição: "111.222.333-00" */
export function formatCPF(cpf: string | null | undefined): string {
    if (!cpf) return '—';
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

// ─── Telefone ─────────────────────────────────────────────────────────────────

type Country = 'BR' | 'US' | 'UNKNOWN';

interface PhoneResult {
    normalized: string;     // SSOT format for storage
    display: string;        // Human-readable
    country: Country;
    valid: boolean;
}

/**
 * Normaliza telefone para SSOT.
 * BR SSOT: "034999999999" (0 + DDD + 9 + 8 dígitos = 13 chars total)
 * US: E.164 without + (11 digits: 1 + area + 7)
 */
export function normalizePhone(raw: string | null | undefined): PhoneResult {
    if (!raw) return { normalized: '', display: '—', country: 'UNKNOWN', valid: false };

    const digits = raw.replace(/\D/g, '');

    // Remove country prefix if present
    let working = digits;

    // Brazilian prefix +55
    if (working.startsWith('55') && working.length >= 12) {
        working = working.slice(2);
    }
    // US prefix +1
    if (working.startsWith('1') && working.length === 11) {
        const usNorm = working; // keep as-is
        const display = `+1 (${usNorm.slice(1,4)}) ${usNorm.slice(4,7)}-${usNorm.slice(7)}`;
        return { normalized: usNorm, display, country: 'US', valid: true };
    }

    // Brazilian number
    if (working.length >= 10 && working.length <= 11) {
        let ddd = working.slice(0, 2);
        let number = working.slice(2);

        // Add 9th digit for mobile (8 digit → 9 digit)
        if (number.length === 8 && ['6','7','8','9'].includes(number[0])) {
            number = '9' + number;
        }

        // Ensure DDD has leading 0
        const dddWithZero = ddd.startsWith('0') ? ddd : '0' + ddd;

        const normalized = dddWithZero + number;
        const display = `(${ddd}) ${number.slice(0, number.length - 4)}-${number.slice(-4)}`;

        if (normalized.length === 12 || normalized.length === 13) {
            return { normalized, display, country: 'BR', valid: true };
        }
    }

    return { normalized: digits, display: digits, country: 'UNKNOWN', valid: false };
}

/** Formata telefone para exibição sem normalizar storage */
export function formatPhone(raw: string | null | undefined): string {
    const result = normalizePhone(raw);
    return result.display;
}

// ─── Exibição de fonte ────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
    REDS_ETL:       'REDS',
    REDS_HOMICIDIO: 'REDS Homicídio',
    REDS_ARMA_FOGO: 'REDS Arma de Fogo',
    reds_homicidio: 'REDS Homicídio',
    reds_arma_fogo: 'REDS Arma de Fogo',
    RECEPTION_DATA: 'Recepção',
    reception_data: 'Recepção',
    PDF_INGEST:     'PDF Ingerido',
    PHOTO_INGEST:   'Foto Ingerida',
    DHPP_CS:        'DHPP-CS',
    dhpp_cs:        'DHPP CS',
    DHPP_EXTRACTOR: 'DHPP Extrator',
    dhpp_extractor: 'DHPP Extrator',
    dhpp_op:        'DHPP Operação',
    dhpp_ip:        'DHPP IP',
    manual:         'Manual',
    Telegram:       'Telegram',
    REDS:           'REDS',
};

export function formatSource(source: string | null | undefined): string {
    if (!source) return '—';
    return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

// ─── Detecção de nomes placeholder ───────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
    /^A APURAR/i,
    /^NÃO IDENTIFICADO/i,
    /^DESCONHECIDO/i,
    /^SEM NOME/i,
    /^ORDEM DE SERVICO/i,
    /^OUTROS$/i,
    /^[A-Z]{1,3}$/, // single initials
    /^[-\s.]+$/,
];

export function isPlaceholderName(name: string | null | undefined): boolean {
    if (!name || name.trim().length < 3) return true;
    return PLACEHOLDER_PATTERNS.some(p => p.test(name.trim()));
}
