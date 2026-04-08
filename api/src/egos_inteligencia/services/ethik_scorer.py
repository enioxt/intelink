"""
ETHIK Scorer for Intelink
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Integrates ETHIK scoring into Intelink document processing.
"""

import structlog
from typing import Dict, Any, Optional
from pathlib import Path

logger = structlog.get_logger(__name__)

# Try to import ETHIK from core
try:
    import sys
    from pathlib import Path
    
    # Add EGOS root to path if not already
    egos_root = Path(__file__).resolve().parents[4]
    if str(egos_root) not in sys.path:
        sys.path.insert(0, str(egos_root))
    
    from core.ethik.ethik_token_processor import create_ethik_processor
    ETHIK_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ETHIK not available: {e}")
    ETHIK_AVAILABLE = False
    create_ethik_processor = None


class ETHIKScoringResult:
    """Result of ETHIK scoring"""
    def __init__(
        self,
        baseline_score: float = 144.0,
        current_score: float = 144.0,
        score_delta: float = 0.0,
        details: Dict[str, Any] = None
    ):
        self.baseline_score = baseline_score
        self.current_score = current_score
        self.score_delta = score_delta
        self.details = details or {}


async def calculate_document_score(
    content: str,
    user_id: Optional[str] = None,
    filename: Optional[str] = None
) -> ETHIKScoringResult:
    """
    Calculate ETHIK score for document content
    
    Args:
        content: Text content to score
        user_id: Optional user ID for wallet tracking
        filename: Optional filename for context
        
    Returns:
        ETHIKScoringResult with scoring information
    """
    if not ETHIK_AVAILABLE:
        logger.debug("ETHIK not available, using default score")
        return ETHIKScoringResult(
            details={"ethik_available": False, "note": "Scoring skipped"}
        )
    
    try:
        # Create ETHIK processor
        processor = await create_ethik_processor()
        
        # Get or create user wallet
        wallet_id = user_id or "system"
        wallet = await processor.get_user_wallet(wallet_id)
        
        # Calculate content score (simplified - adjust based on actual ETHIK API)
        # Using baseline as reference
        baseline = wallet.baseline_score
        
        # For now, use baseline as document score
        # In production, this would analyze content and adjust
        document_score = baseline
        
        return ETHIKScoringResult(
            baseline_score=baseline,
            current_score=document_score,
            score_delta=0.0,  # No delta for now
            details={
                "ethik_available": True,
                "wallet_id": wallet_id,
                "filename": filename,
                "baseline_score": baseline
            }
        )
        
    except Exception as e:
        logger.error(f"ETHIK scoring error: {e}")
        # On error, return default score
        return ETHIKScoringResult(
            details={
                "ethik_available": True,
                "error": str(e),
                "note": "Scoring failed, using default"
            }
        )


def get_ethik_summary(result: ETHIKScoringResult) -> Dict[str, Any]:
    """
    Get summary of ETHIK scoring for API response
    
    Args:
        result: ETHIKScoringResult
        
    Returns:
        Dict with summary information
    """
    if not result.details.get("ethik_available"):
        return {
            "enabled": False,
            "baseline_score": 144.0,
            "note": "ETHIK not available"
        }
    
    summary = {
        "enabled": True,
        "baseline_score": result.baseline_score,
        "document_score": result.current_score,
        "score_delta": result.score_delta
    }
    
    if result.details.get("error"):
        summary["error"] = result.details["error"]
    
    return summary


def is_ethik_enabled() -> bool:
    """Check if ETHIK scoring is available"""
    return ETHIK_AVAILABLE
