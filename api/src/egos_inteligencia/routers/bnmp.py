"""
BNMP Router — EGOS Inteligência
API endpoints para consulta de mandados de prisão

Sacred Code: 000.111.369.963.1618
"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import AsyncSession
from pydantic import BaseModel, Field
from starlette.requests import Request

from bracc.dependencies import get_session
from bracc.middleware.rate_limit import limiter

router = APIRouter(prefix="/api/v1/bnmp", tags=["bnmp"])


class MandadoPrisaoResponse(BaseModel):
    """Resposta de mandado de prisão."""
    element_id: str
    numero_mandado: str | None
    nome_pessoa: str | None
    cpf: str | None = Field(None, description="CPF sem formatação")
    situacao: str
    situacao_codigo: int | None
    data_expedicao: str | None
    data_validade: str | None
    orgao_expedidor: str | None
    orgao_sigla: str | None
    tipo_mandado: str | None
    numero_processo: str | None
    descricao: str | None
    risk_score: int = Field(..., description="Score 0-100 de prioridade")
    url: str | None


class BNMPListResponse(BaseModel):
    """Lista paginada de mandados."""
    total: int
    page: int
    page_size: int
    results: list[MandadoPrisaoResponse]


class BNMPStatsResponse(BaseModel):
    """Estatísticas de mandados."""
    total_mandados: int
    ativos: int
    cumpridos: int
    suspensos: int
    by_state: dict[str, int]
    by_type: dict[str, int]
    high_risk_count: int  # risk_score >= 70


# GET /api/v1/bnmp/search — buscar mandados
@router.get("/search", response_model=BNMPListResponse)
@limiter.limit("60/minute")
async def search_mandados(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    q: str | None = Query(None, description="Busca por nome ou número"),
    state: str | None = Query(None, description="UF (ex: MG, SP, RJ)"),
    situacao: str | None = Query(None, description="ATIVO, CUMPRIDO, SUSPENSO"),
    min_risk: int = Query(0, ge=0, le=100, description="Score mínimo de risco"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> BNMPListResponse:
    """
    Buscar mandados de prisão no BNMP.
    
    Permite filtrar por:
    - Nome da pessoa (busca parcial)
    - Estado (UF)
    - Situação (ATIVO, CUMPRIDO, SUSPENSO)
    - Score de risco mínimo
    
    ## Exemplos
    - `/bnmp/search?q=Silva&state=MG` — Mandados para Silva em MG
    - `/bnmp/search?situacao=ATIVO&min_risk=70` — Ativos de alto risco
    """
    
    # Build query dinamicamente
    where_clauses = ["m:MandadoPrisao"]
    params: dict[str, Any] = {
        "skip": (page - 1) * page_size,
        "limit": page_size,
        "min_risk": min_risk,
    }
    
    if q:
        where_clauses.append(
            "(m.name =~ $name_pattern OR m.numero_mandado =~ $q OR m.searchable_text =~ $name_pattern)"
        )
        params["name_pattern"] = f"(?i).*{q}.*"
        params["q"] = q
    
    if state:
        where_clauses.append("m.orgao_sigla = $state")
        params["state"] = state.upper()
    
    if situacao:
        where_clauses.append("m.situacao = $situacao")
        params["situacao"] = situacao.upper()
    
    where_clauses.append("m.risk_score >= $min_risk")
    
    where_clause = " AND ".join(where_clauses)
    
    # Count total
    count_cypher = f"""
    MATCH (m) WHERE {where_clause}
    RETURN count(m) as total
    """
    
    # Query results
    query_cypher = f"""
    MATCH (m) WHERE {where_clause}
    RETURN m {{
        .element_id, .numero_mandado, .name, .cpf, .situacao,
        .situacao_codigo, .data_expedicao, .data_validade,
        .orgao_expedidor, .orgao_sigla, .tipo_mandado,
        .numero_processo, .descricao, .risk_score, .url
    }} as mandado
    ORDER BY m.risk_score DESC, m.data_expedicao DESC
    SKIP $skip LIMIT $limit
    """
    
    try:
        # Execute count
        count_result = await session.run(count_cypher, params)
        count_record = await count_result.single()
        total = count_record["total"] if count_record else 0
        
        # Execute query
        result = await session.run(query_cypher, params)
        records = await result.data()
        
        # Transform to response model
        results = []
        for record in records:
            m = record["mandado"]
            results.append(MandadoPrisaoResponse(
                element_id=m.get("element_id", ""),
                numero_mandado=m.get("numero_mandado"),
                nome_pessoa=m.get("name"),
                cpf=m.get("cpf"),
                situacao=m.get("situacao", "INDEFINIDO"),
                situacao_codigo=m.get("situacao_codigo"),
                data_expedicao=m.get("data_expedicao"),
                data_validade=m.get("data_validade"),
                orgao_expedidor=m.get("orgao_expedidor"),
                orgao_sigla=m.get("orgao_sigla"),
                tipo_mandado=m.get("tipo_mandado"),
                numero_processo=m.get("numero_processo"),
                descricao=m.get("descricao"),
                risk_score=m.get("risk_score", 0),
                url=m.get("url"),
            ))
        
        return BNMPListResponse(
            total=total,
            page=page,
            page_size=page_size,
            results=results,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na consulta: {str(e)}")


# GET /api/v1/bnmp/stats — estatísticas
@router.get("/stats", response_model=BNMPStatsResponse)
@limiter.limit("120/minute")
async def get_stats(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BNMPStatsResponse:
    """
    Estatísticas gerais dos mandados de prisão.
    """
    
    cypher = """
    MATCH (m:MandadoPrisao)
    RETURN 
        count(m) as total,
        sum(CASE WHEN m.situacao = 'ATIVO' THEN 1 ELSE 0 END) as ativos,
        sum(CASE WHEN m.situacao = 'CUMPRIDO' THEN 1 ELSE 0 END) as cumpridos,
        sum(CASE WHEN m.situacao = 'SUSPENSO' THEN 1 ELSE 0 END) as suspensos,
        sum(CASE WHEN m.risk_score >= 70 THEN 1 ELSE 0 END) as high_risk
    """
    
    cypher_by_state = """
    MATCH (m:MandadoPrisao)
    WHERE m.orgao_sigla IS NOT NULL
    RETURN m.orgao_sigla as state, count(m) as count
    ORDER BY count DESC
    """
    
    cypher_by_type = """
    MATCH (m:MandadoPrisao)
    WHERE m.tipo_mandado IS NOT NULL
    RETURN m.tipo_mandado as type, count(m) as count
    ORDER BY count DESC
    """
    
    try:
        # Main stats
        result = await session.run(cypher)
        record = await result.single()
        
        # By state
        result_state = await session.run(cypher_by_state)
        by_state = {r["state"]: r["count"] async for r in result_state}
        
        # By type
        result_type = await session.run(cypher_by_type)
        by_type = {r["type"]: r["count"] async for r in result_type}
        
        return BNMPStatsResponse(
            total_mandados=record["total"],
            ativos=record["ativos"],
            cumpridos=record["cumpridos"],
            suspensos=record["suspensos"],
            by_state=by_state,
            by_type=by_type,
            high_risk_count=record["high_risk"],
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro nas estatísticas: {str(e)}")


# GET /api/v1/bnmp/person/{cpf} — mandados por CPF
@router.get("/person/{cpf}", response_model=list[MandadoPrisaoResponse])
@limiter.limit("60/minute")
async def get_by_cpf(
    request: Request,
    cpf: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MandadoPrisaoResponse]:
    """
    Buscar todos os mandados de uma pessoa pelo CPF.
    
    ## CPF
    Pode ser informado com ou sem formatação:
    - `123.456.789-00` → aceito
    - `12345678900` → aceito
    """
    # Clean CPF
    clean_cpf = cpf.replace(".", "").replace("-", "").strip()
    
    if len(clean_cpf) != 11 or not clean_cpf.isdigit():
        raise HTTPException(status_code=400, detail="CPF inválido")
    
    cypher = """
    MATCH (p:Person {cpf: $cpf})-[:HAS_MANDATE]->(m:MandadoPrisao)
    RETURN m {
        .element_id, .numero_mandado, .name, .cpf, .situacao,
        .situacao_codigo, .data_expedicao, .data_validade,
        .orgao_expedidor, .orgao_sigla, .tipo_mandado,
        .numero_processo, .descricao, .risk_score, .url
    } as mandado
    ORDER BY m.data_expedicao DESC
    """
    
    try:
        result = await session.run(cypher, {"cpf": clean_cpf})
        records = await result.data()
        
        return [
            MandadoPrisaoResponse(
                element_id=r["mandado"]["element_id"],
                numero_mandado=r["mandado"].get("numero_mandado"),
                nome_pessoa=r["mandado"].get("name"),
                cpf=r["mandado"].get("cpf"),
                situacao=r["mandado"].get("situacao", "INDEFINIDO"),
                situacao_codigo=r["mandado"].get("situacao_codigo"),
                data_expedicao=r["mandado"].get("data_expedicao"),
                data_validade=r["mandado"].get("data_validade"),
                orgao_expedidor=r["mandado"].get("orgao_expedidor"),
                orgao_sigla=r["mandado"].get("orgao_sigla"),
                tipo_mandado=r["mandado"].get("tipo_mandado"),
                numero_processo=r["mandado"].get("numero_processo"),
                descricao=r["mandado"].get("descricao"),
                risk_score=r["mandado"].get("risk_score", 0),
                url=r["mandado"].get("url"),
            )
            for r in records
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na consulta: {str(e)}")


# POST /api/v1/bnmp/ingest — ingestão manual (admin)
@router.post("/ingest")
@limiter.limit("10/minute")
async def ingest_mandados(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    state: str | None = Query(None, description="UF para ingestão"),
    limit: int = Query(100, ge=1, le=5000),
) -> dict[str, Any]:
    """
    Ingestão manual de mandados do BNMP (requer auth admin).
    
    ⚠️ Endpoint administrativo — rate limit baixo.
    """
    from bracc.services.etl.pipelines.bnmp import BNMPPipeline
    
    try:
        pipeline = BNMPPipeline()
        result = await pipeline.run(
            neo4j_session=session,
            state_code=state,
            limit=limit,
        )
        
        return {
            "success": True,
            "message": f"Ingestão concluída: {result['loaded']['mandados']} mandados",
            "details": result,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na ingestão: {str(e)}")
