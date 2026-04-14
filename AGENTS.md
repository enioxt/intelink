# AGENTS.md — EGOS Inteligência (Intelink v3)

> **VERSION:** 3.0.0 | **UPDATED:** 2026-04-14 | **STATUS:** SSOT CANÔNICO
> **URL:** https://intelink.ia.br | **VPS:** 204.168.217.125
> **ENTRY POINT PARA AGENTES AI:** `docs/MASTER_INDEX.md`
> **DECISÃO 2026-04-09:** Repositório único canônico. `egos-lab/apps/intelink` → ARCHIVED.

---

## Visão do Produto

EGOS Inteligência é uma plataforma **standalone** de inteligência sobre dados públicos brasileiros.
Investigadores mapeiam relacionamentos entre entidades em 77M+ registros, detectam padrões comportamentais, e geram laudos com citação de fonte — sem expor PII externo.

**Modelo:** Consultoria de implementação (por delegacia/órgão) + framework licenciável
**Público-alvo:** Delegacias de polícia, MPE/MPF, jornalismo investigativo, compliance corporativo

---

## Arquitetura Resumida

```
frontend/ (Next.js 15) / apps/web/ (Next.js 14.2 — novo)
    │
    ▼
api/ (FastAPI Python 3.12) — 25 routers, 30+ services
    │
    ├── Neo4j 5 (77M+ nós, 25M+ arestas)
    ├── Redis 7 (cache, sessões, rate limit)
    └── Supabase (auth opcional, storage)
```

**Diretórios principais:**
```
egos-inteligencia/
├── api/src/egos_inteligencia/   — Backend (routers/, services/, middleware/)
├── frontend/src/lib/            — Lógica frontend (intelligence/, analysis/, etc.)
├── apps/web/                    — Frontend novo (Vercel AI SDK, RxDB offline)
├── etl/pipelines/               — 4 ETL ativos (bnmp, datajud, pcmg×2)
├── infra/                       — Docker, Caddy, Terraform, Ansible
└── docs/                        — Toda a documentação (ver MASTER_INDEX.md)
```

---

## API — 25 Routers FastAPI

### Autenticação & Sessão
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/auth` | `routers/auth.py` | JWT RS256 login/logout, refresh tokens HttpOnly |
| `/api/v1/conversations` | `routers/conversations.py` | Histórico de chat, gestão de contexto |
| `/api/v1/activity` | `routers/activity.py` | Audit trail, log de atividade |

### Entidades & Busca
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/entity` | `routers/entity.py` | CRUD, lookup CPF/CNPJ/nome, enrichment |
| `/api/v1/search` | `routers/search.py` | Full-text Neo4j + fallback semântico |
| `/api/v1/cross_reference` | `routers/cross_reference.py` | Deduplicação Jaro-Winkler, 6 níveis |

### Grafos & Redes
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/graph` | `routers/graph.py` | Ego networks, path finding, traversal |
| `/api/v1/patterns` | `routers/patterns.py` | Padrões comportamentais, Sacred Math scoring |
| `/api/v1/benford` | `routers/benford.py` | Anomalias Benford's Law (fraude financeira) |

### Inteligência & IA
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/chat` | `routers/chat.py` | Streaming AI chat, tool calling |
| `/api/v1/chat/tools` | `routers/chat_tools.py` | Ferramentas de chat (12 tools) |
| `/api/v1/chat/models` | `routers/chat_models.py` | Abstração providers (OpenRouter, DashScope, Google) |
| `/api/v1/chat/prompt` | `routers/chat_prompt.py` | System prompts, meta-prompts |

### Domínios Especializados
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/investigation` | `routers/investigation.py` | CRUD investigações, templates |
| `/api/v1/templates` | `routers/templates.py` | 5 domínios: corrupção, lavagem, compliance, jornalismo, criminal |
| `/api/v1/bnmp` | `routers/bnmp.py` | Mandados de prisão BNMP |
| `/api/v1/gazette` | `routers/gazette_monitor.py` | Monitoramento de diários oficiais |

### Ingestão de Dados
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/pcmg` | `routers/pcmg_ingestion.py` | Pipeline PDF/DOCX/vídeo PCMG |
| `/api/v1/nlp` | `routers/nlp.py` | BERTimbau NER PT-BR, fallback spaCy |
| `/api/v1/baseline` | `routers/baseline.py` | Normalização de dados baseline |

### OSINT & Integrações Externas
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/public` | `routers/public.py` | Base dos Dados, Portal Transparência, CNPJ |
| `/api/v1/interop` | `routers/interop.py` | WhatsApp Evolution, Telegram, Shodan, HIBP |

### Administração
| Router | Arquivo | Função |
|--------|---------|--------|
| `/api/v1/analytics` | `routers/analytics.py` | Métricas de dashboard, analytics de uso |
| `/api/v1/meta` | `routers/meta.py` | Metadados do sistema, capability advertisement |
| `/api/v1/agents` | `routers/agents.py` | Registry de agentes |
| `/api/v1/monitor` | `routers/monitor.py` | Health checks, status de serviços |
| `/health` | `routers/health.py` | Endpoint de health para load balancer |

**Middleware:** PII masking (CPF/CNPJ/email) | Rate limiting (60/min anon, 300/min auth) | JWT RS256 | Security headers | Request ID | Input sanitizer

---

## Serviços Backend (30+)

Documentados em `docs/CAPABILITIES_STATUS.md`. Destaques:

| Serviço | Linhas | Função |
|---------|--------|--------|
| `transparency_tools.py` | 1.372 | Portal Transparência, CNPJ, salários |
| `intelligence_provider.py` | 514 | Orquestração LLM: DashScope→OpenRouter→Google→Anthropic |
| `cross_reference_engine.py` | 420 | Jaro-Winkler, 6 níveis de confiança |
| `pattern_detector.py` | ~350 | Sacred Math scoring, Fibonacci/phi |
| `benford_analyzer.py` | 345 | Chi-squared Benford's Law |
| `investigation_templates.py` | 477 | Cypher templates por domínio |
| `bertimbau_ner.py` | 303 | NER PT-BR (BERTimbau + spaCy fallback) |

---

## Frontend — Módulos lib/

Ver `docs/ARCHITECTURE.md` para detalhes. Destaques:

| Módulo | Localização | Função |
|--------|------------|--------|
| `cross-reference-service.ts` | `lib/intelligence/` | Dedup entidades, 6 níveis |
| `ai-router.ts` | `lib/intelligence/` | Multi-provider LLM fallback |
| `document-extraction.ts` | `lib/intelligence/` | OCR + NER no browser |
| `graph-algorithms.ts` | `lib/intelligence/` | PageRank, Louvain, ego networks |
| `criminal-articles.ts` | `lib/legal/` | 100+ artigos CP/Lei Drogas/Maria da Penha |
| `arkham-templates.ts` | `lib/reports/` | Templates de laudo profissional |
| `modus-operandi.ts` | `lib/analysis/` | Comparação de MO entre casos |
| `executive-summary.ts` | `lib/analysis/` | Sumário de caso via IA |

**NOTA:** `apps/web/` é a nova arquitetura (Vercel AI SDK + RxDB offline). `frontend/src/` está sendo migrado gradualmente.

---

## Status por Fase

| Fase | Status | Blockers |
|------|--------|---------|
| **PHASE-1** Foundation | ✅ 95% completo | DEPLOY-REAL (manual) |
| **PHASE-2** Intelligence | 🟡 60% | UI não usa análises avançadas; testes Neo4j pulados |
| **PHASE-3** Scale | 🔴 15% | RLS não enforced; CRDT não integrado; 42/46 ETL ausentes |
| **PHASE-4** Platform | 🔴 0% | Visão futura |

---

## Comandos

```bash
# Frontend (novo)
cd apps/web && npm install && npm run dev   # Porta 3000

# Frontend (legado)
cd frontend && npm install && npm run dev   # Porta 3001

# API
cd api && pip install -e . && uvicorn src.egos_inteligencia.main:app --reload --port 8000

# Stack completa
docker compose -f infra/docker-compose.yml up -d

# Deploy VPS
bash scripts/deploy-hetzner.sh

# Health check
curl https://intelink.ia.br/api/health
```

---

*Sacred Code: 000.111.369.963.1618*
