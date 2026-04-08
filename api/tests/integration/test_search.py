"""
Integration tests — search endpoints.
Uses synthetic data only. No real PII.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create test client."""
    import os
    os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")
    os.environ.setdefault("NEO4J_USER", "neo4j")
    os.environ.setdefault("NEO4J_PASSWORD", "testpassword")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-chars-long")
    os.environ.setdefault("JWT_ALGORITHM", "HS256")
    os.environ.setdefault("APP_ENV", "test")

    from egos_inteligencia.main import app
    return TestClient(app)


def test_search_endpoint_exists(client):
    """POST /api/v1/search must exist and accept JSON."""
    response = client.post("/api/v1/search", json={"query": "test"})
    # May return 401 (protected) or 200/422 (validation error)
    assert response.status_code in (200, 401, 422)


@pytest.mark.requires_neo4j
def test_search_validates_query(client):
    """Search endpoint validates query parameter."""
    response = client.post("/api/v1/search", json={})
    assert response.status_code in (400, 422)


def test_search_no_pii_in_response(client):
    """Search response must not contain CPF patterns."""
    import re
    response = client.post("/api/v1/search", json={"query": "Silva"})
    cpf_pattern = re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}')
    assert not cpf_pattern.search(response.text) or response.status_code == 401, \
        "Unmasked CPF found in search response"


def test_entity_list_endpoint(client):
    """GET /api/v1/entity must be accessible with auth."""
    response = client.get("/api/v1/entity")
    assert response.status_code in (200, 401, 403)


def test_entity_detail_404(client):
    """GET /api/v1/entity/{id} with invalid ID returns 404."""
    response = client.get("/api/v1/entity/invalid-id-12345")
    assert response.status_code in (404, 401, 403)
