"""
Legal Document Review Service — EGOS-I004

Skill monetizável ($80-200/hr) for automated legal document analysis.
Provides LGPD compliance checking, risk assessment, and legal structure extraction.

Brazilian law context: LGPD, CPP, CP, Marco Civil, LAI

Usage:
    from services.legal_document_review import review_document, DocumentType
    result = await review_document(document_text, DocumentType.PRIVACY_POLICY)
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Supported document types for legal review."""
    PRIVACY_POLICY = "privacy_policy"  # Política de Privacidade
    TERMS_OF_SERVICE = "terms_of_service"  # Termos de Uso
    CONTRACT = "contract"  # Contrato
    INVESTIGATION_REPORT = "investigation_report"  # Relatório de investigação
    DATA_PROCESSING_AGREEMENT = "dpa"  # Contrato de Processamento de Dados
    LGPD_ARTICLE = "lgpd_article"  # Artigo/Seção LGPD específica
    COURT_ORDER = "court_order"  # Mandado/decisão judicial
    GENERAL = "general"  # Documento genérico


class LegalRisk(BaseModel):
    """Identified legal risk."""
    severity: str = Field(..., description="critical, high, medium, low")
    category: str = Field(..., description="LGPD, CPP, CP, Contract, Other")
    article_reference: str = Field(default="", description="Artigo/parágrafo relevante")
    description: str
    recommendation: str
    location_in_document: str = Field(default="", description="Section/paragraph reference")


class LGPDCompliance(BaseModel):
    """LGPD-specific compliance assessment."""
    overall_status: str = Field(..., description="compliant, partially_compliant, non_compliant")
    legal_basis_identified: list[str] = Field(default_factory=list)
    data_categories_present: list[str] = Field(default_factory=list)
    rights_of_data_subject_addressed: bool = False
    transparency_score: int = Field(ge=0, le=100, default=0)
    security_measures_mentioned: list[str] = Field(default_factory=list)
    international_transfer_provisions: bool = False
    retention_policy_clear: bool = False


class ReviewResult(BaseModel):
    """Complete legal document review result."""
    id: str = Field(default_factory=lambda: f"ldr-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    document_type: DocumentType
    document_hash: str = Field(default="", description="SHA-256 hash of document")
    review_timestamp: datetime = Field(default_factory=datetime.now)
    reviewer_version: str = "1.0.0"
    
    # Analysis results
    lgpd_compliance: LGPDCompliance | None = None
    risks: list[LegalRisk] = Field(default_factory=list)
    missing_clauses: list[str] = Field(default_factory=list)
    suggested_additions: list[str] = Field(default_factory=list)
    
    # Summary
    overall_risk_score: int = Field(ge=0, le=100, default=50)
    executive_summary: str = ""
    action_items: list[str] = Field(default_factory=list)
    
    # Metadata
    processing_time_seconds: float = 0.0
    document_stats: dict[str, Any] = Field(default_factory=dict)


# LGPD Article references for common issues
LGPD_ARTICLES = {
    "basis": {
        "art7": "Art. 7 - Tratamento lawful when consent or other legal basis exists",
        "art11": "Art. 11 - Sensitive data requires specific legal basis",
    },
    "rights": {
        "art18": "Art. 18 - Rights of data subject (access, correction, deletion)",
        "art19": "Art. 19 - Access procedure requirements",
        "art20": "Art. 20 - Right to deletion/anonymization",
    },
    "transparency": {
        "art6": "Art. 6 - Principles (purpose, adequacy, necessity)",
        "art9": "Art. 9 - Transparency requirements",
        "art46": "Art. 46 - Security measures obligation",
    },
    "security": {
        "art46": "Art. 46 - Security, technical and administrative measures",
        "art50": "Art. 50 - Data protection officer (DPO) requirements",
    },
    "transfer": {
        "art33": "Art. 33 - International transfer requirements",
    },
}


class LegalReviewConfig(BaseModel):
    """Configuration for document review."""
    strict_mode: bool = False  # More aggressive risk detection
    include_suggestions: bool = True
    check_lgpd: bool = True
    check_contract_law: bool = True
    max_review_time_seconds: int = 120
    custom_requirements: list[str] = Field(default_factory=list)


async def review_document(
    document_text: str,
    doc_type: DocumentType = DocumentType.GENERAL,
    config: LegalReviewConfig | None = None,
) -> ReviewResult:
    """
    Perform legal review of a document.
    
    Args:
        document_text: The document content to analyze
        doc_type: Type of document for specialized review
        config: Review configuration options
    
    Returns:
        ReviewResult with compliance assessment and recommendations
    """
    if config is None:
        config = LegalReviewConfig()
    
    result = ReviewResult(
        document_type=doc_type,
        document_stats={
            "char_count": len(document_text),
            "word_count": len(document_text.split()),
            "line_count": len(document_text.splitlines()),
        },
    )
    
    # LGPD compliance check
    if config.check_lgpd:
        result.lgpd_compliance = _check_lgpd_compliance(document_text, doc_type)
    
    # Risk analysis
    result.risks = _identify_legal_risks(document_text, doc_type, config)
    
    # Missing clauses detection
    result.missing_clauses = _detect_missing_clauses(document_text, doc_type)
    
    # Suggested additions
    if config.include_suggestions:
        result.suggested_additions = _generate_suggestions(document_text, doc_type)
    
    # Calculate overall risk score
    result.overall_risk_score = _calculate_risk_score(result.risks, result.lgpd_compliance)
    
    # Generate summary
    result.executive_summary = _generate_executive_summary(result)
    result.action_items = _generate_action_items(result)
    
    return result


def _check_lgpd_compliance(text: str, doc_type: DocumentType) -> LGPDCompliance:
    """Check LGPD compliance for document."""
    text_lower = text.lower()
    
    compliance = LGPDCompliance()
    
    # Check legal basis mentions
    basis_keywords = ["consentimento", "execução de contrato", "cumprimento de obrigação legal", 
                      "exercício de direitos", "interesse vital", "interesse legítimo", "interesse público"]
    compliance.legal_basis_identified = [kw for kw in basis_keywords if kw in text_lower]
    
    # Check data categories
    data_keywords = ["dados pessoais", "dados sensíveis", "dados públicos", "dados anonimizados"]
    compliance.data_categories_present = [kw for kw in data_keywords if kw in text_lower]
    
    # Check data subject rights
    rights_keywords = ["direito de acesso", "correção", "eliminação", "portabilidade", "oposição"]
    compliance.rights_of_data_subject_addressed = any(kw in text_lower for kw in rights_keywords)
    
    # Check transparency elements
    transparency_elements = [
        "finalidade" in text_lower,
        "base legal" in text_lower or "fundamento legal" in text_lower,
        "direitos do titular" in text_lower,
        "contato" in text_lower and ("dpo" in text_lower or "encarregado" in text_lower),
    ]
    compliance.transparency_score = int(sum(transparency_elements) / len(transparency_elements) * 100)
    
    # Check security measures
    security_keywords = ["criptografia", "pseudonimização", "controle de acesso", "logs", "auditoria"]
    compliance.security_measures_mentioned = [kw for kw in security_keywords if kw in text_lower]
    
    # Check international transfer
    transfer_keywords = ["transferência internacional", "país", "exterior", "adequação", "cláusulas contratuais"]
    compliance.international_transfer_provisions = any(kw in text_lower for kw in transfer_keywords)
    
    # Check retention policy
    retention_keywords = ["prazo de retenção", "tempo de armazenamento", "descarte", "exclusão"]
    compliance.retention_policy_clear = any(kw in text_lower for kw in retention_keywords)
    
    # Determine overall status
    score = 0
    if compliance.legal_basis_identified:
        score += 20
    if compliance.rights_of_data_subject_addressed:
        score += 20
    if compliance.transparency_score >= 50:
        score += 20
    if compliance.security_measures_mentioned:
        score += 20
    if compliance.retention_policy_clear:
        score += 20
    
    if score >= 80:
        compliance.overall_status = "compliant"
    elif score >= 50:
        compliance.overall_status = "partially_compliant"
    else:
        compliance.overall_status = "non_compliant"
    
    return compliance


def _identify_legal_risks(
    text: str,
    doc_type: DocumentType,
    config: LegalReviewConfig,
) -> list[LegalRisk]:
    """Identify legal risks in document."""
    risks: list[LegalRisk] = []
    text_lower = text.lower()
    
    # LGPD Risks
    if "consentimento" not in text_lower and "fundamento legal" not in text_lower:
        risks.append(LegalRisk(
            severity="high" if config.strict_mode else "medium",
            category="LGPD",
            article_reference="Art. 7",
            description="No explicit legal basis identified for data processing",
            recommendation="Clearly state the legal basis (consent, contract, legal obligation, etc.)",
        ))
    
    if "direito" not in text_lower and "titular" not in text_lower:
        risks.append(LegalRisk(
            severity="high",
            category="LGPD",
            article_reference="Art. 18",
            description="No mention of data subject rights",
            recommendation="Include section on data subject rights (access, correction, deletion, portability)",
        ))
 
    if "segurança" not in text_lower and "proteção" not in text_lower:
        risks.append(LegalRisk(
            severity="medium",
            category="LGPD",
            article_reference="Art. 46",
            description="No security measures mentioned",
            recommendation="Describe technical and administrative security measures",
        ))
    
    if doc_type == DocumentType.PRIVACY_POLICY and "dpo" not in text_lower and "encarregado" not in text_lower:
        risks.append(LegalRisk(
            severity="medium",
            category="LGPD",
            article_reference="Art. 50",
            description="No data protection officer (DPO) contact information",
            recommendation="Include DPO name and contact for data subject requests",
        ))
    
    return risks


def _detect_missing_clauses(text: str, doc_type: DocumentType) -> list[str]:
    """Detect missing standard clauses for document type."""
    text_lower = text.lower()
    missing: list[str] = []
    
    if doc_type == DocumentType.PRIVACY_POLICY:
        required_clauses = [
            ("quem somos", "Identification of data controller"),
            ("dados coletados", "What data is collected"),
            ("finalidade", "Purpose of processing"),
            ("compartilhamento", "Data sharing practices"),
            ("direitos", "Data subject rights"),
            ("segurança", "Security measures"),
            ("contato", "Contact information"),
        ]
        
        for keyword, description in required_clauses:
            if keyword not in text_lower:
                missing.append(description)
    
    return missing


def _generate_suggestions(text: str, doc_type: DocumentType) -> list[str]:
    """Generate suggestions for document improvement."""
    suggestions: list[str] = []
    
    if doc_type == DocumentType.PRIVACY_POLICY:
        suggestions.extend([
            "Add specific retention periods for each data category",
            "Include procedure for data subject access requests",
            "Describe cookie and tracking technologies used",
            "Add section on data subject's right to data portability",
            "Include information on automated decision-making if applicable",
        ])
    
    return suggestions


def _calculate_risk_score(risks: list[LegalRisk], lgpd: LGPDCompliance | None) -> int:
    """Calculate overall risk score (0-100, higher = more risk)."""
    if not risks and (lgpd is None or lgpd.overall_status == "compliant"):
        return 10
    
    score = 0
    
    # Risk severity weights
    for risk in risks:
        if risk.severity == "critical":
            score += 30
        elif risk.severity == "high":
            score += 20
        elif risk.severity == "medium":
            score += 10
        else:
            score += 5
    
    # LGPD compliance impact
    if lgpd:
        if lgpd.overall_status == "non_compliant":
            score += 25
        elif lgpd.overall_status == "partially_compliant":
            score += 10
    
    return min(score, 100)


def _generate_executive_summary(result: ReviewResult) -> str:
    """Generate executive summary of review."""
    parts = []
    
    parts.append(f"Document type: {result.document_type.value}")
    parts.append(f"Overall risk score: {result.overall_risk_score}/100")
    
    if result.lgpd_compliance:
        parts.append(f"LGPD compliance: {result.lgpd_compliance.overall_status}")
    
    parts.append(f"Risks identified: {len(result.risks)}")
    parts.append(f"Missing clauses: {len(result.missing_clauses)}")
    
    return " | ".join(parts)


def _generate_action_items(result: ReviewResult) -> list[str]:
    """Generate prioritized action items."""
    items: list[str] = []
    
    # Critical risks first
    critical_risks = [r for r in result.risks if r.severity == "critical"]
    for risk in critical_risks:
        items.append(f"[CRITICAL] {risk.category}: {risk.recommendation}")
    
    # High risks
    high_risks = [r for r in result.risks if r.severity == "high"]
    for risk in high_risks:
        items.append(f"[HIGH] {risk.category}: {risk.recommendation}")
    
    # Missing clauses
    for clause in result.missing_clauses[:3]:  # Top 3
        items.append(f"[ADD] Include clause: {clause}")
    
    return items
