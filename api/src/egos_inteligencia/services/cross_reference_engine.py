"""
Cross-Reference Engine — EGOS Inteligência
Sistema de vínculos e cross-case analysis

Detecta conexões entre entidades, investigações e casos.
Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from neo4j import AsyncSession

from .patterns.pattern_detector import get_pattern_engine

logger = logging.getLogger(__name__)


@dataclass
class LinkFinding:
    """Vínculo encontrado entre entidades."""
    entity_a_id: str
    entity_b_id: str
    entity_a_name: str
    entity_b_name: str
    entity_a_type: str
    entity_b_type: str
    relationship_type: str
    strength: float  # 0.0 - 1.0
    evidence: list[str] = field(default_factory=list)
    first_seen: str | None = None
    last_seen: str | None = None


@dataclass
class CrossCaseMatch:
    """Match entre investigações diferentes."""
    case_a_id: str
    case_b_id: str
    case_a_title: str
    case_b_title: str
    similarity_score: float
    common_entities: list[dict[str, Any]]
    temporal_overlap: bool
    geographic_overlap: bool
    pattern_matches: list[dict]  # Serialized PatternMatch objects
    recommended_action: str


@dataclass
class NetworkNode:
    """Nó em rede de relacionamentos."""
    id: str
    name: str
    type: str  # person, company, vehicle, location
    centrality_score: float = 0.0
    connections: int = 0
    risk_level: str = "unknown"


@dataclass
class NetworkAnalysis:
    """Análise de rede completa."""
    center_node: NetworkNode
    related_nodes: list[NetworkNode]
    links: list[LinkFinding]
    clusters: list[list[str]]  # Grupos identificados
    anomalies: list[dict[str, Any]]  # Padrões suspeitos


class CrossReferenceEngine:
    """
    Motor de cruzamento de dados para investigações.
    
    Capacidades:
    - Detectar vínculos entre entidades (pessoas, empresas, veículos)
    - Cruzar investigações por entidades comuns
    - Analisar redes de relacionamentos
    - Identificar clusters e anomalias
    """
    
    def __init__(self, neo4j_session: AsyncSession):
        self.session = neo4j_session
        self._pattern_engine = get_pattern_engine()
    
    async def find_links(
        self,
        entity_id: str,
        max_depth: int = 2,
        min_strength: float = 0.5,
    ) -> list[LinkFinding]:
        """
        Encontra vínculos de uma entidade.
        
        Args:
            entity_id: ID da entidade central
            max_depth: Profundidade da busca (1-3 recomendado)
            min_strength: Força mínima do vínculo (0.0-1.0)
        
        Returns:
            Lista de vínculos encontrados
        """
        cypher = """
        MATCH path = (e1 {element_id: $entity_id})-[r*1..$max_depth]-(e2)
        WHERE e1 <> e2
        AND ALL(rel IN r WHERE type(rel) <> 'HAS_MANDATE' OR rel.situacao = 'ATIVO')
        WITH e1, e2, 
             relationships(path) as rels,
             [node IN nodes(path) | node.element_id] as node_ids
        WHERE size(node_ids) = size(apoc.coll.toSet(node_ids))  // Sem ciclos
        RETURN 
            e1.element_id as entity_a_id,
            e1.name as entity_a_name,
            labels(e1)[0] as entity_a_type,
            e2.element_id as entity_b_id,
            e2.name as entity_b_name,
            labels(e2)[0] as entity_b_type,
            [rel IN rels | type(rel)] as relationship_types,
            length(path) as path_length
        LIMIT 100
        """
        
        try:
            result = await self.session.run(cypher, {
                "entity_id": entity_id,
                "max_depth": max_depth
            })
            records = await result.data()
            
            findings: list[LinkFinding] = []
            for r in records:
                # Calcular força baseada na profundidade
                strength = max(0.0, 1.0 - (r["path_length"] - 1) * 0.3)
                if strength < min_strength:
                    continue
                
                findings.append(LinkFinding(
                    entity_a_id=r["entity_a_id"],
                    entity_b_id=r["entity_b_id"],
                    entity_a_name=r["entity_a_name"],
                    entity_b_name=r["entity_b_name"],
                    entity_a_type=r["entity_a_type"],
                    entity_b_type=r["entity_b_type"],
                    relationship_type=" → ".join(r["relationship_types"]),
                    strength=strength,
                    evidence=[f"Caminho de {r['path_length']} saltos"],
                ))
            
            # Ordenar por força
            findings.sort(key=lambda x: x.strength, reverse=True)
            return findings[:50]  # Top 50
            
        except Exception as e:
            logger.error(f"Erro buscando vínculos: {e}")
            return []
    
    async def cross_case_analysis(
        self,
        investigation_ids: list[str],
    ) -> list[CrossCaseMatch]:
        """
        Analisa cruzamentos entre investigações.
        
        Detecta:
        - Entidades em comum (pessoas, empresas, veículos)
        - Sobreposição temporal
        - Sobreposição geográfica
        - Padrões similares
        """
        if len(investigation_ids) < 2:
            return []
        
        matches: list[CrossCaseMatch] = []
        
        # Comparar todos os pares
        for i, case_a in enumerate(investigation_ids):
            for case_b in investigation_ids[i+1:]:
                match = await self._compare_cases(case_a, case_b)
                if match and match.similarity_score > 0.3:
                    matches.append(match)
        
        # Ordenar por score
        matches.sort(key=lambda x: x.similarity_score, reverse=True)
        return matches
    
    def _build_pattern_matches(
        self,
        title_a: str,
        title_b: str,
        common_entities: list[dict],
    ) -> list[dict]:
        """Detecta padrões comportamentais combinando dados dos dois casos."""
        # Build text from titles + entity names for pattern analysis
        entity_names = " ".join(e.get("name", "") for e in common_entities if e.get("name"))
        combined_text = f"{title_a or ''} {title_b or ''} {entity_names}".strip()
        if not combined_text:
            return []
        matches = self._pattern_engine.detect_patterns(combined_text)
        return [
            {
                "pattern_id": m.pattern_id,
                "pattern_name": m.pattern_name,
                "confidence": m.confidence,
                "category": m.category,
                "severity": m.severity,
                "matched_keywords": m.matched_keywords,
            }
            for m in matches
        ]

    async def _compare_cases(
        self,
        case_a_id: str,
        case_b_id: str,
    ) -> CrossCaseMatch | None:
        """Compara duas investigações específicas."""
        
        cypher = """
        MATCH (inv_a:Investigation {id: $case_a})
        MATCH (inv_b:Investigation {id: $case_b})
        
        // Entidades em comum
        OPTIONAL MATCH (inv_a)-[:INVOLVES]->(e)<-[:INVOLVES]-(inv_b)
        WHERE e:Person OR e:Company OR e:Vehicle
        WITH inv_a, inv_b, collect(DISTINCT {
            id: e.element_id,
            name: e.name,
            type: labels(e)[0]
        }) as common_entities
        
        // Sobreposição temporal
        WITH inv_a, inv_b, common_entities,
             CASE 
                WHEN inv_a.created_at IS NULL OR inv_b.created_at IS NULL THEN false
                WHEN abs(duration.between(date(inv_a.created_at), date(inv_b.created_at)).days) < 90 THEN true
                ELSE false
             END as temporal_overlap
        
        // Sobreposição geográfica (se location disponível)
        OPTIONAL MATCH (inv_a)-[:OCCURRED_AT]->(loc_a:Location)
        OPTIONAL MATCH (inv_b)-[:OCCURRED_AT]->(loc_b:Location)
        WITH inv_a, inv_b, common_entities, temporal_overlap,
             CASE 
                WHEN loc_a IS NULL OR loc_b IS NULL THEN false
                WHEN loc_a.city = loc_b.city OR loc_a.state = loc_b.state THEN true
                ELSE false
             END as geographic_overlap
        
        RETURN 
            inv_a.id as case_a_id,
            inv_a.title as case_a_title,
            inv_b.id as case_b_id,
            inv_b.title as case_b_title,
            common_entities,
            temporal_overlap,
            geographic_overlap,
            size(common_entities) as common_count
        """
        
        try:
            result = await self.session.run(cypher, {
                "case_a": case_a_id,
                "case_b": case_b_id
            })
            record = await result.single()
            
            if not record:
                return None
            
            # Calcular score de similaridade
            common_count = record["common_count"]
            temporal = record["temporal_overlap"]
            geographic = record["geographic_overlap"]
            
            score = min(1.0, common_count * 0.2)  # 20% por entidade comum
            if temporal:
                score += 0.2
            if geographic:
                score += 0.15
            
            # Recomendação
            if score >= 0.8:
                action = "🔗 LINK FORTE: Mesma rede criminosa provável. Unificar investigações?"
            elif score >= 0.5:
                action = "⚡ LINK MODERADO: Coordenar diligências. Compartilhar inteligência."
            elif score >= 0.3:
                action = "🔍 LINK FRACO: Monitorar evolução. Possível coincidência."
            else:
                action = "📋 Sem vínculos significativos detectados"
            
            return CrossCaseMatch(
                case_a_id=record["case_a_id"],
                case_b_id=record["case_b_id"],
                case_a_title=record["case_a_title"],
                case_b_title=record["case_b_title"],
                similarity_score=score,
                common_entities=record["common_entities"],
                temporal_overlap=record["temporal_overlap"],
                geographic_overlap=record["geographic_overlap"],
                pattern_matches=self._build_pattern_matches(
                    record["case_a_title"],
                    record["case_b_title"],
                    record["common_entities"],
                ),
                recommended_action=action,
            )
            
        except Exception as e:
            logger.error(f"Erro comparando casos: {e}")
            return None
    
    async def analyze_network(
        self,
        center_entity_id: str,
        max_depth: int = 2,
    ) -> NetworkAnalysis | None:
        """
        Análise completa de rede a partir de entidade central.
        
        Retorna:
        - Nó central com métricas de centralidade
        - Nós relacionados com scores
        - Links entre todos os nós
        - Clusters identificados
        - Anomalias detectadas
        """
        # Buscar todos os nós conectados
        cypher = """
        MATCH path = (center {element_id: $entity_id})-[r*1..$max_depth]-(related)
        WHERE center <> related
        WITH center, related, min(length(path)) as distance
        RETURN 
            center.element_id as center_id,
            center.name as center_name,
            labels(center)[0] as center_type,
            collect(DISTINCT {
                id: related.element_id,
                name: related.name,
                type: labels(related)[0],
                distance: distance
            }) as related_nodes
        """
        
        try:
            result = await self.session.run(cypher, {
                "entity_id": center_entity_id,
                "max_depth": max_depth
            })
            record = await result.single()
            
            if not record:
                return None
            
            # Construir nó central
            center = NetworkNode(
                id=record["center_id"],
                name=record["center_name"],
                type=record["center_type"],
                centrality_score=1.0,
                connections=len(record["related_nodes"]),
                risk_level="unknown",  # Calcular baseado em mandados, sanções, etc.
            )
            
            # Construir nós relacionados
            related: list[NetworkNode] = []
            for r in record["related_nodes"]:
                # Score inversamente proporcional à distância
                score = max(0.1, 1.0 - (r["distance"] - 1) * 0.3)
                related.append(NetworkNode(
                    id=r["id"],
                    name=r["name"],
                    type=r["type"],
                    centrality_score=score,
                    connections=0,  # Calcular posteriormente
                ))
            
            # Buscar links
            links = await self.find_links(center_entity_id, max_depth)
            
            # Detectar clusters (simplificado — usar algoritmo de comunidade)
            clusters = self._detect_clusters(center, related, links)
            
            # Detectar anomalias
            anomalies = self._detect_anomalies(center, related, links)
            
            return NetworkAnalysis(
                center_node=center,
                related_nodes=related,
                links=links,
                clusters=clusters,
                anomalies=anomalies,
            )
            
        except Exception as e:
            logger.error(f"Erro na análise de rede: {e}")
            return None
    
    def _detect_clusters(
        self,
        center: NetworkNode,
        related: list[NetworkNode],
        links: list[LinkFinding],
    ) -> list[list[str]]:
        """Detecta clusters na rede (algoritmo simplificado)."""
        # Agrupar por tipo de entidade como proxy de cluster
        clusters: dict[str, list[str]] = {}
        for node in related:
            if node.type not in clusters:
                clusters[node.type] = []
            clusters[node.type].append(node.id)
        
        return list(clusters.values())
    
    def _detect_anomalies(
        self,
        center: NetworkNode,
        related: list[NetworkNode],
        links: list[LinkFinding],
    ) -> list[dict[str, Any]]:
        """Detecta padrões anômalos na rede."""
        anomalies: list[dict[str, Any]] = []
        
        # Anomalia 1: Muitas conexões (hub suspeito)
        if center.connections > 20:
            anomalies.append({
                "type": "HUB_SUSPEITO",
                "description": f"{center.name} tem {center.connections} conexões — possível elo central",
                "severity": "medium",
            })
        
        # Anomalia 2: Múltiplos mandados
        mandates = [l for l in links if "MandadoPrisao" in l.relationship_type]
        if len(mandates) > 2:
            anomalies.append({
                "type": "MULTIPLOS_MANDADOS",
                "description": f"{len(mandates)} mandados de prisão vinculados",
                "severity": "high",
            })
        
        # Anomalia 3: Empresas offshore (simplificado)
        # Em produção: checar lista de paraísos fiscais
        
        return anomalies


# Instância global factory
def create_cross_reference_engine(session: AsyncSession) -> CrossReferenceEngine:
    """Factory para criar engine com session Neo4j."""
    return CrossReferenceEngine(session)
