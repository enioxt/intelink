"""
Tests for CONNECT-001: PatternDetectionEngine → CrossReferenceEngine integration
"""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from egos_inteligencia.services.cross_reference_engine import (
    CrossCaseMatch,
    CrossReferenceEngine,
)
from egos_inteligencia.services.patterns.pattern_detector import PatternMatch


def _make_pattern_match(pattern_id: str = "TEST-001") -> PatternMatch:
    return PatternMatch(
        pattern_id=pattern_id,
        pattern_name="Test Pattern",
        confidence=0.75,
        matched_keywords=["keyword1"],
        context="some context",
        category="behavioral",
        severity="medium",
    )


@pytest.fixture
def engine():
    mock_session = AsyncMock()
    with patch(
        "egos_inteligencia.services.cross_reference_engine.get_pattern_engine"
    ) as mock_factory:
        mock_pe = MagicMock()
        mock_factory.return_value = mock_pe
        e = CrossReferenceEngine(mock_session)
        e._pattern_engine = mock_pe
    return e, mock_pe


class TestCrossReferenceEngineInit:
    def test_pattern_engine_instantiated(self):
        """CrossReferenceEngine.__init__ must call get_pattern_engine()."""
        mock_session = AsyncMock()
        with patch(
            "egos_inteligencia.services.cross_reference_engine.get_pattern_engine"
        ) as mock_factory:
            mock_factory.return_value = MagicMock()
            eng = CrossReferenceEngine(mock_session)
            mock_factory.assert_called_once()
            assert eng._pattern_engine is not None


class TestBuildPatternMatches:
    def test_returns_empty_for_empty_text(self, engine):
        eng, mock_pe = engine
        mock_pe.detect_patterns.return_value = []
        result = eng._build_pattern_matches("", "", [])
        assert result == []
        mock_pe.detect_patterns.assert_not_called()

    def test_calls_detect_patterns_with_combined_text(self, engine):
        eng, mock_pe = engine
        pm = _make_pattern_match()
        mock_pe.detect_patterns.return_value = [pm]

        result = eng._build_pattern_matches(
            "Caso A: tráfico",
            "Caso B: homicídio",
            [{"name": "João Silva"}],
        )

        call_args = mock_pe.detect_patterns.call_args[0][0]
        assert "Caso A: tráfico" in call_args
        assert "Caso B: homicídio" in call_args
        assert "João Silva" in call_args

        assert len(result) == 1
        assert result[0]["pattern_id"] == "TEST-001"
        assert result[0]["confidence"] == 0.75
        assert result[0]["category"] == "behavioral"
        assert result[0]["severity"] == "medium"

    def test_serializes_all_pattern_fields(self, engine):
        eng, mock_pe = engine
        pm = _make_pattern_match("PAT-999")
        mock_pe.detect_patterns.return_value = [pm]

        result = eng._build_pattern_matches("title A", "title B", [])
        assert set(result[0].keys()) == {
            "pattern_id", "pattern_name", "confidence",
            "category", "severity", "matched_keywords",
        }

    def test_multiple_patterns_returned(self, engine):
        eng, mock_pe = engine
        patterns = [_make_pattern_match(f"P-{i}") for i in range(3)]
        mock_pe.detect_patterns.return_value = patterns

        result = eng._build_pattern_matches("título", "titulo", [])
        assert len(result) == 3
        assert [r["pattern_id"] for r in result] == ["P-0", "P-1", "P-2"]


class TestCrossCaseMatchType:
    def test_pattern_matches_is_list_of_dicts(self):
        """CrossCaseMatch.pattern_matches must accept list[dict], not list[str]."""
        match = CrossCaseMatch(
            case_a_id="A",
            case_b_id="B",
            case_a_title="Caso A",
            case_b_title="Caso B",
            similarity_score=0.7,
            common_entities=[],
            temporal_overlap=True,
            geographic_overlap=False,
            pattern_matches=[{"pattern_id": "X", "confidence": 0.9}],
            recommended_action="test",
        )
        assert isinstance(match.pattern_matches, list)
        assert isinstance(match.pattern_matches[0], dict)
