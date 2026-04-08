from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import AsyncDriver, AsyncSession
from pydantic import BaseModel
from starlette.requests import Request

from bracc.config import settings
from bracc.dependencies import get_driver, get_intelligence_provider, get_session
from bracc.middleware.rate_limit import limiter
from bracc.models.pattern import PatternResponse, PatternResult
from bracc.services.intelligence_provider import IntelligenceProvider
from bracc.services.patterns.pattern_detector import get_pattern_engine, PatternMatch
from bracc.services.public_guard import enforce_entity_lookup_enabled


# PATTERN-001: Request/Response models for POST /detect
class PatternDetectRequest(BaseModel):
    text: str
    min_confidence: float = 0.618
    categories: List[str] | None = None


class PatternDetectResponse(BaseModel):
    patterns: List[dict]
    total: int
    risk_level: str
    text_length: int

router = APIRouter(prefix="/api/v1/patterns", tags=["patterns"])

_PATTERN_ENGINE_DISABLED_DETAIL = (
    "Pattern engine temporarily unavailable pending validation."
)


def _enforce_patterns_enabled() -> None:
    if not settings.patterns_enabled:
        raise HTTPException(status_code=503, detail=_PATTERN_ENGINE_DISABLED_DETAIL)


async def run_all_patterns(
    driver: AsyncDriver,
    entity_id: str | None = None,
    lang: str = "pt",
    include_probable: bool = False,
    provider: IntelligenceProvider | None = None,
) -> list[PatternResult]:
    intelligence = provider or get_intelligence_provider()
    return await intelligence.run_all_patterns(
        driver,
        entity_id=entity_id,
        lang=lang,
        include_probable=include_probable,
    )


async def run_pattern(
    session: AsyncSession,
    pattern_id: str,
    entity_id: str | None = None,
    lang: str = "pt",
    include_probable: bool = False,
    provider: IntelligenceProvider | None = None,
) -> list[PatternResult]:
    intelligence = provider or get_intelligence_provider()
    return await intelligence.run_pattern(
        session,
        pattern_id=pattern_id,
        entity_id=entity_id,
        lang=lang,
        include_probable=include_probable,
    )


@router.get("/{entity_id}", response_model=PatternResponse)
@limiter.limit("30/minute")
async def get_patterns_for_entity(
    request: Request,
    entity_id: str,
    driver: Annotated[AsyncDriver, Depends(get_driver)],
    provider: Annotated[IntelligenceProvider, Depends(get_intelligence_provider)],
    lang: Annotated[str, Query()] = "pt",
    include_probable: Annotated[bool, Query()] = False,
) -> PatternResponse:
    _enforce_patterns_enabled()
    if settings.public_mode:
        enforce_entity_lookup_enabled()
    results = await run_all_patterns(
        driver,
        entity_id,
        lang,
        include_probable=include_probable,
        provider=provider,
    )
    return PatternResponse(
        entity_id=entity_id,
        patterns=results,
        total=len(results),
    )


@router.get("/{entity_id}/{pattern_name}", response_model=PatternResponse)
@limiter.limit("30/minute")
async def get_specific_pattern(
    request: Request,
    entity_id: str,
    pattern_name: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[IntelligenceProvider, Depends(get_intelligence_provider)],
    lang: Annotated[str, Query()] = "pt",
    include_probable: Annotated[bool, Query()] = False,
) -> PatternResponse:
    _enforce_patterns_enabled()
    if settings.public_mode:
        enforce_entity_lookup_enabled()
    available = [row["id"] for row in provider.list_patterns()]
    if pattern_name not in set(available):
        raise HTTPException(
            status_code=404,
            detail=f"Pattern not found: {pattern_name}. Available: {available}",
        )
    results = await run_pattern(
        session,
        pattern_name,
        entity_id,
        lang,
        include_probable=include_probable,
        provider=provider,
    )
    return PatternResponse(
        entity_id=entity_id,
        patterns=results,
        total=len(results),
    )


@router.get("/", response_model=dict[str, list[dict[str, str]]])
async def list_patterns(
    provider: Annotated[IntelligenceProvider, Depends(get_intelligence_provider)],
) -> dict[str, list[dict[str, str]]]:
    _enforce_patterns_enabled()
    return {"patterns": provider.list_patterns()}


# PATTERN-001: POST /api/v1/patterns/detect — detect patterns in text
@router.post("/detect", response_model=PatternDetectResponse)
@limiter.limit("60/minute")
async def detect_patterns_in_text(
    request: Request,
    detect_req: PatternDetectRequest,
) -> PatternDetectResponse:
    """
    Detect behavioral patterns in provided text.
    
    Uses pattern detection engine to identify criminal/psychological
    patterns with confidence scoring based on Sacred Mathematics (φ).
    """
    _enforce_patterns_enabled()
    
    engine = get_pattern_engine()
    matches = engine.detect_patterns(
        text=detect_req.text,
        min_confidence=detect_req.min_confidence,
        categories=detect_req.categories
    )
    
    return PatternDetectResponse(
        patterns=[match.to_dict() for match in matches],
        total=len(matches),
        risk_level=engine.get_risk_level(matches),
        text_length=len(detect_req.text)
    )
