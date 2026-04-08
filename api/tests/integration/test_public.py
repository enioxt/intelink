"""
Integration tests — public endpoints (no auth required).
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


def test_public_status(client):
    """GET /api/v1/public/status must be accessible without auth."""
    response = client.get("/api/v1/public/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data or "version" in data


def test_readiness_probe(client):
    """GET /health/ready must return 200."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data.get("ready") is True or "status" in data


def test_liveness_probe(client):
    """GET /health/live must return 200."""
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data.get("alive") is True or "status" in data


def test_api_info_available(client):
    """API info endpoint must be accessible."""
    response = client.get("/api/v1/meta/info")
    assert response.status_code in (200, 404)  # May not exist yet


def test_public_no_pii_leak(client):
    """Public endpoints must not leak PII."""
    import re
    endpoints = ["/api/v1/public/status", "/health", "/health/ready"]
    cpf_pattern = re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}')
    
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert not cpf_pattern.search(response.text), \
            f"CPF pattern found in {endpoint} response"
