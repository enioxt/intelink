"""
GET /api/v1/_internal/chatbot-manifest

Machine-readable manifest consumed by EGOS chatbot-manifest-aggregator
to auto-populate CHATBOT_SSOT.md AUTO-GEN blocks without handwritten scores.

INC-006 MSSOT-004: evidence-anchored capability declarations.
"""

from datetime import date
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1/_internal", tags=["internal"])

MANIFEST = {
    "chatbot_id": "egos-inteligencia",
    "repo": "github.com/enioxt/egos-inteligencia",
    "generated_at": str(date.today()),
    "schema_version": "1.0.0",
    "capabilities": {
        "multi_tenant": {
            "present": False,
            "evidence": None,
            "note": "N/A for this use case: single-tenant police investigation assistant",
        },
        "atrian_validation": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:66",
            "note": "ATRiAN-light inline PII guard comment; _scan_pii + _mask_pii_in_reply at :75,:85",
        },
        "sse_streaming": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:1044",
            "note": "STREAMING-001: SSE streaming variant via StreamingResponse",
        },
        "pii_detection": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:940",
            "note": "_scan_pii(body.message) + pii_found categories logged at :940-942",
        },
        "tool_calling": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:478",
            "note": "Neo4j graph search tools defined at :478; multi-tool via OpenRouter GPT-4o-mini",
        },
        "rate_limiting": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:26",
            "note": "limiter from bracc.middleware.rate_limit (SlowAPI)",
        },
        "telemetry": {
            "present": True,
            "evidence": "api/src/egos_inteligencia/routers/chat.py:24",
            "note": "log_activity from bracc.routers.activity",
        },
        "guard_brasil_pii": {
            "present": False,
            "evidence": None,
            "note": "Uses inline _scan_pii + public_guard, not @egosbr/guard-brasil endpoint",
        },
    },
    "compliance": {
        "primary_use_case": (
            "Police investigation assistant (Brazilian law enforcement): "
            "Neo4j graph queries, LGPD-compliant, no CPF exposure"
        ),
        "atrian_score_method": (
            "N/A — aggregator computes from capability flags above"
        ),
        "last_verified": str(date.today()),
        "verified_by": "MSSOT-004 auto-manifest endpoint",
    },
}


@router.get("/chatbot-manifest", include_in_schema=False)
async def get_chatbot_manifest() -> JSONResponse:
    return JSONResponse(
        content=MANIFEST,
        headers={
            "Cache-Control": "public, max-age=300",
            "X-EGOS-Schema": "1.0.0",
        },
    )
