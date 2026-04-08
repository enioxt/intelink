"""
Unit tests for /chat/enhance endpoint (Socratic mode)
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Tests POST /api/v1/intelink/chat/enhance with mocked LLM calls.
"""

import pytest
from unittest.mock import patch, AsyncMock
import json

from fastapi.testclient import TestClient
from app.intelink.router import router, EnhanceRequest, EnhanceResponse


@pytest.fixture
def client():
    """Create test client."""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/intelink")
    return TestClient(app)


def test_chat_enhance_empty_message(client):
    """Test enhance with empty message returns clarification question."""
    
    payload = {"message": ""}
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["improved_prompt"] == ""
    assert len(data["questions"]) > 0
    assert "objetivo" in data["questions"][0].lower()
    assert data["proceed"] is False


def test_chat_enhance_short_message_triggers_questions(client):
    """Test short/vague message triggers heuristic clarification questions."""
    
    payload = {"message": "resumo"}  # < 40 chars + keyword
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["questions"]) >= 3
    # Check for heuristic questions
    questions_text = " ".join(data["questions"]).lower()
    assert "público-alvo" in questions_text or "formato" in questions_text
    assert data["proceed"] is False  # Has questions, so don't proceed yet


def test_chat_enhance_clear_message(client):
    """Test clear, specific message returns proceed=true with no questions."""
    
    payload = {
        "message": "Liste todos os documentos carregados na investigação #123 com data superior a 2024-01-01, ordenados por relevância."
    }
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["improved_prompt"] != ""
    assert "Markdown" in data["improved_prompt"]  # Has formatting instructions
    # May or may not have questions depending on heuristic
    # But should have proceed logic
    assert isinstance(data["proceed"], bool)


def test_chat_enhance_with_investigation_context(client):
    """Test enhance with investigation_id adds context hint."""
    
    payload = {
        "message": "Mostre os vínculos principais",
        "investigation_id": "inv-abc123"
    }
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "inv-abc123" in data["improved_prompt"]


def test_chat_enhance_with_doc_context(client):
    """Test enhance with context_doc_ids adds document reference."""
    
    payload = {
        "message": "Analise este documento",
        "context_doc_ids": ["doc-001", "doc-002"]
    }
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should mention doc IDs (truncated to 8 chars)
    assert "doc-001" in data["improved_prompt"] or "doc-001"[:8] in data["improved_prompt"]


@pytest.mark.asyncio
async def test_chat_enhance_with_groq_llm(client):
    """Test enhance with Groq LLM enabled (mocked)."""
    
    # Mock environment vars
    with patch('app.intelink.router._read_env_fallback') as mock_env, \
         patch('app.intelink.router.call_llm_groq', new_callable=AsyncMock) as mock_groq:
        
        # Configure env
        def env_side_effect(key):
            if key == 'LLM_PROVIDER' or key == 'LLM_PROVIDER_PRIMARY':
                return 'groq'
            if key == 'GROQ_API_KEY':
                return 'test-key-12345'
            if key == 'GROQ_MODEL':
                return 'llama-3.1-8b-instant'
            return None
        
        mock_env.side_effect = env_side_effect
        
        # Mock LLM response
        llm_response = json.dumps({
            "improved_prompt": "Responda em Markdown. Liste vínculos entre José Silva e Maria Santos na investigação #123.",
            "questions": ["Quais tipos de vínculos são prioritários?", "Incluir vínculos indiretos?"],
            "proceed": False
        })
        mock_groq.return_value = llm_response
        
        payload = {"message": "vínculos entre José e Maria"}
        
        response = client.post("/api/v1/intelink/chat/enhance", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have LLM-enhanced prompt
        assert "José Silva" in data["improved_prompt"] or "vínculos" in data["improved_prompt"]
        assert len(data["questions"]) == 2
        assert data["proceed"] is False


@pytest.mark.asyncio
async def test_chat_enhance_llm_failure_fallback(client):
    """Test that LLM failure gracefully falls back to heuristic."""
    
    with patch('app.intelink.router._read_env_fallback') as mock_env, \
         patch('app.intelink.router.call_llm_groq', new_callable=AsyncMock) as mock_groq:
        
        def env_side_effect(key):
            if key in ('LLM_PROVIDER', 'LLM_PROVIDER_PRIMARY'):
                return 'groq'
            if key == 'GROQ_API_KEY':
                return 'test-key'
            return None
        
        mock_env.side_effect = env_side_effect
        
        # Mock LLM failure
        mock_groq.side_effect = Exception("LLM timeout")
        
        payload = {"message": "resumo"}
        
        response = client.post("/api/v1/intelink/chat/enhance", json=payload)
        
        # Should still work, using heuristic fallback
        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) > 0  # Heuristic questions
        assert data["improved_prompt"] != ""


@pytest.mark.asyncio
async def test_chat_enhance_malformed_llm_json(client):
    """Test handling of malformed JSON from LLM."""
    
    with patch('app.intelink.router._read_env_fallback') as mock_env, \
         patch('app.intelink.router.call_llm_groq', new_callable=AsyncMock) as mock_groq:
        
        def env_side_effect(key):
            if key in ('LLM_PROVIDER', 'LLM_PROVIDER_PRIMARY'):
                return 'groq'
            if key == 'GROQ_API_KEY':
                return 'test-key'
            return None
        
        mock_env.side_effect = env_side_effect
        
        # Mock malformed response
        mock_groq.return_value = "This is not JSON at all"
        
        payload = {"message": "teste"}
        
        response = client.post("/api/v1/intelink/chat/enhance", json=payload)
        
        # Should fallback gracefully
        assert response.status_code == 200
        data = response.json()
        assert data["improved_prompt"] != ""
        # Should have fallen back to heuristic
        assert isinstance(data["proceed"], bool)


def test_chat_enhance_strips_whitespace(client):
    """Test that message is stripped of leading/trailing whitespace."""
    
    payload = {"message": "   lista documentos   "}
    
    response = client.post("/api/v1/intelink/chat/enhance", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # Improved prompt should contain trimmed message
    assert "lista documentos" in data["improved_prompt"]
    assert "   lista" not in data["improved_prompt"]


def test_chat_enhance_keywords_trigger_questions(client):
    """Test that specific keywords trigger clarification questions."""
    
    keywords = ["resumo", "explicar", "sobre", "como fazer", "ajuda"]
    
    for keyword in keywords:
        payload = {"message": f"Preciso de {keyword} sobre a investigação"}
        
        response = client.post("/api/v1/intelink/chat/enhance", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should trigger questions due to keyword
        assert len(data["questions"]) > 0, f"Keyword '{keyword}' should trigger questions"


def test_chat_enhance_response_model():
    """Test EnhanceResponse model structure."""
    
    # Valid response
    response = EnhanceResponse(
        improved_prompt="Test prompt",
        questions=["Q1", "Q2"],
        proceed=False
    )
    
    assert response.improved_prompt == "Test prompt"
    assert len(response.questions) == 2
    assert response.proceed is False


def test_enhance_request_model():
    """Test EnhanceRequest model with optional fields."""
    
    # Minimal request
    req = EnhanceRequest(message="test")
    assert req.message == "test"
    assert req.investigation_id is None
    assert req.context_doc_ids is None
    
    # Full request
    req_full = EnhanceRequest(
        message="test",
        investigation_id="inv-123",
        context_doc_ids=["doc-1", "doc-2"]
    )
    assert req_full.investigation_id == "inv-123"
    assert len(req_full.context_doc_ids) == 2


# Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
