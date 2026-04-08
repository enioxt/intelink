"""
Cross-Reference Router — EGOS Inteligência
API endpoints para vínculos e análise de redes

Sacred Code: 000.111.369.963.1618
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession
from pydantic import BaseModel, Field
from starlette.requests import Request

from bracc.dependencies import get_session
from bracc.middleware.rate_limit import limiter
from bracc.services.cross_reference_engine import (
    CrossReferenceEngine,
    LinkFinding,
    NetworkAnalysis,
)

router = APIRouter(prefix="/api/v1/cross-reference", tags=["cross-reference"])


class LinkResponse(BaseModel):
    """Resposta de vínculo encontrado."""
    entity_a_id: str
    entity_b_id: str
    entity_a_name: str
    entity_b_name: str
    entity_a_type: str
    entity_b_type: str
    relationship_type: str
    strength: float = Field(..., description="0.0-1.0 força do vínculo")
    evidence: list[str]


class FindLinksRequest(BaseModel):
    """Requisição para buscar vínculos."""
    entity_id: str = Field(..., description="ID da entidade central")
    max_depth: int = Field(default=2, ge=1, le=3, description="Profundidade da busca")
    min_strength: float = Field(default=0.5, ge=0.0, le=1.0)


class FindLinksResponse(BaseModel):
    """Resposta com vínculos encontrados."""
    entity_id: str
    total_found: int
    links: list[LinkResponse]


class NetworkNodeResponse(BaseModel):
    """Nó na rede."""
    id: str
    name: str
    type: str
    centrality_score: float
    connections: int
    risk_level: str


class NetworkAnalysisResponse(BaseModel):
    """Análise completa de rede."""
    center_node: NetworkNodeResponse
    related_nodes: list[NetworkNodeResponse]
    links: list[LinkResponse]
    clusters: list[list[str]]
    anomalies: list[dict[str, Any]]
    summary: str


class CrossCaseRequest(BaseModel):
    """Requisição para análise cross-case."""
    investigation_ids: list[str] = Field(..., min_length=2, max_length=10)


class CrossCaseMatchResponse(BaseModel):
    """Match entre casos."""
    case_a_id: str
    case_b_id: str
    case_a_title: str
    case_b_title: str
    similarity_score: float
    common_entities: list[dict[str, Any]]
    temporal_overlap: bool
    geographic_overlap: bool
    recommended_action: str


# POST /api/v1/cross-reference/links — buscar vínculos
@router.post("/links", response_model=FindLinksResponse)
@limiter.limit("60/minute")
async def find_links(
    request: Request,
    req: FindLinksRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FindLinksResponse:
    """
    Busca vínculos de uma entidade na rede.
    
    Detecta conexões diretas e indiretas entre:
    - Pessoas físicas/jurídicas
    - Empresas e sócios
    - Veículos e proprietários
    - Processos e partes
    - Mandados e pessoas
    
    ## Exemplo
    ```json
    {
        "entity_id": "cnpj:12345678000195",
        "max_depth": 2,
        "min_strength": 0.5
    }
    ```
    """
    engine = CrossReferenceEngine(session)
    
    findings = await engine.find_links(
        entity_id=req.entity_id,
        max_depth=req.max_depth,
        min_strength=req.min_strength,
    )
    
    return FindLinksResponse(
        entity_id=req.entity_id,
        total_found=len(findings),
        links=[
            LinkResponse(
                entity_a_id=f.entity_a_id,
                entity_b_id=f.entity_b_id,
                entity_a_name=f.entity_a_name,
                entity_b_name=f.entity_b_name,
                entity_a_type=f.entity_a_type,
                entity_b_type=f.entity_b_type,
                relationship_type=f.relationship_type,
                strength=f.strength,
                evidence=f.evidence,
            )
            for f in findings
        ],
    )


# POST /api/v1/cross-reference/network — análise de rede
@router.post("/network", response_model=NetworkAnalysisResponse)
@limiter.limit("30/minute")
async def analyze_network(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    entity_id: str,
    max_depth: int = 2,
) -> NetworkAnalysisResponse:
    """
    Análise completa de rede a partir de entidade central.
    
    Retorna:
    - Métricas de centralidade
    - Clusters identificados
    - Anomalias detectadas
    - Mapa completo de relacionamentos
    
    ## Exemplo
    `POST /cross-reference/network?entity_id=cpf:12345678900&max_depth=2`
    """
    engine = CrossReferenceEngine(session)
    
    analysis = await engine.analyze_network(entity_id, max_depth)
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Entidade não encontrada ou sem rede")
    
    # Gerar summary
    summary_parts = [
        f"Rede de {analysis.center_node.name}: {len(analysis.related_nodes)} entidades conectadas",
        f"{len(analysis.clusters)} clusters identificados",
    ]
    if analysis.anomalies:
        summary_parts.append(f"⚠️ {len(analysis.anomalies)} anomalias detectadas")
    
    return NetworkAnalysisResponse(
        center_node=NetworkNodeResponse(
            id=analysis.center_node.id,
            name=analysis.center_node.name,
            type=analysis.center_node.type,
            centrality_score=analysis.center_node.centrality_score,
            connections=analysis.center_node.connections,
            risk_level=analysis.center_node.risk_level,
        ),
        related_nodes=[
            NetworkNodeResponse(
                id=n.id,
                name=n.name,
                type=n.type,
                centrality_score=n.centrality_score,
                connections=n.connections,
                risk_level=n.risk_level,
            )
            for n in analysis.related_nodes[:50]  # Top 50
        ],
        links=[
            LinkResponse(
                entity_a_id=l.entity_a_id,
                entity_b_id=l.entity_b_id,
                entity_a_name=l.entity_a_name,
                entity_b_name=l.entity_b_name,
                entity_a_type=l.entity_a_type,
                entity_b_type=l.entity_b_type,
                relationship_type=l.relationship_type,
                strength=l.strength,
                evidence=l.evidence,
            )
            for l in analysis.links[:100]  # Top 100
        ],
        clusters=analysis.clusters,
        anomalies=analysis.anomalies,
        summary=". ".join(summary_parts),
    )


# POST /api/v1/cross-reference/cross-case — análise cross-case
@router.post("/cross-case", response_model=list[CrossCaseMatchResponse])
@limiter.limit("30/minute")
async def cross_case_analysis(
    request: Request,
    req: CrossCaseRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CrossCaseMatchResponse]:
    """
    Analisa cruzamentos entre múltiplas investigações.
    
    Detecta:
    - Entidades em comum (pessoas, empresas, veículos)
    - Sobreposição temporal
    - Sobreposição geográfica
    - Possíveis conexões criminosas
    
    ## Exemplo
    ```json
    {
        "investigation_ids": ["inv-001", "inv-002", "inv-003"]
    }
    ```
    
    ## Resposta
    Retorna lista de matches ordenados por similaridade.
    - Score >= 0.8: Link forte — mesma rede provável
    - Score 0.5-0.8: Link moderado — coordenar diligências
    - Score 0.3-0.5: Link fraco — monitorar
    """
    engine = CrossReferenceEngine(session)
    
    matches = await engine.cross_case_analysis(req.investigation_ids)
    
    return [
        CrossCaseMatchResponse(
            case_a_id=m.case_a_id,
            case_b_id=m.case_b_id,
            case_a_title=m.case_a_title,
            case_b_title=m.case_b_title,
            similarity_score=m.similarity_score,
            common_entities=m.common_entities,
            temporal_overlap=m.temporal_overlap,
            geographic_overlap=m.geographic_overlap,
            recommended_action=m.recommended_action,
        )
        for m in matches
    ]


# GET /api/v1/cross-reference/info — documentação
@router.get("/info")
@limiter.limit("120/minute")
async def get_info(request: Request) -> dict[str, Any]:
    """
    Informações sobre o sistema de cross-reference.
    """
    return {
        "description": "Sistema de vínculos e análise de redes para investigações",
        "capabilities": [
            "Busca de vínculos diretos e indiretos (até 3 saltos)",
            "Análise de rede com métricas de centralidade",
            "Detecção de clusters e comunidades",
            "Cross-case analysis (entidades em comum)",
            "Detecção de anomalias (hubs suspeitos, múltiplos mandados)",
        ],
        "entity_types": [
            "Person (CPF)",
            "Company (CNPJ)",
            "Vehicle (placa)",
            "Location",
            "ProcessoJudicial",
            "MandadoPrisao",
        ],
        "relationship_types": [
            "PARTNER_OF (sócio)",
            "HAS_VEHICLE (veículo)",
            "INVOLVED_IN (envolvido em)",
            "ISSUED_BY (expedido por)",
            "HAS_MANDATE (mandado)",
            "LOCATED_AT (localizado em)",
        ],
        "limitations": [
            "Máximo 3 saltos de profundidade",
            "Rate limit: 60 req/min (links), 30 req/min (network/cross-case)",
            "Dados limitados ao que está no Neo4j",
        ],
        "algorithms": {
            "centrality": "Grau de conexão + proximidade",
            "clustering": "Agrupamento por tipo de entidade",
            "anomaly_detection": "Heurísticas baseadas em mandados, sanções",
        },
    }
