"""
NLP Router — EGOS Inteligência / Intelink
NER-001: Named Entity Recognition endpoints

Sacred Code: 000.111.369.963.1618
"""

from typing import Annotated, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from starlette.requests import Request

from bracc.config import settings
from bracc.middleware.rate_limit import limiter
from bracc.services.nlp.bertimbau_ner import BERTimbauNER, get_bertimbau_ner
from bracc.services.public_guard import enforce_entity_lookup_enabled

router = APIRouter(prefix="/api/v1/nlp", tags=["nlp"])


# NER-001: Request/Response models
class ExtractEntitiesRequest(BaseModel):
    text: str
    model: str = "bertimbau"  # "bertimbau" or "spacy"
    confidence_threshold: float = 0.85


class EntityResponse(BaseModel):
    text: str
    label: str
    start_char: int
    end_char: int
    confidence: float


class ExtractEntitiesResponse(BaseModel):
    entities: List[EntityResponse]
    total: int
    model_used: str
    text_length: int
    processing_time_ms: float | None = None


class EntityLabelInfo(BaseModel):
    label: str
    description: str
    color: str


class NERInfoResponse(BaseModel):
    available_models: List[str]
    entity_labels: List[EntityLabelInfo]
    default_model: str


# NER-001: POST /api/v1/nlp/extract-entities
@router.post("/extract-entities", response_model=ExtractEntitiesResponse)
@limiter.limit("120/minute")
async def extract_entities(
    request: Request,
    extract_req: ExtractEntitiesRequest,
) -> ExtractEntitiesResponse:
    """
    Extract named entities from text using BERTimbau or spaCy.
    
    Supports Brazilian Portuguese legal/forensic documents.
    Entities: PER (person), ORG (organization), LOC (location), 
    LEG (legal terms), DATE, MONEY, etc.
    """
    import time
    
    start_time = time.time()
    
    # Get NER pipeline
    ner = get_bertimbau_ner()
    
    # Extract entities
    entities = ner.extract_entities(
        text=extract_req.text,
        confidence_threshold=extract_req.confidence_threshold
    )
    
    processing_time = (time.time() - start_time) * 1000
    
    return ExtractEntitiesResponse(
        entities=[
            EntityResponse(
                text=e.text,
                label=e.label,
                start_char=e.start_char,
                end_char=e.end_char,
                confidence=e.confidence
            )
            for e in entities
        ],
        total=len(entities),
        model_used=extract_req.model,
        text_length=len(extract_req.text),
        processing_time_ms=round(processing_time, 2)
    )


# NER-001: GET /api/v1/nlp/info
@router.get("/info", response_model=NERInfoResponse)
async def get_ner_info() -> NERInfoResponse:
    """Get NER configuration and available entity labels."""
    return NERInfoResponse(
        available_models=["bertimbau", "spacy"],
        entity_labels=[
            EntityLabelInfo(label="PER", description="Pessoa", color="#3b82f6"),
            EntityLabelInfo(label="ORG", description="Organização/Empresa", color="#10b981"),
            EntityLabelInfo(label="LOC", description="Localização", color="#f59e0b"),
            EntityLabelInfo(label="LEG", description="Termo Jurídico", color="#8b5cf6"),
            EntityLabelInfo(label="DATE", description="Data", color="#6b7280"),
            EntityLabelInfo(label="MONEY", description="Valor Monetário", color="#ef4444"),
        ],
        default_model="bertimbau"
    )


# NER-001: POST /api/v1/nlp/batch-extract (para múltiplos textos)
@router.post("/batch-extract", response_model=List[ExtractEntitiesResponse])
@limiter.limit("30/minute")
async def batch_extract_entities(
    request: Request,
    texts: List[str],
    model: str = "bertimbau",
    confidence_threshold: float = 0.85,
) -> List[ExtractEntitiesResponse]:
    """
    Batch extract entities from multiple texts.
    
    Useful for processing document collections or chat histories.
    """
    import time
    
    ner = get_bertimbau_ner()
    results = []
    
    for text in texts:
        start_time = time.time()
        entities = ner.extract_entities(
            text=text,
            confidence_threshold=confidence_threshold
        )
        processing_time = (time.time() - start_time) * 1000
        
        results.append(ExtractEntitiesResponse(
            entities=[
                EntityResponse(
                    text=e.text,
                    label=e.label,
                    start_char=e.start_char,
                    end_char=e.end_char,
                    confidence=e.confidence
                )
                for e in entities
            ],
            total=len(entities),
            model_used=model,
            text_length=len(text),
            processing_time_ms=round(processing_time, 2)
        ))
    
    return results
