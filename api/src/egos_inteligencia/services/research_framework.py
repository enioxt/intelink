"""
Research Framework Service — EGOS-I001

Implements the Research Skill Graph 6+2 Lenses as a consumable API service.
Provides structured research analysis following the EGOS Research Skill Graph methodology.

Lenses supported:
- Technical, Economic, Historical, Geopolitical, Contrarian, First Principles (original 6)
- Legal, Criminal Behavior (EGOS-specific)

Usage:
    from services.research_framework import ResearchAnalysis, LensType
    analysis = await run_research_analysis(session, topic, [LensType.TECHNICAL, LensType.LEGAL])
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LensType(str, Enum):
    """The 6+2 Research Skill Graph lenses."""
    TECHNICAL = "technical"
    ECONOMIC = "economic"
    HISTORICAL = "historical"
    GEOPOLITICAL = "geopolitical"
    CONTRARIAN = "contrarian"
    FIRST_PRINCIPLES = "first_principles"
    LEGAL = "legal"
    CRIMINAL_BEHAVIOR = "criminal_behavior"


class LensAnalysis(BaseModel):
    """Analysis result for a single lens."""
    lens: LensType
    key_questions: list[str] = Field(default_factory=list)
    findings: list[str] = Field(default_factory=list)
    evidence_quality: str = "medium"  # high, medium, low
    confidence: int = Field(ge=0, le=100, default=50)
    risks_identified: list[str] = Field(default_factory=list)
    recommendation: str = ""
    time_spent_minutes: int = 0


class ResearchAnalysis(BaseModel):
    """Complete research analysis across multiple lenses."""
    id: str = Field(default_factory=lambda: f"ra-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    topic: str
    question: str
    lenses_applied: list[LensAnalysis] = Field(default_factory=list)
    synthesis: str = ""
    final_confidence: int = Field(ge=0, le=100, default=50)
    created_at: datetime = Field(default_factory=datetime.now)
    metadata: dict[str, Any] = Field(default_factory=dict)


# Lens-specific analysis templates
LENS_TEMPLATES: dict[LensType, dict[str, Any]] = {
    LensType.TECHNICAL: {
        "questions": [
            "What is the state-of-the-art for this technology?",
            "What are the performance characteristics (latency, throughput)?",
            "What architectural patterns does this support?",
            "How hard is it to operate and maintain?",
            "What are the known limitations?",
        ],
        "evidence_types": ["benchmarks", "specifications", "architecture docs"],
    },
    LensType.ECONOMIC: {
        "questions": [
            "Who pays, who benefits, who bears costs?",
            "What is the cost structure (fixed vs variable)?",
            "What are the opportunity costs?",
            "What are the market dynamics?",
            "How are incentives aligned?",
        ],
        "evidence_types": ["cost analysis", "market research", "pricing data"],
    },
    LensType.HISTORICAL: {
        "questions": [
            "What analogous cases exist?",
            "What temporal patterns apply?",
            "What are common failure modes historically?",
            "How has this problem evolved?",
            "What does institutional memory tell us?",
        ],
        "evidence_types": ["case studies", "historical data", "postmortems"],
    },
    LensType.GEOPOLITICAL: {
        "questions": [
            "What jurisdictions are involved?",
            "Who holds formal and informal power?",
            "What is the regulatory trajectory?",
            "Who are natural allies vs adversaries?",
            "What are the geographic constraints?",
        ],
        "evidence_types": ["regulatory analysis", "political assessment"],
    },
    LensType.CONTRARIAN: {
        "questions": [
            "What is the consensus view?",
            "What assumptions are hidden?",
            "What is the opposite hypothesis?",
            "What if the consensus is wrong?",
            "Can we preserve optionality?",
        ],
        "evidence_types": ["anomaly analysis", "alternative views", "edge cases"],
    },
    LensType.FIRST_PRINCIPLES: {
        "questions": [
            "What are the irreducible components?",
            "What are the physical constraints?",
            "What are the logical/mathematical truths?",
            "How would we design from scratch?",
            "What is truly vs artificially constrained?",
        ],
        "evidence_types": ["fundamental analysis", "constraint mapping"],
    },
    LensType.LEGAL: {
        "questions": [
            "What laws and regulations apply (LGPD, CPP)?",
            "What data categories are involved?",
            "What is the legal basis for processing?",
            "What procedural requirements exist?",
            "What are the compliance risks?",
        ],
        "evidence_types": ["legal review", "compliance assessment", "LGPD analysis"],
    },
    LensType.CRIMINAL_BEHAVIOR: {
        "questions": [
            "What is the modus operandi?",
            "What network patterns exist?",
            "What are the financial behavior signatures?",
            "What is the digital footprint?",
            "What behavioral patterns indicate criminal activity?",
        ],
        "evidence_types": ["MO analysis", "network analysis", "behavioral patterns"],
    },
}


async def analyze_with_lens(
    topic: str,
    question: str,
    lens: LensType,
    context: dict[str, Any] | None = None,
) -> LensAnalysis:
    """
    Run analysis using a single lens.
    
    This is a framework/template service. In production, this would:
    1. Call LLM with structured prompt
    2. Retrieve relevant data from knowledge base
    3. Validate findings against evidence
    4. Return structured analysis
    """
    template = LENS_TEMPLATES.get(lens, {})
    questions = template.get("questions", [])
    
    # Placeholder for actual analysis logic
    # In production, this would integrate with:
    # - LLM provider for structured reasoning
    # - Knowledge base for evidence retrieval
    # - Validation services for fact-checking
    
    return LensAnalysis(
        lens=lens,
        key_questions=questions,
        findings=[f"Analysis of {topic} through {lens.value} lens"],
        evidence_quality="medium",
        confidence=50,
        risks_identified=["Placeholder risk - actual analysis required"],
        recommendation=f"Consider {lens.value} factors in decision",
        time_spent_minutes=45,
    )


async def run_research_analysis(
    topic: str,
    question: str,
    lenses: list[LensType] | None = None,
    context: dict[str, Any] | None = None,
) -> ResearchAnalysis:
    """
    Run complete research analysis across specified lenses.
    
    Args:
        topic: The subject being researched
        question: The specific decision/question to analyze
        lenses: Which lenses to apply (default: all 8)
        context: Additional context for analysis
    
    Returns:
        ResearchAnalysis with findings from all lenses + synthesis
    """
    if lenses is None:
        lenses = list(LensType)
    
    analysis = ResearchAnalysis(
        topic=topic,
        question=question,
        metadata=context or {},
    )
    
    # Run each lens analysis
    for lens in lenses:
        lens_result = await analyze_with_lens(topic, question, lens, context)
        analysis.lenses_applied.append(lens_result)
    
    # Synthesize findings
    analysis.synthesis = _synthesize_findings(analysis.lenses_applied)
    analysis.final_confidence = _calculate_overall_confidence(analysis.lenses_applied)
    
    return analysis


def _synthesize_findings(lenses: list[LensAnalysis]) -> str:
    """Synthesize findings from multiple lenses into coherent recommendation."""
    if not lenses:
        return "No lenses applied."
    
    # Group by agreement
    high_confidence = [l for l in lenses if l.confidence >= 70]
    medium_confidence = [l for l in lenses if 40 <= l.confidence < 70]
    low_confidence = [l for l in lenses if l.confidence < 40]
    
    synthesis_parts = []
    
    if high_confidence:
        synthesis_parts.append(
            f"Strong agreement from {len(high_confidence)} lens(es): "
            f"{', '.join(l.lens.value for l in high_confidence)}."
        )
    
    if low_confidence:
        synthesis_parts.append(
            f"Low confidence from {len(low_confidence)} lens(es): "
            f"{', '.join(l.lens.value for l in low_confidence)}."
        )
    
    # Cross-lens insights
    all_risks = []
    for lens in lenses:
        all_risks.extend(lens.risks_identified)
    
    if all_risks:
        synthesis_parts.append(
            f"Risks identified across lenses: {len(set(all_risks))} unique risk types."
        )
    
    return " ".join(synthesis_parts)


def _calculate_overall_confidence(lenses: list[LensAnalysis]) -> int:
    """Calculate overall confidence from individual lens confidences."""
    if not lenses:
        return 0
    
    # Weight by evidence quality
    weights = {"high": 1.5, "medium": 1.0, "low": 0.5}
    
    weighted_sum = sum(
        lens.confidence * weights.get(lens.evidence_quality, 1.0)
        for lens in lenses
    )
    total_weight = sum(weights.get(lens.evidence_quality, 1.0) for lens in lenses)
    
    return int(weighted_sum / total_weight) if total_weight > 0 else 50


# Convenience functions for common research scenarios

async def quick_technical_analysis(topic: str, question: str) -> ResearchAnalysis:
    """Run technical lens only for rapid technical assessment."""
    return await run_research_analysis(topic, question, [LensType.TECHNICAL])


async def compliance_analysis(topic: str, question: str) -> ResearchAnalysis:
    """Run legal + technical lenses for compliance decisions."""
    return await run_research_analysis(
        topic, question, [LensType.LEGAL, LensType.TECHNICAL]
    )


async def full_strategic_analysis(topic: str, question: str) -> ResearchAnalysis:
    """Run all 8 lenses for major strategic decisions."""
    return await run_research_analysis(topic, question, list(LensType))
