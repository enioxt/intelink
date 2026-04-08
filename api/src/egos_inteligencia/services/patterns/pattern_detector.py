"""
EGOS v.2 - Intelink Pattern Detection Engine
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Behavioral Pattern Detection for Criminal Intelligence
Integrates core/patterns/*.json for psychological profiling
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Sacred Mathematics Constants
PHI = 1.618033988749895
PHI_INVERSE = 0.618033988749895  # Minimum confidence threshold

class PatternMatch:
    """Represents a detected pattern with confidence score"""
    def __init__(
        self,
        pattern_id: str,
        pattern_name: str,
        confidence: float,
        matched_keywords: List[str],
        context: str,
        category: str,
        severity: str
    ):
        self.pattern_id = pattern_id
        self.pattern_name = pattern_name
        self.confidence = confidence
        self.matched_keywords = matched_keywords
        self.context = context
        self.category = category
        self.severity = severity
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "pattern_id": self.pattern_id,
            "pattern_name": self.pattern_name,
            "confidence": round(self.confidence, 3),
            "matched_keywords": self.matched_keywords,
            "context": self.context[:200] if self.context else "",  # Limit context
            "category": self.category,
            "severity": self.severity
        }


class PatternDetectionEngine:
    """
    Detects psychological and criminal behavioral patterns in text
    Uses Sacred Mathematics (φ, Fibonacci) for scoring
    """
    
    def __init__(self, patterns_dir: Optional[Path] = None):
        """Initialize with pattern definitions from JSON files"""
        if patterns_dir is None:
            # Default to core/patterns/ relative to project root
            current_file = Path(__file__).resolve()
            project_root = current_file.parents[4]  # Go up to EGOSv2/
            patterns_dir = project_root / "core" / "patterns"
        
        self.patterns_dir = Path(patterns_dir)
        self.patterns = self._load_patterns()
        logger.info(f"PatternDetectionEngine initialized with {len(self.patterns)} patterns")
    
    def _load_patterns(self) -> List[Dict[str, Any]]:
        """Load all pattern JSON files"""
        patterns = []
        
        if not self.patterns_dir.exists():
            logger.warning(f"Patterns directory not found: {self.patterns_dir}")
            return patterns
        
        for json_file in self.patterns_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    pattern = json.load(f)
                    patterns.append(pattern)
                    logger.debug(f"Loaded pattern: {pattern.get('pattern_id')}")
            except Exception as e:
                logger.error(f"Failed to load pattern {json_file}: {e}")
        
        return patterns
    
    def detect_patterns(
        self,
        text: str,
        min_confidence: float = PHI_INVERSE,
        categories: Optional[List[str]] = None
    ) -> List[PatternMatch]:
        """
        Detect patterns in text with confidence scoring
        
        Args:
            text: Input text to analyze
            min_confidence: Minimum confidence threshold (default φ⁻¹ = 0.618)
            categories: Filter by pattern categories (optional)
        
        Returns:
            List of PatternMatch objects above confidence threshold
        """
        if not text or len(text.strip()) < 10:
            return []
        
        text_lower = text.lower()
        matches = []
        
        for pattern in self.patterns:
            # Filter by category if specified
            if categories and pattern.get('category') not in categories:
                continue
            
            # Detect pattern
            match = self._detect_single_pattern(text_lower, text, pattern)
            
            if match and match.confidence >= min_confidence:
                matches.append(match)
        
        # Sort by confidence (highest first)
        matches.sort(key=lambda x: x.confidence, reverse=True)
        
        return matches
    
    def _detect_single_pattern(
        self,
        text_lower: str,
        text_original: str,
        pattern: Dict[str, Any]
    ) -> Optional[PatternMatch]:
        """Detect a single pattern in text"""
        
        indicators = pattern.get('indicators', {})
        keywords = indicators.get('keywords', [])
        linguistic_patterns = indicators.get('linguistic_patterns', [])
        
        if not keywords:
            return None
        
        # Count keyword matches
        matched_keywords = []
        for keyword in keywords:
            if keyword.lower() in text_lower:
                matched_keywords.append(keyword)
        
        # Check linguistic patterns (regex-like)
        pattern_matches = 0
        for ling_pattern in linguistic_patterns:
            # Convert linguistic pattern to regex
            regex_pattern = self._linguistic_to_regex(ling_pattern)
            if re.search(regex_pattern, text_lower):
                pattern_matches += 1
        
        # Calculate confidence using Sacred Mathematics
        detection_rules = pattern.get('detection_rules', {})
        min_keywords = detection_rules.get('min_keywords', 2)
        
        if len(matched_keywords) < min_keywords:
            return None
        
        # Confidence calculation (Fibonacci-weighted)
        keyword_score = len(matched_keywords) / len(keywords)
        pattern_score = pattern_matches / max(len(linguistic_patterns), 1) if linguistic_patterns else 0
        
        # Weighted average (φ ratio)
        confidence = (keyword_score * PHI + pattern_score) / (PHI + 1)
        
        # Apply Sacred Math adjustments
        sacred_math = detection_rules.get('sacred_math', {})
        phi_weight = sacred_math.get('phi_weight', PHI)
        confidence *= (phi_weight / PHI)  # Normalize
        
        # Ensure confidence is in [0, 1]
        confidence = min(max(confidence, 0.0), 1.0)
        
        # Extract context (snippet around first match)
        context = self._extract_context(text_original, matched_keywords[0] if matched_keywords else "")
        
        return PatternMatch(
            pattern_id=pattern.get('pattern_id', 'unknown'),
            pattern_name=pattern.get('pattern_name', 'Unknown Pattern'),
            confidence=confidence,
            matched_keywords=matched_keywords,
            context=context,
            category=pattern.get('category', 'unknown'),
            severity=pattern.get('severity', 'medium')
        )
    
    def _linguistic_to_regex(self, ling_pattern: str) -> str:
        """Convert linguistic pattern to regex"""
        # Simple conversion: [X] becomes \w+, keep literals
        regex = ling_pattern.replace('[', '\\w+').replace(']', '')
        return regex
    
    def _extract_context(self, text: str, keyword: str, window: int = 100) -> str:
        """Extract context window around keyword"""
        if not keyword:
            return text[:200]
        
        pos = text.lower().find(keyword.lower())
        if pos == -1:
            return text[:200]
        
        start = max(0, pos - window)
        end = min(len(text), pos + len(keyword) + window)
        
        return text[start:end].strip()
    
    def get_risk_level(self, matches: List[PatternMatch]) -> str:
        """
        Calculate overall risk level from detected patterns
        
        Returns:
            "low", "medium", "high", or "critical"
        """
        if not matches:
            return "low"
        
        # Average confidence weighted by severity
        severity_weights = {
            "low": 1,
            "medium": 2,
            "high": 3,
            "critical": 5
        }
        
        total_score = 0
        total_weight = 0
        
        for match in matches:
            weight = severity_weights.get(match.severity, 2)
            total_score += match.confidence * weight
            total_weight += weight
        
        avg_score = total_score / total_weight if total_weight > 0 else 0
        
        # Thresholds based on Sacred Mathematics
        if avg_score >= 0.85:  # Above φ/2
            return "critical"
        elif avg_score >= 0.618:  # φ⁻¹
            return "high"
        elif avg_score >= 0.382:  # φ⁻²
            return "medium"
        else:
            return "low"
    
    def format_for_neo4j(self, matches: List[PatternMatch]) -> Dict[str, Any]:
        """
        Format pattern matches for Neo4j node properties
        
        Returns:
            Dict suitable for behavioral_tags property
        """
        return {
            "behavioral_tags": [match.to_dict() for match in matches],
            "risk_level": self.get_risk_level(matches),
            "pattern_count": len(matches),
            "max_confidence": max([m.confidence for m in matches]) if matches else 0.0
        }


# Singleton instance
_pattern_engine = None

def get_pattern_engine() -> PatternDetectionEngine:
    """Get singleton pattern detection engine"""
    global _pattern_engine
    if _pattern_engine is None:
        _pattern_engine = PatternDetectionEngine()
    return _pattern_engine


if __name__ == "__main__":
    # Test with example text
    engine = PatternDetectionEngine()
    
    test_texts = [
        "Eu não confio em ninguém, sempre fico em alerta. Durmo mal porque qualquer barulho me acorda.",
        "Nunca tenho dinheiro suficiente. Sempre falta alguma coisa. A vida é dura.",
        "Foi só sorte eu estar lá, não mereço esse reconhecimento."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n=== Test {i} ===")
        print(f"Text: {text}")
        matches = engine.detect_patterns(text)
        print(f"Patterns detected: {len(matches)}")
        for match in matches:
            print(f"  - {match.pattern_name} (confidence: {match.confidence:.3f})")
        print(f"Risk level: {engine.get_risk_level(matches)}")
