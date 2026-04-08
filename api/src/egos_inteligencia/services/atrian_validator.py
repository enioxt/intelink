"""
ATRiAN Validator for Intelink
Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)

Integrates ATRiAN ethical validation into Intelink ingestion pipeline.
"""

import structlog
from typing import Dict, Any, Optional
from pathlib import Path

logger = structlog.get_logger(__name__)

# Try to import ATRiAN from core
try:
    import sys
    from pathlib import Path
    
    # Add EGOS root to path if not already
    egos_root = Path(__file__).resolve().parents[4]
    if str(egos_root) not in sys.path:
        sys.path.insert(0, str(egos_root))
    
    from core.atrian.atrian_validator import validate_content, ValidationLevel
    ATRIAN_AVAILABLE = True
except ImportError as e:
    logger.warning(f"ATRiAN not available: {e}")
    ATRIAN_AVAILABLE = False
    ValidationLevel = None
    validate_content = None


class ATRiANValidationResult:
    """Result of ATRiAN validation"""
    def __init__(
        self,
        is_compliant: bool,
        critical_issues: int = 0,
        warnings: int = 0,
        issues: list = None,
        details: Dict[str, Any] = None
    ):
        self.is_compliant = is_compliant
        self.critical_issues = critical_issues
        self.warnings = warnings
        self.issues = issues or []
        self.details = details or {}


async def validate_document_content(
    content: str,
    min_level: str = "warning",
    filename: Optional[str] = None
) -> ATRiANValidationResult:
    """
    Validate document content using ATRiAN ethical filter
    
    Args:
        content: Text content to validate
        min_level: Minimum validation level (warning, critical)
        filename: Optional filename for context
        
    Returns:
        ATRiANValidationResult with validation results
    """
    if not ATRIAN_AVAILABLE:
        logger.debug("ATRiAN not available, skipping validation")
        return ATRiANValidationResult(
            is_compliant=True,
            details={"atrian_available": False, "note": "Validation skipped"}
        )
    
    try:
        # Validate content
        results = validate_content(content, min_level=min_level)
        
        # Count issues by severity
        critical_count = sum(1 for item in results if item.get("severity") == "critical")
        warning_count = sum(1 for item in results if item.get("severity") == "warning")
        
        # Compliant if no critical issues
        is_compliant = critical_count == 0
        
        return ATRiANValidationResult(
            is_compliant=is_compliant,
            critical_issues=critical_count,
            warnings=warning_count,
            issues=results,
            details={
                "atrian_available": True,
                "min_level": min_level,
                "filename": filename,
                "total_issues": len(results)
            }
        )
        
    except Exception as e:
        logger.error(f"ATRiAN validation error: {e}")
        # On error, allow but log
        return ATRiANValidationResult(
            is_compliant=True,
            details={
                "atrian_available": True,
                "error": str(e),
                "note": "Validation failed, document allowed"
            }
        )


def get_atrian_summary(result: ATRiANValidationResult) -> Dict[str, Any]:
    """
    Get summary of ATRiAN validation for API response
    
    Args:
        result: ATRiANValidationResult
        
    Returns:
        Dict with summary information
    """
    if not result.details.get("atrian_available"):
        return {
            "enabled": False,
            "compliant": True,
            "note": "ATRiAN not available"
        }
    
    summary = {
        "enabled": True,
        "compliant": result.is_compliant,
        "critical_issues": result.critical_issues,
        "warnings": result.warnings,
        "total_issues": len(result.issues)
    }
    
    # Add first few issues as examples
    if result.issues:
        summary["sample_issues"] = result.issues[:3]
    
    if result.details.get("error"):
        summary["error"] = result.details["error"]
    
    return summary


def is_atrian_enabled() -> bool:
    """Check if ATRiAN validation is available"""
    return ATRIAN_AVAILABLE
