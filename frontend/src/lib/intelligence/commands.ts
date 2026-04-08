/**
 * Commands & Menus para INTELINK Bot
 * 
 * Funções de comando e menus interativos do Telegram
 * Extraído de intelink-service.ts para modularização
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface CommandDeps {
    supabase: SupabaseClient;
    sendMessage: (chatId: number, text: string, replyMarkup?: any) => Promise<void>;
    visual: {
        separator: string;
        separatorShort: string;
        getType: (type: string) => { icon: string; label: string };
        formatName: (name: string) => string;
    };
}

export interface CommandContext {
    chatId: number;
    text: string;
    userId?: string;
    investigationId?: string;
}

export interface CommandDependencies {
    supabase: SupabaseClient;
    sendMessage: (chatId: number, text: string, replyMarkup?: unknown) => Promise<void>;
}

export interface ParsedCommand {
    command: string;
    args: string[];
}

export function parseCommand(text: string): ParsedCommand | null {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return null;
    const parts = trimmed.slice(1).split(/\s+/);
    return { command: parts[0].toLowerCase(), args: parts.slice(1) };
}

type CommandHandler = (ctx: CommandContext, deps: CommandDependencies) => Promise<string | void>;

class CommandRegistry {
    private handlers = new Map<string, CommandHandler>();

    register(command: string, handler: CommandHandler) {
        this.handlers.set(command, handler);
    }

    has(command: string): boolean {
        return this.handlers.has(command);
    }

    async execute(command: string, ctx: CommandContext, deps: CommandDependencies): Promise<boolean> {
        const handler = this.handlers.get(command);
        if (!handler) return false;
        await handler(ctx, deps);
        return true;
    }
}

export const commandRegistry = new CommandRegistry();

// ============================================
// MENU FUNCTIONS
// ============================================

/**
 * Envia menu principal com ações disponíveis
 */
export async function sendMainMenu(
    chatId: number,
    text: string,
    sendMessage: (chatId: number, text: string, replyMarkup?: any) => Promise<void>
): Promise<void> {
    await sendMessage(chatId, text, {
        inline_keyboard: [
            [{ text: "📂 Selecionar Caso", callback_data: "case_select" }, { text: "📥 Inserir Dados", callback_data: "menu_prompts" }],
            [{ text: "🔍 Buscar (Quem é)", callback_data: "search_whois" }, { text: "🕸️ Ver Grafo", callback_data: "search_graph" }],
            [{ text: "🌉 Analisar Pontes", callback_data: "analyze_bridge" }]
        ]
    });
}

/**
 * Envia menu de seleção de tipo de documento
 */
export async function sendPromptMenu(
    chatId: number,
    sendMessage: (chatId: number, text: string, replyMarkup?: any) => Promise<void>
): Promise<void> {
    await sendMessage(chatId, "📜 **Selecione o Tipo de Documento:**", {
        inline_keyboard: [
            [{ text: "🚔 Ocorrência Policial", callback_data: "prompt_ocorrencia" }],
            [{ text: "🗣️ Depoimento / Termo", callback_data: "prompt_depoimento" }],
            [{ text: "🔙 Voltar", callback_data: "menu_main" }]
        ]
    });
}

// ============================================
// ANALYZE COMMAND
// ============================================

/**
 * Analisa rede de entidades e calcula centralidade
 */
export async function handleAnalyzeCommand(
    chatId: number,
    _text: string,
    deps: CommandDeps
): Promise<void> {
    const { supabase, sendMessage, visual } = deps;

    const { data: session } = await supabase
        .from('intelink_sessions')
        .select('investigation_id')
        .eq('chat_id', chatId)
        .single();

    if (!session?.investigation_id) {
        await sendMessage(chatId, '⚠️ Selecione um caso primeiro.');
        return;
    }

    await sendMessage(chatId, "⏳ **Analisando rede...** (Calculando Centralidade)");

    // 1. Fetch all nodes and edges for this investigation
    const { data: nodes } = await supabase
        .from('intelink_entities')
        .select('id, name, type')
        .eq('investigation_id', session.investigation_id);

    const { data: edges } = await supabase
        .from('intelink_relationships')
        .select('source_id, target_id')
        .eq('investigation_id', session.investigation_id);

    if (!nodes || !edges || nodes.length === 0) {
        await sendMessage(chatId, "❌ Nenhuma entidade encontrada. Use `/inserir` para adicionar dados.");
        return;
    }

    // 2. Build Graph (Adjacency List)
    const graph = new Map<string, string[]>();
    const nodeData = new Map<string, { name: string; type: string }>();

    nodes.forEach(n => {
        graph.set(n.id, []);
        nodeData.set(n.id, { name: n.name, type: n.type });
    });

    edges.forEach(e => {
        if (graph.has(e.source_id)) graph.get(e.source_id)?.push(e.target_id);
        if (graph.has(e.target_id)) graph.get(e.target_id)?.push(e.source_id);
    });

    // 3. Calculate Degree Centrality
    const centrality: Array<{ id: string; name: string; type: string; degree: number }> = [];
    for (const [id, neighbors] of graph.entries()) {
        const data = nodeData.get(id);
        centrality.push({
            id,
            name: data?.name || 'Desconhecido',
            type: data?.type || 'OTHER',
            degree: neighbors.length
        });
    }

    // Sort by Degree
    centrality.sort((a, b) => b.degree - a.degree);
    const topNodes = centrality.slice(0, 5);

    // Build message with VISUAL pattern
    let msg = `🌉 **ANÁLISE DE REDE**
${visual.separator}

📊 **Top Conectores (Possíveis Pontes):**

`;

    topNodes.forEach((node, idx) => {
        const typeInfo = visual.getType(node.type);
        msg += `${idx + 1}. ${typeInfo.icon} **${visual.formatName(node.name)}**\n`;
        msg += `   └─ ${node.degree} conexões • ${typeInfo.label}\n\n`;
    });

    msg += `${visual.separatorShort}
💡 _Nós centrais são potenciais "pontes" entre grupos criminosos._`;

    // Create clickable buttons for each entity
    const entityButtons = topNodes.map(node => {
        const typeInfo = visual.getType(node.type);
        return [{
            text: `${typeInfo.icon} ${visual.formatName(node.name)}`,
            callback_data: `entity_${node.id}`
        }];
    });

    await sendMessage(chatId, msg, {
        inline_keyboard: [
            ...entityButtons,
            [{ text: visual.separatorShort, callback_data: "noop" }],
            [{ text: "🔙 Voltar ao Caso", callback_data: "case_back" }]
        ]
    });
}

// ============================================
// FINDINGS COMMAND
// ============================================

/**
 * Exibe achados investigativos da operação atual
 */
export async function handleFindingsCommand(
    chatId: number,
    deps: CommandDeps
): Promise<void> {
    const { supabase, sendMessage, visual } = deps;

    const { data: session } = await supabase
        .from('intelink_sessions')
        .select('investigation_id')
        .eq('chat_id', chatId)
        .single();

    if (!session?.investigation_id) {
        await sendMessage(chatId, '⚠️ Selecione um caso primeiro com `/investigacoes`');
        return;
    }

    await sendMessage(chatId, "⏳ **Buscando achados investigativos...**");

    // Buscar achados da operação atual
    const { data: findings, error } = await supabase
        .from('intelink_investigator_findings')
        .select('*')
        .eq('investigation_id', session.investigation_id)
        .eq('status', 'active')
        .order('confidence', { ascending: false })
        .limit(10);

    if (error) {
        await sendMessage(chatId, `❌ Erro ao buscar achados: ${error.message}`);
        return;
    }

    if (!findings || findings.length === 0) {
        await sendMessage(chatId, `📋 **ACHADOS INVESTIGATIVOS**
${visual.separator}

Nenhum achado registrado para esta operação.

${visual.separatorShort}
💡 _Achados são observações do investigador:_
• Impressões de entrevistas
• Observações de vigilância
• Análises técnicas (ERB, extração)
• Hipóteses de conexão
• Modus operandi identificado
• Informações de fontes

_Os achados são extraídos automaticamente de documentos CS/Relatórios._`);
        return;
    }

    // Labels para tipos
    const typeLabels: Record<string, string> = {
        'interview_impression': '💬 Impressão de Entrevista',
        'surveillance_obs': '👁️ Observação de Vigilância',
        'technical_analysis': '📊 Análise Técnica',
        'connection_hypothesis': '🔗 Hipótese de Conexão',
        'modus_operandi': '🎯 Modus Operandi',
        'source_intel': '🕵️ Info de Fonte'
    };

    const priorityLabels: Record<string, string> = {
        'immediate': '🔴 IMEDIATO',
        'high': '🟠 ALTA',
        'medium': '🟡 MÉDIA',
        'low': '🟢 BAIXA'
    };

    let msg = `📋 **ACHADOS INVESTIGATIVOS** (${findings.length})
${visual.separator}
_Observações do investigador - NÃO são provas periciais_

`;

    for (const f of findings) {
        const typeLabel = typeLabels[f.finding_type] || f.finding_type;
        const priority = f.action_priority ? priorityLabels[f.action_priority] || '' : '';
        const confidence = Math.round((f.confidence || 0) * 100);

        msg += `${typeLabel}
**${f.title}**
${f.description?.substring(0, 150)}${f.description?.length > 150 ? '...' : ''}
📊 Confiança: ${confidence}% ${priority}
`;
        if (f.suggested_action) {
            msg += `💡 Ação: _${f.suggested_action.substring(0, 80)}${f.suggested_action.length > 80 ? '...' : ''}_
`;
        }
        msg += `${visual.separatorShort}
`;
    }

    msg += `
📖 _Para ver detalhes completos, acesse o dashboard web._`;

    await sendMessage(chatId, msg, {
        inline_keyboard: [
            [{ text: "🔍 Analisar Rede", callback_data: "analyze_bridge" }],
            [{ text: "🔙 Voltar ao Caso", callback_data: "case_back" }]
        ]
    });
}
