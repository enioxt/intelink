/**
 * @egos/eval-runner — types
 *
 * Golden case definition for any chat-style system.
 * A case is a triple (input messages, expected behavior assertions, optional custom scorer).
 * The runner scores each case and produces an aggregated report.
 */

export interface EvalMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface TrajectoryStep {
    /** Tool name that should appear */
    tool: string;
    /** Optional: expected order relative to other steps. If set on multiple steps, strict order is enforced. */
    order?: number;
}

export interface GoldenCase {
    /** Human-readable identifier (unique across suite) */
    id: string;
    /** Input conversation — last message is typically 'user' */
    messages: EvalMessage[];
    /** Substrings that MUST appear in the response (case-insensitive) */
    mustContain?: string[];
    /** Substrings that must NOT appear in the response (case-insensitive) */
    mustNotContain?: string[];
    /** Regex patterns that must NOT match the response */
    mustNotMatch?: RegExp[];
    /** Minimum response length in chars */
    minLength?: number;
    /** Maximum response length in chars */
    maxLength?: number;
    /** Custom deterministic scorer — returns 0..1, <0.5 = fail */
    score?: (response: string, ctx: EvalContext) => number | Promise<number>;
    /** Expected tool-call trajectory (EVAL-E1). Subset of actual trajectory in order. */
    expectedTrajectory?: TrajectoryStep[];
    /** Expected response for reference (not scored unless score() uses it) */
    expectedResponse?: string;
    /** Category for grouping results (e.g., 'safety', 'rag', 'tool-selection') */
    category?: string;
    /** Severity — 'block' = CI fail on regression, 'warn' = log only */
    severity?: 'block' | 'warn';
    /** Metadata passed through to custom scorers */
    metadata?: Record<string, unknown>;
}

export interface EvalContext {
    /** Full tool-call trajectory captured from response (if available) */
    trajectory?: string[];
    /** Retrieved RAG contexts (if available) */
    ragContexts?: string[];
    /** Token usage if available */
    usage?: { prompt: number; completion: number; total: number };
    /** Latency in ms */
    latencyMs: number;
    /** Any extra fields returned by chatFn */
    meta?: Record<string, unknown>;
}

export interface EvalResult {
    caseId: string;
    category?: string;
    severity: 'block' | 'warn';
    passed: boolean;
    score: number;
    response: string;
    durationMs: number;
    failures: string[];
    trajectory?: string[];
}

export interface EvalReport {
    totalCases: number;
    passed: number;
    failed: number;
    warned: number;
    passRate: number;
    avgScore: number;
    avgDurationMs: number;
    results: EvalResult[];
    summary: string;
    byCategory: Record<string, { passed: number; total: number; rate: number }>;
}

/**
 * chatFn receives input messages and returns the response text.
 * Optionally returns { text, trajectory, ragContexts, usage, meta } as a richer envelope.
 */
export type ChatFnResult = string | {
    text: string;
    trajectory?: string[];
    ragContexts?: string[];
    usage?: { prompt: number; completion: number; total: number };
    meta?: Record<string, unknown>;
};

export type ChatFn = (messages: EvalMessage[]) => Promise<ChatFnResult>;
