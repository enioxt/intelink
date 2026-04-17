# EGOS-KERNEL-PROPAGATED: 2026-04-17
<!-- AUTO-INJECTED by disseminate-propagator.ts — DO NOT EDIT THIS BLOCK MANUALLY -->
<!-- Kernel commit: a6d1ad7 | 1 rule section(s) changed -->
<!-- Source of rules: egos/AGENTS.md (canonical). Kernel-only authoritative copy: ~/.claude/CLAUDE.md -->
<!-- Re-run: bun ~/egos/scripts/disseminate-propagator.ts --all to update -->
<!-- ~ CAPABILITY_REGISTRY.md → ### Existing MCPs Already Covering Needs (DO NOT REBUILD) (2 lines) -->

> ⚠️ **PROPAGATED FROM KERNEL** — Edits to this block are overwritten by next `bun governance:sync:exec`.
> Edit kernel `egos/AGENTS.md` section between `<!-- PROPAGATE-RULES-BEGIN -->` and `<!-- PROPAGATE-RULES-END -->` instead.

<!-- === BEGIN KERNEL RULES BODY (auto-injected from egos/AGENTS.md) === -->

## 📋 Canonical Rules (authoritative across ALL IDEs)

This section is the single source of truth for agent rules. Claude Code reads this. Windsurf reads this. Cursor reads this. Codex reads this. GitHub Copilot reads this. When `~/.claude/CLAUDE.md`, `.windsurfrules`, or repo-level `CLAUDE.md` diverge from this file, **AGENTS.md wins**.

### R0 — Critical non-negotiables (irreversible damage prevention)
1. **NEVER `git push --force` to main/master/production** — use `bash scripts/safe-push.sh` (INC-001)
2. **NEVER log/echo/commit secrets** — no `.env`, no hardcoded keys
3. **NEVER publish externally without human approval** — articles, X posts, outreach
4. **NEVER `git add -A` in background agents** — always `git add <specific-file>` (INC-002)
5. **COMMIT TASKS.md immediately** after edit (parallel agents lose uncommitted state)

### R1 — Verification before assertion
1. **Code claims** (function exists, caller count, import usage, dead code, route mapping) → `codebase-memory-mcp` is PRIMARY. Read/Grep is fallback for docs/config/markdown only. If `cbm-code-discovery-gate` hook fires, load MCP tools via ToolSearch; never bypass.
2. **External LLM paste** (ChatGPT/Gemini/Grok/Kimi/Perplexity output) → every named feature, commit, file, version = UNVERIFIED CLAIM. Classify REAL/CONCEPT/PHANTOM via `git log --grep` + `Glob`. High-density buzzword lists (8+ capitalized "systems") = phantom signal (INC-005).
3. **Subagent audits** (Agent/Explore/Plan outputs) = SYNTHESIS, not evidence. Before citing in commit/SSOT edit: re-verify top 3 structural claims via `codebase-memory-mcp`. Absolute audit claims ("X doesn't exist", "Y is skeleton") without file:line anchor = PHANTOM until verified (INC-006).
4. **When spawning Agent/Explore/Plan** → prompt MUST include: "return evidence tuples `{claim, evidence_path, evidence_line}`; prefix unanchored with `UNVERIFIED:`".

### R2 — SSOT integrity
1. **Scored SSOT tables** (columns: `Compliance`/`Score`/`%`/`Coverage`/`Maturity`/`Readiness`/`Grade`) MUST be wrapped in `<!-- AUTO-GEN-BEGIN:<agent> -->` / `<!-- AUTO-GEN-END -->` populated by a compliance agent, OR every row MUST carry `VERIFIED_AT` + `method` + `evidence` (file:line or cmd output SHA). Handwritten scored tables are PHANTOM VECTORS. Pre-commit blocks after MSSOT-002 ships (INC-006).
2. **Use-case scoped scoring** — before applying a uniform rubric across products, declare each product's primary use case. Mark rubric rows REQUIRED/OPTIONAL/N/A per use case. `N/A (use case: X)` is valid, not a fail. Cannot use single score column across heterogeneous use cases (INC-006).
3. **ONE SSOT per domain** — see "SSOT Map" section below. New content goes to existing SSOT, never new file. Prohibited: `docs/business/`, `docs/sales/`, `docs/notes/`, `docs/tmp/`, timestamped docs, `AUDIT*.md`, `REPORT*.md`, `DIAGNOSTIC*.md` (except in `_archived/`).
4. **Evidence-first** — every claim in durable docs (README, SSOT, article) needs: automated test exercising it, metric confirming the number, entry in manifest (`.egos-manifest.yaml` or `CAPABILITY_REGISTRY.md`), or dashboard tile. Unproven claims marked `unverified:`.

### R3 — Edit safety
1. Read before Edit (at least the relevant section). Confirm exact string. Re-read after edit.
2. Max 3 edits per file before verification read.
3. Rename/signature change → grep all callers first.
4. Large files (>300 LOC): remove dead code first (separate commit), break into phases (max 5 files).
5. **Simplicity First (Karpathy):** minimum code that solves. No speculative abstractions. Wait for 3rd repetition before extracting. Test: "Would a senior engineer call this overcomplicated?"

### R4 — Git safety
1. Force-push forbidden on main/master/production/prod/release/hotfix. Exception: `EGOS_ALLOW_FORCE_PUSH=1` in shell only.
2. Always `bash scripts/safe-push.sh <branch>` (fetch+rebase+retry).
3. `.husky/pre-push` blocks non-FF. Answer = `git fetch && git rebase`, never `--no-verify`.

### R5 — Context & swarm
1. Use Agent tool when: 5+ files to read, >3 Glob/Grep rounds expected, research+implement needed. Don't spawn for single-file edits, git ops, known answers.
2. Independent tasks → all agents in ONE message. Dependent → sequential.
3. After 10+ turns or compaction: re-read TASKS.md + current file.
4. Cost control: 3 retries fail on same error → STOP, flag `[BLOCKER]`.

### R6 — Incident-driven (always load when relevant)
| Incident | Rule |
|---|---|
| INC-001 | Force-push protocol — `bash scripts/safe-push.sh` |
| INC-002 | Git swarm — `git add <specific>`, commit TASKS.md first |
| INC-003 | TASKS.md — verify artifact before adding, mark `[x]` same commit |
| INC-004 | Supabase Realtime quota — rate limiter + retention |
| INC-005 | External LLM narrative — classify REAL/CONCEPT/PHANTOM |
| INC-006 | Subagent phantoms + scored SSOT tables — see R1.3, R2.1-2 |

Full postmortems: `docs/INCIDENTS/INC-XXX-*.md`. Index: `docs/INCIDENTS/INDEX.md`.

<!-- === END KERNEL RULES BODY === -->

---

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

## Integrações Externas

OpenRouter (LLM principal) · DashScope/Qwen (fallback) · Portal da Transparência · Querido Diário · SICONV · Telegram Bot API

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
