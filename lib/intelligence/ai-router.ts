/**
 * AI Router — Conversational Intelligence for Intelink
 * 
 * Replaces rigid /commands with natural language understanding.
 * User types anything → AI determines intent → executes query → returns formatted response.
 * 
 * Uses OpenRouter function calling to route to:
 * - Entity search (by name, CPF, CNPJ, plate)
 * - Region search (by city, state)
 * - Investigation search (by topic, keyword)
 * - Cross-reference (connections between entities)
 * - General intelligence questions (AI-powered)
 * 
 * @version 1.0.0
 */

import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI MODEL CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const AI_MODEL = process.env.EGOS_ORCHESTRATOR_MODEL || process.env.AI_MODEL || 'google/gemini-2.0-flash-001';

const DASHSCOPE_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function isQwenModel(model: string): boolean {
    return model.startsWith('qwen');
}

/**
 * Returns an OpenAI client configured for the current AI_MODEL.
 * - Qwen models → DashScope (uses DASHSCOPE_API_KEY or ALIBABA_API_KEY)
 * - Other models → uses the injected OpenAI client (OpenRouter)
 */
function getAIClient(injectedClient: OpenAI): OpenAI {
    if (isQwenModel(AI_MODEL)) {
        const apiKey = process.env.DASHSCOPE_API_KEY || process.env.ALIBABA_API_KEY || '';
        return new OpenAI({ apiKey, baseURL: DASHSCOPE_BASE_URL });
    }
    return injectedClient;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RouterDeps {
    supabase: SupabaseClient;
    openai: OpenAI;
    sendMessage: (chatId: number, text: string) => Promise<void>;
    sendMessageHTML: (chatId: number, text: string) => Promise<void>;
    botToken: string;
}

interface ToolResult {
    text: string;
    deepLinks?: string[];
}

const DASHBOARD_URL = 'https://intelink.ia.br';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL DEFINITIONS (for OpenRouter function calling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'search_entity',
            description: 'Search for a person, vehicle, company, phone, or location by name, CPF, CNPJ, plate number, or phone. Use this when the user asks about a specific person, company, vehicle, or wants to look up an identifier.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search term (name, CPF, CNPJ, plate, phone number)' },
                    type: { type: 'string', enum: ['PERSON', 'VEHICLE', 'ORGANIZATION', 'PHONE', 'LOCATION', 'any'], description: 'Entity type filter. Use "any" if unsure.' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_region',
            description: 'Search for investigations, entities, and public spending data in a specific city, state, or region of Brazil. Use when the user asks about a geographic area (e.g. "Patos de Minas", "Minas Gerais", "Uberlândia").',
            parameters: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: 'City name (e.g. "Patos de Minas")' },
                    state: { type: 'string', description: 'State abbreviation or name (e.g. "MG", "Minas Gerais")' },
                    topic: { type: 'string', description: 'Optional topic filter (e.g. "corruption", "public works", "health spending")' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_investigations',
            description: 'Search across all investigations by keyword or topic. Use when the user asks about cases, corruption, investigations, or specific topics.',
            parameters: {
                type: 'object',
                properties: {
                    keyword: { type: 'string', description: 'Search keyword or topic' },
                    status: { type: 'string', enum: ['active', 'archived', 'all'], description: 'Filter by investigation status' }
                },
                required: ['keyword']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'find_connections',
            description: 'Find connections and relationships between entities across investigations. Use when the user asks about connections, links, networks, or relationships between people/companies/vehicles.',
            parameters: {
                type: 'object',
                properties: {
                    entity_name: { type: 'string', description: 'Name of the entity to find connections for' },
                    depth: { type: 'number', description: 'How many levels of connections to explore (1-3)' }
                },
                required: ['entity_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_spending',
            description: 'Query public government spending data (CEAP, parliamentary expenses). Use when the user asks about government spending, public money, parliamentary expenses, or fiscal data.',
            parameters: {
                type: 'object',
                properties: {
                    entity_name: { type: 'string', description: 'Name of politician, company, or supplier' },
                    region: { type: 'string', description: 'State or city to filter by' },
                    min_value: { type: 'number', description: 'Minimum transaction value in BRL' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'general_intelligence',
            description: 'Answer general questions about how Intelink works, what data is available, or provide guidance. Use as fallback when no specific data query is needed.',
            parameters: {
                type: 'object',
                properties: {
                    question: { type: 'string', description: 'The user question to answer' }
                },
                required: ['question']
            }
        }
    }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM PROMPT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SYSTEM_PROMPT = `You are the Intelink Intelligence Agent — a conversational assistant for querying open public data in Brazil.

You help users investigate:
- Government spending (CEAP parliamentary expenses)
- Companies and their connections (CNPJ)
- Politicians and candidates (TSE)
- Cross-case connections between entities across investigations
- Regional intelligence (corruption, public works, health spending by city/state)

RULES:
1. ALWAYS use the available tools to query data. Never make up data.
2. If the user asks about a specific entity (person, company, CNPJ, CPF), use search_entity.
3. If the user asks about a region/city/state, use search_region.
4. If the user asks about connections or networks, use find_connections.
5. If the user asks about government spending, use query_spending.
6. You can call multiple tools if needed.
7. Respond in the SAME LANGUAGE the user writes in (Portuguese or English).
8. Be concise — this is a chat message, not a report.
9. Always include dashboard links when showing entities or investigations.
10. Mask CPF partially: show only first 3 and last 2 digits (e.g. 123.***.89).`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL EXECUTORS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function execSearchEntity(
    supabase: SupabaseClient,
    args: { query: string; type?: string }
): Promise<ToolResult> {
    const { query, type } = args;
    
    let dbQuery = supabase
        .from('intelink_entities')
        .select(`
            id, name, type, vulgo, properties, observations,
            investigation:intelink_investigations(id, title)
        `)
        .or(`name.ilike.%${query}%,vulgo.ilike.%${query}%,properties->cpf.ilike.%${query}%,properties->cnpj.ilike.%${query}%,properties->plate.ilike.%${query}%,properties->phone.ilike.%${query}%`)
        .limit(10);

    if (type && type !== 'any') {
        dbQuery = dbQuery.eq('type', type);
    }

    const { data: entities, error } = await dbQuery;
    
    if (error) return { text: `Database error: ${error.message}` };
    if (!entities?.length) return { text: `No entities found for "${query}". Try different terms or check spelling.` };

    const lines = entities.map(e => {
        const inv = (e.investigation as any);
        const props = (e.properties || {}) as Record<string, any>;
        const cpf = props.cpf ? maskCPF(props.cpf) : '';
        const cnpj = props.cnpj || '';
        const plate = props.plate || '';
        
        let info = `• **${e.name}**${e.vulgo ? ` (${e.vulgo})` : ''} — ${e.type}`;
        if (cpf) info += `\n  CPF: ${cpf}`;
        if (cnpj) info += `\n  CNPJ: ${cnpj}`;
        if (plate) info += `\n  Plate: ${plate}`;
        if (inv?.title) info += `\n  Investigation: ${inv.title}`;
        info += `\n  🔗 ${DASHBOARD_URL}/graph/${inv?.id || ''}#entity=${e.id}`;
        return info;
    });

    return {
        text: `🔍 **${entities.length} result(s) for "${query}":**\n\n${lines.join('\n\n')}`,
        deepLinks: entities.map(e => `${DASHBOARD_URL}/graph/${(e.investigation as any)?.id}`)
    };
}

async function execSearchRegion(
    supabase: SupabaseClient,
    args: { city?: string; state?: string; topic?: string }
): Promise<ToolResult> {
    const { city, state, topic } = args;
    const searchTerms: string[] = [];
    if (city) searchTerms.push(city);
    if (state) searchTerms.push(state);
    if (topic) searchTerms.push(topic);
    
    const searchQuery = searchTerms.join(' ');
    if (!searchQuery) return { text: 'Please specify a city or state to search.' };

    // Search entities by location/address
    const { data: entities } = await supabase
        .from('intelink_entities')
        .select(`
            id, name, type, properties,
            investigation:intelink_investigations(id, title)
        `)
        .or(`name.ilike.%${searchQuery}%,properties->address.ilike.%${searchQuery}%,properties->city.ilike.%${searchQuery}%,properties->state.ilike.%${searchQuery}%`)
        .limit(15);

    // Search investigations by title/description
    const { data: investigations } = await supabase
        .from('intelink_investigations')
        .select('id, title, description, status, created_at')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(10);

    // Search CEAP spending data if it exists
    const { data: spending } = await supabase
        .from('intelink_entities')
        .select('id, name, type, properties, investigation:intelink_investigations(id, title)')
        .eq('type', 'ORGANIZATION')
        .or(`name.ilike.%${searchQuery}%,properties->city.ilike.%${searchQuery}%`)
        .limit(10);

    const sections: string[] = [];

    if (investigations?.length) {
        const invLines = investigations.map(inv => 
            `• **${inv.title}** (${inv.status})\n  🔗 ${DASHBOARD_URL}/investigation/${inv.id}`
        );
        sections.push(`📂 **Investigations (${investigations.length}):**\n${invLines.join('\n')}`);
    }

    if (entities?.length) {
        const entLines = entities.slice(0, 8).map(e => {
            const inv = (e.investigation as any);
            return `• ${e.name} (${e.type})${inv?.title ? ` — ${inv.title}` : ''}`;
        });
        sections.push(`👥 **Entities (${entities.length}):**\n${entLines.join('\n')}`);
    }

    if (spending?.length) {
        const spendLines = spending.slice(0, 5).map(s => `• ${s.name}`);
        sections.push(`🏢 **Organizations (${spending.length}):**\n${spendLines.join('\n')}`);
    }

    if (!sections.length) {
        return { text: `📍 No data found for "${searchQuery}". Data coverage is expanding — try broader terms or check back later.` };
    }

    return {
        text: `📍 **Intelligence for "${searchQuery}":**\n\n${sections.join('\n\n')}\n\n🌐 Dashboard: ${DASHBOARD_URL}`,
    };
}

async function execSearchInvestigations(
    supabase: SupabaseClient,
    args: { keyword: string; status?: string }
): Promise<ToolResult> {
    const { keyword, status } = args;
    
    let query = supabase
        .from('intelink_investigations')
        .select('id, title, description, status, created_at')
        .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (status && status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return { text: `Error: ${error.message}` };
    if (!data?.length) return { text: `No investigations found for "${keyword}".` };

    const lines = data.map(inv => {
        const date = new Date(inv.created_at).toLocaleDateString('pt-BR');
        return `• **${inv.title}** (${inv.status}, ${date})\n  ${inv.description?.slice(0, 100) || 'No description'}\n  🔗 ${DASHBOARD_URL}/investigation/${inv.id}`;
    });

    return { text: `📂 **${data.length} investigation(s) for "${keyword}":**\n\n${lines.join('\n\n')}` };
}

async function execFindConnections(
    supabase: SupabaseClient,
    args: { entity_name: string; depth?: number }
): Promise<ToolResult> {
    const { entity_name } = args;
    
    // Find the entity
    const { data: entities } = await supabase
        .from('intelink_entities')
        .select('id, name, type, investigation:intelink_investigations(id, title)')
        .ilike('name', `%${entity_name}%`)
        .limit(3);

    if (!entities?.length) return { text: `Entity "${entity_name}" not found.` };
    
    const entity = entities[0];
    const inv = (entity.investigation as any);

    // Get relationships
    const { data: rels } = await supabase
        .from('intelink_relationships')
        .select(`
            type, description, weight,
            source:intelink_entities!source_id(id, name, type),
            target:intelink_entities!target_id(id, name, type)
        `)
        .or(`source_id.eq.${entity.id},target_id.eq.${entity.id}`)
        .limit(20);

    if (!rels?.length) {
        return { text: `🔗 **${entity.name}** has no known connections.\n\n🔗 ${DASHBOARD_URL}/graph/${inv?.id}#entity=${entity.id}` };
    }

    // Check cross-case appearances
    const { data: otherInvs } = await supabase
        .from('intelink_entities')
        .select('id, name, investigation:intelink_investigations(id, title)')
        .ilike('name', `%${entity_name}%`);

    const uniqueInvs = new Map<string, string>();
    otherInvs?.forEach(e => {
        const i = (e.investigation as any);
        if (i?.id) uniqueInvs.set(i.id, i.title);
    });

    const connLines = rels.map(r => {
        const other = (r.source as any)?.name === entity.name
            ? (r.target as any)
            : (r.source as any);
        return `• ${r.type}: **${other?.name}** (${other?.type})${r.description ? ` — ${r.description}` : ''}`;
    });

    let text = `🕸️ **Connections for ${entity.name}** (${entity.type}):\n\n${connLines.join('\n')}`;

    if (uniqueInvs.size > 1) {
        text += `\n\n⚠️ **Cross-Case Alert:** Appears in ${uniqueInvs.size} investigations:`;
        uniqueInvs.forEach((title, id) => {
            text += `\n• ${title} — ${DASHBOARD_URL}/investigation/${id}`;
        });
    }

    text += `\n\n🔗 Graph: ${DASHBOARD_URL}/graph/${inv?.id}#entity=${entity.id}`;

    return { text };
}

async function execQuerySpending(
    supabase: SupabaseClient,
    args: { entity_name?: string; region?: string; min_value?: number }
): Promise<ToolResult> {
    const { entity_name, region } = args;
    const searchTerms: string[] = [];
    if (entity_name) searchTerms.push(entity_name);
    if (region) searchTerms.push(region);
    
    if (!searchTerms.length) return { text: 'Please specify an entity name or region to search spending data.' };

    const searchQuery = searchTerms.join(' ');

    // Search CEAP-related entities and relationships
    const { data: entities } = await supabase
        .from('intelink_entities')
        .select(`
            id, name, type, properties,
            investigation:intelink_investigations(id, title)
        `)
        .or(`name.ilike.%${searchQuery}%,properties->supplier.ilike.%${searchQuery}%`)
        .in('type', ['ORGANIZATION', 'PERSON'])
        .limit(15);

    // Search relationships that might be financial
    const { data: financialRels } = await supabase
        .from('intelink_relationships')
        .select(`
            type, description, weight,
            source:intelink_entities!source_id(name, type),
            target:intelink_entities!target_id(name, type)
        `)
        .in('type', ['CUSTOMER', 'SUPPLIER', 'PAYMENT', 'CONTRACT'])
        .limit(20);

    const sections: string[] = [];

    if (entities?.length) {
        const lines = entities.slice(0, 10).map(e => {
            const props = (e.properties || {}) as Record<string, any>;
            let info = `• **${e.name}** (${e.type})`;
            if (props.cnpj) info += ` — CNPJ: ${props.cnpj}`;
            if (props.value) info += ` — R$ ${Number(props.value).toLocaleString('pt-BR')}`;
            return info;
        });
        sections.push(`💰 **Entities related to "${searchQuery}":**\n${lines.join('\n')}`);
    }

    if (financialRels?.length) {
        const relLines = financialRels.slice(0, 10).map(r => {
            const src = (r.source as any)?.name || '?';
            const tgt = (r.target as any)?.name || '?';
            return `• ${src} → ${r.type} → ${tgt}${r.description ? ` (${r.description})` : ''}`;
        });
        sections.push(`🔗 **Financial relationships:**\n${relLines.join('\n')}`);
    }

    if (!sections.length) {
        return { text: `💰 No spending data found for "${searchQuery}". CEAP data is being expanded.` };
    }

    return { text: `💰 **Spending Intelligence for "${searchQuery}":**\n\n${sections.join('\n\n')}\n\n🌐 ${DASHBOARD_URL}` };
}

function execGeneralIntelligence(args: { question: string }): ToolResult {
    return {
        text: `Intelink is an open-source intelligence platform for querying Brazilian public data.\n\n**Available data:**\n• CEAP (parliamentary expenses) — 5,000+ transactions\n• Entity networks (people, companies, vehicles)\n• Cross-case connections\n• Government spending patterns\n\n**Try asking:**\n• "Buscar empresa XYZ"\n• "Corrupção em Uberlândia"\n• "Conexões de João Silva"\n• "Gastos em Minas Gerais"\n\n🌐 Dashboard: ${DASHBOARD_URL}`
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function maskCPF(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.***.${digits.slice(9)}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ROUTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function routeNaturalLanguage(
    chatId: number,
    userMessage: string,
    deps: RouterDeps
): Promise<void> {
    const { supabase, openai, sendMessage } = deps;

    try {
        // Step 1: Send to AI with tool definitions
        const aiClient = getAIClient(openai);
        const response = await aiClient.chat.completions.create({
            model: AI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.3,
            max_tokens: 500
        });

        const message = response.choices[0]?.message;
        if (!message) {
            await sendMessage(chatId, '❌ No response from AI. Try again.');
            return;
        }

        // Step 2: If AI wants to call tools, execute them
        const toolCalls = message.tool_calls as any[];
        if (toolCalls?.length) {
            const results: string[] = [];

            for (const toolCall of toolCalls) {
                const fnName = toolCall.function?.name;
                let args: any = {};
                try {
                    args = JSON.parse(toolCall.function?.arguments || '{}');
                } catch {
                    continue;
                }

                let result: ToolResult;
                switch (fnName) {
                    case 'search_entity':
                        result = await execSearchEntity(supabase, args);
                        break;
                    case 'search_region':
                        result = await execSearchRegion(supabase, args);
                        break;
                    case 'search_investigations':
                        result = await execSearchInvestigations(supabase, args);
                        break;
                    case 'find_connections':
                        result = await execFindConnections(supabase, args);
                        break;
                    case 'query_spending':
                        result = await execQuerySpending(supabase, args);
                        break;
                    case 'general_intelligence':
                        result = execGeneralIntelligence(args);
                        break;
                    default:
                        result = { text: `Unknown tool: ${fnName}` };
                }
                results.push(result.text);
            }

            // Send all results
            const fullResponse = results.join('\n\n━━━━━━━━━━━━━━━━━━━\n\n');
            
            // Telegram has 4096 char limit
            if (fullResponse.length > 4000) {
                const chunks = splitMessage(fullResponse, 4000);
                for (const chunk of chunks) {
                    await sendMessage(chatId, chunk);
                }
            } else {
                await sendMessage(chatId, fullResponse);
            }
        } else {
            // AI responded directly (no tool call)
            const text = message.content || 'No response. Try being more specific.';
            await sendMessage(chatId, text);
        }

    } catch (error: any) {
        console.error('[AI Router] Error:', error.message || error);
        await sendMessage(chatId, `⚠️ Error processing your request. Try again or use commands:\n\n/buscar [term]\n/quem [name]\n/ajuda`);
    }
}

function splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }
        // Find last newline before maxLength
        let splitAt = remaining.lastIndexOf('\n', maxLength);
        if (splitAt === -1 || splitAt < maxLength / 2) splitAt = maxLength;
        chunks.push(remaining.slice(0, splitAt));
        remaining = remaining.slice(splitAt).trimStart();
    }
    return chunks;
}
