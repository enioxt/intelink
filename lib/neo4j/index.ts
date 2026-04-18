/**
 * Neo4j Library Exports — EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED
 * TIMESTAMP: 2026-04-01
 */

export { neo4jClient, createNeo4jClient } from './client';
export type { default as Neo4jClient } from './client';
export type {
  EntityType,
  Neo4jNode,
  Neo4jRelationship,
  GraphResult,
  CompanyData,
  PEPData,
  SanctionData,
} from './client';

export { QUERIES, buildCompanySearchQuery, buildPEPSearchQuery } from './queries';
