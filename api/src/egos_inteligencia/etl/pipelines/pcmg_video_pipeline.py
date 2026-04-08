"""
PCMG Video Pipeline — EGOS Inteligência
Extrai áudio → Transcreve → Analisa contexto policial

Para vídeos de: câmeras corporais, celulares, câmeras de segurança,
depoimentos em vídeo, ocorrências registradas em vídeo.

Sacred Code: 000.111.369.963.1618
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import aiofiles

logger = logging.getLogger(__name__)


@dataclass
class VideoProcessingResult:
    """Resultado do processamento de vídeo."""
    video_path: str
    audio_path: str | None
    transcript: str | None
    analysis: dict[str, Any] | None
    duration_seconds: float | None
    file_size_mb: float
    success: bool
    errors: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TranscriptionSegment:
    """Segmento de transcrição com timestamps."""
    start: float
    end: float
    text: str
    speaker: str | None = None
    confidence: float = 0.0


@dataclass
class PoliceContextAnalysis:
    """Análise contextual de texto policial."""
    document_type: str  # ocorrencia, inquerito, ordem_servico, comunicacao, pericia
    entities: list[dict[str, Any]]  # pessoas, locais, veículos, objetos
    timeline: list[dict[str, Any]]  # eventos cronológicos
    key_facts: list[str]  # fatos relevantes
    involved_parties: list[dict[str, Any]]  # partes envolvidas
    legal_references: list[str]  # artigos, leis mencionadas
    risk_indicators: list[str]  # sinais de alerta
    next_actions: list[str]  # recomendações
    confidence_score: float  # 0.0-1.0


class PCMGVideoPipeline:
    """
    Pipeline completo para processamento de vídeos policiais.
    
    Fluxo:
    1. Extrair áudio (ffmpeg)
    2. Transcrever (Whisper/OpenAI API)
    3. Analisar contexto (LLM especializado)
    4. Extrair entidades e estruturar
    
    Suporta: MP4, AVI, MOV, MKV, WMV
    """
    
    SUPPORTED_VIDEO_FORMATS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm"}
    
    # Contextos policiais conhecidos
    DOCUMENT_PATTERNS = {
        "ocorrencia_policial": [
            r"boletim de ocorrência",
            r"ocorrência policial",
            r"registro de ocorrência",
            r"fato ocorrido",
            r"vítima.*autor",
            r"local do fato",
        ],
        "inquerito_policial": [
            r"inquérito policial",
            r"termo de declaração",
            r"indiciado",
            r"testemunha.*declara",
            r"diligências realizadas",
            r"relatório investigativo",
        ],
        "ordem_servico": [
            r"ordem de serviço",
            r"ordem de missão",
            r"cumprimento de mandado",
            r"operação policial",
            r"equipe designada",
        ],
        "comunicacao_servico": [
            r"comunicação de serviço",
            r"passagem de serviço",
            r"relato operacional",
            r"situação relatada",
        ],
        "pericia_tecnica": [
            r"laudo pericial",
            r"exame técnico",
            r"perícia criminal",
            r"exame de corpo de delito",
            r"coleta de vestígios",
        ],
        "texto_livre": [
            r"observações",
            r"anotações",
            r"parecer",
            r"análise.*técnica",
        ],
    }
    
    def __init__(
        self,
        whisper_model: str = "base",  # tiny, base, small, medium, large
        openai_api_key: str | None = None,
        temp_dir: str | None = None,
    ):
        self.whisper_model = whisper_model
        self.openai_api_key = openai_api_key
        self.temp_dir = temp_dir or tempfile.gettempdir()
        self.ffmpeg_path = self._find_ffmpeg()
    
    def _find_ffmpeg(self) -> str:
        """Localiza ffmpeg no sistema."""
        try:
            result = subprocess.run(
                ["which", "ffmpeg"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fallback para paths comuns
            for path in ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]:
                if os.path.exists(path):
                    return path
            raise RuntimeError("ffmpeg não encontrado. Instale: sudo apt install ffmpeg")
    
    async def process_video(
        self,
        video_path: str,
        extract_audio: bool = True,
        transcribe: bool = True,
        analyze: bool = True,
        progress_callback: Callable[[str, float], None] | None = None,
    ) -> VideoProcessingResult:
        """
        Processa vídeo completo: áudio → transcrição → análise.
        
        Args:
            video_path: Caminho do arquivo de vídeo
            extract_audio: Se deve extrair áudio
            transcribe: Se deve transcrever
            analyze: Se deve analisar contexto
            progress_callback: Callback (etapa, progresso 0.0-1.0)
        
        Returns:
            VideoProcessingResult com todos os resultados
        """
        result = VideoProcessingResult(
            video_path=video_path,
            audio_path=None,
            transcript=None,
            analysis=None,
            duration_seconds=None,
            file_size_mb=os.path.getsize(video_path) / (1024 * 1024),
            success=False,
            errors=[],
        )
        
        try:
            # Validar formato
            ext = Path(video_path).suffix.lower()
            if ext not in self.SUPPORTED_VIDEO_FORMATS:
                result.errors.append(f"Formato não suportado: {ext}")
                return result
            
            # Fase 1: Extrair áudio
            if extract_audio:
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("extract_audio", 0.0)
                    )
                
                audio_path = await self._extract_audio(video_path)
                result.audio_path = audio_path
                
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("extract_audio", 1.0)
                    )
            
            # Fase 2: Transcrever
            if transcribe and result.audio_path:
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("transcribe", 0.0)
                    )
                
                transcription = await self._transcribe_audio(result.audio_path)
                result.transcript = transcription["text"]
                result.duration_seconds = transcription["duration"]
                result.metadata["segments"] = transcription.get("segments", [])
                
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("transcribe", 1.0)
                    )
            
            # Fase 3: Analisar contexto
            if analyze and result.transcript:
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("analyze", 0.0)
                    )
                
                analysis = await self._analyze_police_context(result.transcript)
                result.analysis = analysis
                
                if progress_callback:
                    await asyncio.get_event_loop().run_in_executor(
                        None, lambda: progress_callback("analyze", 1.0)
                    )
            
            result.success = True
            
        except Exception as e:
            logger.exception(f"Erro processando vídeo {video_path}")
            result.errors.append(str(e))
        
        return result
    
    async def _extract_audio(self, video_path: str) -> str:
        """
        Extrai áudio do vídeo usando ffmpeg.
        
        Output: WAV mono 16kHz (ideal para transcrição)
        """
        audio_path = os.path.join(
            self.temp_dir,
            f"{Path(video_path).stem}_audio.wav"
        )
        
        cmd = [
            self.ffmpeg_path,
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "pcm_s16le",  # PCM 16-bit little-endian
            "-ac", "1",  # Mono
            "-ar", "16000",  # 16kHz (ideal para Whisper)
            "-y",  # Overwrite
            audio_path
        ]
        
        # Executar ffmpeg
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"ffmpeg falhou: {stderr.decode()}")
        
        logger.info(f"Áudio extraído: {audio_path}")
        return audio_path
    
    async def _transcribe_audio(self, audio_path: str) -> dict[str, Any]:
        """
        Transcreve áudio usando Whisper.
        
        Tenta ordem:
        1. OpenAI API (se api_key disponível)
        2. Whisper local (se instalado)
        3. Whisper via subprocess
        """
        # Tentar OpenAI API primeiro
        if self.openai_api_key:
            return await self._transcribe_openai(audio_path)
        
        # Fallback para Whisper local
        return await self._transcribe_local(audio_path)
    
    async def _transcribe_openai(self, audio_path: str) -> dict[str, Any]:
        """Transcreve usando OpenAI Whisper API."""
        import aiohttp
        
        url = "https://api.openai.com/v1/audio/transcriptions"
        
        form_data = aiohttp.FormData()
        form_data.add_field(
            "file",
            open(audio_path, "rb"),
            filename=Path(audio_path).name,
            content_type="audio/wav"
        )
        form_data.add_field("model", "whisper-1")
        form_data.add_field("response_format", "verbose_json")
        form_data.add_field("timestamp_granularities[]", "segment")
        
        headers = {"Authorization": f"Bearer {self.openai_api_key}"}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=form_data, headers=headers) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"OpenAI API erro {resp.status}: {text}")
                
                data = await resp.json()
                
                return {
                    "text": data.get("text", ""),
                    "duration": data.get("duration"),
                    "segments": [
                        {
                            "start": s.get("start"),
                            "end": s.get("end"),
                            "text": s.get("text"),
                        }
                        for s in data.get("segments", [])
                    ],
                    "source": "openai_api",
                }
    
    async def _transcribe_local(self, audio_path: str) -> dict[str, Any]:
        """Transcreve usando Whisper local via subprocess."""
        import json
        
        output_json = audio_path.replace(".wav", "_transcription.json")
        
        cmd = [
            "whisper",
            audio_path,
            "--model", self.whisper_model,
            "--language", "pt",
            "--output_format", "json",
            "--output_dir", self.temp_dir,
            "--verbose", "False",
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"Whisper falhou: {stderr.decode()}")
        
        # Ler resultado
        async with aiofiles.open(output_json, "r") as f:
            content = await f.read()
            data = json.loads(content)
        
        # Calcular duração total
        duration = max(
            (s.get("end", 0) for s in data.get("segments", [])),
            default=0
        )
        
        return {
            "text": data.get("text", ""),
            "duration": duration,
            "segments": data.get("segments", []),
            "source": "whisper_local",
        }
    
    async def _analyze_police_context(
        self,
        transcript: str,
    ) -> PoliceContextAnalysis:
        """
        Analisa transcrição no contexto policial.
        
        Detecta:
        - Tipo de documento/procedimento
        - Entidades (pessoas, locais, veículos)
        - Timeline de eventos
        - Fatos relevantes
        - Partes envolvidas
        - Referências legais
        - Indicadores de risco
        """
        # Detectar tipo de documento
        doc_type = self._detect_document_type(transcript)
        
        # Extrair entidades com regex (pode ser melhorado com NER)
        entities = self._extract_entities(transcript)
        
        # Construir timeline
        timeline = self._extract_timeline(transcript)
        
        # Extrair fatos chave
        key_facts = self._extract_key_facts(transcript, doc_type)
        
        # Identificar partes envolvidas
        involved = self._identify_parties(transcript, entities)
        
        # Extrair referências legais
        legal_refs = self._extract_legal_references(transcript)
        
        # Detectar riscos
        risks = self._detect_risk_indicators(transcript)
        
        # Recomendar próximas ações
        next_actions = self._recommend_actions(doc_type, entities, risks)
        
        # Calcular confiança
        confidence = self._calculate_confidence(
            transcript, entities, doc_type
        )
        
        return PoliceContextAnalysis(
            document_type=doc_type,
            entities=entities,
            timeline=timeline,
            key_facts=key_facts,
            involved_parties=involved,
            legal_references=legal_refs,
            risk_indicators=risks,
            next_actions=next_actions,
            confidence_score=confidence,
        )
    
    def _detect_document_type(self, text: str) -> str:
        """Detecta tipo de documento policial baseado em padrões."""
        text_lower = text.lower()
        
        scores = {}
        for doc_type, patterns in self.DOCUMENT_PATTERNS.items():
            score = sum(1 for p in patterns if re.search(p, text_lower))
            scores[doc_type] = score
        
        # Retornar tipo com maior score, ou "texto_livre"
        if scores:
            best = max(scores, key=scores.get)
            if scores[best] > 0:
                return best
        
        return "texto_livre"
    
    def _extract_entities(self, text: str) -> list[dict[str, Any]]:
        """Extrai entidades relevantes do texto."""
        entities = []
        
        # Pessoas (nomes próprios em maiúsculo)
        name_pattern = r"\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b"
        for match in re.finditer(name_pattern, text):
            entities.append({
                "type": "person",
                "value": match.group(1),
                "position": match.span(),
            })
        
        # Locais (delegacias, endereços)
        location_patterns = [
            r"(?:Rua|Avenida|Av\.|Travessa|Al\.?|Praça)\s+[A-Z][a-zA-Z\s]+",
            r"(?:Delegacia|DP|DPCAMI)\s+[A-Z][a-zA-Z\s]+",
            r"(?:Bairro|Jardim|Vila|Centro)\s+[A-Z][a-zA-Z\s]+",
        ]
        for pattern in location_patterns:
            for match in re.finditer(pattern, text):
                entities.append({
                    "type": "location",
                    "value": match.group(0),
                    "position": match.span(),
                })
        
        # Veículos (placas)
        plate_pattern = r"\b([A-Z]{3}[0-9][A-Z][0-9]{2}|[A-Z]{3}-?[0-9]{4})\b"
        for match in re.finditer(plate_pattern, text):
            entities.append({
                "type": "vehicle_plate",
                "value": match.group(1),
                "position": match.span(),
            })
        
        # Datas
        date_pattern = r"\b(\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4})\b"
        for match in re.finditer(date_pattern, text):
            entities.append({
                "type": "date",
                "value": match.group(1),
                "position": match.span(),
            })
        
        # Horários
        time_pattern = r"\b(\d{2}:\d{2}(?::\d{2})?)\b"
        for match in re.finditer(time_pattern, text):
            entities.append({
                "type": "time",
                "value": match.group(1),
                "position": match.span(),
            })
        
        return entities
    
    def _extract_timeline(self, text: str) -> list[dict[str, Any]]:
        """Extrai eventos em ordem cronológica."""
        timeline = []
        
        # Procurar por eventos com data/hora
        event_patterns = [
            r"(?:em|às|no dia)\s+(\d{2}/\d{2}/\d{4})[\s,às]*(\d{2}:\d{2})?.*?(?:ocorreu|aconteceu|foi|chegou|saiu|entrou)[\s]+(.+?)(?:\.|,|$)",
            r"(\d{2}:\d{2})[\s-]+(.+?)(?:\.|,|$)",
        ]
        
        for pattern in event_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                groups = match.groups()
                if len(groups) >= 2:
                    timeline.append({
                        "timestamp": groups[0] if len(groups) > 2 else None,
                        "time": groups[1] if len(groups) > 2 else groups[0],
                        "description": groups[-1].strip(),
                        "position": match.span(),
                    })
        
        # Ordenar por timestamp se disponível
        timeline.sort(key=lambda x: x.get("timestamp") or "")
        
        return timeline
    
    def _extract_key_facts(self, text: str, doc_type: str) -> list[str]:
        """Extrai fatos relevantes baseado no tipo de documento."""
        facts = []
        
        # Sentenças com verbos de ação relevantes
        action_verbs = [
            "furto", "roubo", "homicídio", "lesão", "tráfico",
            "apreensão", "prisão", "condução", "diligência",
            "resistência", "fuga", "colaboração", "confissão",
        ]
        
        sentences = re.split(r"[.!?]+", text)
        for sent in sentences:
            sent_lower = sent.lower()
            if any(verb in sent_lower for verb in action_verbs):
                facts.append(sent.strip())
        
        return facts[:20]  # Top 20 fatos
    
    def _identify_parties(
        self,
        text: str,
        entities: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Identifica partes envolvidas e seus papéis."""
        parties = []
        
        # Padrões de identificação de papéis
        role_patterns = {
            "vitima": r"(?:vítima|lesado|ofendido)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            "autor": r"(?:autor|indiciado|investigado|acusado)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            "testemunha": r"(?:testemunha)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            "policial": r"(?:policial|investigador|escrivão|delegado)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        }
        
        for role, pattern in role_patterns.items():
            for match in re.finditer(pattern, text, re.IGNORECASE):
                parties.append({
                    "name": match.group(1),
                    "role": role,
                    "identified_by": "pattern",
                })
        
        return parties
    
    def _extract_legal_references(self, text: str) -> list[str]:
        """Extrai referências a leis e artigos."""
        refs = []
        
        # Artigos do Código Penal
        cp_pattern = r"(?:art(?:igo|\.)?\s+(\d+)[\s\.,]*(do)?\s*(Código Penal|CP|cp))"
        for match in re.finditer(cp_pattern, text, re.IGNORECASE):
            refs.append(f"Art. {match.group(1)} CP")
        
        # Artigos do CPP
        cpp_pattern = r"(?:art(?:igo|\.)?\s+(\d+)[\s\.,]*(do)?\s*(Código de Processo Penal|CPP|cpp))"
        for match in re.finditer(cpp_pattern, text, re.IGNORECASE):
            refs.append(f"Art. {match.group(1)} CPP")
        
        # Leis específicas
        law_pattern = r"(?:Lei|Decreto)\s+[nN]?[º°]?\s*(\d+[\./]\d+)"
        for match in re.finditer(law_pattern, text):
            refs.append(match.group(0))
        
        return list(set(refs))  # Remover duplicatas
    
    def _detect_risk_indicators(self, text: str) -> list[str]:
        """Detecta indicadores de risco ou alerta."""
        risks = []
        
        risk_patterns = {
            "arma_de_fogo": r"(?:arma\s+de\s+fogo|revólver|pistola|escopeta|fuzil)",
            "droga": r"(?:droga|entorpecente|cocaína|maconha|crack)\s+(?:apreendid|encontrad|trafic)",
            "fuga": r"(?:fuga|evasão|evadiu|fugiu|se\s+evadiu)",
            "resistencia": r"(?:resistência|resistiu|opôs\s+resistência|agrediu)",
            "reincidencia": r"(?:reincidente|antecedente|já\s+possui|outros\s+processos)",
            "ameaca": r"(?:ameaça|ameaçou|intimidação|chantageou)",
        }
        
        text_lower = text.lower()
        for risk_type, pattern in risk_patterns.items():
            if re.search(pattern, text_lower):
                risks.append(risk_type)
        
        return risks
    
    def _recommend_actions(
        self,
        doc_type: str,
        entities: list[dict[str, Any]],
        risks: list[str],
    ) -> list[str]:
        """Recomenda próximas ações baseado no contexto."""
        actions = []
        
        if doc_type == "ocorrencia_policial":
            actions.append("Verificar REDS e vínculos no sistema")
            if "autor" in [p.get("role") for p in entities if isinstance(p, dict)]:
                actions.append("Consultar antecedentes criminais")
        
        if doc_type == "inquerito_policial":
            actions.append("Verificar prazo de conclusão")
            actions.append("Atualizar status de diligências pendentes")
        
        if doc_type == "ordem_servico":
            actions.append("Confirmar cumprimento da missão")
            actions.append("Registrar resultado operacional")
        
        if "arma_de_fogo" in risks:
            actions.append("⚠️ Protocolo de apreensão de arma — verificar numeração no SIGMA")
        
        if "droga" in risks:
            actions.append("⚠️ Protocolo de apreensão de drogas — pesar e lacrar")
        
        if not actions:
            actions.append("Documentar e arquivar conforme protocolo")
        
        return actions
    
    def _calculate_confidence(
        self,
        transcript: str,
        entities: list[dict[str, Any]],
        doc_type: str,
    ) -> float:
        """Calcula score de confiança da análise."""
        score = 0.5  # Base
        
        # +0.2 se tem muitas entidades
        if len(entities) > 5:
            score += 0.2
        
        # +0.1 se detectou tipo de documento específico
        if doc_type != "texto_livre":
            score += 0.1
        
        # +0.1 se transcrição é longa (mais contexto)
        if len(transcript) > 500:
            score += 0.1
        
        # -0.1 se muito curta (pouco contexto)
        if len(transcript) < 100:
            score -= 0.1
        
        return min(1.0, max(0.0, score))


# Instância global
video_pipeline = PCMGVideoPipeline()


async def process_single_video(video_path: str) -> VideoProcessingResult:
    """Processa um único vídeo (função utilitária)."""
    return await video_pipeline.process_video(video_path)


async def batch_process_videos(
    video_paths: list[str],
    progress_callback: Callable[[int, int, str], None] | None = None,
) -> list[VideoProcessingResult]:
    """
    Processa múltiplos vídeos em batch.
    
    Args:
        video_paths: Lista de caminhos de vídeo
        progress_callback: Callback (atual, total, mensagem)
    
    Returns:
        Lista de resultados
    """
    results = []
    total = len(video_paths)
    
    for i, path in enumerate(video_paths):
        if progress_callback:
            progress_callback(i + 1, total, f"Processando {Path(path).name}...")
        
        result = await process_single_video(path)
        results.append(result)
    
    return results
