/**
 * AGENTE-001..007: Modo chatbot Telegram com memória + tools.
 * /agente ativa → todas as mensagens seguintes do chat são processadas como LLM queries.
 * /sair ou timeout 30min desativa.
 *
 * Tools disponíveis para o LLM:
 *   buscarPessoa(query) → busca REDS por nome ou CPF
 *   getOccurrences(cpf) → lista ocorrências de uma pessoa
 *   getLinks(cpf) → lista co-envolvidos
 *   criarProposta(cpf, fields) → sugere edição de dados
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';
import { runQuery } from '@/lib/neo4j/server';
import neo4j from 'neo4j-driver';

// ── Session memory (in-process, per chat_id) ──────────────────────────────
interface AgentMessage { role: 'user' | 'assistant'; content: string }
const activeSessions = new Map<number, { messages: AgentMessage[]; lastActivity: number }>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

export function isAgentActive(chatId: number): boolean {
    const session = activeSessions.get(chatId);
    if (!session) return false;
    if (Date.now() - session.lastActivity > SESSION_TIMEOUT_MS) {
        activeSessions.delete(chatId);
        return false;
    }
    return true;
}

export function deactivateAgent(chatId: number): void {
    activeSessions.delete(chatId);
}

export async function handleAgentMessage(
    chatId: number,
    userText: string,
    sendMessage: CommandDependencies['sendMessage']
): Promise<void> {
    let session = activeSessions.get(chatId);
    if (!session) return;

    session.messages.push({ role: 'user', content: userText });
    session.lastActivity = Date.now();
    // Keep last 10 messages
    if (session.messages.length > 10) session.messages = session.messages.slice(-10);

    await sendMessage(chatId, '🤖 _Processando..._');

    try {
        const response = await callLLMWithTools(session.messages, chatId, sendMessage);
        session.messages.push({ role: 'assistant', content: response });
        await sendMessage(chatId, response);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendMessage(chatId, `❌ Erro no agente: ${msg}\n\n_Use /sair para desativar o modo agente._`);
    }
}

// ── LLM + tool calling ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o Agente Intelink, assistente especializado em investigação policial.
Você tem acesso ao grafo REDS (registros policiais) e pode buscar informações sobre pessoas e ocorrências.

Responda sempre em português. Seja direto e objetivo.
Para buscar dados, use as tools disponíveis. Não invente informações.
Se não encontrar resultados, diga claramente.
Quando citar CPFs ou nomes, use \`backticks\`.

Ao final de respostas com dados de pessoa, lembre que: "⚠️ Dados sigilosos — uso restrito à investigação."`;

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'buscarPessoa',
            description: 'Busca pessoas no grafo REDS por nome ou CPF',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Nome completo ou CPF (11 dígitos)' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getOccurrences',
            description: 'Lista ocorrências REDS de uma pessoa',
            parameters: {
                type: 'object',
                properties: {
                    cpf: { type: 'string', description: 'CPF com 11 dígitos' }
                },
                required: ['cpf']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'getLinks',
            description: 'Lista pessoas co-envolvidas em ocorrências',
            parameters: {
                type: 'object',
                properties: {
                    cpf: { type: 'string', description: 'CPF com 11 dígitos' }
                },
                required: ['cpf']
            }
        }
    },
];

async function callLLMWithTools(
    messages: AgentMessage[],
    chatId: number,
    sendMessage: CommandDependencies['sendMessage']
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada');

    const payload = {
        model: 'minimax/minimax-m1',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
        ],
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 1500,
        temperature: 0.3,
    };

    let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://intelink.ia.br',
            'X-Title': 'Intelink Agent',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);

    const data = await response.json() as {
        choices: Array<{
            message: {
                content?: string;
                tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
            };
            finish_reason: string;
        }>;
    };

    const choice = data.choices[0];

    // If LLM wants to call tools
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        const toolMessages: Array<{ role: string; content: string; tool_call_id?: string; name?: string }> = [
            { role: 'assistant', content: choice.message.content ?? '', ...{ tool_calls: choice.message.tool_calls } }
        ];

        for (const tc of choice.message.tool_calls) {
            let toolResult: string;
            try {
                const args = JSON.parse(tc.function.arguments) as Record<string, string>;
                toolResult = await executeTool(tc.function.name, args);
            } catch (e) {
                toolResult = `Erro: ${e instanceof Error ? e.message : String(e)}`;
            }
            toolMessages.push({ role: 'tool', content: toolResult, tool_call_id: tc.id, name: tc.function.name });
        }

        // Second call with tool results
        const finalPayload = {
            ...payload,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages,
                ...toolMessages,
            ],
            tools: undefined,
            tool_choice: undefined,
        };

        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://intelink.ia.br',
                'X-Title': 'Intelink Agent',
            },
            body: JSON.stringify(finalPayload),
            signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) throw new Error(`OpenRouter final error: ${response.status}`);
        const finalData = await response.json() as { choices: Array<{ message: { content: string } }> };
        return finalData.choices[0]?.message?.content ?? 'Sem resposta.';
    }

    return choice.message.content ?? 'Sem resposta.';
}

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
    if (name === 'buscarPessoa') {
        const { query } = args;
        const isCpf = /^\d{10,11}$/.test(query.replace(/\D/g, ''));
        const cleanCpf = query.replace(/\D/g, '');

        type PersonRow = { p: { properties: Record<string, unknown> }; occ_count: unknown };
        const rows = isCpf
            ? await runQuery<PersonRow>(
                'MATCH (p:Person) WHERE p.cpf = $cpf OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o) RETURN p, count(o) AS occ_count LIMIT 3',
                { cpf: cleanCpf }
            )
            : await runQuery<PersonRow>(
                `CALL db.index.fulltext.queryNodes('personSearch', $q + '~') YIELD node AS p, score
                 OPTIONAL MATCH (p)-[:ENVOLVIDO_EM]->(o) RETURN p, count(o) AS occ_count
                 ORDER BY score DESC LIMIT 5`,
                { q: query, limit: neo4j.int(5) }
            );

        if (!rows.length) return 'Nenhuma pessoa encontrada.';

        return rows.map(row => {
            const p = row.p.properties;
            const name = String(p.nome_original ?? p.name ?? 'Sem nome').toUpperCase();
            const cpf = p.cpf ? String(p.cpf) : 'sem CPF';
            const occ = Number(row.occ_count ?? 0);
            const nasc = p.data_nascimento ? new Date(String(p.data_nascimento)).toLocaleDateString('pt-BR') : '';
            return `Nome: ${name} | CPF: ${cpf} | Nascimento: ${nasc} | Ocorrências: ${occ}`;
        }).join('\n');
    }

    if (name === 'getOccurrences') {
        const { cpf } = args;
        type OccRow = { o: { properties: Record<string, unknown> } };
        const rows = await runQuery<OccRow>(
            'MATCH (p:Person {cpf: $cpf})-[:ENVOLVIDO_EM]->(o:Occurrence) RETURN o ORDER BY o.data_fato DESC LIMIT 10',
            { cpf: cpf.replace(/\D/g, '') }
        );
        if (!rows.length) return 'Sem ocorrências REDS registradas.';
        return rows.map(r => {
            const o = r.o.properties;
            return `BO ${o.reds_number ?? '?'} | ${o.data_fato ? new Date(String(o.data_fato)).toLocaleDateString('pt-BR') : ''} | ${o.type ?? ''} | ${o.municipio ?? ''}`;
        }).join('\n');
    }

    if (name === 'getLinks') {
        const { cpf } = args;
        type LinkRow = { other: { properties: Record<string, unknown> }; shared: unknown };
        const rows = await runQuery<LinkRow>(
            `MATCH (p:Person {cpf: $cpf})-[:ENVOLVIDO_EM]->(o)<-[:ENVOLVIDO_EM]-(other:Person)
             WHERE other <> p
             RETURN other, count(o) AS shared ORDER BY shared DESC LIMIT 8`,
            { cpf: cpf.replace(/\D/g, '') }
        );
        if (!rows.length) return 'Sem co-envolvidos encontrados.';
        return rows.map(r => {
            const p = r.other.properties;
            const name = String(p.nome_original ?? p.name ?? 'Sem nome').toUpperCase();
            const ocpf = p.cpf ? String(p.cpf) : 'sem CPF';
            return `${name} | CPF: ${ocpf} | Ocorrências compartilhadas: ${r.shared}`;
        }).join('\n');
    }

    return `Tool "${name}" não reconhecida.`;
}

// ── Command handler ───────────────────────────────────────────────────────

export const agenteCommand: Command = {
    name: 'agente',
    aliases: ['agent', 'ia', 'chat'],
    description: 'Ativa modo chatbot com IA + acesso ao grafo REDS',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId } = ctx;
        const { sendMessage } = deps;

        if (isAgentActive(chatId)) {
            await sendMessage(chatId,
                `🤖 *Modo Agente já está ativo*\n${VISUAL.separator}\n\n` +
                `Envie sua pergunta ou consulta normalmente.\n\n` +
                `_Use /sair para desativar._`
            );
            return;
        }

        activeSessions.set(chatId, {
            messages: [],
            lastActivity: Date.now(),
        });

        await sendMessage(chatId,
            `🤖 *MODO AGENTE INTELINK ATIVADO*\n${VISUAL.separator}\n\n` +
            `Pode fazer perguntas em linguagem natural:\n\n` +
            `• _"Busca o João Silva nascido em 1985"_\n` +
            `• _"Quais os envolvidos no BO 2024/001234?"_\n` +
            `• _"CPF 12345678900 tem passagem?"_\n` +
            `• _"Quem mais aparece junto com Maria da Silva?"_\n\n` +
            `⚠️ Dados sigilosos — uso restrito à investigação.\n\n` +
            `_Timeout automático: 30 minutos · /sair para desativar_`
        );
    }
};

export const sairCommand: Command = {
    name: 'sair',
    aliases: ['exit', 'quit', 'stop'],
    description: 'Desativa o modo agente',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId } = ctx;
        deactivateAgent(chatId);
        await deps.sendMessage(chatId, `🤖 Modo Agente desativado. Use /agente para reativar.`);
    }
};
