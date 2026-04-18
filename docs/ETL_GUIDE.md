# ETL Guide — Como Adicionar Pipelines de Dados
> **SSOT:** `docs/ETL_GUIDE.md` | Updated: 2026-04-14

---

## Visão Geral

| Status | Pipelines |
|--------|-----------|
| ✅ Implementados (4) | BNMP, DataJud, PCMG Documentos, PCMG Vídeos |
| 🔴 Pendentes (42) | RAIS, SIGTAP, SICONFI, CNEFE, Receita Federal, TSE, TCU, Portal Transparência... |

**Template base:** `api/scripts/etl_pipeline_template.py` (448 linhas)
**Pipelines ativos:** `etl/pipelines/` (4 arquivos)

---

## Pipelines Implementados

### 1. BNMP (`etl/pipelines/bnmp.py`)
- **Fonte:** Banco Nacional de Mandados de Prisão (CNJ)
- **Dados:** Mandados de prisão ativos, expedidos, cumpridos
- **Output Neo4j:** `(:Person)-[:HAS_WARRANT]->(:Warrant)`
- **Frequência:** Manual / sob demanda

### 2. DataJud (`etl/pipelines/datajud.py`)
- **Fonte:** DataJud (CNJ — processos judiciais)
- **Dados:** Processos, partes, audiências, decisões
- **Output Neo4j:** `(:Person)-[:APPEARS_IN]->(:Case)`
- **API key:** `DATAJUD_API_KEY` no .env

### 3. PCMG Documentos (`etl/pipelines/pcmg_document_pipeline.py`)
- **Fonte:** Upload manual de PDF/DOCX/TXT/XLSX policiais
- **Dados:** IPs, CSs, laudos, BO
- **Processamento:** Extração de texto → BERTimbau NER → entidades Neo4j
- **Router:** `/api/v1/pcmg`

### 4. PCMG Vídeos (`etl/pipelines/pcmg_video_pipeline.py`)
- **Fonte:** Upload manual de MP4/AVI/MOV
- **Dados:** Gravações de câmeras, depoimentos
- **Processamento:** ffmpeg frames → OCR → speech-to-text (Groq Whisper)
- **Output:** Transcrição + entidades extraídas

---

## Como Criar um Novo Pipeline

### Passo 1 — Usar o template

```python
# api/scripts/etl_pipeline_template.py — base para novos pipelines
# Copiar para: etl/pipelines/{fonte}_pipeline.py

class ETLPipeline:
    def extract(self, source: str) -> list[dict]:
        """Baixar/ler dados da fonte."""
        pass

    def transform(self, raw: list[dict]) -> list[EntityRecord]:
        """Normalizar, validar, detectar PII."""
        pass

    def load(self, records: list[EntityRecord]) -> LoadResult:
        """Inserir/atualizar no Neo4j."""
        pass

    def run(self, dry_run: bool = False) -> PipelineResult:
        """Orquestrar extract→transform→load."""
        data = self.extract(self.source)
        records = self.transform(data)
        if dry_run:
            return PipelineResult(preview=records[:10])
        return self.load(records)
```

### Passo 2 — Registrar na source_registry

```python
# api/src/egos_inteligencia/services/source_registry.py
register_source(
    id="rais",
    name="RAIS — Relação Anual de Informações Sociais",
    url="https://bi.mte.gov.br/bgcaged/",
    data_types=["employment", "salary", "company"],
    pipeline="etl/pipelines/rais_pipeline.py",
    frequency="annual",
    requires_key=False
)
```

### Passo 3 — Padrão de output (Neo4j)

```python
# Sempre usar o investigation template correto
from services.investigation_templates import CriminalInvestigationTemplate

template = CriminalInvestigationTemplate()
cypher = template.build_insert_query(
    entity_type="Person",
    properties={"name": "...", "cpf": "masked_cpf", "source": "RAIS"},
    confidence=0.9
)
```

### Passo 4 — Obrigações LGPD

```python
# Todo pipeline DEVE:
# 1. Mascarar CPF antes de persistir
masked_cpf = pii_service.mask_cpf(raw_cpf)

# 2. Registrar source no audit log
audit_log.record(action="ETL_INGEST", source="RAIS", record_count=n)

# 3. Incluir base legal no metadata
metadata = {"legal_basis": "LGPD Art. 7º, III — segurança pública"}
```

### Passo 5 — Dry-run obrigatório

```bash
# Sempre testar com dry-run antes de executar
python etl/pipelines/rais_pipeline.py --dry-run --limit 100
# Deve mostrar preview sem persistir nada

# Executar
python etl/pipelines/rais_pipeline.py --exec
```

---

## Fontes Prioritárias a Implementar

| Prioridade | Fonte | Dados | Esforço |
|-----------|-------|-------|---------|
| P1 | **Portal Transparência** | Gastos, contratos, servidores | 2 dias |
| P1 | **Receita Federal CNPJ** | Empresas, sócios, situação | 1 dia |
| P1 | **TSE — dados eleitorais** | Doações, candidatos | 2 dias |
| P2 | **TCU — auditorias** | Irregularidades, multas | 3 dias |
| P2 | **RAIS** | Vínculos empregatícios | 2 dias |
| P2 | **Base dos Dados** | 43 datasets consolidados | 3 dias |
| P3 | **SIGTAP** | Procedimentos SUS | 3 dias |
| P3 | **SICONFI** | Finanças municipais | 2 dias |
| P3 | **CNEFE** | Localização geográfica | 1 dia |

---

## Scheduler (Pendente — PHASE-3)

Atualmente todos os pipelines são **manuais**. O scheduler automático é um gap conhecido:

```python
# TODO: Implementar em api/src/egos_inteligencia/services/etl_scheduler.py
# Frequências desejadas:
# - BNMP: diário (mandados mudam)
# - CNPJ: semanal
# - Portal Transparência: diário
# - RAIS: anual
# - DataJud: diário
```

---

*Para adicionar novo pipeline: crie o arquivo em `etl/pipelines/`, registre em `source_registry.py`, documente neste arquivo.*
