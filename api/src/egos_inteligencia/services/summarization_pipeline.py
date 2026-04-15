"""
Summarization Pipeline Service — EGOS-I008

Automated content summarization with multiple strategies:
- Extractive: Key sentences/paragraphs
- Abstractive: Generated summaries (via LLM)
- Hierarchical: Multi-level summaries (short/medium/long)

Usage:
    from services.summarization_pipeline import summarize, SummarizationConfig
    result = await summarize(content, SummarizationConfig(strategy="hierarchical"))
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SummarizationStrategy(str, Enum):
    """Available summarization strategies."""
    EXTRACTIVE = "extractive"  # Pull key sentences
    ABSTRACTIVE = "abstractive"  # Generate new text
    HIERARCHICAL = "hierarchical"  # Multi-level summaries
    HYBRID = "hybrid"  # Combine extractive + abstractive


class SummaryLength(str, Enum):
    """Target summary length."""
    SHORT = "short"  # 1-2 sentences
    MEDIUM = "medium"  # 1 paragraph
    LONG = "long"  # 2-3 paragraphs
    CUSTOM = "custom"


class SummarizationConfig(BaseModel):
    """Configuration for summarization."""
    strategy: SummarizationStrategy = SummarizationStrategy.HYBRID
    length: SummaryLength = SummaryLength.MEDIUM
    custom_max_tokens: int | None = None  # For custom length
    preserve_key_entities: bool = True
    include_key_numbers: bool = True
    language: str = "pt-BR"  # Portuguese (Brazil)
    focus_areas: list[str] = Field(default_factory=list)  # Emphasize these topics
    exclude_sections: list[str] = Field(default_factory=list)  # Skip these


class SummaryLevel(BaseModel):
    """A single level of summary."""
    level: str = Field(..., description="short, medium, long")
    content: str
    token_count: int
    compression_ratio: float  # Summary length / Original length
    key_points: list[str] = Field(default_factory=list)


class EntityMention(BaseModel):
    """Key entity found in content."""
    name: str
    type: str = ""  # PERSON, ORG, LOCATION, etc.
    mention_count: int = 1
    contexts: list[str] = Field(default_factory=list)


class SummaryResult(BaseModel):
    """Complete summarization result."""
    id: str = Field(default_factory=lambda: f"sum-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    original_length: int = 0  # Characters
    original_token_estimate: int = 0
    
    # Summary outputs
    summaries: list[SummaryLevel] = Field(default_factory=list)
    selected_summary: str = ""  # The one matching config.length
    
    # Metadata
    key_entities: list[EntityMention] = Field(default_factory=list)
    key_numbers: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    
    # Processing info
    strategy_used: SummarizationStrategy
    processing_time_seconds: float = 0.0
    language_detected: str = "pt-BR"


# Sentence scoring heuristics for extractive summarization
def _score_sentence(sentence: str, doc_words: set[str], title_words: set[str]) -> float:
    """Score a sentence for importance."""
    score = 0.0
    words = set(sentence.lower().split())
    
    # Position bonus (first sentence of paragraph gets boost)
    score += 0.1
    
    # Title word overlap
    title_overlap = len(words & title_words)
    score += title_overlap * 0.3
    
    # Document frequency (common words indicate centrality)
    doc_overlap = len(words & doc_words)
    score += (doc_overlap / len(words)) * 0.2 if words else 0
    
    # Length penalty (too short or too long)
    word_count = len(sentence.split())
    if word_count < 5:
        score -= 0.2
    elif word_count > 50:
        score -= 0.1
    
    # Indicators of importance
    importance_markers = ["conclui", "importante", "crítico", "essencial", "fundamental",
                          "conclude", "important", "critical", "essential", "key"]
    for marker in importance_markers:
        if marker in sentence.lower():
            score += 0.15
    
    return score


def _extractive_summarize(text: str, target_ratio: float = 0.2) -> SummaryLevel:
    """Extract key sentences to form summary."""
    # Simple sentence splitting
    sentences = [s.strip() for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    
    if len(sentences) <= 3:
        return SummaryLevel(
            level="extractive",
            content=text,
            token_count=len(text.split()),
            compression_ratio=1.0,
            key_points=sentences[:5],
        )
    
    # Build word frequency
    all_words = []
    for s in sentences:
        all_words.extend(s.lower().split())
    
    doc_words = set(all_words)
    title_words = set(sentences[0].lower().split()) if sentences else set()
    
    # Score sentences
    scored = [(s, _score_sentence(s, doc_words, title_words)) for s in sentences]
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Select top sentences (maintaining original order)
    num_to_select = max(1, int(len(sentences) * target_ratio))
    selected = scored[:num_to_select]
    selected.sort(key=lambda x: sentences.index(x[0]))  # Restore order
    
    summary_text = ". ".join([s for s, _ in selected]) + "."
    
    return SummaryLevel(
        level="extractive",
        content=summary_text,
        token_count=len(summary_text.split()),
        compression_ratio=len(summary_text) / len(text),
        key_points=[s for s, _ in selected[:5]],
    )


def _abstractive_summarize_placeholder(text: str, length: SummaryLength) -> SummaryLevel:
    """
    Placeholder for abstractive summarization.
    
    In production, this would call an LLM service (OpenRouter, DashScope, etc.)
    with a structured prompt for summary generation.
    """
    word_limits = {
        SummaryLength.SHORT: 30,
        SummaryLength.MEDIUM: 100,
        SummaryLength.LONG: 300,
    }
    
    limit = word_limits.get(length, 100)
    
    # Simple fallback: truncate with ellipsis
    words = text.split()
    if len(words) <= limit:
        summary = text
    else:
        summary = " ".join(words[:limit]) + "..."
    
    # Add note that this is placeholder
    summary = f"[Abstractive summary placeholder - would call LLM in production] {summary[:200]}..."
    
    return SummaryLevel(
        level=f"abstractive-{length.value}",
        content=summary,
        token_count=len(summary.split()),
        compression_ratio=0.1,  # Approximate
        key_points=["Placeholder: would extract key points via LLM"],
    )


def _hierarchical_summarize(text: str) -> list[SummaryLevel]:
    """Generate multi-level summaries."""
    return [
        _extractive_summarize(text, target_ratio=0.05),  # Very short
        _extractive_summarize(text, target_ratio=0.15),  # Medium
        _extractive_summarize(text, target_ratio=0.30),  # Long
    ]


def _extract_entities(text: str) -> list[EntityMention]:
    """Extract key entities from text (simplified)."""
    # Simple pattern-based extraction
    import re
    
    entities: dict[str, EntityMention] = {}
    
    # Capitalized words (potential proper nouns)
    pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
    matches = re.findall(pattern, text)
    
    for match in matches:
        if len(match) > 3 and match not in ["The", "This", "That", "These", "Those"]:
            if match not in entities:
                entities[match] = EntityMention(name=match, type="ENTITY")
            entities[match].mention_count += 1
    
    # Numbers with context
    number_pattern = r'\b(?:R\$\s*)?\d+(?:[.,]\d+)?(?:\s*(?:milhões|bilhões|%|percent))?\b'
    number_matches = re.findall(number_pattern, text, re.IGNORECASE)
    
    return list(entities.values())[:10]  # Top 10


def _extract_numbers(text: str) -> list[str]:
    """Extract significant numbers."""
    import re
    
    # Currency and percentages
    pattern = r'R\$\s*[\d.,]+(?:\s*(?:milhões|bilhões))?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s*(?:percent|por cento)'
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    return list(set(matches))[:10]  # Unique, top 10


async def summarize(
    content: str,
    config: SummarizationConfig | None = None,
) -> SummaryResult:
    """
    Summarize content using specified strategy.
    
    Args:
        content: Text to summarize
        config: Summarization configuration
    
    Returns:
        SummaryResult with summaries and metadata
    """
    if config is None:
        config = SummarizationConfig()
    
    if not content or len(content.strip()) < 50:
        return SummaryResult(
            original_length=len(content),
            original_token_estimate=len(content.split()),
            selected_summary=content,
            strategy_used=config.strategy,
        )
    
    result = SummaryResult(
        original_length=len(content),
        original_token_estimate=len(content.split()),
        strategy_used=config.strategy,
        language_detected=config.language,
    )
    
    # Generate summaries based on strategy
    if config.strategy == SummarizationStrategy.EXTRACTIVE:
        result.summaries = [_extractive_summarize(content)]
        
    elif config.strategy == SummarizationStrategy.ABSTRACTIVE:
        result.summaries = [_abstractive_summarize_placeholder(content, config.length)]
        
    elif config.strategy == SummarizationStrategy.HIERARCHICAL:
        result.summaries = _hierarchical_summarize(content)
        
    else:  # HYBRID
        result.summaries = [
            _extractive_summarize(content, target_ratio=0.15),
            _abstractive_summarize_placeholder(content, SummaryLength.MEDIUM),
        ]
    
    # Select appropriate summary
    length_map = {
        SummaryLength.SHORT: 0,
        SummaryLength.MEDIUM: min(1, len(result.summaries) - 1),
        SummaryLength.LONG: len(result.summaries) - 1,
    }
    
    selected_idx = length_map.get(config.length, 0)
    if result.summaries:
        result.selected_summary = result.summaries[selected_idx].content
    
    # Extract metadata
    result.key_entities = _extract_entities(content)
    result.key_numbers = _extract_numbers(content)
    
    return result


async def batch_summarize(
    contents: list[str],
    config: SummarizationConfig | None = None,
) -> list[SummaryResult]:
    """Summarize multiple documents."""
    results: list[SummaryResult] = []
    for content in contents:
        result = await summarize(content, config)
        results.append(result)
    return results


# Specific use-case helpers

async def summarize_investigation_report(
    report_text: str,
    focus_on: list[str] | None = None,
) -> SummaryResult:
    """Specialized summarization for investigation reports."""
    config = SummarizationConfig(
        strategy=SummarizationStrategy.HYBRID,
        length=SummaryLength.MEDIUM,
        focus_areas=focus_on or ["findings", "evidence", "conclusions"],
        preserve_key_entities=True,
        include_key_numbers=True,
    )
    return await summarize(report_text, config)


async def summarize_chat_conversation(
    messages: list[dict[str, Any]],
) -> SummaryResult:
    """Summarize chat/conversation history."""
    # Flatten messages to text
    text_parts = []
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        text_parts.append(f"{role}: {content}")
    
    full_text = "\n\n".join(text_parts)
    
    config = SummarizationConfig(
        strategy=SummarizationStrategy.EXTRACTIVE,
        length=SummaryLength.SHORT,
    )
    return await summarize(full_text, config)


async def generate_executive_brief(
    documents: list[str],
    max_pages: int = 2,
) -> SummaryResult:
    """Generate executive brief from multiple documents."""
    combined = "\n\n---\n\n".join(documents)
    
    config = SummarizationConfig(
        strategy=SummarizationStrategy.HIERARCHICAL,
        length=SummaryLength.SHORT,
    )
    
    result = await summarize(combined, config)
    result.selected_summary = result.summaries[0].content if result.summaries else ""
    
    return result
