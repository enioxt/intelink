/**
 * @egos/eval-runner — judge-LLM scoring
 *
 * Uses a cheap LLM (default: Haiku 4.5 via OpenRouter) to grade outputs
 * against a rubric. Returns 0..1 score for use as GoldenCase.score().
 *
 * Rubrics are explicit to avoid judge-bias + token waste. Template below.
 *
 * Usage:
 *   import { createJudge } from '@egos/eval-runner/judge';
 *   const judge = createJudge({ model: 'anthropic/claude-haiku-4-5' });
 *   const case: GoldenCase = {
 *     id: 'RAG-001',
 *     messages: [...],
 *     score: judge.rubric('faithfulness', 'A resposta deve usar apenas dados da investigação citada.'),
 *   };
 */

import type { EvalContext } from './types';

export interface JudgeConfig {
    /** OpenRouter-compatible model id. Default: anthropic/claude-haiku-4-5 */
    model?: string;
    /** API base URL. Default: https://openrouter.ai/api/v1 */
    baseURL?: string;
    /** API key. Default: process.env.OPENROUTER_API_KEY */
    apiKey?: string;
    /** Temperature. Default: 0 (deterministic) */
    temperature?: number;
    /** Max tokens for judge output. Default: 300 */
    maxTokens?: number;
}

export interface RubricInput {
    question: string;
    answer: string;
    criterion: string;
    context?: string;
}

const JUDGE_SYSTEM = `Você é um juiz de avaliação de respostas de chatbot policial. Dada a pergunta, a resposta e um critério, você avalia se a resposta atende ao critério.

Responda APENAS com um JSON válido no formato:
{"score": 0.0 a 1.0, "reason": "explicação curta em 1 frase"}

Valores:
- 1.0 = atende totalmente
- 0.7 = atende parcialmente (ressalva menor)
- 0.4 = atende pouco (problema significativo)
- 0.0 = não atende / contradiz critério

Seja estrito. Não dê notas altas por "boas intenções" — o critério é binário-ish.`;

interface JudgeResponse {
    score: number;
    reason: string;
}

export function createJudge(config: JudgeConfig = {}) {
    const model = config.model ?? 'anthropic/claude-haiku-4-5';
    const baseURL = config.baseURL ?? 'https://openrouter.ai/api/v1';
    const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    const temperature = config.temperature ?? 0;
    const maxTokens = config.maxTokens ?? 300;

    async function call(input: RubricInput): Promise<JudgeResponse> {
        if (!apiKey) {
            throw new Error('[judge] OPENROUTER_API_KEY not set');
        }
        const userMsg = [
            `PERGUNTA: ${input.question}`,
            input.context ? `CONTEXTO: ${input.context}` : null,
            `RESPOSTA: ${input.answer}`,
            `CRITÉRIO: ${input.criterion}`,
        ].filter(Boolean).join('\n\n');

        const res = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature,
                max_tokens: maxTokens,
                messages: [
                    { role: 'system', content: JUDGE_SYSTEM },
                    { role: 'user', content: userMsg },
                ],
            }),
        });
        if (!res.ok) {
            throw new Error(`[judge] HTTP ${res.status}: ${await res.text()}`);
        }
        const json = await res.json() as any;
        const content = json.choices?.[0]?.message?.content ?? '';
        try {
            const jsonMatch = content.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
            const parsed = JSON.parse(jsonMatch?.[0] ?? content) as JudgeResponse;
            const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0;
            return { score, reason: parsed.reason ?? '' };
        } catch {
            return { score: 0, reason: `judge returned non-JSON: ${content.slice(0, 120)}` };
        }
    }

    return {
        /**
         * Returns a scorer closure compatible with GoldenCase.score.
         * The question is extracted from the last user message via messages parameter
         * when wrapped. Simple usage just passes the raw criterion.
         */
        rubric(label: string, criterion: string, opts?: { question?: string; context?: string }) {
            return async (answer: string, ctx: EvalContext): Promise<number> => {
                const question = opts?.question ?? '(question not provided — pass via opts)';
                const context = opts?.context ?? (ctx.ragContexts ? ctx.ragContexts.join('\n---\n') : undefined);
                const result = await call({ question, answer, criterion, context });
                if (process.env.EVAL_JUDGE_DEBUG) {
                    console.log(`[judge:${label}] score=${result.score} reason=${result.reason}`);
                }
                return result.score;
            };
        },

        /** Raw call for custom orchestration */
        call,
    };
}
