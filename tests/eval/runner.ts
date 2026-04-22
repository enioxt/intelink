/**
 * INTELINK eval runner — EVAL-A3
 *
 * Runs the golden dataset against a deployed intelink /api/chat.
 * Signs an ephemeral JWT for an "eval" user so auth works without a real login.
 *
 * Usage:
 *   BASE_URL=http://localhost:3001 bun tests/eval/runner.ts
 *   BASE_URL=https://intelink.ia.br bun tests/eval/runner.ts
 *   BASE_URL=http://127.0.0.1:3009 bun tests/eval/runner.ts   # VPS
 *
 * Env required:
 *   BASE_URL                — target chatbot URL (default http://localhost:3001)
 *   JWT_SECRET              — same value the target server uses (required to sign)
 *   EVAL_INVESTIGATION_ID   — optional, defaults to seeded UUID; skip RAG cases if unreachable
 *   EVAL_ONLY_CATEGORY      — optional, e.g. 'slash-commands' to run subset
 *   EVAL_MIN_PASS_RATE      — default 85; exit 1 if block-severity pass rate below this
 *   EVAL_CONCURRENCY        — default 3
 *   EVAL_TIMEOUT_MS         — default 45000
 *   EVAL_REPORT_JSON        — write JSON report to this path (for CI artifacts)
 */

import { runEval } from './lib/runner';
import type { EvalMessage, EvalReport } from './lib/types';
import { INTELINK_GOLDEN_CASES } from './golden/intelink';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
// Eval harness member row (seeded via Supabase migration)
const EVAL_MEMBER_ID = process.env.EVAL_MEMBER_ID ?? '00000000-0000-0000-0000-000000000001';
const ONLY_CATEGORY = process.env.EVAL_ONLY_CATEGORY;
const MIN_PASS_RATE = Number(process.env.EVAL_MIN_PASS_RATE ?? 85);
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 3);
const TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS ?? 45_000);
const REPORT_JSON = process.env.EVAL_REPORT_JSON;

// Validate eval member UUID format (getAuthContext enforces this)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(EVAL_MEMBER_ID)) {
    console.error(`ERROR: EVAL_MEMBER_ID must be a valid UUID, got: ${EVAL_MEMBER_ID}`);
    process.exit(2);
}

async function buildChatFn(memberId: string) {
    return async (messages: EvalMessage[]) => {
        const res = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `intelink_member_id=${memberId}`,
                'Authorization': `Bearer ${memberId}`,
                'x-eval-run': '1',
            },
            body: JSON.stringify({
                messages,
                mode: 'single',
                saveHistory: false,
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '<no-body>');
            throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
        }

        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const json = await res.json();
            return {
                text: json.response ?? json.message ?? JSON.stringify(json),
                // EVAL-A6: trajectory exposed by /api/chat — enables expectedTrajectory asserts
                trajectory: Array.isArray(json.trajectory) ? json.trajectory : undefined,
                meta: {
                    linkedInvestigationId: json.linkedInvestigationId,
                    sessionId: json.sessionId,
                    compliance: json.compliance,
                },
            };
        }

        // Fallback: text/stream — read fully
        return (await res.text()).trim();
    };
}

function renderReport(report: EvalReport): void {
    console.log(`\n🧪 INTELINK Eval — ${report.totalCases} cases against ${BASE_URL}\n`);

    const categories = Object.keys(report.byCategory).sort();
    for (const cat of categories) {
        const bucket = report.byCategory[cat]!;
        const icon = bucket.rate === 100 ? '✅' : bucket.rate >= 80 ? '🟡' : '❌';
        console.log(`${icon} [${cat}] ${bucket.passed}/${bucket.total} (${bucket.rate}%)`);

        const catResults = report.results.filter(r => (r.category ?? 'misc') === cat);
        for (const r of catResults) {
            if (r.passed) continue;
            const sev = r.severity === 'warn' ? '⚠️ ' : '❌';
            const reason = r.failures.slice(0, 2).join('; ');
            console.log(`  ${sev} ${r.caseId}: ${reason}`);
        }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(report.summary);
    console.log(`${'─'.repeat(60)}\n`);
}

async function main() {
    const cases = ONLY_CATEGORY
        ? INTELINK_GOLDEN_CASES.filter(c => c.category === ONLY_CATEGORY)
        : INTELINK_GOLDEN_CASES;

    if (cases.length === 0) {
        console.error(`No cases found${ONLY_CATEGORY ? ` for category "${ONLY_CATEGORY}"` : ''}.`);
        process.exit(2);
    }

    console.log(`Using eval member: ${EVAL_MEMBER_ID}`);
    const chatFn = await buildChatFn(EVAL_MEMBER_ID);

    console.log(`Running ${cases.length} cases with concurrency=${CONCURRENCY} timeout=${TIMEOUT_MS}ms…\n`);
    const start = Date.now();
    const report = await runEval(cases, chatFn, {
        concurrency: CONCURRENCY,
        timeoutMs: TIMEOUT_MS,
        onCaseComplete: (r) => {
            const icon = r.passed ? '.' : (r.severity === 'warn' ? 'w' : 'F');
            process.stdout.write(icon);
        },
    });
    console.log(`\n\nCompleted in ${((Date.now() - start) / 1000).toFixed(1)}s`);

    renderReport(report);

    if (REPORT_JSON) {
        const fs = await import('node:fs/promises');
        await fs.writeFile(REPORT_JSON, JSON.stringify(report, null, 2));
        console.log(`📄 Report written to ${REPORT_JSON}`);
    }

    // Exit code based on block-severity pass rate
    const blockPassRate = report.totalCases === 0
        ? 100
        : Math.round((report.passed / (report.passed + report.failed)) * 100);

    if (blockPassRate < MIN_PASS_RATE) {
        console.error(`\n❌ Block-severity pass rate ${blockPassRate}% < ${MIN_PASS_RATE}% threshold`);
        process.exit(1);
    }

    console.log(`\n✅ Block-severity pass rate ${blockPassRate}% ≥ ${MIN_PASS_RATE}% threshold`);
    process.exit(0);
}

main().catch((err) => {
    console.error('\n❌ Eval runner crashed:', err);
    process.exit(2);
});
