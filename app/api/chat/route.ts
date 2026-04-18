/**
 * Intelink Chat API - Enhanced Version
 * 
 * Suporta:
 * - Modo operação única
 * - Modo Central (todas operações)
 * - Geração de relatórios via comandos
 * - Contexto enriquecido com documentos
 * - Rate limiting e logging centralizado
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseAdmin } from '@/lib/api-utils';
import { apiLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, getClientIP, rateLimitExceeded, getRateLimitHeaders } from '@/lib/rate-limit';
import { withSecurity, AuthContext } from '@/lib/api-security';
import { OpenRouterProvider } from '@/lib/llm/llm-provider';
import { retrieveInvestigationContext, retrieveCentralContext, buildRAGSystemPrompt } from '@/lib/rag/context-retriever';

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'sk-placeholder',
    baseURL: "https://openrouter.ai/api/v1"
});

// Use centralized Supabase client

// ============================================
// SYSTEM PROMPT UNIFICADO - INTELINK v5
// Usando novo prompt builder avançado
// ============================================
import { buildIntelinkSystemPrompt, SystemPromptOptions } from '@/lib/prompts/intelink-system-prompt';
import { getPromptConfig } from '@/lib/prompts/registry';
import { INTELINK_TOOLS, executeToolCall } from '@/lib/tools/intelink-tools';
import { getMemoryContext, extractAndSaveFacts } from '@/lib/memory/chat-memory';
import { buildConversationMemoryBlock, buildConversationTranscript, createAtrianValidator, getPIISummary, sanitizeText, scanForPII, shouldSummarizeConversation } from '@/lib/shared';

const chatPromptConfig = getPromptConfig('chat.main');
const CHAT_MODEL = process.env.OPENROUTER_MODEL || process.env.LLM_MODEL || chatPromptConfig?.model || 'google/gemini-2.0-flash-001';
const CHAT_TEMPERATURE = chatPromptConfig?.temperature ?? 0.7;
const CHAT_MAX_TOKENS = chatPromptConfig?.maxTokens ?? 4000;
const openRouterProvider = new OpenRouterProvider({ model: CHAT_MODEL });
const atrian = createAtrianValidator({
    knownAcronyms: ['CPF', 'RG', 'REDS', 'RAG', 'LLM', 'IA', 'DHPP', 'MASP'],
    onViolation: (result: { score: number; violations: Array<{ category: string }> }) => apiLogger.warn('Intelink chat ATRiAN violation', {
        score: result.score,
        categories: [...new Set(result.violations.map((v) => v.category))]
    })
});

// Legacy prompt for fallback
const INTELINK_SYSTEM_PROMPT_LEGACY = `Você é INTELINK, Assistente de Inteligência Policial.
Responda em português brasileiro. Seja direto e profissional.
Para ênfase use MAIÚSCULAS (não asteriscos).`;

// ============================================
// MACI BEHAVIOR MODULATION
// Now handled by lib/prompts/intelink-system-prompt.ts
// ============================================

async function handlePost(req: NextRequest, auth: AuthContext): Promise<NextResponse> {
    const startTime = Date.now();
    const ip = getClientIP(req);
    
    // Rate limiting: Use member ID if authenticated, otherwise IP
    const rateLimitKey = auth.isAuthenticated ? `chat:user:${auth.memberId}` : `chat:ip:${ip}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.chat);
    
    if (!rateLimitResult.success) {
        apiLogger.warn('Chat API rate limit exceeded', { 
            key: rateLimitKey,
            user: auth.isAuthenticated ? auth.memberId : 'anonymous',
            ip 
        });
        return rateLimitExceeded(rateLimitResult);
    }
    
    try {
        const { 
            messages, 
            systemPrompt, 
            context, 
            investigationId,
            mode = 'single', // 'single' | 'central'
            sessionId, // Optional: for saving to history
            saveHistory = false, // Whether to save to history
            behavior, // MACI: { contentiousness: 0.0-1.0, mode?: 'explore'|'balanced'|'consolidate' }
            visualContext // Context Bridge: { investigationTitle, selectedEntities, activeView }
        } = await req.json();

        apiLogger.debug('Chat request received', { 
            mode, 
            investigationId, 
            messageCount: messages?.length,
            ip 
        });

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 });
        }

        if (!(await openRouterProvider.isAvailable())) {
            apiLogger.warn('Chat provider unavailable', { provider: openRouterProvider.name });
            return NextResponse.json({ error: 'Provedor LLM indisponível no momento.' }, { status: 503 });
        }

        // TENANT ISOLATION: Verify access to investigation if provided
        if (investigationId) {
            const { guardInvestigation } = await import('@/lib/tenant-guard');
            const accessDenied = await guardInvestigation(auth, investigationId);
            if (accessDenied) return accessDenied;
        }

        // Build enhanced context
        let enhancedContext = '';
        
        if (mode === 'central') {
            // TENANT ISOLATION: Central mode still filters by unit
            // Super admins (unitId = null) see everything, regular users see only their unit
            enhancedContext = await loadCentralContext(auth.unitId);
        } else if (investigationId) {
            // Load single investigation with full details
            enhancedContext = await loadInvestigationContext(investigationId);
        }

        // RAG: Retrieve specific context based on user's query
        let ragContext = '';
        const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
        const requestPIIFindings = scanForPII(lastUserMessage);
        const sanitizedLastUserMessage = requestPIIFindings.length > 0 ? sanitizeText(lastUserMessage, requestPIIFindings) : lastUserMessage;
        if (requestPIIFindings.length > 0) apiLogger.debug('Chat request PII detected', { count: requestPIIFindings.length, summary: getPIISummary(requestPIIFindings) });
        
        if (lastUserMessage.length > 10) {
            try {
                const ragResult = mode === 'central'
                    ? await retrieveCentralContext(lastUserMessage, 10, auth.unitId)
                    : investigationId
                        ? await retrieveInvestigationContext(investigationId, lastUserMessage, 10)
                        : null;
                
                if (ragResult && ragResult.contexts.length > 0) {
                    ragContext = buildRAGSystemPrompt(ragResult);
                    apiLogger.debug('RAG context retrieved', { 
                        terms: ragResult.searchTerms,
                        found: ragResult.totalFound,
                        used: ragResult.contexts.length 
                    });
                }
            } catch (ragError) {
                apiLogger.warn('RAG retrieval failed', { error: ragError });
                // Continue without RAG context
            }
        }

        // MACI: Generate behavior prompt if contentiousness is specified
        const contentiousness = behavior?.contentiousness !== undefined 
            ? Math.max(0, Math.min(1, behavior.contentiousness))
            : 0.5;

        // Build full system prompt with new builder
        const promptOptions: SystemPromptOptions = {
            mode,
            contentiousness,
            ragContext: ragContext || undefined,
        };

        // Add investigation context if available
        if (mode === 'single' && investigationId) {
            const { data: inv } = await getSupabaseAdmin()
                .from('intelink_investigations')
                .select('title, description, rho_score, rho_status')
                .eq('id', investigationId)
                .single();
            
            if (inv) {
                promptOptions.investigationTitle = inv.title;
                promptOptions.investigationDescription = inv.description;
                promptOptions.rhoScore = inv.rho_score;
                promptOptions.rhoStatus = inv.rho_status;
            }
        }

        // Retrieve memory context from previous conversations
        let memoryContext = '';
        const transcriptContext = shouldSummarizeConversation(messages)
            ? buildConversationTranscript(messages.map((message: any) => ({ role: message.role, content: String(message.content || '') })))
            : '';
        if (investigationId) {
            const memory = await getMemoryContext(investigationId, 8);
            memoryContext = [
                buildConversationMemoryBlock([{ title: 'Memória da investigação', summary: memory.summary }]),
                transcriptContext ? `## TRANSCRIÇÃO RECENTE DA SESSÃO ATUAL\n${transcriptContext}` : null,
            ].filter(Boolean).join('\n\n');
        } else if (transcriptContext) {
            memoryContext = `## TRANSCRIÇÃO RECENTE DA SESSÃO ATUAL\n${transcriptContext}`;
        }

        // Use new prompt builder or fallback to custom/legacy
        const baseSystemPrompt = systemPrompt || buildIntelinkSystemPrompt(promptOptions);
        
        // Context Bridge: Inject visual context from Dashboard
        let visualContextString = '';
        if (visualContext) {
            const parts: string[] = ['📍 CONTEXTO VISUAL ATUAL:'];
            if (visualContext.investigationTitle) {
                parts.push(`📂 Investigação: ${visualContext.investigationTitle}`);
            }
            if (visualContext.selectedEntities?.length > 0) {
                parts.push(`🎯 Entidades Selecionadas (${visualContext.selectedEntities.length}):`);
                visualContext.selectedEntities.forEach((e: any) => {
                    parts.push(`  - ${e.name} (${e.type})`);
                });
            }
            if (visualContext.activeView) {
                const viewLabels: Record<string, string> = {
                    list: 'Lista de Entidades',
                    graph: 'Grafo de Vínculos',
                    map: 'Mapa de Localizações',
                    timeline: 'Linha do Tempo',
                    analysis: 'Painel de Análise',
                    chat: 'Chat com IA',
                };
                parts.push(`👁️ Visualização: ${viewLabels[visualContext.activeView] || visualContext.activeView}`);
            }
            visualContextString = parts.join('\n') + '\n\n';
        }

        const systemPromptSections = [
            baseSystemPrompt.trim(),
            visualContextString.trim(),
            enhancedContext.trim(),
            memoryContext.trim(),
        ].filter(Boolean);
        const fullSystemPrompt = systemPromptSections.join('\n\n');
        apiLogger.debug('LLM routing', { provider: openRouterProvider.name, model: CHAT_MODEL, mode, promptId: chatPromptConfig?.id, sections: systemPromptSections.length });

        // Detect report generation request
        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
        const isReportRequest = lastMessage.includes('relatório') || 
                                lastMessage.includes('relatorio') ||
                                lastMessage.includes('exportar') ||
                                lastMessage.includes('pdf');

        console.log(`[Intelink Chat] Mode: ${mode}, Investigation: ${investigationId}, Context: ${enhancedContext.length} chars, RAG: ${ragContext.length} chars`);

        // Call LLM with Tool Calling enabled
        const completion = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: [
                { role: 'system', content: fullSystemPrompt },
                ...messages
            ],
            max_tokens: CHAT_MAX_TOKENS,
            temperature: CHAT_TEMPERATURE,
            tools: investigationId ? INTELINK_TOOLS : undefined, // Only enable tools if we have investigation context
            tool_choice: investigationId ? 'auto' : undefined,
        });

        let response = completion.choices[0]?.message?.content || '';
        const toolCalls = completion.choices[0]?.message?.tool_calls;

        // Process tool calls if any
        if (toolCalls && toolCalls.length > 0 && investigationId) {
            console.log(`[Intelink Chat] Processing ${toolCalls.length} tool calls`);
            
            const toolResults: string[] = [];
            for (const toolCall of toolCalls) {
                try {
                    // Handle both OpenAI standard format and custom format
                    const tc = toolCall as any;
                    const funcName = tc.function?.name || tc.name || 'unknown';
                    const funcArgs = tc.function?.arguments || tc.arguments || '{}';
                    const args = JSON.parse(funcArgs);
                    
                    const result = await executeToolCall(
                        funcName,
                        args,
                        investigationId
                    );
                    toolResults.push(`[${funcName}]\n${result}`);
                    console.log(`[Intelink Chat] Tool ${funcName} executed`);
                } catch (toolError: any) {
                    console.error(`[Intelink Chat] Tool error:`, toolError);
                    toolResults.push(`Erro ao executar ferramenta: ${toolError.message}`);
                }
            }

            // Make follow-up call with tool results
            const followUpCompletion = await openai.chat.completions.create({
                model: CHAT_MODEL,
                messages: [
                    { role: 'system', content: fullSystemPrompt },
                    ...messages,
                    { 
                        role: 'assistant', 
                        content: `Consultei os dados do sistema:\n\n${toolResults.join('\n\n')}`
                    },
                    {
                        role: 'user',
                        content: 'Com base nesses dados, responda minha pergunta anterior de forma clara e completa.'
                    }
                ],
                max_tokens: CHAT_MAX_TOKENS,
                temperature: CHAT_TEMPERATURE,
            });

            response = followUpCompletion.choices[0]?.message?.content || 'Sem resposta após consulta.';
        }

        // Fallback if no response
        if (!response) {
            response = 'Sem resposta.';
        }

        // If report was requested, generate and save it
        if (isReportRequest) {
            try {
                // Save the report to database
                const reportId = crypto.randomUUID();
                const timestamp = new Date().toISOString().split('T')[0];
                const reportTitle = `Relatório_IA_${timestamp}`;

                await getSupabaseAdmin().from('intelink_documents').insert({
                    id: reportId,
                    investigation_id: investigationId || null,
                    document_type: 'RELATORIO_IA',
                    original_filename: `${reportTitle}.md`,
                    summary: response.substring(0, 500),
                    historico_completo: response,
                    extraction_time_ms: 0
                });

                // Add download instructions
                response += `\n\n━━━━━━━━━━━━━━━━━━━\n📄 **RELATÓRIO SALVO**\n━━━━━━━━━━━━━━━━━━━\n`;
                response += `✅ Relatório salvo automaticamente no sistema.\n`;
                if (investigationId) {
                    response += `🔗 Acesse em: /investigation/${investigationId}/reports\n`;
                }
                response += `📋 ID: ${reportId.substring(0, 8)}...`;
            } catch (reportError) {
                console.error('[Intelink Chat] Report save error:', reportError);
                response += `\n\n━━━━━━━━━━━━━━━━━━━\n📄 **EXPORTAR RELATÓRIO**\n━━━━━━━━━━━━━━━━━━━\n`;
                response += `Para baixar em PDF, acesse a página de Relatórios.`;
            }
        }

        const responseAtrian = atrian.validateAndReport(response);
        if (!responseAtrian.passed) response += `\n\nOBSERVAÇÃO: trate esta resposta como apoio investigativo e confirme dados críticos diretamente nas fontes do caso.`;
        const responsePIIFindings = scanForPII(response);
        const sanitizedResponseForMemory = responsePIIFindings.length > 0 ? sanitizeText(response, responsePIIFindings) : response;
        if (responsePIIFindings.length > 0) apiLogger.debug('Chat response PII detected', { count: responsePIIFindings.length, summary: getPIISummary(responsePIIFindings) });

        console.log(`[Intelink Chat] Response tokens: ${completion.usage?.total_tokens}`);

        // Save to history if requested
        let savedSessionId = sessionId;
        if (saveHistory) {
            try {
                // Create session if not exists
                if (!savedSessionId) {
                    const { data: newSession } = await getSupabaseAdmin()
                        .from('intelink_chat_sessions')
                        .insert({
                            mode,
                            investigation_id: investigationId || null,
                            title: messages[0]?.content?.substring(0, 100) || 'Nova conversa',
                            message_count: 0,
                            total_tokens: 0
                        })
                        .select()
                        .single();
                    
                    savedSessionId = newSession?.id;
                }

                if (savedSessionId) {
                    // Save user message
                    const lastUserMsg = messages[messages.length - 1];
                    if (lastUserMsg?.role === 'user') {
                        await getSupabaseAdmin().from('intelink_chat_messages').insert({
                            session_id: savedSessionId,
                            role: 'user',
                            content: lastUserMsg.content
                        });
                    }

                    // Save assistant response
                    await getSupabaseAdmin().from('intelink_chat_messages').insert({
                        session_id: savedSessionId,
                        role: 'assistant',
                        content: response,
                        tokens: completion.usage?.total_tokens,
                        context_size: enhancedContext.length
                    });

                    // Update session stats
                    const { data: currentSession } = await getSupabaseAdmin()
                        .from('intelink_chat_sessions')
                        .select('message_count, total_tokens')
                        .eq('id', savedSessionId)
                        .single();

                    if (currentSession) {
                        await getSupabaseAdmin().from('intelink_chat_sessions').update({
                            message_count: (currentSession.message_count || 0) + 2,
                            total_tokens: (currentSession.total_tokens || 0) + (completion.usage?.total_tokens || 0)
                        }).eq('id', savedSessionId);
                    }
                }
            } catch (historyError) {
                console.error('[Intelink Chat] History save error:', historyError);
                // Don't fail the request if history save fails
            }
        }

        // Extract and save memory facts (async, don't wait)
        if (investigationId && savedSessionId) {
            extractAndSaveFacts(investigationId, savedSessionId, sanitizedLastUserMessage, sanitizedResponseForMemory)
                .catch(err => console.error('[Intelink Chat] Memory extraction error:', err));
        }

        return NextResponse.json({ 
            response,
            usage: completion.usage,
            mode,
            contextSize: enhancedContext.length,
            sessionId: savedSessionId,
            compliance: {
                atrian: { passed: responseAtrian.passed, score: responseAtrian.score, violations: responseAtrian.violations.length },
                pii: { findings: responsePIIFindings.length, summary: getPIISummary(responsePIIFindings) }
            }
        });

    } catch (e: any) {
        console.error('[Chat API] Error:', e);
        return NextResponse.json(
            { error: 'Erro ao processar mensagem. Tente novamente.' },
            { status: 500 }
        );
    }
}

// Protected: Only member+ can use chat
export const POST = withSecurity(handlePost, { requiredRole: 'visitor' });

// Load full context for a single investigation
async function loadInvestigationContext(investigationId: string): Promise<string> {
    let ctx = '';
    
    try {
        // 1. Investigation details
        const { data: inv } = await getSupabaseAdmin()
            .from('intelink_investigations')
            .select('*')
            .eq('id', investigationId)
            .single();
        
        if (inv) {
            ctx += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            ctx += `📁 INVESTIGAÇÃO: ${inv.title?.toUpperCase()}\n`;
            ctx += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            ctx += `Descrição: ${inv.description || 'N/A'}\n`;
            ctx += `Status: ${inv.status || 'Em andamento'}\n\n`;
        }

        // 2. Entities with full metadata
        const { data: entities } = await getSupabaseAdmin()
            .from('intelink_entities')
            .select('*')
            .eq('investigation_id', investigationId);
        
        if (entities && entities.length > 0) {
            ctx += `👥 ENTIDADES (${entities.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const e of entities) {
                ctx += `• ${e.name?.toUpperCase()} [${e.type}]\n`;
                if (e.metadata) {
                    const meta = e.metadata as Record<string, any>;
                    if (meta.cpf) ctx += `  CPF: ${meta.cpf}\n`;
                    if (meta.rg) ctx += `  RG: ${meta.rg}\n`;
                    if (meta.role) ctx += `  Papel: ${meta.role}\n`;
                    if (meta.placa) ctx += `  Placa: ${meta.placa}\n`;
                    if (meta.endereco) ctx += `  Endereço: ${meta.endereco}\n`;
                }
            }
            ctx += '\n';
        }

        // 3. Relationships with entity names
        const { data: relationships } = await getSupabaseAdmin()
            .from('intelink_relationships')
            .select(`
                *,
                source:source_entity_id(name, type),
                target:target_entity_id(name, type)
            `)
            .eq('investigation_id', investigationId);
        
        if (relationships && relationships.length > 0) {
            ctx += `🔗 VÍNCULOS (${relationships.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const r of relationships) {
                const source = (r.source as any)?.name?.toUpperCase() || 'DESCONHECIDO';
                const target = (r.target as any)?.name?.toUpperCase() || 'DESCONHECIDO';
                ctx += `• ${source} ─[${r.type}]─> ${target}\n`;
                if (r.description) ctx += `  Detalhes: ${r.description}\n`;
            }
            ctx += '\n';
        }

        // 4. Documents and summaries
        const { data: documents } = await getSupabaseAdmin()
            .from('intelink_documents')
            .select('id, document_type, summary, historico_completo, original_filename, created_at')
            .eq('investigation_id', investigationId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (documents && documents.length > 0) {
            ctx += `📄 DOCUMENTOS RECENTES (${documents.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const doc of documents) {
                ctx += `• [${doc.document_type?.toUpperCase()}] ${doc.original_filename || 'Documento'}\n`;
                if (doc.summary) {
                    ctx += `  Resumo: ${doc.summary.substring(0, 300)}${doc.summary.length > 300 ? '...' : ''}\n`;
                }
                if (doc.historico_completo) {
                    const hist = doc.historico_completo.substring(0, 500);
                    ctx += `  Histórico: ${hist}${doc.historico_completo.length > 500 ? '...' : ''}\n`;
                }
            }
            ctx += '\n';
        }

        // 5. Evidence
        const { data: evidence } = await getSupabaseAdmin()
            .from('intelink_evidence')
            .select('*')
            .eq('investigation_id', investigationId);
        
        if (evidence && evidence.length > 0) {
            ctx += `🔍 EVIDÊNCIAS (${evidence.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const ev of evidence) {
                ctx += `• [${ev.type}] ${ev.description}\n`;
                if (ev.quantity) ctx += `  Quantidade: ${ev.quantity}\n`;
            }
            ctx += '\n';
        }

        // 6. Achados Investigativos (Provas Subjetivas)
        const { data: findings } = await getSupabaseAdmin()
            .from('intelink_investigator_findings')
            .select('*')
            .eq('investigation_id', investigationId)
            .eq('status', 'active')
            .order('confidence', { ascending: false })
            .limit(10);
        
        if (findings && findings.length > 0) {
            ctx += `🔎 ACHADOS INVESTIGATIVOS (${findings.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            ctx += `(Observações do investigador - NÃO são provas periciais)\n\n`;
            
            const typeLabels: Record<string, string> = {
                'interview_impression': '💬 Impressão de Entrevista',
                'surveillance_obs': '👁️ Observação de Vigilância',
                'technical_analysis': '📊 Análise Técnica',
                'connection_hypothesis': '🔗 Hipótese de Conexão',
                'modus_operandi': '🎯 Modus Operandi',
                'source_intel': '🕵️ Informação de Fonte'
            };
            
            for (const f of findings) {
                const label = typeLabels[f.finding_type] || f.finding_type;
                ctx += `• ${label}: ${f.title}\n`;
                ctx += `  Descrição: ${f.description?.substring(0, 200)}${f.description?.length > 200 ? '...' : ''}\n`;
                ctx += `  Confiança: ${Math.round((f.confidence || 0) * 100)}%\n`;
                if (f.suggested_action) {
                    ctx += `  Ação Sugerida: ${f.suggested_action}\n`;
                }
                if (f.subject_names && f.subject_names.length > 0) {
                    ctx += `  Entidades: ${f.subject_names.join(', ')}\n`;
                }
                ctx += '\n';
            }
        }

        // 7. Cross-case alerts for this investigation
        const { data: alerts } = await getSupabaseAdmin()
            .from('intelink_cross_case_alerts')
            .select(`
                *,
                target_inv:target_investigation_id(title)
            `)
            .or(`source_investigation_id.eq.${investigationId},target_investigation_id.eq.${investigationId}`)
            .eq('status', 'pending')
            .limit(5);
        
        if (alerts && alerts.length > 0) {
            ctx += `⚠️ ALERTAS CROSS-CASE (${alerts.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const a of alerts) {
                ctx += `• ${a.entity_name?.toUpperCase()} - ${a.description}\n`;
                ctx += `  Match: ${a.match_type} | Confiança: ${Math.round((a.confidence || 0) * 100)}%\n`;
            }
        }

    } catch (error) {
        console.error('[loadInvestigationContext] Error:', error);
    }

    return ctx;
}

// Load context for Central Intelligence (filtered by unit for tenant isolation)
async function loadCentralContext(unitId?: string): Promise<string> {
    let ctx = '';
    
    try {
        ctx += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        ctx += `🏛️ MODO: CENTRAL DE INTELIGÊNCIA\n`;
        ctx += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        ctx += unitId 
            ? `Você tem acesso às operações da sua unidade.\n\n`
            : `Você tem acesso a TODAS as operações.\n\n`;

        // 1. All investigations summary (TENANT ISOLATED)
        let invQuery = getSupabaseAdmin()
            .from('intelink_investigations')
            .select('id, title, description, status, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (unitId) {
            invQuery = invQuery.eq('unit_id', unitId);
        }
        
        const { data: investigations } = await invQuery;
        
        if (investigations) {
            ctx += `📁 INVESTIGAÇÕES ATIVAS (${investigations.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const inv of investigations) {
                ctx += `• ${inv.title?.toUpperCase()} [${inv.status || 'Em andamento'}]\n`;
                if (inv.description) ctx += `  ${inv.description.substring(0, 100)}...\n`;
            }
            ctx += '\n';
        }

        // 2. Cross-case entities (appear in multiple investigations)
        // NOTE: get_cross_case_entities RPC needs to be updated to accept unit_id
        // For now, skip if unitId is set to avoid leaking cross-unit data
        if (!unitId) {
            const { data: crossCaseEntities } = await getSupabaseAdmin().rpc('get_cross_case_entities');
            
            if (crossCaseEntities && crossCaseEntities.length > 0) {
                ctx += `⚠️ ENTIDADES CROSS-CASE (aparecem em múltiplas operações):\n`;
                ctx += `─────────────────────────────────────────\n`;
                for (const e of crossCaseEntities.slice(0, 10)) {
                    ctx += `• ${e.name?.toUpperCase()} - ${e.investigation_count} operações\n`;
                }
                ctx += '\n';
            }
        }

        // 3. Recent entities (TENANT ISOLATED via investigation join)
        let entQuery = getSupabaseAdmin()
            .from('intelink_entities')
            .select('name, type, investigation_id, created_at, intelink_investigations!inner(unit_id)')
            .order('created_at', { ascending: false })
            .limit(30);
        
        if (unitId) {
            entQuery = entQuery.eq('intelink_investigations.unit_id', unitId);
        }
        
        const { data: recentEntities } = await entQuery;
        
        if (recentEntities) {
            ctx += `👥 ENTIDADES RECENTES (${recentEntities.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const e of recentEntities) {
                ctx += `• ${e.name?.toUpperCase()} [${e.type}]\n`;
            }
            ctx += '\n';
        }

        // 4. High-priority investigator findings across all investigations
        const { data: priorityFindings } = await getSupabaseAdmin()
            .from('intelink_investigator_findings')
            .select(`
                *,
                investigation:investigation_id(title)
            `)
            .eq('status', 'active')
            .eq('is_actionable', true)
            .in('action_priority', ['immediate', 'high'])
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (priorityFindings && priorityFindings.length > 0) {
            ctx += `🚨 ACHADOS DE ALTA PRIORIDADE (${priorityFindings.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const f of priorityFindings) {
                const invTitle = (f.investigation as any)?.title || 'Desconhecida';
                ctx += `• [${f.action_priority?.toUpperCase()}] ${f.title}\n`;
                ctx += `  Operação: ${invTitle}\n`;
                ctx += `  Ação: ${f.suggested_action || 'N/A'}\n\n`;
            }
        }

        // 5. Pending cross-case alerts
        const { data: pendingAlerts } = await getSupabaseAdmin()
            .from('intelink_cross_case_alerts')
            .select(`
                *,
                source_inv:source_investigation_id(title),
                target_inv:target_investigation_id(title)
            `)
            .eq('status', 'pending')
            .order('confidence', { ascending: false })
            .limit(10);
        
        if (pendingAlerts && pendingAlerts.length > 0) {
            ctx += `⚠️ ALERTAS CROSS-CASE PENDENTES (${pendingAlerts.length}):\n`;
            ctx += `─────────────────────────────────────────\n`;
            for (const a of pendingAlerts) {
                const source = (a.source_inv as any)?.title || '?';
                const target = (a.target_inv as any)?.title || '?';
                ctx += `• ${a.entity_name?.toUpperCase()} aparece em:\n`;
                ctx += `  - ${source}\n`;
                ctx += `  - ${target}\n`;
                ctx += `  Match: ${a.match_type} | Confiança: ${Math.round((a.confidence || 0) * 100)}%\n\n`;
            }
        }

    } catch (error) {
        console.error('[loadCentralContext] Error:', error);
    }

    return ctx;
}
