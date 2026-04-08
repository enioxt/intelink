"""
Unit tests for /suggestions endpoint
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Tests POST /api/v1/intelink/suggestions with mocked DB and file I/O.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch, mock_open
from datetime import datetime, timezone
from uuid import uuid4
import json

from fastapi.testclient import TestClient
from app.intelink.router import router, SuggestionIn


@pytest.fixture
def mock_feedback_dir(tmp_path):
    """Mock feedback directory with temporary path."""
    feedback_dir = tmp_path / "feedback"
    feedback_dir.mkdir()
    return feedback_dir


@pytest.fixture
def client():
    """Create test client."""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/intelink")
    return TestClient(app)


@pytest.mark.asyncio
async def test_submit_suggestion_success(client, mock_feedback_dir):
    """Test successful suggestion submission with valid payload."""
    
    # Mock _feedback_dir to return our temp dir
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        # Create initial empty files
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        # Payload
        payload = {
            "term": "suspeito",
            "suggestion": "investigado",
            "severity": "warning",
            "category": "terminology",
            "delegacia": "1-DP",
            "user": "test_user",
            "notes": "Termo mais adequado"
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Sugestão registrada"
        assert data["score"] == 1  # warning = 1 point
        
        # Verify file was updated
        suggestions = json.loads(suggestions_file.read_text())
        assert len(suggestions) == 1
        assert suggestions[0]["term"] == "suspeito"
        assert suggestions[0]["suggestion"] == "investigado"
        
        leaderboard = json.loads(leaderboard_file.read_text())
        assert leaderboard["users"]["test_user"] == 1
        assert leaderboard["delegacias"]["1-DP"] == 1


@pytest.mark.asyncio
async def test_submit_suggestion_error_severity(client, mock_feedback_dir):
    """Test suggestion with error severity gets 2 points."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        payload = {
            "term": "traficante",
            "suggestion": "acusado_de_trafico",
            "severity": "error",  # Error = 2 points
            "category": "legal_term",
            "delegacia": "2-DP",
            "user": "investigador_a",
            "notes": "Evitar presunção de culpa"
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 2  # error = 2 points
        
        leaderboard = json.loads(leaderboard_file.read_text())
        assert leaderboard["users"]["investigador_a"] == 2
        assert leaderboard["delegacias"]["2-DP"] == 2


@pytest.mark.asyncio
async def test_submit_suggestion_anonymous(client, mock_feedback_dir):
    """Test anonymous suggestion (no user/delegacia)."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        payload = {
            "term": "vítima",
            "suggestion": "pessoa_atingida",
            "severity": "info",
            "category": "terminology",
            "delegacia": None,
            "user": None,
            "notes": ""
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        
        assert response.status_code == 200
        
        leaderboard = json.loads(leaderboard_file.read_text())
        assert "anon" in leaderboard["users"]
        assert "geral" in leaderboard["delegacias"]


@pytest.mark.asyncio
async def test_submit_suggestion_accumulates_points(client, mock_feedback_dir):
    """Test that multiple suggestions accumulate points correctly."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        # Start with existing leaderboard
        initial_leaderboard = {
            "users": {"test_user": 5},
            "delegacias": {"1-DP": 3}
        }
        leaderboard_file.write_text(json.dumps(initial_leaderboard))
        suggestions_file.write_text("[]")
        
        # Submit new suggestion
        payload = {
            "term": "criminoso",
            "suggestion": "investigado",
            "severity": "error",  # 2 points
            "category": "legal_term",
            "delegacia": "1-DP",
            "user": "test_user",
            "notes": ""
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        assert response.status_code == 200
        
        # Verify points accumulated
        leaderboard = json.loads(leaderboard_file.read_text())
        assert leaderboard["users"]["test_user"] == 7  # 5 + 2
        assert leaderboard["delegacias"]["1-DP"] == 5  # 3 + 2


def test_suggestion_model_validation():
    """Test SuggestionIn model validates required fields."""
    
    # Valid payload
    valid = SuggestionIn(
        term="test",
        suggestion="test_new",
        severity="warning",
        category="terminology"
    )
    assert valid.term == "test"
    
    # Missing required field should raise ValidationError
    with pytest.raises(Exception):  # Pydantic ValidationError
        SuggestionIn(
            term="test",
            # missing suggestion
            severity="warning",
            category="terminology"
        )


@pytest.mark.asyncio
async def test_submit_suggestion_strips_whitespace(client, mock_feedback_dir):
    """Test that term and suggestion are stripped of whitespace."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        payload = {
            "term": "  suspeito  ",  # Leading/trailing spaces
            "suggestion": "  investigado  ",
            "severity": "info",
            "category": "terminology",
            "delegacia": None,
            "user": None,
            "notes": ""
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        assert response.status_code == 200
        
        # Verify stripped
        suggestions = json.loads(suggestions_file.read_text())
        assert suggestions[0]["term"] == "suspeito"
        assert suggestions[0]["suggestion"] == "investigado"


@pytest.mark.asyncio
async def test_submit_suggestion_generates_uuid(client, mock_feedback_dir):
    """Test that each suggestion gets a unique ID."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        # Submit 2 suggestions
        for i in range(2):
            payload = {
                "term": f"term_{i}",
                "suggestion": f"suggestion_{i}",
                "severity": "info",
                "category": "terminology",
                "delegacia": None,
                "user": None,
                "notes": ""
            }
            response = client.post("/api/v1/intelink/suggestions", json=payload)
            assert response.status_code == 200
        
        # Verify unique IDs
        suggestions = json.loads(suggestions_file.read_text())
        assert len(suggestions) == 2
        assert suggestions[0]["id"] != suggestions[1]["id"]
        
        # Verify valid UUID format
        from uuid import UUID
        UUID(suggestions[0]["id"])  # Should not raise
        UUID(suggestions[1]["id"])


@pytest.mark.asyncio
async def test_submit_suggestion_includes_timestamp(client, mock_feedback_dir):
    """Test that suggestion includes ISO timestamp."""
    
    with patch('app.intelink.router._feedback_dir', return_value=mock_feedback_dir):
        suggestions_file = mock_feedback_dir / "suggestions.json"
        leaderboard_file = mock_feedback_dir / "leaderboard.json"
        
        suggestions_file.write_text("[]")
        leaderboard_file.write_text('{"users": {}, "delegacias": {}}')
        
        before = datetime.now(timezone.utc)
        
        payload = {
            "term": "test",
            "suggestion": "test_new",
            "severity": "info",
            "category": "terminology",
            "delegacia": None,
            "user": None,
            "notes": ""
        }
        
        response = client.post("/api/v1/intelink/suggestions", json=payload)
        assert response.status_code == 200
        
        after = datetime.now(timezone.utc)
        
        suggestions = json.loads(suggestions_file.read_text())
        ts = datetime.fromisoformat(suggestions[0]["ts"].replace('Z', '+00:00'))
        
        assert before <= ts <= after


# Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
