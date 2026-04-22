// INTELINK-014 (2026-04-22): these functions were stubs that did NOTHING.
// Discovery: golden eval PII-001 caught chatbot echoing CPF in response.
// Root cause: route.ts imports scanForPII/sanitizeText/createAtrianValidator from here,
// but they were no-op stubs. PII was never actually scanned or sanitized.
// Wired to real implementations in lib/pii-scanner.ts and lib/atrian.ts.

import { detectPII, type PIIFinding } from './pii-scanner';
import { validateATRiAN } from './atrian';

export function buildConversationMemoryBlock(_messages: unknown[]): string { return ''; }
export function buildConversationTranscript(_messages: unknown[]): string { return ''; }

export interface AtrianValidationResult {
    passed: boolean;
    score: number;
    violations: Array<{ category: string }>;
}

export function createAtrianValidator(_config?: {
    knownAcronyms?: string[];
    onViolation?: (result: { score: number; violations: Array<{ category: string }> }) => void;
}) {
    return {
        validate(text: string): AtrianValidationResult {
            const report = validateATRiAN(text);
            return {
                passed: report.passed,
                score: report.score,
                violations: report.violations.map(v => ({ category: v.category })),
            };
        },
        validateAndReport(text: string): AtrianValidationResult {
            const result = this.validate(text);
            if (!result.passed && _config?.onViolation) {
                _config.onViolation({ score: result.score, violations: result.violations });
            }
            return result;
        },
    };
}

export function getPIISummary(findings: PIIFinding[] | string[]): string {
    if (!findings || findings.length === 0) return '';
    if (typeof findings[0] === 'string') return (findings as string[]).join(',');
    const counts: Record<string, number> = {};
    for (const f of findings as PIIFinding[]) {
        counts[f.type] = (counts[f.type] ?? 0) + 1;
    }
    return Object.entries(counts).map(([t, c]) => `${t}:${c}`).join(',');
}

export function sanitizeText(text: string, findings?: PIIFinding[] | string[]): string {
    // Re-scan to compute masked text authoritatively (findings arg is informational).
    const report = detectPII(text);
    return report.maskedText;
}

export function scanForPII(text: string): PIIFinding[] {
    const report = detectPII(text);
    return report.findings;
}

export function shouldSummarizeConversation(messages: unknown[]): boolean {
    // Summarize when conversation grows beyond 10 turns
    return Array.isArray(messages) && messages.length > 10;
}
