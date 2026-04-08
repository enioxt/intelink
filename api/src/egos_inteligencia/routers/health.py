"""
Health Router — EGOS Inteligência
Sacred Code: 000.111.369.963.1618

Health check and system status endpoints.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime
import os

router = APIRouter(prefix="/health", tags=["health"])


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str
    services: dict


@router.get("", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        version=os.getenv("APP_VERSION", "0.1.0"),
        environment=os.getenv("APP_ENV", "development"),
        services={
            "api": "up",
            "database": "unknown",  # Will be checked in detailed health
            "neo4j": "unknown",
            "redis": "unknown",
        }
    )


@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe."""
    return {"ready": True}


@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe."""
    return {"alive": True}
