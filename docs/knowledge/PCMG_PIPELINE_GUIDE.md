# PCMG Pipeline — Guia de Uso
## EGOS Inteligência — Ingestão de Dados da Polícia Civil de MG

**Sacred Code:** 000.111.369.963.1618  
**Versão:** 1.0.0  
**Status:** ✅ Local Test Ready

---

## 🎯 O que Faz

Processa **vídeos e documentos policiais** da PCMG:

1. **Vídeos** (câmeras corporais, celulares, ocorrências):
   - Extrai áudio (ffmpeg)
   - Transcreve (Whisper/OpenAI)
   - Analisa contexto (ocorrência/inquérito/ordem)
   - Mascara PII antes de salvar

2. **Documentos** (BOs, IPs, ordens, laudos):
   - Extrai texto (PDF, DOCX, XLSX, CSV, TXT)
   - Estrutura campos (REDS, inquérito, partes)
   - Analisa riscos e prazos
   - Mascara dados sensíveis

---

## 📦 Instalação

```bash
cd /home/enio/egos-inteligencia/api

# Instalar dependências do sistema
sudo apt update
sudo apt install ffmpeg  # Obrigatório para vídeos

# Instalar dependências Python
pip install -r requirements-pcmg.txt

# Para transcrição local (opcional)
pip install openai-whisper

# Ou usar API OpenAI (precisa de API key)
export OPENAI_API_KEY="sk-..."
```

---

## 🚀 Endpoints API

### 1. Upload de Vídeo

```bash
curl -X POST http://localhost:8000/api/v1/pcmg/upload/video \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ocorrencia_video.mp4" \
  -F "auto_process=true"
```

**Resposta:**
```json
{
  "job_id": "vid-a1b2c3d4",
  "filename": "ocorrencia_video.mp4",
  "status": "processing",
  "message": "Vídeo em processamento (áudio → transcrição → análise)"
}
```

### 2. Upload de Documento

```bash
curl -X POST http://localhost:8000/api/v1/pcmg/upload/document \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@relatorio_inquerito.pdf"
```

### 3. Upload em Lote (até 50 arquivos)

```bash
curl -X POST http://localhost:8000/api/v1/pcmg/upload/batch \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@video1.mp4" \
  -F "files=@bo.pdf" \
  -F "files=@planilha.xlsx"
```

### 4. Consultar Job

```bash
curl http://localhost:8000/api/v1/pcmg/job/vid-a1b2c3d4 \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Buscar em Dados PCMG

```bash
curl -X POST http://localhost:8000/api/v1/pcmg/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"q": "roubo a mão armada", "doc_type": "ocorrencia_policial"}'
```

### 6. Estatísticas

```bash
curl http://localhost:8000/api/v1/pcmg/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Teste Local

### Testar com Python

```python
import asyncio
from bracc.etl.pipelines.pcmg_video_pipeline import PCMGVideoPipeline
from bracc.etl.pipelines.pcmg_document_pipeline import PCMGDocumentPipeline

# Processar vídeo
async def test_video():
    pipeline = PCMGVideoPipeline(whisper_model="base")
    
    result = await pipeline.process_video(
        "/caminho/video_ocorrencia.mp4",
        extract_audio=True,
        transcribe=True,
        analyze=True,
    )
    
    print(f"Transcrição: {result.transcript[:200]}...")
    print(f"Tipo: {result.analysis.document_type}")
    print(f"Entidades: {result.analysis.entities}")
    print(f"Riscos: {result.analysis.risk_indicators}")

# Processar documento
async def test_document():
    pipeline = PCMGDocumentPipeline()
    
    result = await pipeline.process_document(
        "/caminho/relatorio.pdf",
        extract_tables=True,
        analyze=True,
    )
    
    doc = result.structured_data
    print(f"REDS: {doc.document_number}")
    print(f"Tipo: {doc.document_type}")
    print(f"Partes: {doc.involved_parties}")
    print(f"Prazos: {result.analysis.deadlines}")

# Executar
asyncio.run(test_video())
```

---

## 📋 Contextos Detectados

| Contexto | Descrição | Padrões Buscados |
|----------|-----------|------------------|
| **ocorrencia_policial** | BO, REDS | "boletim de ocorrência", "ocorrência policial" |
| **inquerito_policial** | IP, declarações | "inquérito policial", "termo de declaração" |
| **ordem_servico** | Missões, cumprimentos | "ordem de serviço", "cumprimento de mandado" |
| **comunicacao_servico** | Passagem de serviço | "comunicação de serviço", "passagem de serviço" |
| **pericia_tecnica** | Laudos, exames | "laudo pericial", "exame técnico" |
| **relatorio_investigativo** | Relatórios | "relatório investigativo" |

---

## 🔒 LGPD / Mascaramento

Guard Brasil mascara automaticamente:

| Dado | Original | Mascarado |
|------|----------|-----------|
| CPF | 123.456.789-00 | 123.***.***-00 |
| RG | MG-12.345.678 | MG-**.***.*** |
| MASP | 123456-7 | ******-7 |
| REDS | 1234567/2024 | *****/2024 |
| Placa | ABC1D23 | ABC*D** |
| Telefone | 31 98765-4321 | 31 ****-4321 |
| Email | joao@email.com | j***@email.com |

---

## 📊 Estrutura de Dados

### Video (Neo4j)
```cypher
(:Video {
  job_id: "vid-abc123",
  source_path: "...",
  duration_seconds: 180.5,
  document_type: "ocorrencia_policial",
  transcript: "...",
  masked_transcript: "...",
  confidence: 0.85,
  created_at: datetime()
})
```

### Document (Neo4j)
```cypher
(:Document {
  job_id: "doc-xyz789",
  file_type: "pdf",
  document_type: "inquerito_policial",
  document_number: "1234/2024",
  date: "15/03/2024",
  location: "Delegacia de ...",
  author: "Escrivão ...",
  facts: "...",
  masked_facts: "...",
  legal_basis: ["Art. 157 CP"],
  created_at: datetime()
})
```

---

## ⚠️ Requisitos do Sistema

### Obrigatórios
- **ffmpeg** — Extração de áudio
- **Neo4j** — Armazenamento
- **Python 3.11+**

### Opcionais (para transcrição)
- **Whisper local** — `pip install openai-whisper`
- **OpenAI API** — `export OPENAI_API_KEY="..."`

### Para documentos
- **pdftotext** — `sudo apt install poppler-utils`
- **antiword** — `sudo apt install antiword` (para .doc)
- **python-docx** — Já no requirements
- **openpyxl** — Já no requirements

---

## 🔧 Troubleshooting

### "ffmpeg não encontrado"
```bash
sudo apt install ffmpeg
which ffmpeg  # Verificar path
```

### "Whisper falhou"
```bash
# Instalar whisper local
pip install openai-whisper

# Ou usar OpenAI API
export OPENAI_API_KEY="sk-..."
```

### "PDF extraction failed"
```bash
sudo apt install poppler-utils  # Para pdftotext
# ou
pip install PyMuPDF  # Fallback
```

### Rate Limit
```
POST /upload/video    → 10/minuto
POST /upload/document → 20/minuto
POST /upload/batch    → 5/minuto
```

---

## 🗺️ Fluxo de Dados

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vídeo MP4     │────▶│   ffmpeg     │────▶│  Áudio WAV  │
└─────────────────┘     └──────────────┘     └──────┬──────┘
                                                    │
┌─────────────────┐     ┌──────────────┐           │
│  Documento PDF  │────▶│  pdftotext   │───────────┤
└─────────────────┘     └──────────────┘           │
                                                    ▼
┌─────────────────────────────────────────────────────────┐
│                    Whisper / OpenAI                      │
│              Transcrição com timestamps                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Análise de Contexto Policial                │
│   - Detectar tipo de documento                          │
│   - Extrair entidades (pessoas, locais, veículos)      │
│   - Construir timeline                                  │
│   - Identificar riscos                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Guard Brasil — Mascaramento               │
│   - CPF, RG, MASP, REDS, placas, emails                 │
│   - LGPD disclosure                                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Neo4j (Intelink)                       │
│   - Nós: Video, Document, Person, Location              │
│   - Relacionamentos: INVOLVES, OCCURRED_AT, etc.        │
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Próximos Passos

- [ ] Testar com vídeos reais da PCMG
- [ ] Ajustar padrões de regex para casos específicos
- [ ] Treinar modelo de detecção de contexto (BERTimbau)
- [ ] Integrar com sistema REDS da PCMG
- [ ] Criar dashboard de visualização de vínculos

---

**Documento criado:** 2026-04-08  
**Última atualização:** 2026-04-08  
**Responsável:** EGOS Inteligência
