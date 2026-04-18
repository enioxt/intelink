// Stub implementations — functions referenced in chat route but not yet implemented

export function buildConversationMemoryBlock(_messages: unknown[]): string { return ''; }
export function buildConversationTranscript(_messages: unknown[]): string { return ''; }
export function createAtrianValidator(_config?: Record<string, unknown>) {
    return {
        validate: (_text: string) => ({ valid: true, score: 1, violations: [] as Array<{ category: string }> }),
        validateAndReport: (_text: string) => ({ passed: true, score: 1, violations: [] as Array<{ category: string }> }),
    };
}
export function getPIISummary(_findings: string[]): string { return ''; }
export function sanitizeText(text: string, _findings?: string[]): string { return text; }
export function scanForPII(_text: string): string[] { return []; }
export function shouldSummarizeConversation(_messages: unknown[]): boolean { return false; }
