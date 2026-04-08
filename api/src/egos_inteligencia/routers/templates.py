"""
Templates Router — EGOS Inteligência / Intelink
TEMPLATE-001: Investigation templates endpoints

Sacred Code: 000.111.369.963.1618
"""

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from starlette.requests import Request

from bracc.config import settings
from bracc.middleware.rate_limit import limiter
from bracc.services.investigation_templates import InvestigationTemplates, InvestigationTemplate

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


# TEMPLATE-001: Response models
class TemplateQuery(BaseModel):
    name: str
    cypher: str
    description: str


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    entity_types: List[str]
    relationship_types: List[str]
    queries: List[TemplateQuery]
    suggested_sources: List[str]


class TemplateListResponse(BaseModel):
    templates: List[dict]
    total: int
    categories: List[str]


class TemplateApplyRequest(BaseModel):
    entity_id: str | None = None
    custom_params: dict | None = None


class TemplateApplyResponse(BaseModel):
    template_id: str
    template_name: str
    applied_queries: List[dict]
    status: str


# TEMPLATE-001: GET /api/v1/templates
@router.get("/", response_model=TemplateListResponse)
@limiter.limit("60/minute")
async def list_templates(
    request: Request,
) -> TemplateListResponse:
    """
    List all available investigation templates.
    
    Templates are pre-configured investigation patterns for:
    - Corruption (follow the money)
    - Money laundering
    - Corporate compliance
    - Investigative journalism
    - Criminal investigation
    """
    templates = InvestigationTemplates()
    
    template_list = []
    for template_id, template in templates.templates.items():
        template_list.append({
            "id": template_id,
            "name": template.name,
            "description": template.description,
            "entity_count": len(template.entity_types),
            "query_count": len(template.queries)
        })
    
    return TemplateListResponse(
        templates=template_list,
        total=len(template_list),
        categories=["corruption", "money_laundering", "compliance", "journalism", "criminal"]
    )


# TEMPLATE-001: GET /api/v1/templates/{template_id}
@router.get("/{template_id}", response_model=TemplateResponse)
@limiter.limit("60/minute")
async def get_template(
    request: Request,
    template_id: str = Path(..., description="Template ID (e.g., corruption, money_laundering)"),
) -> TemplateResponse:
    """
    Get detailed template including all Cypher queries.
    """
    templates = InvestigationTemplates()
    
    if template_id not in templates.templates:
        raise HTTPException(
            status_code=404,
            detail=f"Template not found: {template_id}. Available: {list(templates.templates.keys())}"
        )
    
    template = templates.templates[template_id]
    
    return TemplateResponse(
        id=template_id,
        name=template.name,
        description=template.description,
        entity_types=template.entity_types,
        relationship_types=template.relationship_types,
        queries=[
            TemplateQuery(
                name=q["name"],
                cypher=q["cypher"],
                description=q.get("description", "")
            )
            for q in template.queries
        ],
        suggested_sources=template.suggested_sources
    )


# TEMPLATE-001: POST /api/v1/templates/{template_id}/apply
@router.post("/{template_id}/apply", response_model=TemplateApplyResponse)
@limiter.limit("30/minute")
async def apply_template(
    request: Request,
    template_id: str = Path(..., description="Template ID to apply"),
    apply_req: TemplateApplyRequest | None = None,
) -> TemplateApplyResponse:
    """
    Apply a template to create a new investigation or analyze an entity.
    
    This endpoint prepares the Cypher queries with optional entity_id binding.
    """
    templates = InvestigationTemplates()
    
    if template_id not in templates.templates:
        raise HTTPException(
            status_code=404,
            detail=f"Template not found: {template_id}"
        )
    
    template = templates.templates[template_id]
    entity_id = apply_req.entity_id if apply_req else None
    
    # Prepare queries with entity binding if provided
    applied_queries = []
    for query in template.queries:
        cypher = query["cypher"]
        
        # Simple entity binding (replace placeholder if entity_id provided)
        if entity_id and "{entity_id}" in cypher:
            cypher = cypher.replace("{entity_id}", f"'{entity_id}'")
        
        applied_queries.append({
            "name": query["name"],
            "cypher": cypher,
            "description": query.get("description", ""),
            "entity_bound": entity_id is not None
        })
    
    return TemplateApplyResponse(
        template_id=template_id,
        template_name=template.name,
        applied_queries=applied_queries,
        status="prepared"  # In a real implementation, this might execute the queries
    )


# TEMPLATE-001: GET /api/v1/templates/categories
@router.get("/categories/list", response_model=List[dict])
async def list_categories() -> List[dict]:
    """List template categories with descriptions."""
    return [
        {"id": "corruption", "name": "Corruption", "description": "Follow the money investigations"},
        {"id": "money_laundering", "name": "Money Laundering", "description": "Financial flow analysis"},
        {"id": "compliance", "name": "Compliance", "description": "Corporate compliance checks"},
        {"id": "journalism", "name": "Journalism", "description": "Investigative journalism patterns"},
        {"id": "criminal", "name": "Criminal Investigation", "description": "Criminal network analysis"},
    ]
