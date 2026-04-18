/**
 * AI Router with Neo4j Context — EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Merge entre Intelink AI Router + BR-ACC Neo4j context
 * SOURCE: /home/enio/egos-lab/apps/intelink/lib/intelink/ai-router.ts
 * TARGET: /home/enio/intelink/lib/ai/ai-router.ts
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 * 
 * Este router combina:
 * - AI Router original do Intelink (NL → Tool selection)
 * - Context loader Neo4j (dados do BR-ACC: CNPJ, PEPs, Sanctions)
 * - RAG com dados do grafo
 */

import { neo4jClient, CompanyData, PEPData, SanctionData } from '../neo4j/client';

export type ToolName =
  | 'search_company'
  | 'search_pep'
  | 'get_sanctions'
  | 'expand_network'
  | 'detect_patterns'
  | 'general_query';

export interface ToolCall {
  name: ToolName;
  arguments: Record<string, any>;
}

export interface AIContext {
  userQuery: string;
  currentView?: string;
  selectedEntity?: {
    type: 'company' | 'pep' | 'sanction';
    id: string;
  };
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface Neo4jContext {
  companies?: CompanyData[];
  peps?: PEPData[];
  sanctions?: SanctionData[];
  graphData?: {
    nodes: any[];
    relationships: any[];
  };
  patterns?: Array<{
    pattern: string;
    severity: string;
    description: string;
  }>;
}

export interface RouterResult {
  tool: ToolName;
  context: Neo4jContext;
  enrichedPrompt: string;
  directAnswer?: string;
}

class AIRouter {
  /**
   * Route a user query to the appropriate tool and load Neo4j context
   */
  async route(context: AIContext): Promise<RouterResult> {
    const { userQuery, selectedEntity } = context;

    // Detect CNPJ in query
    const cnpjMatch = userQuery.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
    const cnpj = cnpjMatch ? cnpjMatch[0].replace(/[^\d]/g, '') : null;

    // Detect entity type from query
    const isCompanyQuery = /cnpj|empresa|company/i.test(userQuery) || cnpj;
    const isPEPQuery = /pep|politico|pessoa exposta/i.test(userQuery);
    const isSanctionQuery = /sancionado|ceis|cnep|penalidade/i.test(userQuery);
    const isNetworkQuery = /rede|grafo|conexao|vinculo|socio/i.test(userQuery);
    const isPatternQuery = /padrao|pattern|risco|anomalia|irregularidade/i.test(userQuery);

    // Priority routing
    if (cnpj || isCompanyQuery) {
      return this.handleCompanyQuery(userQuery, cnpj);
    }

    if (isPEPQuery) {
      return this.handlePEPQuery(userQuery);
    }

    if (isSanctionQuery) {
      return this.handleSanctionQuery(userQuery, cnpj);
    }

    if (isNetworkQuery && selectedEntity) {
      return this.handleNetworkQuery(selectedEntity);
    }

    if (isPatternQuery && cnpj) {
      return this.handlePatternQuery(cnpj);
    }

    // Fallback: general query with search context
    return this.handleGeneralQuery(userQuery);
  }

  private async handleCompanyQuery(query: string, cnpj: string | null): Promise<RouterResult> {
    const neo4jContext: Neo4jContext = {};

    if (cnpj) {
      // Load specific company
      const company = await neo4jClient.getCompanyByCNPJ(cnpj);
      if (company) {
        neo4jContext.companies = [company];

        // Load related sanctions
        const sanctions = await neo4jClient.getSanctionsByCNPJ(cnpj);
        if (sanctions.length > 0) {
          neo4jContext.sanctions = sanctions;
        }

        // Try to detect patterns
        try {
          const patterns = await neo4jClient.detectPatterns(cnpj);
          if (patterns.length > 0) {
            neo4jContext.patterns = patterns;
          }
        } catch (e) {
          // Pattern detection may not be available
        }
      }
    } else {
      // Search companies by name
      const searchResults = await neo4jClient.search(query, {
        types: ['Company'],
        limit: 5
      });

      if (searchResults.length > 0) {
        // Load full company data for top result
        const topCompany = searchResults[0];
        if (topCompany.properties?.cnpj) {
          const company = await neo4jClient.getCompanyByCNPJ(topCompany.properties.cnpj);
          if (company) {
            neo4jContext.companies = [company];
          }
        }
      }
    }

    const enrichedPrompt = this.buildCompanyPrompt(query, neo4jContext);

    return {
      tool: 'search_company',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  private async handlePEPQuery(query: string): Promise<RouterResult> {
    const searchTerm = query.replace(/pep|politico|buscar|encontrar/gi, '').trim();
    const peps = await neo4jClient.searchPEPs(searchTerm, 10);

    const neo4jContext: Neo4jContext = { peps };

    const enrichedPrompt = this.buildPEPPrompt(query, neo4jContext);

    return {
      tool: 'search_pep',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  private async handleSanctionQuery(query: string, cnpj: string | null): Promise<RouterResult> {
    const neo4jContext: Neo4jContext = {};

    if (cnpj) {
      const sanctions = await neo4jClient.getSanctionsByCNPJ(cnpj);
      neo4jContext.sanctions = sanctions;
    }

    // Search for sanctioned companies
    const searchResults = await neo4jClient.search(query, {
      types: ['Sanction', 'Company'],
      limit: 10,
    });

    const enrichedPrompt = this.buildSanctionPrompt(query, neo4jContext);

    return {
      tool: 'get_sanctions',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  private async handleNetworkQuery(selectedEntity: AIContext['selectedEntity']): Promise<RouterResult> {
    if (!selectedEntity) {
      return this.handleGeneralQuery('network query without entity');
    }

    // Expand graph around selected entity
    const graphData = await neo4jClient.expandGraph(selectedEntity.id, 2);

    const neo4jContext: Neo4jContext = { graphData };

    const enrichedPrompt = this.buildNetworkPrompt(selectedEntity, neo4jContext);

    return {
      tool: 'expand_network',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  private async handlePatternQuery(cnpj: string): Promise<RouterResult> {
    const patterns = await neo4jClient.detectPatterns(cnpj);
    const company = await neo4jClient.getCompanyByCNPJ(cnpj);

    const neo4jContext: Neo4jContext = {
      companies: company ? [company] : [],
      patterns,
    };

    const enrichedPrompt = this.buildPatternPrompt(cnpj, neo4jContext);

    return {
      tool: 'detect_patterns',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  private async handleGeneralQuery(query: string): Promise<RouterResult> {
    // General search across all entity types
    const searchResults = await neo4jClient.search(query, { limit: 10 });

    // Load detailed data for top results
    const neo4jContext: Neo4jContext = {};

    for (const node of searchResults.slice(0, 3)) {
      if (node.labels.includes('Company') && node.properties?.cnpj) {
        const company = await neo4jClient.getCompanyByCNPJ(node.properties.cnpj);
        if (company) {
          neo4jContext.companies = [...(neo4jContext.companies || []), company];
        }
      }
    }

    const enrichedPrompt = this.buildGeneralPrompt(query, neo4jContext, searchResults);

    return {
      tool: 'general_query',
      context: neo4jContext,
      enrichedPrompt,
    };
  }

  // Prompt builders
  private buildCompanyPrompt(query: string, context: Neo4jContext): string {
    const company = context.companies?.[0];
    const sanctions = context.sanctions;
    const patterns = context.patterns;

    let prompt = `Query do usuário: "${query}"\n\n`;

    if (company) {
      prompt += `DADOS DA EMPRESA (Neo4j):\n`;
      prompt += `- Nome: ${company.name}\n`;
      prompt += `- CNPJ: ${company.cnpj}\n`;
      prompt += `- Status: ${company.status}\n`;
      if (company.address) prompt += `- Endereço: ${company.address}\n`;
      if (company.city) prompt += `- Cidade: ${company.city}/${company.state}\n`;
    }

    if (sanctions && sanctions.length > 0) {
      prompt += `\nSANÇÕES ENCONTRADAS:\n`;
      sanctions.forEach((s, i) => {
        prompt += `${i + 1}. ${s.source}: ${s.reason} (de ${s.start_date}${s.end_date ? ` até ${s.end_date}` : ''})\n`;
      });
    }

    if (patterns && patterns.length > 0) {
      prompt += `\nPADRÕES DE RISCO DETECTADOS:\n`;
      patterns.forEach((p, i) => {
        prompt += `${i + 1}. [${p.severity.toUpperCase()}] ${p.pattern}: ${p.description}\n`;
      });
    }

    prompt += `\nInstrução: Responda à query do usuário usando os dados acima. `;
    prompt += `Se não houver dados específicos, informe que não encontrou informações. `;
    prompt += `Use linguagem técnica e precisa. Destaque riscos se presentes.`;

    return prompt;
  }

  private buildPEPPrompt(query: string, context: Neo4jContext): string {
    const peps = context.peps || [];

    let prompt = `Query do usuário: "${query}"\n\n`;
    prompt += `RESULTADOS DE BUSCA PEP (Neo4j): ${peps.length} encontrados\n\n`;

    peps.slice(0, 5).forEach((pep, i) => {
      prompt += `${i + 1}. ${pep.name}\n`;
      prompt += `   - Órgão: ${pep.organization}\n`;
      prompt += `   - Cargo: ${pep.position}\n`;
      prompt += `   - Nível: ${pep.level}\n`;
      if (pep.cpf) prompt += `   - CPF: ${pep.cpf}\n`;
    });

    prompt += `\nInstrução: Responda sobre os PEPs encontrados. `;
    prompt += `Mencione que é uma pessoa politicamente exposta e pode ter restrições.`;

    return prompt;
  }

  private buildSanctionPrompt(query: string, context: Neo4jContext): string {
    const sanctions = context.sanctions || [];

    let prompt = `Query do usuário: "${query}"\n\n`;
    prompt += `SANÇÕES ENCONTRADAS: ${sanctions.length}\n\n`;

    sanctions.forEach((s, i) => {
      prompt += `${i + 1}. ${s.company_name} (${s.cnpj})\n`;
      prompt += `   - Fonte: ${s.source}\n`;
      prompt += `   - Motivo: ${s.reason}\n`;
      prompt += `   - Período: ${s.start_date} a ${s.end_date || 'atual'}\n`;
      if (s.penalties?.length) {
        prompt += `   - Penalidades: ${s.penalties.join(', ')}\n`;
      }
    });

    prompt += `\nInstrução: Explique as sanções encontradas e suas implicações. `;
    prompt += `Destaque se há sanções ativas ou múltiplas fontes.`;

    return prompt;
  }

  private buildNetworkPrompt(entity: AIContext['selectedEntity'], context: Neo4jContext): string {
    const graphData = context.graphData;

    let prompt = `Análise de rede para entidade: ${entity?.type} ${entity?.id}\n\n`;

    if (graphData) {
      prompt += `DADOS DO GRAFO:\n`;
      prompt += `- Nós: ${graphData.nodes.length}\n`;
      prompt += `- Relacionamentos: ${graphData.relationships.length}\n\n`;

      prompt += `PRINCIPAIS CONEXÕES:\n`;
      graphData.nodes.slice(0, 10).forEach((node, i) => {
        prompt += `${i + 1}. ${node.labels?.[0] || 'Entity'}: ${node.properties?.name || node.properties?.cnpj || node.id}\n`;
      });
    }

    prompt += `\nInstrução: Analise a rede de relacionamentos. `;
    prompt += `Identifique concentrações, caminhos críticos e potenciais riscos.`;

    return prompt;
  }

  private buildPatternPrompt(cnpj: string, context: Neo4jContext): string {
    const company = context.companies?.[0];
    const patterns = context.patterns || [];

    let prompt = `Análise de padrões para CNPJ: ${cnpj}\n\n`;

    if (company) {
      prompt += `EMPRESA: ${company.name}\n\n`;
    }

    if (patterns.length > 0) {
      prompt += `PADRÕES DETECTADOS (${patterns.length}):\n\n`;
      patterns.forEach((p, i) => {
        prompt += `${i + 1}. [${p.severity.toUpperCase()}] ${p.pattern}\n`;
        prompt += `   ${p.description}\n\n`;
      });
    } else {
      prompt += `Nenhum padrão de risco detectado nesta análise.\n\n`;
    }

    prompt += `Instrução: Explique os padrões encontrados e recomende ações. `;
    prompt += `Se não houver padrões, confirme que a análise não identificou riscos óbvios.`;

    return prompt;
  }

  private buildGeneralPrompt(query: string, context: Neo4jContext, searchResults: any[]): string {
    let prompt = `Query do usuário: "${query}"\n\n`;
    prompt += `CONTEXTO DO NEO4J (83M+ nós):\n\n`;

    if (context.companies && context.companies.length > 0) {
      prompt += `Empresas encontradas:\n`;
      context.companies.forEach((c, i) => {
        prompt += `${i + 1}. ${c.name} (${c.cnpj}) - Status: ${c.status}\n`;
      });
      prompt += `\n`;
    }

    if (searchResults.length > 0) {
      prompt += `Outros resultados na base:\n`;
      searchResults.slice(0, 5).forEach((node, i) => {
        const label = node.labels?.[0] || 'Entity';
        const name = node.properties?.name || node.properties?.company_name || node.id;
        prompt += `${i + 1}. [${label}] ${name}\n`;
      });
    }

    prompt += `\nInstrução: Responda à query usando o contexto acima. `;
    prompt += `Se não houver informações específicas, sugira como o usuário pode refinar a busca.`;

    return prompt;
  }
}

// Singleton export
export const aiRouter = new AIRouter();

// Factory
export function createAIRouter(): AIRouter {
  return new AIRouter();
}

export default AIRouter;
