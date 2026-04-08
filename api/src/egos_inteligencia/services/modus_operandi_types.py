"""
Modus Operandi Types — EGOS Inteligência
MO-001a: Tipagens para comparação cross-case

Sacred Code: 000.111.369.963.1618
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class PatternMatch:
    """Padrão comportamental detectado em investigação."""
    id: str
    name: str
    category: str  # ex: "temporal", "geografico", "financeiro"
    confidence: float  # 0.0 - 1.0
    description: str
    entities_involved: list[str] | None = None
    evidence_refs: list[str] | None = None


@dataclass
class EntityReference:
    """Referência a entidade em investigação."""
    id: str
    name: str
    type: str  # "person", "company", "vehicle", "location"
    role: str  # "suspect", "victim", "witness", "target"
    first_seen: str | None = None


@dataclass
class TimelineEvent:
    """Evento na linha do tempo da investigação."""
    date: str  # ISO 8601
    description: str
    type: str  # "acao", "movimentacao", "comunicacao", "transacao"
    location: str | None = None
    entities: list[str] | None = None  # IDs de entidades


@dataclass
class InvestigationSummary:
    """Resumo leve de investigação para comparação."""
    id: str
    title: str
    case_number: str
    status: str  # "ativa", "arquivada", "concluida"
    created_at: str
    priority: str  # "baixa", "media", "alta", "critica"
    
    # Dados para comparação
    patterns: list[PatternMatch]
    entities: list[EntityReference]
    timeline: list[TimelineEvent]
    tags: list[str] | None = None


@dataclass
class TemporalMatch:
    """Alinhamento temporal entre eventos de dois casos."""
    event_a: TimelineEvent
    event_b: TimelineEvent
    days_apart: int
    similarity_score: float  # 0.0 - 1.0
    match_type: str  # "mesmo_dia", "proximo", "padrao_semanal", "padrao_mensal"


@dataclass
class EntitySimilarity:
    """Similaridade entre entidades de dois casos."""
    entity_a: EntityReference
    entity_b: EntityReference
    match_score: float  # 0.0 - 1.0
    match_reason: str  # "mesmo_nome", "mesmo_documento", "parentesco", "societario"


@dataclass
class PatternSimilarity:
    """Similaridade entre padrões de dois casos."""
    pattern_a: PatternMatch
    pattern_b: PatternMatch
    similarity_score: float
    shared_entities: list[str] | None = None


@dataclass
class ComparisonResult:
    """Resultado completo da comparação entre investigações."""
    investigation_a_id: str
    investigation_b_id: str
    
    # Scores
    overall_similarity: float  # 0.0 - 100.0
    temporal_similarity: float
    entity_similarity: float
    pattern_similarity: float
    
    # Matches encontrados
    common_entities: list[EntitySimilarity]
    common_patterns: list[PatternSimilarity]
    temporal_alignments: list[TemporalMatch]
    
    # Análise
    risk_level: str  # "baixo", "medio", "alto", "critico"
    interpretation: str
    suggested_links: list[dict[str, Any]] | None = None
    
    # Metadados
    comparison_date: str
    algorithm_version: str = "1.0.0"


@dataclass
class BatchComparisonRequest:
    """Requisição para comparar múltiplas investigações."""
    investigation_ids: list[str]
    min_similarity_threshold: float = 50.0  # Filtrar matches abaixo disso
    include_temporal: bool = True
    include_entities: bool = True
    include_patterns: bool = True


@dataclass
class BatchComparisonResult:
    """Resultado de comparação em lote."""
    total_comparisons: int
    significant_matches: list[ComparisonResult]  # Acima do threshold
    similarity_matrix: dict[str, dict[str, float]]  # Matriz NxN
    clusters: list[list[str]] | None = None  # Grupos de casos relacionados
