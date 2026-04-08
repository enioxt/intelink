/**
 * Neo4j Client — EGOS Inteligência Frontend
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Browser-compatible Neo4j client using fetch API
 */

const NEO4J_API_URL = process.env.NEXT_PUBLIC_NEO4J_HTTP_API || '/api/v1/neo4j';

export interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

export interface Neo4jPath {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

export interface QueryResult {
  records: any[];
  summary: {
    counters: {
      nodesCreated?: number;
      nodesDeleted?: number;
      relationshipsCreated?: number;
      relationshipsDeleted?: number;
    };
    query: {
      text: string;
      parameters: Record<string, any>;
    };
  };
}

// Execute Cypher query via API
export async function executeQuery(
  cypher: string,
  parameters: Record<string, any> = {},
  token?: string
): Promise<QueryResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${NEO4J_API_URL}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ cypher, parameters }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Neo4j query failed');
  }

  return response.json();
}

// Get entity by ID
export async function getEntity(
  entityId: string,
  token?: string
): Promise<Neo4jNode | null> {
  const result = await executeQuery(
    'MATCH (e {id: $entityId}) RETURN e LIMIT 1',
    { entityId },
    token
  );

  if (result.records.length === 0) {
    return null;
  }

  const record = result.records[0];
  return {
    id: record.e.id,
    labels: record.e.labels || [],
    properties: record.e.properties || {},
  };
}

// Get ego network (connections up to depth)
export async function getEgoNetwork(
  entityId: string,
  depth: number = 2,
  token?: string
): Promise<Neo4jPath> {
  const result = await executeQuery(
    `MATCH path = (e {id: $entityId})-[*1..${depth}]-(connected)
     RETURN path
     LIMIT 100`,
    { entityId },
    token
  );

  const nodes: Map<string, Neo4jNode> = new Map();
  const relationships: Map<string, Neo4jRelationship> = new Map();

  for (const record of result.records) {
    const path = record.path;
    
    // Extract nodes
    for (const node of path.nodes || []) {
      if (!nodes.has(node.id)) {
        nodes.set(node.id, {
          id: node.id,
          labels: node.labels || [],
          properties: node.properties || {},
        });
      }
    }

    // Extract relationships
    for (const rel of path.relationships || []) {
      if (!relationships.has(rel.id)) {
        relationships.set(rel.id, {
          id: rel.id,
          type: rel.type,
          startNode: rel.startNode,
          endNode: rel.endNode,
          properties: rel.properties || {},
        });
      }
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    relationships: Array.from(relationships.values()),
  };
}

// Search entities by name or identifier
export async function searchEntities(
  query: string,
  limit: number = 20,
  token?: string
): Promise<Neo4jNode[]> {
  const result = await executeQuery(
    `MATCH (e)
     WHERE e.name CONTAINS $query 
        OR e.cnpj CONTAINS $query 
        OR e.cpf CONTAINS $query
     RETURN e
     LIMIT $limit`,
    { query, limit },
    token
  );

  return result.records.map((record: any) => ({
    id: record.e.id,
    labels: record.e.labels || [],
    properties: record.e.properties || {},
  }));
}

// Get relationship path between two entities
export async function getShortestPath(
  startId: string,
  endId: string,
  token?: string
): Promise<Neo4jPath | null> {
  const result = await executeQuery(
    `MATCH path = shortestPath((a {id: $startId})-[*]-(b {id: $endId}))
     RETURN path
     LIMIT 1`,
    { startId, endId },
    token
  );

  if (result.records.length === 0) {
    return null;
  }

  const path = result.records[0].path;
  
  return {
    nodes: (path.nodes || []).map((n: any) => ({
      id: n.id,
      labels: n.labels || [],
      properties: n.properties || {},
    })),
    relationships: (path.relationships || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      startNode: r.startNode,
      endNode: r.endNode,
      properties: r.properties || {},
    })),
  };
}

export default {
  executeQuery,
  getEntity,
  getEgoNetwork,
  searchEntities,
  getShortestPath,
};
