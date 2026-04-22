/**
 * @egos/eval-runner — runner
 *
 * Runs golden cases through a chatFn, scores each against assertions, aggregates.
 * Backwards-compatible with 852's original eval-runner.ts API.
 *
 * New in this package (vs 852 original):
 *   - mustNotMatch (regex) for PII/secret patterns
 *   - expectedTrajectory for tool-call sequence assertions
 *   - severity=block|warn (warn doesn't fail CI)
 *   - byCategory aggregation in report
 *   - chatFn may return rich envelope { text, trajectory, ragContexts, usage, meta }
 */

import type {
    ChatFn,
    EvalContext,
    EvalReport,
    EvalResult,
    GoldenCase,
    TrajectoryStep,
} from './types';

export interface RunEvalOptions {
    concurrency?: number;
    timeoutMs?: number;
    onCaseComplete?: (result: EvalResult) => void;
}

export async function runEval(
    cases: GoldenCase[],
    chatFn: ChatFn,
    options: RunEvalOptions = {},
): Promise<EvalReport> {
    const { concurrency = 3, timeoutMs = 30_000, onCaseComplete } = options;
    const results: EvalResult[] = [];

    for (let i = 0; i < cases.length; i += concurrency) {
        const batch = cases.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(c => runCase(c, chatFn, timeoutMs).then(r => {
                onCaseComplete?.(r);
                return r;
            })),
        );
        results.push(...batchResults);
    }

    return buildReport(results);
}

async function runCase(goldenCase: GoldenCase, chatFn: ChatFn, timeoutMs: number): Promise<EvalResult> {
    const start = Date.now();
    const failures: string[] = [];
    let responseText = '';
    let trajectory: string[] | undefined;
    const severity: 'block' | 'warn' = goldenCase.severity ?? 'block';

    try {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs),
        );
        const raw = await Promise.race([chatFn(goldenCase.messages), timeoutPromise]);
        if (typeof raw === 'string') {
            responseText = raw;
        } else {
            responseText = raw.text;
            trajectory = raw.trajectory;
        }
    } catch (err) {
        failures.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
        return {
            caseId: goldenCase.id,
            category: goldenCase.category,
            severity,
            passed: false,
            score: 0,
            response: '',
            durationMs: Date.now() - start,
            failures,
            trajectory,
        };
    }

    const lower = responseText.toLowerCase();

    for (const term of goldenCase.mustContain ?? []) {
        if (!lower.includes(term.toLowerCase())) {
            failures.push(`mustContain "${term}" not found`);
        }
    }
    for (const term of goldenCase.mustNotContain ?? []) {
        if (lower.includes(term.toLowerCase())) {
            failures.push(`mustNotContain "${term}" found`);
        }
    }
    for (const re of goldenCase.mustNotMatch ?? []) {
        if (re.test(responseText)) {
            failures.push(`mustNotMatch ${re} matched in response`);
        }
    }
    if (goldenCase.minLength && responseText.length < goldenCase.minLength) {
        failures.push(`response too short: ${responseText.length} < ${goldenCase.minLength}`);
    }
    if (goldenCase.maxLength && responseText.length > goldenCase.maxLength) {
        failures.push(`response too long: ${responseText.length} > ${goldenCase.maxLength}`);
    }

    // Trajectory assertions (EVAL-E1)
    if (goldenCase.expectedTrajectory && goldenCase.expectedTrajectory.length > 0) {
        if (!trajectory) {
            failures.push('expectedTrajectory set but chatFn did not return trajectory');
        } else {
            const trajFailures = checkTrajectory(goldenCase.expectedTrajectory, trajectory);
            failures.push(...trajFailures);
        }
    }

    // Custom scorer
    const ctx: EvalContext = {
        trajectory,
        latencyMs: Date.now() - start,
    };
    let score = failures.length === 0 ? 1 : 0;
    if (goldenCase.score) {
        try {
            score = await goldenCase.score(responseText, ctx);
            if (score < 0.5) failures.push(`custom score too low: ${score.toFixed(2)}`);
        } catch (err) {
            failures.push(`scorer error: ${err instanceof Error ? err.message : String(err)}`);
            score = 0;
        }
    }

    return {
        caseId: goldenCase.id,
        category: goldenCase.category,
        severity,
        passed: failures.length === 0,
        score,
        response: responseText,
        durationMs: Date.now() - start,
        failures,
        trajectory,
    };
}

/**
 * Verify expected trajectory is a subsequence of actual.
 * If all expected steps have numeric `order`, order is enforced strictly;
 * otherwise, only presence + relative order of expected steps is checked.
 */
export function checkTrajectory(expected: TrajectoryStep[], actual: string[]): string[] {
    const failures: string[] = [];
    let cursor = 0;

    const ordered = [...expected].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const step of ordered) {
        const idx = actual.indexOf(step.tool, cursor);
        if (idx === -1) {
            failures.push(
                `expected tool "${step.tool}" not found in trajectory [${actual.join(' → ')}]${
                    cursor > 0 ? ` (after position ${cursor})` : ''
                }`,
            );
            return failures;
        }
        cursor = idx + 1;
    }
    return failures;
}

function buildReport(results: EvalResult[]): EvalReport {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failedBlock = results.filter(r => !r.passed && r.severity === 'block').length;
    const warned = results.filter(r => !r.passed && r.severity === 'warn').length;
    const avgScore = total === 0 ? 0 : results.reduce((s, r) => s + r.score, 0) / total;
    const avgDurationMs = total === 0 ? 0 : Math.round(results.reduce((s, r) => s + r.durationMs, 0) / total);
    const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);

    const byCategory: Record<string, { passed: number; total: number; rate: number }> = {};
    for (const r of results) {
        const cat = r.category ?? 'misc';
        byCategory[cat] ??= { passed: 0, total: 0, rate: 0 };
        byCategory[cat]!.total += 1;
        if (r.passed) byCategory[cat]!.passed += 1;
    }
    for (const cat of Object.keys(byCategory)) {
        const bucket = byCategory[cat]!;
        bucket.rate = bucket.total === 0 ? 0 : Math.round((bucket.passed / bucket.total) * 100);
    }

    const failedIds = results.filter(r => !r.passed && r.severity === 'block').map(r => r.caseId);
    const summary = [
        `Eval: ${passed}/${total} passed (${passRate}%) | avg ${avgScore.toFixed(2)} | avg ${avgDurationMs}ms`,
        warned > 0 ? `Warnings: ${warned}` : null,
        failedIds.length > 0 ? `Blocking fails: ${failedIds.join(', ')}` : 'No blocking fails.',
    ].filter(Boolean).join('\n');

    return {
        totalCases: total,
        passed,
        failed: failedBlock,
        warned,
        passRate,
        avgScore,
        avgDurationMs,
        results,
        summary,
        byCategory,
    };
}
