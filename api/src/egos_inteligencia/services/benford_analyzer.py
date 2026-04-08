"""
Benford's Law Analyzer — EGOS Inteligência
BENFORD-001: Anomaly detection for financial/contract data

Detects deviations from expected digit distribution in naturally occurring datasets.
Useful for fraud detection in contracts, invoices, and financial records.

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from neo4j import AsyncSession

# Benford's Law expected first-digit distribution
BENFORD_EXPECTED = {
    1: 0.301,  # 30.1%
    2: 0.176,  # 17.6%
    3: 0.125,  # 12.5%
    4: 0.097,  # 9.7%
    5: 0.079,  # 7.9%
    6: 0.067,  # 6.7%
    7: 0.058,  # 5.8%
    8: 0.051,  # 5.1%
    9: 0.046,  # 4.6%
}

BENFORD_SECOND_DIGIT = {
    0: 0.120, 1: 0.114, 2: 0.109, 3: 0.104, 4: 0.100,
    5: 0.097, 6: 0.093, 7: 0.090, 8: 0.088, 9: 0.085,
}


@dataclass
class DigitDistribution:
    digit: int
    count: int
    expected_count: float
    actual_percentage: float
    expected_percentage: float
    deviation: float


@dataclass
class BenfordResult:
    sample_size: int
    chi_square_statistic: float
    chi_square_critical: float  # at 95% confidence
    degrees_of_freedom: int
    is_anomalous: bool
    conformity_score: float  # 0-100, higher = more conformant
    first_digit_distribution: list[DigitDistribution]
    second_digit_distribution: list[DigitDistribution] | None
    risk_level: str  # "low", "medium", "high"
    interpretation: str


def get_first_digit(value: float) -> int | None:
    """Extract first significant digit from a number."""
    if value <= 0:
        return None
    abs_val = abs(value)
    while abs_val < 1:
        abs_val *= 10
    while abs_val >= 10:
        abs_val /= 10
    return int(abs_val)


def get_second_digit(value: float) -> int | None:
    """Extract second significant digit from a number."""
    if value <= 0:
        return None
    abs_val = abs(value)
    while abs_val < 1:
        abs_val *= 10
    while abs_val >= 100:
        abs_val /= 10
    first = int(abs_val)
    second = int((abs_val - first) * 10)
    return second


def calculate_chi_square(
    observed: dict[int, int],
    expected_probs: dict[int, float],
    total: int,
) -> tuple[float, int]:
    """Calculate chi-square statistic for goodness of fit."""
    chi_sq = 0.0
    df = 0
    for digit, prob in expected_probs.items():
        expected = total * prob
        obs = observed.get(digit, 0)
        if expected > 0:
            chi_sq += ((obs - expected) ** 2) / expected
            df += 1
    return chi_sq, df - 1  # degrees of freedom = categories - 1


def analyze_benford(
    values: list[float],
    include_second_digit: bool = False,
    confidence_level: float = 0.95,
) -> BenfordResult:
    """
    Analyze a dataset against Benford's Law.
    
    Args:
        values: List of numerical values to analyze
        include_second_digit: Whether to include second-digit analysis
        confidence_level: Statistical confidence level (default 95%)
    
    Returns:
        BenfordResult with conformity metrics and anomaly detection
    """
    if not values:
        return BenfordResult(
            sample_size=0,
            chi_square_statistic=0.0,
            chi_square_critical=0.0,
            degrees_of_freedom=0,
            is_anomalous=False,
            conformity_score=0.0,
            first_digit_distribution=[],
            second_digit_distribution=None,
            risk_level="unknown",
            interpretation="No data provided for analysis",
        )
    
    # Extract first digits
    first_digits: list[int] = []
    for val in values:
        d = get_first_digit(val)
        if d is not None:
            first_digits.append(d)
    
    if not first_digits:
        return BenfordResult(
            sample_size=0,
            chi_square_statistic=0.0,
            chi_square_critical=0.0,
            degrees_of_freedom=0,
            is_anomalous=False,
            conformity_score=0.0,
            first_digit_distribution=[],
            second_digit_distribution=None,
            risk_level="unknown",
            interpretation="No positive values found in dataset",
        )
    
    # Count first digits
    first_digit_counts: dict[int, int] = {d: 0 for d in range(1, 10)}
    for d in first_digits:
        first_digit_counts[d] += 1
    
    total = len(first_digits)
    
    # Calculate chi-square for first digits
    chi_sq, df = calculate_chi_square(first_digit_counts, BENFORD_EXPECTED, total)
    
    # Critical value for 95% confidence (df=8 for first digits)
    # χ² critical at α=0.05, df=8 is approximately 15.51
    chi_critical = 15.507
    
    is_anomalous = chi_sq > chi_critical
    
    # Calculate conformity score (0-100)
    # Perfect conformity = 100, Critical threshold = 50
    if chi_sq <= 5:
        conformity_score = 100.0
    elif chi_sq >= chi_critical:
        conformity_score = max(0.0, 50.0 - (chi_sq - chi_critical) * 2)
    else:
        conformity_score = 100.0 - ((chi_sq - 5) / (chi_critical - 5)) * 50
    
    conformity_score = round(max(0.0, min(100.0, conformity_score)), 2)
    
    # Build first digit distribution
    first_dist = []
    for digit in range(1, 10):
        count = first_digit_counts.get(digit, 0)
        expected = total * BENFORD_EXPECTED[digit]
        actual_pct = (count / total) * 100 if total > 0 else 0
        expected_pct = BENFORD_EXPECTED[digit] * 100
        deviation = actual_pct - expected_pct
        
        first_dist.append(DigitDistribution(
            digit=digit,
            count=count,
            expected_count=round(expected, 2),
            actual_percentage=round(actual_pct, 2),
            expected_percentage=round(expected_pct, 2),
            deviation=round(deviation, 2),
        ))
    
    # Second digit analysis
    second_dist = None
    if include_second_digit:
        second_digits: list[int] = []
        for val in values:
            d = get_second_digit(val)
            if d is not None:
                second_digits.append(d)
        
        if second_digits:
            second_digit_counts: dict[int, int] = {d: 0 for d in range(0, 10)}
            for d in second_digits:
                second_digit_counts[d] += 1
            
            second_total = len(second_digits)
            second_dist = []
            for digit in range(0, 10):
                count = second_digit_counts.get(digit, 0)
                expected = second_total * BENFORD_SECOND_DIGIT[digit]
                actual_pct = (count / second_total) * 100 if second_total > 0 else 0
                expected_pct = BENFORD_SECOND_DIGIT[digit] * 100
                deviation = actual_pct - expected_pct
                
                second_dist.append(DigitDistribution(
                    digit=digit,
                    count=count,
                    expected_count=round(expected, 2),
                    actual_percentage=round(actual_pct, 2),
                    expected_percentage=round(expected_pct, 2),
                    deviation=round(deviation, 2),
                ))
    
    # Determine risk level
    if conformity_score >= 90:
        risk_level = "low"
    elif conformity_score >= 70:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Generate interpretation
    if is_anomalous:
        interpretation = (
            f"⚠️ ANÔMALIA DETECTADA: Os dados desviam significativamente da Lei de Benford "
            f"(χ²={chi_sq:.2f} > {chi_critical}). "
            f"Isso sugere possível manipulação ou padrões artificiais no dataset. "
            f"Score de conformidade: {conformity_score}/100."
        )
    elif conformity_score >= 95:
        interpretation = (
            f"✅ CONFORMIDADE EXCELENTE: Os dados seguem a distribuição esperada da Lei de Benford "
            f"(χ²={chi_sq:.2f}). Score de conformidade: {conformity_score}/100. "
            f"Nenhuma anomalia detectada."
        )
    else:
        interpretation = (
            f"⚡ CONFORMIDADE MODERADA: Pequenos desvios da Lei de Benford detectados "
            f"(χ²={chi_sq:.2f}). Score de conformidade: {conformity_score}/100. "
            f"Recomenda-se revisão amostral."
        )
    
    return BenfordResult(
        sample_size=total,
        chi_square_statistic=round(chi_sq, 4),
        chi_square_critical=chi_critical,
        degrees_of_freedom=df,
        is_anomalous=is_anomalous,
        conformity_score=conformity_score,
        first_digit_distribution=first_dist,
        second_digit_distribution=second_dist,
        risk_level=risk_level,
        interpretation=interpretation,
    )


async def analyze_entity_contracts(
    session: AsyncSession,
    entity_id: str,
) -> BenfordResult:
    """
    Analyze contract values for an entity using Benford's Law.
    
    This is useful for detecting anomalies in procurement/contracts data.
    """
    from bracc.services.neo4j_service import execute_query
    
    # Query contract values for the entity
    query = """
    MATCH (e:Entity {id: $entity_id})-[:HAS_CONTRACT]->(c:Contract)
    WHERE c.value IS NOT NULL AND c.value > 0
    RETURN collect(c.value) as contract_values
    """
    
    records = await execute_query(session, query, {"entity_id": entity_id})
    
    if not records:
        return analyze_benford([], include_second_digit=True)
    
    values = records[0].get("contract_values", [])
    
    if not values:
        return analyze_benford([], include_second_digit=True)
    
    return analyze_benford(values, include_second_digit=True)


def to_dict(result: BenfordResult) -> dict[str, Any]:
    """Convert BenfordResult to dictionary for JSON serialization."""
    return {
        "sample_size": result.sample_size,
        "chi_square_statistic": result.chi_square_statistic,
        "chi_square_critical": result.chi_square_critical,
        "degrees_of_freedom": result.degrees_of_freedom,
        "is_anomalous": result.is_anomalous,
        "conformity_score": result.conformity_score,
        "first_digit_distribution": [
            {
                "digit": d.digit,
                "count": d.count,
                "expected_count": d.expected_count,
                "actual_percentage": d.actual_percentage,
                "expected_percentage": d.expected_percentage,
                "deviation": d.deviation,
            }
            for d in result.first_digit_distribution
        ],
        "second_digit_distribution": (
            [
                {
                    "digit": d.digit,
                    "count": d.count,
                    "expected_count": d.expected_count,
                    "actual_percentage": d.actual_percentage,
                    "expected_percentage": d.expected_percentage,
                    "deviation": d.deviation,
                }
                for d in result.second_digit_distribution
            ]
            if result.second_digit_distribution
            else None
        ),
        "risk_level": result.risk_level,
        "interpretation": result.interpretation,
    }
