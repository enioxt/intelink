/**
 * Neo4j Client Adapter for EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Adaptado do BR-ACC neo4j_service.py para TypeScript
 * SOURCE: /home/enio/br-acc/api/src/bracc/services/neo4j_service.py
 * TARGET: /home/enio/intelink/lib/neo4j/client.ts
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 * 
 * Este cliente se comunica com a API Python (FastAPI) que por sua vez
 * conecta ao Neo4j. Não há conexão direta frontend→Neo4j por segurança.
 */

// Tipos de entidades do BR-ACC
export type EntityType =
  | 'Company'
  | 'Person'
  | 'PEPRecord'
  | 'Sanction'
  | 'GovTravel'
  | 'GovCardExpense'
  | 'BarredNGO';

export interface Neo4jNode {
  id: string;
  labels: EntityType[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface GraphResult {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

export interface CompanyData {
  cnpj: string;
  name: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  employees?: number;
  created_at?: string;
}

export interface PEPData {
  id: string;
  name: string;
  organization: string;
  position: string;
  level: 'federal' | 'state' | 'municipal';
  cpf?: string;
  start_date?: string;
  end_date?: string;
}

export interface SanctionData {
  id: string;
  source: 'CEIS' | 'CNEP' | 'other';
  company_name: string;
  cnpj: string;
  reason: string;
  start_date: string;
  end_date?: string;
  penalties: string[];
}

export interface EntityApiResponse {
  id: string;
  type: string;
  entity_label?: string | null;
  identity_quality?: string | null;
  properties: Record<string, any>;
  sources?: Array<{ database: string }>;
  is_pep?: boolean;
  exposure_tier?: string;
}

export interface SearchApiResult {
  id: string;
  type: string;
  name: string;
  score: number;
  document?: string | null;
  properties: Record<string, any>;
  sources?: Array<{ database: string }>;
  exposure_tier?: string;
}

export interface SearchApiResponse {
  results: SearchApiResult[];
  total: number;
  page: number;
  size: number;
}

export interface GraphApiNode {
  id: string;
  label: string;
  type: string;
  document_id?: string | null;
  properties: Record<string, any>;
  sources?: Array<{ database: string }>;
  is_pep?: boolean;
  exposure_tier?: string;
}

export interface GraphApiEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  confidence?: number;
  sources?: Array<{ database: string }>;
  exposure_tier?: string;
}

export interface GraphApiResponse {
  nodes: GraphApiNode[];
  edges: GraphApiEdge[];
  center_id?: string;
}

// Configuração
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class Neo4jClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Health check
  async health(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error('API health check failed');
    return res.json();
  }

  // Buscar empresa por CNPJ
  async getCompanyByCNPJ(cnpj: string): Promise<CompanyData | null> {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    const res = await fetch(`${this.baseUrl}/api/v1/entity/${cleanCnpj}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch company: ${res.statusText}`);
    const entity: EntityApiResponse = await res.json();
    return {
      cnpj: entity.properties.cnpj || cleanCnpj,
      name: entity.properties.razao_social || entity.properties.name || entity.properties.nome_fantasia || 'Empresa',
      status: entity.properties.status || entity.properties.situacao_cadastral || 'unknown',
      address: entity.properties.address || entity.properties.logradouro,
      city: entity.properties.city || entity.properties.municipio,
      state: entity.properties.state || entity.properties.uf,
      employees: entity.properties.employees,
      created_at: entity.properties.created_at || entity.properties.data_abertura,
    };
  }

  // Buscar PEP por nome ou CPF
  async searchPEPs(query: string, limit: number = 20): Promise<PEPData[]> {
    const params = new URLSearchParams({ q: query, type: 'person', size: String(limit) });
    const res = await fetch(`${this.baseUrl}/api/v1/search?${params}`);
    if (!res.ok) throw new Error(`Failed to search PEPs: ${res.statusText}`);
    const data: SearchApiResponse = await res.json();
    return data.results
      .filter((item) => item.properties?.role || item.properties?.cargo || item.properties?.organization)
      .map((item) => ({
        id: item.id,
        name: item.name,
        organization: item.properties.organization || item.properties.org || item.properties.office || 'N/A',
        position: item.properties.position || item.properties.role || item.properties.cargo || 'N/A',
        level: item.properties.level || 'federal',
        cpf: item.document || item.properties.cpf,
        start_date: item.properties.start_date,
        end_date: item.properties.end_date,
      }));
  }

  // Buscar sanções por CNPJ
  async getSanctionsByCNPJ(cnpj: string): Promise<SanctionData[]> {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    const params = new URLSearchParams({ q: cleanCnpj, type: 'sanction', size: '20' });
    const res = await fetch(`${this.baseUrl}/api/v1/search?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch sanctions: ${res.statusText}`);
    const data: SearchApiResponse = await res.json();
    return data.results.map((item) => ({
      id: item.id,
      source: item.properties.source || 'other',
      company_name: item.properties.company_name || item.properties.razao_social || item.name,
      cnpj: item.properties.cnpj || cleanCnpj,
      reason: item.properties.reason || item.properties.description || 'Sanção registrada',
      start_date: item.properties.start_date || item.properties.date || '',
      end_date: item.properties.end_date,
      penalties: item.properties.penalties || [],
    }));
  }

  // Busca geral (Quantum Search via Neo4j)
  async search(query: string, options: {
    types?: EntityType[];
    limit?: number;
    offset?: number;
  } = {}): Promise<Neo4jNode[]> {
    const params = new URLSearchParams({
      q: query,
      size: String(options.limit || 50),
      page: String(Math.floor((options.offset || 0) / (options.limit || 50)) + 1),
    });

    if (options.types?.length) {
      const firstType = options.types[0];
      params.set('type', firstType.toLowerCase().replace('peprecord', 'person'));
    }

    const res = await fetch(`${this.baseUrl}/api/v1/search?${params}`);
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    const data: SearchApiResponse = await res.json();
    return data.results.map((item) => ({
      id: item.id,
      labels: [this.mapTypeToLabel(item.type)],
      properties: {
        name: item.name,
        ...item.properties,
      },
    }));
  }

  // Expandir grafo a partir de um nó
  async expandGraph(nodeId: string, depth: number = 1): Promise<GraphResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/graph/${nodeId}?depth=${depth}`);
    if (!res.ok) throw new Error(`Graph expansion failed: ${res.statusText}`);
    const data: GraphApiResponse = await res.json();
    return {
      nodes: data.nodes.map((node) => ({
        id: node.id,
        labels: [this.mapTypeToLabel(node.type)],
        properties: {
          name: node.label,
          ...node.properties,
        },
      })),
      relationships: data.edges.map((edge) => ({
        id: edge.id,
        type: edge.type,
        startNodeId: edge.source,
        endNodeId: edge.target,
        properties: edge.properties,
      })),
    };
  }

  // Buscar caminho mais curto entre dois nós
  async shortestPath(
    startId: string,
    endId: string,
    maxDepth: number = 6
  ): Promise<Neo4jNode[] | null> {
    const startGraph = await this.expandGraph(startId, Math.min(maxDepth, 2));
    const targetIds = new Set(startGraph.nodes.map((node) => node.id));
    if (!targetIds.has(endId)) return null;
    return startGraph.nodes.filter((node) => node.id === startId || node.id === endId);
  }

  // Detectar padrões de risco
  async detectPatterns(cnpj: string): Promise<Array<{
    pattern: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: any[];
  }>> {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    const res = await fetch(`${this.baseUrl}/api/v1/patterns/${cleanCnpj}`);
    if (!res.ok) throw new Error(`Pattern detection failed: ${res.statusText}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.patterns || [];
  }

  // Estatísticas do grafo
  async getStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    nodesByLabel: Record<string, number>;
    lastUpdate: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/v1/meta/stats`);
    if (!res.ok) throw new Error(`Failed to get stats: ${res.statusText}`);
    const data = await res.json();
    return {
      totalNodes: data.total_nodes || 0,
      totalRelationships: data.total_relationships || 0,
      nodesByLabel: {
        person: data.person_count || 0,
        company: data.company_count || 0,
        sanction: data.sanction_count || 0,
        pep_record: data.pep_record_count || 0,
        gov_travel: data.gov_travel_count || 0,
        gov_card_expense: data.gov_card_expense_count || 0,
      },
      lastUpdate: new Date().toISOString(),
    };
  }

  private mapTypeToLabel(type: string): EntityType {
    const normalized = type.toLowerCase();
    if (normalized === 'company') return 'Company';
    if (normalized === 'person') return 'Person';
    if (normalized === 'peprecord' || normalized === 'pep_record') return 'PEPRecord';
    if (normalized === 'sanction') return 'Sanction';
    if (normalized === 'govtravel' || normalized === 'gov_travel') return 'GovTravel';
    if (normalized === 'govcardexpense' || normalized === 'gov_card_expense') return 'GovCardExpense';
    return 'BarredNGO';
  }
}

// Singleton export
export const neo4jClient = new Neo4jClient();

// Factory para instâncias customizadas
export function createNeo4jClient(baseUrl: string): Neo4jClient {
  return new Neo4jClient(baseUrl);
}

export default Neo4jClient;
