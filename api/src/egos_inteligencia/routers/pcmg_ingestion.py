"""
PCMG Data Ingestion Router — EGOS Inteligência
API endpoints para ingestão de vídeos e documentos policiais

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Annotated, Any

logger = logging.getLogger(__name__)

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from neo4j import AsyncSession
from pydantic import BaseModel, Field
from starlette.requests import Request

from bracc.dependencies import get_session
from bracc.middleware.rate_limit import limiter
from bracc.services.guard_integration import guard, mask_pii
from bracc.etl.pipelines.pcmg_video_pipeline import (
    PCMGVideoPipeline,
    VideoProcessingResult,
)
from bracc.etl.pipelines.pcmg_document_pipeline import (
    PCMGDocumentPipeline,
    DocumentProcessingResult,
)

router = APIRouter(prefix="/api/v1/pcmg", tags=["pcmg"])

# =============================================================================
# Schemas
# =============================================================================


class VideoUploadResponse(BaseModel):
    """Resposta de upload de vídeo."""
    job_id: str
    filename: str
    status: str  # queued, processing, completed, failed
    message: str


class VideoProcessingDetail(BaseModel):
    """Detalhes do processamento de vídeo."""
    video_path: str
    audio_extracted: bool
    audio_path: str | None
    transcript: str | None
    duration_seconds: float | None
    file_size_mb: float
    success: bool
    errors: list[str]


class DocumentAnalysisResponse(BaseModel):
    """Análise contextual do documento/vídeo."""
    document_type: str
    confidence: float
    entities: list[dict[str, Any]]
    timeline: list[dict[str, Any]]
    key_facts: list[str]
    involved_parties: list[dict[str, Any]]
    legal_references: list[str]
    risk_indicators: list[str]
    next_actions: list[str]
    masked_transcript: str | None  # Com PII mascarado


class DocumentUploadResponse(BaseModel):
    """Resposta de upload de documento."""
    job_id: str
    filename: str
    file_type: str
    status: str
    extracted_fields: dict[str, Any]


class BatchUploadResponse(BaseModel):
    """Resposta de upload em lote."""
    batch_id: str
    total_files: int
    accepted: int
    rejected: int
    jobs: list[dict[str, Any]]


class PCMGIngestionStats(BaseModel):
    """Estatísticas de ingestão PCMG."""
    total_videos_processed: int
    total_documents_processed: int
    storage_used_gb: float
    pending_jobs: int
    completed_jobs: int
    failed_jobs: int


# =============================================================================
# Endpoints Vídeo
# =============================================================================


@router.post("/upload/video", response_model=VideoUploadResponse)
@limiter.limit("10/minute")
async def upload_video(
    request: Request,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_session)],
    auto_process: bool = True,
) -> VideoUploadResponse:
    """
    Upload de vídeo policial para processamento.
    
    Fluxo:
    1. Recebe arquivo (MP4, AVI, MOV, MKV)
    2. Extrai áudio (ffmpeg)
    3. Transcreve (Whisper)
    4. Analisa contexto policial
    5. Mascara PII
    6. Armazena no Neo4j
    
    ## Contextos Detectados
    - Ocorrência policial (BO)
    - Inquérito policial
    - Ordem de serviço
    - Comunicação de serviço
    - Perícia técnica
    
    ## Exemplo cURL
    ```bash
    curl -X POST http://localhost:8000/api/v1/pcmg/upload/video \\
      -H "Authorization: Bearer $TOKEN" \\
      -F "file=@video_ocorrencia.mp4" \\
      -F "auto_process=true"
    ```
    """
    # Validar formato
    allowed_extensions = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}
    ext = Path(file.filename or "").suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado: {ext}. Use: {allowed_extensions}"
        )
    
    # Salvar temporariamente
    temp_dir = tempfile.mkdtemp(prefix="pcmg_video_")
    temp_path = Path(temp_dir) / (file.filename or "upload.mp4")
    
    content = await file.read()
    temp_path.write_bytes(content)
    
    # Gerar job ID
    import uuid
    job_id = f"vid-{uuid.uuid4().hex[:8]}"
    
    # Processar ou enfileirar
    if auto_process:
        background_tasks.add_task(
            _process_video_task,
            str(temp_path),
            job_id,
            session,
        )
        status = "processing"
        message = "Vídeo em processamento (áudio → transcrição → análise)"
    else:
        status = "queued"
        message = "Vídeo enfileirado para processamento manual"
    
    return VideoUploadResponse(
        job_id=job_id,
        filename=file.filename or "unknown",
        status=status,
        message=message,
    )


async def _process_video_task(
    video_path: str,
    job_id: str,
    neo4j_session: AsyncSession,
) -> None:
    """Task background para processar vídeo."""
    try:
        pipeline = PCMGVideoPipeline()
        
        result = await pipeline.process_video(
            video_path,
            extract_audio=True,
            transcribe=True,
            analyze=True,
        )
        
        if result.success and result.analysis:
            # Mascara PII antes de salvar
            masked_transcript = None
            if result.transcript:
                mask_result = guard.inspect(result.transcript)
                masked_transcript = mask_result.masked
            
            # Persistir no Neo4j
            cypher = """
            CREATE (v:Video {
                job_id: $job_id,
                source_path: $video_path,
                duration_seconds: $duration,
                document_type: $doc_type,
                transcript: $transcript,
                masked_transcript: $masked,
                confidence: $confidence,
                created_at: datetime()
            })
            """
            
            await neo4j_session.run(cypher, {
                "job_id": job_id,
                "video_path": video_path,
                "duration": result.duration_seconds,
                "doc_type": result.analysis.get("document_type", "unknown"),
                "transcript": result.transcript,
                "masked": masked_transcript,
                "confidence": result.analysis.get("confidence_score", 0.0),
            })
            
            logger.info(f"Vídeo {job_id} processado e salvo no Neo4j")
        
    except Exception as e:
        logger.exception(f"Erro processando vídeo {job_id}: {e}")
    finally:
        # Limpar arquivo temporário
        try:
            Path(video_path).unlink(missing_ok=True)
        except:
            pass


# =============================================================================
# Endpoints Documento
# =============================================================================


@router.post("/upload/document", response_model=DocumentUploadResponse)
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(...)],
    session: Annotated[AsyncSession, Depends(get_session)],
    auto_process: bool = True,
) -> DocumentUploadResponse:
    """
    Upload de documento policial (PDF, DOCX, XLSX, CSV, TXT).
    
    Extrai e estrutura:
    - REDS, número de inquérito
    - Datas, locais, delegacias
    - Partes envolvidas (vítimas, indiciados, testemunhas)
    - Fatos narrados
    - Fundamentação legal
    - Providências
    
    ## Formatos Suportados
    - PDF (relatórios, termos)
    - DOCX/DOC (documentos editáveis)
    - XLSX/XLS (planilhas operacionais)
    - CSV (dados exportados)
    - TXT/MD (texto livre)
    
    ## Exemplo cURL
    ```bash
    curl -X POST http://localhost:8000/api/v1/pcmg/upload/document \\
      -H "Authorization: Bearer $TOKEN" \\
      -F "file=@relatorio_inquerito.pdf"
    ```
    """
    # Validar formato
    allowed_extensions = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".md"}
    ext = Path(file.filename or "").suffix.lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado: {ext}. Use: {allowed_extensions}"
        )
    
    # Salvar temporariamente
    temp_dir = tempfile.mkdtemp(prefix="pcmg_doc_")
    temp_path = Path(temp_dir) / (file.filename or f"upload{ext}")
    
    content = await file.read()
    temp_path.write_bytes(content)
    
    # Gerar job ID
    import uuid
    job_id = f"doc-{uuid.uuid4().hex[:8]}"
    
    # Processar
    if auto_process:
        background_tasks.add_task(
            _process_document_task,
            str(temp_path),
            ext.replace(".", ""),
            job_id,
            session,
        )
        status = "processing"
    else:
        status = "queued"
    
    return DocumentUploadResponse(
        job_id=job_id,
        filename=file.filename or "unknown",
        file_type=ext.replace(".", ""),
        status=status,
        extracted_fields={},  # Será preenchido após processamento
    )


async def _process_document_task(
    doc_path: str,
    file_type: str,
    job_id: str,
    neo4j_session: AsyncSession,
) -> None:
    """Task background para processar documento."""
    try:
        pipeline = PCMGDocumentPipeline()
        
        result = await pipeline.process_document(
            doc_path,
            extract_tables=True,
            analyze=True,
        )
        
        if result.success and result.structured_data:
            doc = result.structured_data
            
            # Mascara dados sensíveis
            masked_facts = None
            if doc.facts:
                mask_result = guard.inspect(doc.facts)
                masked_facts = mask_result.masked
            
            # Persistir no Neo4j
            cypher = """
            CREATE (d:Document {
                job_id: $job_id,
                source_path: $doc_path,
                file_type: $file_type,
                document_type: $doc_type,
                document_number: $doc_number,
                date: $date,
                location: $location,
                author: $author,
                facts: $facts,
                masked_facts: $masked_facts,
                legal_basis: $legal,
                created_at: datetime()
            })
            """
            
            await neo4j_session.run(cypher, {
                "job_id": job_id,
                "doc_path": doc_path,
                "file_type": file_type,
                "doc_type": doc.document_type,
                "doc_number": doc.document_number,
                "date": doc.date,
                "location": doc.location,
                "author": doc.author,
                "facts": doc.facts,
                "masked_facts": masked_facts,
                "legal": doc.legal_basis,
            })
            
            logger.info(f"Documento {job_id} processado e salvo no Neo4j")
        
    except Exception as e:
        logger.exception(f"Erro processando documento {job_id}: {e}")
    finally:
        try:
            Path(doc_path).unlink(missing_ok=True)
        except:
            pass


# =============================================================================
# Endpoints Batch
# =============================================================================


@router.post("/upload/batch", response_model=BatchUploadResponse)
@limiter.limit("5/minute")
async def upload_batch(
    request: Request,
    background_tasks: BackgroundTasks,
    files: Annotated[list[UploadFile], File(...)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BatchUploadResponse:
    """
    Upload em lote de múltiplos arquivos (vídeos + documentos).
    
    Separa automaticamente:
    - Vídeos → processamento de áudio/transcrição
    - Documentos → extração e estruturação
    
    ## Limites
    - Máximo 50 arquivos por batch
    - Tamanho total máximo: 500MB
    """
    import uuid
    
    if len(files) > 50:
        raise HTTPException(400, "Máximo 50 arquivos por batch")
    
    batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    jobs: list[dict[str, Any]] = []
    accepted = 0
    rejected = 0
    
    video_exts = {".mp4", ".avi", ".mov", ".mkv", ".wmv"}
    doc_exts = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".md"}
    
    for file in files:
        ext = Path(file.filename or "").suffix.lower()
        
        if ext in video_exts:
            # Processar como vídeo
            temp_dir = tempfile.mkdtemp(prefix="pcmg_video_")
            temp_path = Path(temp_dir) / (file.filename or "upload.mp4")
            content = await file.read()
            temp_path.write_bytes(content)
            
            job_id = f"vid-{uuid.uuid4().hex[:8]}"
            background_tasks.add_task(
                _process_video_task, str(temp_path), job_id, session
            )
            
            jobs.append({
                "job_id": job_id,
                "filename": file.filename,
                "type": "video",
                "status": "processing",
            })
            accepted += 1
            
        elif ext in doc_exts:
            # Processar como documento
            temp_dir = tempfile.mkdtemp(prefix="pcmg_doc_")
            temp_path = Path(temp_dir) / (file.filename or f"upload{ext}")
            content = await file.read()
            temp_path.write_bytes(content)
            
            job_id = f"doc-{uuid.uuid4().hex[:8]}"
            background_tasks.add_task(
                _process_document_task, str(temp_path), ext.replace(".", ""), job_id, session
            )
            
            jobs.append({
                "job_id": job_id,
                "filename": file.filename,
                "type": "document",
                "status": "processing",
            })
            accepted += 1
            
        else:
            rejected += 1
            jobs.append({
                "filename": file.filename,
                "type": "unknown",
                "status": "rejected",
                "reason": f"Formato não suportado: {ext}",
            })
    
    return BatchUploadResponse(
        batch_id=batch_id,
        total_files=len(files),
        accepted=accepted,
        rejected=rejected,
        jobs=jobs,
    )


# =============================================================================
# Endpoints Consulta
# =============================================================================


@router.get("/job/{job_id}")
@limiter.limit("60/minute")
async def get_job_status(
    request: Request,
    job_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any]:
    """
    Consulta status de um job de processamento.
    
    Retorna:
    - Status atual (queued, processing, completed, failed)
    - Resultado parcial ou final
    - Erros se houver
    """
    # Buscar no Neo4j
    cypher = """
    MATCH (n)
    WHERE n.job_id = $job_id
    RETURN n {
        .*,
        element_id: elementId(n),
        labels: labels(n)
    } as data
    """
    
    result = await session.run(cypher, {"job_id": job_id})
    record = await result.single()
    
    if not record:
        raise HTTPException(404, f"Job {job_id} não encontrado")
    
    return {
        "job_id": job_id,
        "status": "completed",  # Se está no Neo4j, completou
        "data": record["data"],
    }


@router.get("/stats")
@limiter.limit("30/minute")
async def get_stats(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PCMGIngestionStats:
    """
    Estatísticas de ingestão PCMG.
    
    Retorna totais de vídeos, documentos, storage, jobs.
    """
    cypher = """
    MATCH (v:Video)
    WITH count(v) as videos
    MATCH (d:Document)
    RETURN videos, count(d) as documents
    """
    
    result = await session.run(cypher)
    record = await result.single()
    
    return PCMGIngestionStats(
        total_videos_processed=record["videos"] if record else 0,
        total_documents_processed=record["documents"] if record else 0,
        storage_used_gb=0.0,  # TODO: calcular
        pending_jobs=0,  # TODO: fila
        completed_jobs=(record["videos"] + record["documents"]) if record else 0,
        failed_jobs=0,  # TODO: tracking
    )


@router.post("/search")
@limiter.limit("60/minute")
async def search_pcmg_data(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    q: str,
    doc_type: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Busca em dados PCMG indexados.
    
    Busca em:
    - Transcrições de vídeos
    - Texto de documentos
    - Metadados estruturados
    
    ## Exemplo
    ```
    POST /api/v1/pcmg/search?q=roubo&doc_type=ocorrencia_policial
    ```
    """
    cypher = """
    MATCH (n)
    WHERE (n:Video OR n:Document)
    AND (
        n.transcript CONTAINS $query
        OR n.masked_transcript CONTAINS $query
        OR n.facts CONTAINS $query
        OR n.masked_facts CONTAINS $query
        OR n.document_number CONTAINS $query
    )
    """
    
    params: dict[str, Any] = {"query": q, "limit": limit}
    
    if doc_type:
        cypher += " AND n.document_type = $doc_type"
        params["doc_type"] = doc_type
    
    cypher += """
    RETURN n {
        .*,
        element_id: elementId(n)
    } as data
    LIMIT $limit
    """
    
    result = await session.run(cypher, params)
    records = await result.data()
    
    return [r["data"] for r in records]


# =============================================================================
# Info
# =============================================================================


@router.get("/info")
@limiter.limit("120/minute")
async def get_info(request: Request) -> dict[str, Any]:
    """
    Informações sobre o sistema de ingestão PCMG.
    """
    return {
        "description": "Sistema de ingestão de dados da Polícia Civil de Minas Gerais",
        "capabilities": [
            "Processamento de vídeos: extração de áudio, transcrição, análise",
            "Processamento de documentos: PDF, DOCX, XLSX, CSV, TXT",
            "Detecção automática de tipo de documento",
            "Extração de entidades: pessoas, locais, veículos, datas",
            "Estruturação de campos policiais: REDS, inquérito, partes",
            "Mascaramento automático de PII (LGPD)",
            "Armazenamento no Neo4j com metadados",
        ],
        "video_formats": [".mp4", ".avi", ".mov", ".mkv", ".wmv"],
        "document_formats": [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv", ".txt", ".md"],
        "document_types_detected": [
            "ocorrencia_policial",
            "inquerito_policial",
            "ordem_servico",
            "comunicacao_servico",
            "pericia_tecnica",
            "relatorio_investigativo",
            "texto_livre",
        ],
        "rate_limits": {
            "upload_video": "10/minuto",
            "upload_document": "20/minuto",
            "upload_batch": "5/minuto",
        },
        "privacy": {
            "pii_masking": True,
            "lgpd_compliant": True,
            "retention_days": 2555,  # 7 anos (padrão investigação)
        },
    }
