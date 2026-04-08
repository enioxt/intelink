"""
Router exports for EGOS Inteligência API
"""

from .auth import router as auth_router
from .entity import router as entity_router
from .health import router as health_router
from .investigation import router as investigation_router, shared_router as investigation_shared_router

__all__ = [
    "auth_router",
    "entity_router", 
    "health_router",
    "investigation_router",
    "investigation_shared_router",
]
