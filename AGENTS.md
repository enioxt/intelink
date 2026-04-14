# AGENTS.md — EGOS Inteligência (Intelink)

> **VERSION:** 4.0.0 | **UPDATED:** 2026-04-14 (audit completo) | **STATUS:** SSOT CANÔNICO
> **URL:** https://intelink.ia.br | **VPS:** 204.168.217.125
> **ENTRY POINT:** `docs/MASTER_INDEX.md` | **SYNC CHECK:** `npm run sync:check`

---

## Produto

Plataforma standalone de inteligência investigativa sobre dados públicos brasileiros.
Investigadores mapeiam redes criminais em 83.7M+ registros, detectam padrões comportamentais
e geram laudos com citação de fonte.

**Modelo:** Consultoria de implementação + framework licenciável
**Público-alvo:** Delegacias, MPE/MPF, jornalismo investigativo, compliance

---

## Arquitetura Dual-Frontend

```
frontend/ (Next.js — online, produção)        apps/web/ (Next.js — offline-first, RxDB)
      │                                               │
      └──────────────────┬────────────────────────────┘
                         ▼
            api/ (FastAPI Python 3.12)
            27 routers | 90+ endpoints
                         │
              ┌──────────┴──────────┐
         Neo4j 5                 Redis 7
       83.7M+ nós              cache + rate limit
       25M+ arestas
```

**REGRA:** Dois frontends são intencionais e distintos:
- `frontend/` — 12 rotas, 138 componentes, 35,900 LOC, modo online, produção
- `apps/web/` — RxDB offline-first, admin/tenants, OSINT, security (uso de campo)

---

## Backend — 27 Routers, 90+ Endpoints

### Autenticação & Sessão
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/auth` | login, register, /me | JWT HS256 + bcrypt |
| `/api/v1/conversations` | CRUD + PATCH title | Histórico de chat |
| `/api/v1/activity` | feed, stats | Audit trail |

### Busca & Entidades
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/search` | GET /search, GET /search/suggestions | Full-text Neo4j + autocomplete (Lucene wildcard) |
| `/api/v1/entity` | by-id, by-element-id, /exposure, /timeline, /connections | CRUD + enrichment CPF/CNPJ |
| `/api/v1/cross_reference` | /links, /network, /cross-case, /info | Deduplicação Jaro-Winkler 6 níveis |
| `/api/v1/graph` | GET /{entity_id} | Ego networks, path finding |

### Inteligência & IA
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/chat` | POST /chat (streaming) | 20+ tools integradas no LLM |
| `/api/v1/patterns` | GET /{entity_id}, POST /detect, GET list | Padrões comportamentais |
| `/api/v1/benford` | POST /analyze, POST /entity/{id}, GET /info | Benford's Law — fraude financeira |
| `/api/v1/baseline` | GET /{entity_id} | Baseline comparativo de entidade |
| `/api/v1/nlp` | POST /extract-entities, POST /batch-extract, GET /info | BERTimbau NER PT-BR + spaCy |

### Investigações
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/investigation` | CRUD + entities, annotations, tags, share, export (PDF/MD/HTML) | Gestão completa de casos |
| `/api/v1/templates` | list, get, apply, categories/list | 5 domínios: corrupção, lavagem, criminal, compliance, jornalismo |
| `/api/v1/bnmp` | search, stats, /person/{cpf}, ingest | Mandados de prisão BNMP |

### Monitoramento & OSINT
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/gazette_monitor` | scan, patterns | Diários oficiais (Querido Diário) |
| `/api/v1/monitor` | sanctions/recent, report/{municipio} | Feeds de sanções |
| `/api/v1/interop` | entity, network, sanctions, pep (por CNPJ/query) | Infoseg, PEP, SICONV |
| `/api/v1/public` | meta, patterns/company, graph/company | APIs públicas sem auth |

### Ingestão & ETL
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/pcmg` | upload/document, upload/video, upload/batch, job/{id}, search, stats, info | Pipeline PDF/DOCX/vídeo PCMG |

### Admin & Infra
| Router | Endpoints | Função |
|--------|-----------|--------|
| `/api/v1/meta` | stats, sources, cache-stats, DELETE /cache, security, etl-progress | Sistema e Neo4j |
| `/api/v1/analytics` | POST /pageview, GET /summary | Métricas |
| `/api/v1/agents` | list, GET /{agent_id} | Registry de agentes |
| `/health` | /health, /ready, /live | Probes para load balancer |

**Middleware:** PII masking (CPF/CNPJ/email) | Rate limit (60/min anon, 300/min auth) | JWT HS256 | Security headers

---

## Chat — 20+ Ferramentas Integradas

O chat (POST /chat) tem tool-calling com 20+ ferramentas de OSINT/transparência:
`contratos`, `licitacoes`, `emendas`, `sancoes`, `servidores`, `transferencias`, `viagens`,
`votacoes`, `gazettes`, `ceap`, `processos`, `pep_city`, `cnpj_info`, `oab_advogado`,
`lista_suja`, `bnmp_mandados`, `procurados_lookup`, `pncp_licitacoes`, `web_search`

---

## Frontend — 12 Rotas, 138 Componentes

### Rotas (todas funcionais, conectadas ao backend)
| Rota | LOC | Função |
|------|-----|--------|
| `/intelink` | 152 | Dashboard + health + stats |
| `/intelink/analysis` | 236 | Graph stats, community detection |
| `/intelink/docs` | 346 | Gestão de documentos |
| `/intelink/docs/search` | 280 | Busca full-text em documentos |
| `/intelink/investigations` | 248 | Lista de investigações |
| `/intelink/investigations/new` | 299 | Wizard de criação |
| `/intelink/jobs` | 475 | Monitoramento de jobs (5s refresh) |
| `/intelink/leaderboard` | 249 | Rankings de usuários/entidades |
| `/intelink/links/review` | 164 | Revisão de links preditos |
| `/intelink/settings` | 520 | Preferências + segurança |
| `/intelink/upload` | 37 | Upload de arquivos |
| `/intelink/vinculos` | 415 | Gestão de vínculos/conexões |

### Componentes Maiores (>500 LOC)
`DocumentUploadModal` (1810), `EntityDetailModal` (832), `IntelinkChatbot` (723),
`GlobalSearch` (710, Cmd+K, CPF/placa/nome/apelido), `SetupWizard` (693),
`NarrativeSummary` (678), `EntityResolverTab` (618), `JuristaTab` (563),
`JourneyReplayModal` (520), `EvidenceDetailModal` (519), `EnhancedGraph` (519)

### Lib Intelligence (34 módulos, 280KB+ de lógica)
`ai-router.ts` (multi-provider LLM) | `cross-reference-service.ts` (entity linking) |
`graph-algorithms.ts` (PageRank, Louvain) | `entity-matcher.ts` (fuzzy matching) |
`document-extraction.ts` (OCR+NER browser) | `chat-memory.ts` | `rag-context-retriever.ts`

---

## apps/web — App Offline-First (separado do /frontend)

**Páginas ÚNICAS** não existentes em /frontend:
- `/admin/tenants` — Gestão multi-tenant (**necessário para FRONT-0 — AUTH-MULTITENANT**)
- `/osint` — Interface OSINT dedicada
- `/security` — Audit de segurança

**Stack offline:**
- `lib/db/rxdb.ts` — IndexedDB local para trabalho sem internet
- `lib/db/sync.ts` — Sync CRDT quando reconecta
- `lib/db/encryption.ts` — AES-256-GCM com chave derivada de MASP

---

## ETL Pipelines

| Pipeline | Dados | Status |
|----------|-------|--------|
| 28 pipelines br-acc | 83.7M nós (CNPJ, CPF, contratos, etc.) | ✅ Todos rodaram 2026-04-14 |
| bnmp | Mandados de prisão | ✅ Ingestão via API |
| pcmg | PDF/DOCX/vídeo policiais | ✅ Produção |
| gazette_monitor | Diários oficiais | ✅ Via Querido Diário |
| transparencia | Contratos, PEP, CEAF, CEIS, CNEP | ✅ Manual (VPS IP bloqueado no CGU) |

---

## Integrações Externas

| Serviço | URL | Uso |
|---------|-----|-----|
| OpenRouter | openrouter.ai/api/v1 | LLM principal (Gemini Flash) |
| DashScope (Alibaba) | dashscope-intl.aliyuncs.com | Qwen fallback |
| Portal da Transparência | portaldatransparencia.gov.br | Contratos, PEP, salários |
| Querido Diário | api.queridodiario.ok.org.br | Diários oficiais |
| SICONV | transferegov.sistema.gov.br | Transferências federais |
| Telegram Bot API | api.telegram.org | Notificações |

---

## Backend sem UI — Backlog de Frontend

| Endpoint | Prioridade | Observação |
|----------|-----------|------------|
| entity: /exposure, /timeline, /connections | Alta | Chamadas dinâmicas existem mas sem página dedicada |
| templates: /categories/list | Alta | SetupWizard existe mas sem navegação por categoria |
| nlp: /extract-entities | Alta | Backend NER pronto, falta botão na UI |
| patterns: /detect | Média | Componente existe mas sem input de texto livre |
| meta: etl-progress | Média | Monitoramento ETL sem painel |
| baseline: /{entity_id} | Média | Análise comparativa sem UI |
| monitor: sanctions/recent | Baixa | Feed de sanções sem widget |
| interop: sanctions, pep | Baixa | Endpoints chamados via chat tools, não diretamente |

---

## Comandos

```bash
npm run sync:check          # drift backend↔frontend (42.7% cobertura estática atual)
npm run sync:ci             # exit 1 se drift > 20%

cd frontend && npm run dev  # porta 3000 (produção)
cd apps/web && npm run dev  # porta 3000 (offline-first)
cd api && uvicorn src.egos_inteligencia.main:app --reload --port 8000
docker compose up -d        # stack completa

bash scripts/deploy-hetzner.sh
curl https://intelink.ia.br/health
```

---

*Sacred Code: 000.111.369.963.1618*
