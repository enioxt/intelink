# API Reference — EGOS Inteligência (Intelink)

> **SSOT:** `docs/API_REFERENCE.md` | Updated: 2026-04-14
> **Fonte principal de verdade:** OpenAPI Schema (`/docs` ou `/redoc` na API rodando)

---

## 🚀 Como Acessar a Documentação Viva

A API do EGOS Inteligência é construída com **FastAPI**, o que significa que a documentação completa dos 25 routers e centenas de endpoints é gerada **automaticamente** via Swagger UI e ReDoc.

1. **Suba a API:**
   ```bash
   cd api
   pip install -e .
   uvicorn src.egos_inteligencia.main:app --reload --port 8000
   ```

2. **Acesse no navegador:**
   - Swagger UI (Interativo): [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc (Leitura estruturada): [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🗂️ Estrutura de Routers (api/src/egos_inteligencia/routers/)

A API está dividida em 25 routers principais:

### Autenticação & Segurança
- `auth.py`: Autenticação JWT RS256, login, refresh, roles
- `baseline.py`: Baseline security checks

### Entidades & Análises
- `entity.py`: Busca e extração de entidades (Person, Company, Vehicle)
- `search.py`: Busca avançada no Neo4j com suporte a FTS
- `cross_reference.py`: Deduplicação Jaro-Winkler e entity resolution
- `graph.py`: Traversal, shortest path e ego networks
- `nlp.py`: Extração NER via BERTimbau/spaCy

### Inteligência & Padrões
- `chat.py`, `chat_models.py`, `chat_prompt.py`, `chat_tools.py`: Orquestração Multi-LLM (streaming)
- `patterns.py`: Detecção de padrões criminais (Sacred Math scoring)
- `benford.py`: Detecção de anomalias financeiras
- `investigation.py`: Gerenciamento de dossiês e casos
- `templates.py`: Templates Neo4j Cypher pre-built

### Ingestão & Dados Externos
- `pcmg_ingestion.py`: Upload e parsing de documentos/vídeos PCMG
- `bnmp.py`: Integração mandados de prisão
- `public.py`: Fontes públicas (Transparência, Base dos Dados)
- `interop.py`: Integrações webhook, Telegram, Evolution API
- `gazette_monitor.py`: Monitoramento diários oficiais

### Sistema & Observabilidade
- `health.py`: Liveness e readiness probes
- `activity.py`: Audit logs, timeline de uso
- `monitor.py`: Métricas de infraestrutura
- `analytics.py`: Agregação de estatísticas para dashboards
- `agents.py`: Exposição de status dos agentes autônomos
- `meta.py`: Versionamento, capacidades do servidor
- `conversations.py`: Gestão de histórico de chats
