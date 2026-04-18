/**
 * Neo4j Cypher Queries for EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Queries do BR-ACC adaptadas para TypeScript
 * SOURCE: /home/enio/br-acc/api/src/bracc/queries/
 * TARGET: /home/enio/egos-lab/apps/egos-inteligencia/apps/web/lib/neo4j/queries.ts
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 */

export const QUERIES = {
  // Busca de empresa por CNPJ
  COMPANY_BY_CNPJ: `
    MATCH (c:Company {cnpj: $cnpj})
    OPTIONAL MATCH (c)-[:SOCIO_DE]->(p:Person)
    OPTIONAL MATCH (c)-[:SANCIONADA]->(s:Sanction)
    RETURN c, collect(DISTINCT p) as partners, collect(DISTINCT s) as sanctions
  `,

  // Busca de sócios de uma empresa
  COMPANY_PARTNERS: `
    MATCH (c:Company {cnpj: $cnpj})<-[:SOCIO_DE]-(p:Person)
    RETURN p
    LIMIT 50
  `,

  // Busca de PEP por nome (fuzzy)
  PEP_SEARCH: `
    MATCH (p:PEPRecord)
    WHERE p.name CONTAINS $query OR p.cpf = $query
    RETURN p
    ORDER BY p.name
    LIMIT $limit
  `,

  // Busca geral por texto
  GENERAL_SEARCH: `
    CALL {
      MATCH (c:Company)
      WHERE c.name CONTAINS $query OR c.cnpj CONTAINS $query
      RETURN c as node, 'Company' as type
      LIMIT $limit
      
      UNION
      
      MATCH (p:PEPRecord)
      WHERE p.name CONTAINS $query
      RETURN p as node, 'PEPRecord' as type
      LIMIT $limit
      
      UNION
      
      MATCH (s:Sanction)
      WHERE s.company_name CONTAINS $query OR s.cnpj CONTAINS $query
      RETURN s as node, 'Sanction' as type
      LIMIT $limit
    }
    RETURN node, type
    LIMIT $limit
  `,

  // Expandir rede de relacionamentos
  EXPAND_NETWORK: `
    MATCH path = (start)-[*1..$depth]-(connected)
    WHERE id(start) = $nodeId
    RETURN path
    LIMIT 100
  `,

  // Caminho mais curto
  SHORTEST_PATH: `
    MATCH path = shortestPath(
      (start)-[*1..$maxDepth]-(end)
    )
    WHERE id(start) = $startId AND id(end) = $endId
    RETURN path
  `,

  // Empresas sancionadas
  SANCTIONED_COMPANIES: `
    MATCH (c:Company)-[:SANCIONADA]->(s:Sanction)
    RETURN c, s
    ORDER BY s.start_date DESC
    LIMIT $limit
  `,

  // PEPs com empresas
  PEPS_WITH_COMPANIES: `
    MATCH (p:PEPRecord)
    OPTIONAL MATCH (p)-[:OWNS]->(c:Company)
    WITH p, count(c) as companyCount
    WHERE companyCount > 0
    RETURN p, companyCount
    ORDER BY companyCount DESC
    LIMIT $limit
  `,

  // Dupla sanção (CEIS + CNEP)
  DUAL_SANCTIONED: `
    MATCH (c:Company)-[:SANCIONADA]->(s:Sanction)
    WITH c, collect(DISTINCT s.source) as sources
    WHERE size(sources) > 1
    RETURN c, sources
    LIMIT $limit
  `,

  // Ghost employee pattern
  GHOST_EMPLOYEES: `
    MATCH (p:Person)-[:EMPLOYED_BY]->(c:Company),
          (p)-[:EMPLOYED_BY]->(g:Government)
    WHERE c <> g
    RETURN p, c, g
    LIMIT $limit
  `,

  // Shell company detection
  SHELL_COMPANIES: `
    MATCH (c1:Company)-[:SHARES_ADDRESS]->(c2:Company)
    WHERE c1 <> c2
    RETURN c1, c2
    LIMIT $limit
  `,

  // Estatísticas do grafo
  STATS: `
    CALL {
      MATCH (n) RETURN count(n) as totalNodes
    }
    CALL {
      MATCH ()-[r]->() RETURN count(r) as totalRelationships
    }
    CALL {
      MATCH (n) RETURN labels(n)[0] as label, count(*) as count
    }
    RETURN totalNodes, totalRelationships, 
           collect({label: label, count: count}) as nodesByLabel
  `,
};

// Helpers para construir queries dinâmicas
export function buildCompanySearchQuery(cnpj: string): string {
  return QUERIES.COMPANY_BY_CNPJ.replace('$cnpj', `'${cnpj}'`);
}

export function buildPEPSearchQuery(query: string, limit: number = 20): string {
  return QUERIES.PEP_SEARCH
    .replace('$query', `'${query}'`)
    .replace('$limit', String(limit));
}

export function buildGeneralSearchQuery(query: string, limit: number = 50): string {
  return QUERIES.GENERAL_SEARCH
    .replace(/\$query/g, `'${query}'`)
    .replace(/\$limit/g, String(limit));
}

export function buildNetworkExpansionQuery(nodeId: number, depth: number = 2): string {
  return QUERIES.EXPAND_NETWORK
    .replace('$nodeId', String(nodeId))
    .replace('$depth', String(depth));
}

export function buildShortestPathQuery(startId: number, endId: number, maxDepth: number = 6): string {
  return QUERIES.SHORTEST_PATH
    .replace('$startId', String(startId))
    .replace('$endId', String(endId))
    .replace('$maxDepth', String(maxDepth));
}

export default QUERIES;
