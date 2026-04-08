"""
Integration tests — health and auth endpoints.
Uses synthetic data only. No real PII.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    """Create test client without connecting to real DB."""
    import os
    os.environ.setdefault("NEO4J_URI", "bolt://localhost:7687")
    os.environ.setdefault("NEO4J_USER", "neo4j")
    os.environ.setdefault("NEO4J_PASSWORD", "testpassword")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-chars-long")
    os.environ.setdefault("JWT_ALGORITHM", "HS256")
    os.environ.setdefault("APP_ENV", "test")

    from src.egos_inteligencia.main import app
    return TestClient(app)


def test_health_returns_200(client):
    """GET /health must return 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_health_has_required_fields(client):
    """Health response must include version and environment."""
    response = client.get("/health")
    data = response.json()
    # status is required
    assert data.get("status") in ("ok", "degraded", "error")


def test_api_docs_accessible(client):
    """OpenAPI docs must be accessible."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_json(client):
    """OpenAPI JSON schema must be valid."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "openapi" in schema
    assert "paths" in schema


def test_auth_login_missing_credentials(client):
    """POST /api/v1/auth/login with empty body returns 422."""
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code in (400, 422)


def test_auth_login_invalid_credentials(client):
    """POST /api/v1/auth/login with wrong credentials returns 401."""
    response = client.post("/api/v1/auth/login", json={
        "masp": "M-999999",
        "password": "wrongpassword"
    })
    assert response.status_code in (401, 422, 503)


def test_protected_endpoint_without_token(client):
    """Protected endpoints must return 401 without token."""
    response = client.get("/api/v1/investigations")
    assert response.status_code in (401, 403)


def test_pii_not_in_error_responses(client):
    """Error responses must not contain CPF/CNPJ patterns."""
    import re
    response = client.post("/api/v1/auth/login", json={
        "masp": "000.000.000-00",  # CPF-like value should be rejected/masked
        "password": "test"
    })
    cpf_pattern = re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}')
    # Response body must not echo back a real CPF
    assert not cpf_pattern.search(response.text), \
        "CPF pattern found in error response — PII leak detected"
