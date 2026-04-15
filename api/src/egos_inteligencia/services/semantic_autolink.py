"""
Semantic Autolink Service — EGOS-I009

Automatic semantic linking between content items based on:
- Text similarity (TF-IDF, embeddings)
- Entity overlap (shared people, orgs, locations)
- Temporal proximity
- Topic clustering

Usage:
    from services.semantic_autolink import find_related, create_links
    related = await find_similar(content_id, content_text)
    links = await create_links(content_id, related)
"""

from datetime import datetime, timedelta
from typing import Any

from pydantic import BaseModel, Field


class LinkType(str):
    """Types of semantic links."""
    SIMILAR_CONTENT = "similar_content"  # Text similarity
    SHARED_ENTITY = "shared_entity"  # Common entities
    TEMPORAL = "temporal"  # Time-based
    TOPIC = "topic"  # Topic cluster
    CITATION = "citation"  # Explicit reference
    SEQUENTIAL = "sequential"  # Before/after in sequence


class ContentItem(BaseModel):
    """A piece of content to be linked."""
    id: str
    content: str
    title: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
    entities: list[dict[str, Any]] = Field(default_factory=list)  # [{name, type, id}]
    topics: list[str] = Field(default_factory=list)
    embedding: list[float] | None = None  # Vector embedding
    metadata: dict[str, Any] = Field(default_factory=dict)


class SemanticLink(BaseModel):
    """A discovered semantic link."""
    source_id: str
    target_id: str
    link_type: str
    strength: float = Field(ge=0.0, le=1.0)  # 0-1 similarity
    shared_elements: list[str] = Field(default_factory=list)  # What connects them
    confidence: str = "medium"  # low, medium, high
    created_at: datetime = Field(default_factory=datetime.now)
    explanation: str = ""  # Human-readable why linked


class AutolinkResult(BaseModel):
    """Result of autolink analysis."""
    content_id: str
    links_found: list[SemanticLink] = Field(default_factory=list)
    link_count: int = 0
    strongest_links: list[SemanticLink] = Field(default_factory=list)
    topic_clusters: list[dict[str, Any]] = Field(default_factory=list)
    processing_time_seconds: float = 0.0


class AutolinkConfig(BaseModel):
    """Configuration for autolinking."""
    min_similarity_threshold: float = 0.6
    max_links_per_content: int = 10
    consider_temporal_proximity: bool = True
    temporal_window_hours: int = 24
    entity_match_boost: float = 0.2  # Bonus for entity overlap
    topic_match_boost: float = 0.15  # Bonus for topic overlap


# Simple similarity functions (replace with embeddings in production)

def _text_similarity(text1: str, text2: str) -> float:
    """Calculate simple text similarity (Jaccard-like)."""
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    # Filter to "significant" words (>4 chars)
    significant_intersection = {w for w in intersection if len(w) > 4}
    
    return len(significant_intersection) / max(len(words1), len(words2))


def _entity_similarity(entities1: list[dict], entities2: list[dict]) -> tuple[float, list[str]]:
    """Calculate entity overlap similarity."""
    names1 = {e.get("name", "").lower() for e in entities1}
    names2 = {e.get("name", "").lower() for e in entities2}
    
    shared = names1 & names2
    
    if not names1 or not names2:
        return 0.0, []
    
    similarity = len(shared) / max(len(names1), len(names2))
    return similarity, list(shared)


def _topic_similarity(topics1: list[str], topics2: list[str]) -> tuple[float, list[str]]:
    """Calculate topic overlap."""
    set1 = set(t.lower() for t in topics1)
    set2 = set(t.lower() for t in topics2)
    
    shared = set1 & set2
    
    if not set1 or not set2:
        return 0.0, []
    
    return len(shared) / max(len(set1), len(set2)), list(shared)


def _temporal_proximity(time1: datetime, time2: datetime, window_hours: int) -> float:
    """Calculate temporal proximity score."""
    diff = abs((time1 - time2).total_seconds())
    window_seconds = window_hours * 3600
    
    if diff > window_seconds:
        return 0.0
    
    # Linear decay within window
    return 1.0 - (diff / window_seconds)


async def find_similar(
    content: ContentItem,
    candidates: list[ContentItem],
    config: AutolinkConfig | None = None,
) -> list[tuple[ContentItem, float, dict[str, Any]]]:
    """
    Find similar content items.
    
    Returns:
        List of (candidate, similarity_score, details)
    """
    if config is None:
        config = AutolinkConfig()
    
    scored: list[tuple[ContentItem, float, dict[str, Any]]] = []
    
    for candidate in candidates:
        if candidate.id == content.id:
            continue
        
        # Text similarity
        text_sim = _text_similarity(content.content, candidate.content)
        
        # Entity similarity
        entity_sim, shared_entities = _entity_similarity(
            content.entities, candidate.entities
        )
        
        # Topic similarity
        topic_sim, shared_topics = _topic_similarity(
            content.topics, candidate.topics
        )
        
        # Temporal proximity
        temporal_sim = 0.0
        if config.consider_temporal_proximity:
            temporal_sim = _temporal_proximity(
                content.created_at,
                candidate.created_at,
                config.temporal_window_hours
            )
        
        # Combined score
        score = (
            text_sim * 0.5 +
            entity_sim * config.entity_match_boost +
            topic_sim * config.topic_match_boost +
            temporal_sim * 0.1
        )
        
        details = {
            "text_similarity": text_sim,
            "entity_similarity": entity_sim,
            "shared_entities": shared_entities,
            "topic_similarity": topic_sim,
            "shared_topics": shared_topics,
            "temporal_proximity": temporal_sim,
        }
        
        scored.append((candidate, score, details))
    
    # Filter by threshold and sort
    filtered = [(c, s, d) for c, s, d in scored if s >= config.min_similarity_threshold]
    filtered.sort(key=lambda x: x[1], reverse=True)
    
    return filtered[:config.max_links_per_content]


async def create_links(
    content: ContentItem,
    similar_items: list[tuple[ContentItem, float, dict[str, Any]]],
) -> list[SemanticLink]:
    """Create semantic link objects from similar items."""
    links: list[SemanticLink] = []
    
    for candidate, score, details in similar_items:
        # Determine link type
        if details.get("entity_similarity", 0) > 0.5:
            link_type = LinkType.SHARED_ENTITY
            shared = details.get("shared_entities", [])
        elif details.get("topic_similarity", 0) > 0.5:
            link_type = LinkType.TOPIC
            shared = details.get("shared_topics", [])
        elif details.get("temporal_proximity", 0) > 0.8:
            link_type = LinkType.TEMPORAL
            shared = []
        else:
            link_type = LinkType.SIMILAR_CONTENT
            shared = []
        
        # Determine confidence
        if score > 0.8:
            confidence = "high"
        elif score > 0.6:
            confidence = "medium"
        else:
            confidence = "low"
        
        link = SemanticLink(
            source_id=content.id,
            target_id=candidate.id,
            link_type=link_type,
            strength=score,
            shared_elements=shared[:5],  # Top 5
            confidence=confidence,
            explanation=f"{link_type} link with {score:.0%} similarity",
        )
        
        links.append(link)
    
    return links


async def autolink_content(
    content: ContentItem,
    candidate_pool: list[ContentItem],
    config: AutolinkConfig | None = None,
) -> AutolinkResult:
    """
    Full autolink pipeline: find similar + create links.
    
    Args:
        content: The content to link from
        candidate_pool: Potential targets to link to
        config: Autolink configuration
    
    Returns:
        AutolinkResult with discovered links
    """
    import time
    start = time.time()
    
    if config is None:
        config = AutolinkConfig()
    
    # Find similar content
    similar = await find_similar(content, candidate_pool, config)
    
    # Create links
    links = await create_links(content, similar)
    
    # Identify topic clusters
    clusters = _identify_topic_clusters([content] + candidate_pool)
    
    processing_time = time.time() - start
    
    return AutolinkResult(
        content_id=content.id,
        links_found=links,
        link_count=len(links),
        strongest_links=links[:5] if links else [],
        topic_clusters=clusters,
        processing_time_seconds=processing_time,
    )


def _identify_topic_clusters(items: list[ContentItem]) -> list[dict[str, Any]]:
    """Identify topic clusters across content items."""
    # Simple clustering: group by shared topics
    topic_to_items: dict[str, list[str]] = {}
    
    for item in items:
        for topic in item.topics:
            topic_lower = topic.lower()
            if topic_lower not in topic_to_items:
                topic_to_items[topic_lower] = []
            topic_to_items[topic_lower].append(item.id)
    
    # Find clusters (topics with >1 item)
    clusters = []
    for topic, item_ids in topic_to_items.items():
        if len(item_ids) > 1:
            clusters.append({
                "topic": topic,
                "item_count": len(item_ids),
                "item_ids": item_ids,
            })
    
    # Sort by size
    clusters.sort(key=lambda x: x["item_count"], reverse=True)
    
    return clusters[:10]  # Top 10 clusters


async def batch_autolink(
    contents: list[ContentItem],
    config: AutolinkConfig | None = None,
) -> list[AutolinkResult]:
    """Autolink multiple content items against each other."""
    results: list[AutolinkResult] = []
    
    for content in contents:
        # Use other items as candidate pool
        others = [c for c in contents if c.id != content.id]
        result = await autolink_content(content, others, config)
        results.append(result)
    
    return results


# Storage helpers (would connect to DB in production)

class LinkStore:
    """In-memory link store (replace with database in production)."""
    
    def __init__(self):
        self._links: dict[str, list[SemanticLink]] = {}
    
    async def save_links(self, content_id: str, links: list[SemanticLink]) -> None:
        """Save links for a content item."""
        self._links[content_id] = links
    
    async def get_links(self, content_id: str) -> list[SemanticLink]:
        """Retrieve links for a content item."""
        return self._links.get(content_id, [])
    
    async def get_related_content_ids(self, content_id: str) -> list[str]:
        """Get IDs of related content."""
        links = await self.get_links(content_id)
        return [link.target_id for link in links]


# Global store instance
_link_store = LinkStore()


async def save_autolink_result(result: AutolinkResult) -> None:
    """Save autolink result to store."""
    await _link_store.save_links(result.content_id, result.links_found)


async def get_related_content(content_id: str) -> list[SemanticLink]:
    """Get related content links."""
    return await _link_store.get_links(content_id)
