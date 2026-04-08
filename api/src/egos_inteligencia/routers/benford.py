"""
Benford Router — EGOS Inteligência / Intelink
BENFORD-001: Benford's Law anomaly detection endpoints

Sacred Code: 000.111.369.963.1618
"""

from typing import Annotated, Any, List

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession
from pydantic import BaseModel, Field
from starlette.requests import Request

from bracc.config import settings
from bracc.dependencies import get_session
from bracc.middleware.rate_limit import limiter
from bracc.services.benford_analyzer import (
    analyze_benford,
    analyze_entity_contracts,
    to_dict,
)

router = APIRouter(prefix="/api/v1/benford", tags=["benford"])


class BenfordAnalyzeRequest(BaseModel):
    values: List[float] = Field(..., description="List of numerical values to analyze")
    include_second_digit: bool = Field(default=False, description="Include second-digit analysis")
    confidence_level: float = Field(default=0.95, ge=0.8, le=0.99, description="Statistical confidence level")


class BenfordDigitDistribution(BaseModel):
    digit: int
    count: int
    expected_count: float
    actual_percentage: float
    expected_percentage: float
    deviation: float


class BenfordResponse(BaseModel):
    sample_size: int
    chi_square_statistic: float
    chi_square_critical: float
    degrees_of_freedom: int
    is_anomalous: bool
    conformity_score: float = Field(..., description="Conformity score 0-100 (higher = more conformant)")
    first_digit_distribution: List[BenfordDigitDistribution]
    second_digit_distribution: List[BenfordDigitDistribution] | None
    risk_level: str = Field(..., description="Risk level: low, medium, high")
    interpretation: str


class BenfordEntityRequest(BaseModel):
    entity_id: str = Field(..., description="Entity ID to analyze contracts for")


# BENFORD-001: POST /api/v1/benford/analyze — analyze custom dataset
@router.post("/analyze", response_model=BenfordResponse)
@limiter.limit("60/minute")
async def analyze_dataset(
    request: Request,
    analyze_req: BenfordAnalyzeRequest,
) -> BenfordResponse:
    """
    Analyze a custom dataset against Benford's Law.
    
    Detects anomalies in financial data, contracts, invoices, or any naturally
    occurring numerical dataset. Useful for fraud detection and data quality
    validation.
    
    ## Benford's Law
    In naturally occurring datasets, the first digit follows a logarithmic distribution:
    - 1 appears ~30.1% of the time
    - 2 appears ~17.6% of the time
    - ...
    - 9 appears ~4.6% of the time
    
    Deviations from this distribution may indicate manipulation or artificial data.
    """
    result = analyze_benford(
        values=analyze_req.values,
        include_second_digit=analyze_req.include_second_digit,
        confidence_level=analyze_req.confidence_level,
    )
    
    # Convert to response model
    return BenfordResponse(
        sample_size=result.sample_size,
        chi_square_statistic=result.chi_square_statistic,
        chi_square_critical=result.chi_square_critical,
        degrees_of_freedom=result.degrees_of_freedom,
        is_anomalous=result.is_anomalous,
        conformity_score=result.conformity_score,
        first_digit_distribution=[
            BenfordDigitDistribution(
                digit=d.digit,
                count=d.count,
                expected_count=d.expected_count,
                actual_percentage=d.actual_percentage,
                expected_percentage=d.expected_percentage,
                deviation=d.deviation,
            )
            for d in result.first_digit_distribution
        ],
        second_digit_distribution=(
            [
                BenfordDigitDistribution(
                    digit=d.digit,
                    count=d.count,
                    expected_count=d.expected_count,
                    actual_percentage=d.actual_percentage,
                    expected_percentage=d.expected_percentage,
                    deviation=d.deviation,
                )
                for d in result.second_digit_distribution
            ]
            if result.second_digit_distribution
            else None
        ),
        risk_level=result.risk_level,
        interpretation=result.interpretation,
    )


# BENFORD-001: POST /api/v1/benford/entity/{entity_id} — analyze entity contracts
@router.post("/entity/{entity_id}", response_model=BenfordResponse)
@limiter.limit("30/minute")
async def analyze_entity(
    request: Request,
    entity_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BenfordResponse:
    """
    Analyze an entity's contract values against Benford's Law.
    
    Queries all contracts associated with the entity and analyzes their
    monetary values for anomalies that may indicate procurement irregularities.
    """
    result = await analyze_entity_contracts(session, entity_id)
    
    return BenfordResponse(
        sample_size=result.sample_size,
        chi_square_statistic=result.chi_square_statistic,
        chi_square_critical=result.chi_square_critical,
        degrees_of_freedom=result.degrees_of_freedom,
        is_anomalous=result.is_anomalous,
        conformity_score=result.conformity_score,
        first_digit_distribution=[
            BenfordDigitDistribution(
                digit=d.digit,
                count=d.count,
                expected_count=d.expected_count,
                actual_percentage=d.actual_percentage,
                expected_percentage=d.expected_percentage,
                deviation=d.deviation,
            )
            for d in result.first_digit_distribution
        ],
        second_digit_distribution=(
            [
                BenfordDigitDistribution(
                    digit=d.digit,
                    count=d.count,
                    expected_count=d.expected_count,
                    actual_percentage=d.actual_percentage,
                    expected_percentage=d.expected_percentage,
                    deviation=d.deviation,
                )
                for d in result.second_digit_distribution
            ]
            if result.second_digit_distribution
            else None
        ),
        risk_level=result.risk_level,
        interpretation=result.interpretation,
    )


# BENFORD-001: GET /api/v1/benford/info — get Benford's Law info
@router.get("/info")
@limiter.limit("120/minute")
async def get_benford_info(
    request: Request,
) -> dict[str, Any]:
    """
    Get information about Benford's Law and expected distributions.
    """
    return {
        "description": "Benford's Law describes the frequency distribution of leading digits in naturally occurring datasets",
        "expected_first_digit_distribution": {
            str(d): f"{p*100:.1f}%" for d, p in [
                (1, 0.301), (2, 0.176), (3, 0.125), (4, 0.097),
                (5, 0.079), (6, 0.067), (7, 0.058), (8, 0.051), (9, 0.046),
            ]
        },
        "applications": [
            "Fraud detection in financial data",
            "Contract value analysis",
            "Invoice verification",
            "Procurement irregularity detection",
            "Data quality validation",
        ],
        "limitations": [
            "Requires naturally occurring data (not assigned numbers like SSN)",
            "Minimum sample size of 100-200 values recommended",
            "May not apply to data with narrow ranges (e.g., human heights)",
            "Second-digit analysis requires larger samples",
        ],
        "confidence_levels": {
            "95%": "χ² critical = 15.51 (df=8)",
            "99%": "χ² critical = 20.09 (df=8)",
        },
    }
