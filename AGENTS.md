# EGOS-KERNEL-PROPAGATED: 2026-04-24
<!-- AUTO-INJECTED by disseminate-propagator.ts — DO NOT EDIT THIS BLOCK MANUALLY -->
<!-- Kernel commit: 2918866 | 10 rule section(s) changed -->
<!-- Source of rules: egos/AGENTS.md (canonical). Kernel-only authoritative copy: ~/.claude/CLAUDE.md -->
<!-- Re-run: bun ~/egos/scripts/disseminate-propagator.ts --all to update -->
<!-- ~ .windsurfrules (10 lines) -->
<!-- ~ .windsurfrules → ## PROTECTED SURFACES (39 lines) -->
<!-- ~ CLAUDE.md → # CLAUDE.md — EGOS Kernel Context (5 lines) -->
<!-- ~ CLAUDE.md → ## 🌊 OPUS MODE — Modo operacional padrão (23 lines) -->
<!-- ~ CLAUDE.md → ## Quick Context (35 lines) -->
<!-- ~ CLAUDE.md → ## Arquitetura (7 lines) -->
<!-- ~ CLAUDE.md → ## Convenções (18 lines) -->
<!-- ~ CLAUDE.md → ## SINGLE PURSUIT (2026-04-12 → 2026-05-12) (7 lines) -->
<!-- ~ CLAUDE.md → ## SSOT Map (18 lines) -->
<!-- ~ CLAUDE.md → ## Limites de arquivo (11 lines) -->

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
5. **Session checkpoint:** when pre-commit emits `[CHECKPOINT-NEEDED]` (turns≥10/commits≥15/elapsed≥90min), invoke `/checkpoint` (Hard Reset). Use `bun scripts/session-init.ts --status` to check. Never ignore [CHECKPOINT-NEEDED].

### R6 — Incident-driven (always load when relevant)
| Incident | Rule |
|---|---|
| INC-001 | Force-push protocol — `bash scripts/safe-push.sh` |
| INC-002 | Git swarm — `git add <specific>`, commit TASKS.md first |
| INC-003 | TASKS.md — verify artifact before adding, mark `[x]` same commit |
| INC-004 | Supabase Realtime quota — rate limiter + retention |
| INC-005 | External LLM narrative — classify REAL/CONCEPT/PHANTOM |
| INC-006 | Subagent phantoms + scored SSOT tables — see R1.3, R2.1-2 |
| INC-007 | API key exposure via `|| fallback` pattern — never commit secrets |
| INC-008 | Phantom compliance stubs — see R7 below |

Full postmortems: `docs/INCIDENTS/INC-XXX-*.md`. Index: `docs/INCIDENTS/INDEX.md`.

### R7 — Behavioral eval required for claimed capabilities (INC-008, 2026-04-22)

**Rule:** Any capability a system claims (in manifest, README, docs, CAPABILITY_REGISTRY, or `/api/*/discover` response) MUST have a **behavioral eval** proving it at runtime.

- **"Behavioral"** = simulates real usage (full input→output pipeline), not shape assertions on pure functions.
- Unit test of `detectPII()` returning correct findings is **NOT** enough — it doesn't prove `detectPII()` is being called in the code path that claims PII masking.
- Golden case that POSTs a chat message containing a CPF and asserts the response has no unmasked CPF **IS** behavioral.

**Why (INC-008, 2026-04-22):** Intelink's `lib/shared.ts` exported stub implementations of `scanForPII`/`sanitizeText`/`createAtrianValidator` that returned `[]`/unchanged/always-passed. Route imported these expecting real work. Manifest claimed `pii-masking` + `atrian-validation`. Type checker, linter, 151 unit tests all green. For weeks/months, PII leaked in every production response. Golden eval's first live run caught it in 1 day.

**How to apply:**
1. **New capability in manifest/README → ≥3 golden cases before merge.** If the capability is `X`, at least one case must be designed so that if the underlying code were a stub, the case would fail.
2. **Stubs in compliance/safety code paths are FORBIDDEN in main.** Use `throw new Error('NOT IMPLEMENTED — see TODO-XXX')` during refactors so CI fails loudly, not a silent no-op returning `[]`/`true`/unchanged input.
3. **`try { compliance() } catch { /* non-fatal */ }` patterns MUST log + alert.** Silent swallow is how stubs hide.
4. **Weekly eval against production.** Pass-rate drop = something regressed silently. See `@egos/eval-runner` + `intelink/tests/eval/` for reference.
5. **Canonical eval harness:** `packages/eval-runner/` (extracted from 852's battle-tested runner + trajectory + judge-LLM). Adopt it, don't reinvent. promptfoo layers on top for YAML cases + redteam (Phase B of EVAL track).

**Pattern to detect in code review:**
- File named `*.shared.ts`, `*.stubs.ts`, `*-placeholder.ts` exporting functions with non-trivial signatures returning trivial defaults
- Capability listed in manifest with no corresponding `tests/eval/golden/*.ts` case
- Green CI + green typecheck + green unit tests but no end-to-end eval

Full postmortem: `docs/INCIDENTS/INC-008-phantom-compliance-stubs.md`.
Canonical eval strategy: `docs/knowledge/AI_EVAL_STRATEGY.md` (being written — see EVAL-X2).

<!-- === END KERNEL RULES BODY === -->

---

# AGENTS.md — EGOS Inteligência

> **VERSION:** 1.0.0 | **CREATED:** 2026-04-01 | **MERGE STATUS:** Ativo
> **TYPE:** Intelligence Platform (Merge: Intelink + BR-ACC)
> **URL:** https://inteligencia.egos.ia.br
> **KERNEL SSOT:** `/home/enio/egos/docs/SSOT_REGISTRY.md`

---

<!-- llmrefs:start -->

## LLM Reference Signature

- **Role:** workspace map + governance entrypoint
- **Summary:** Intelink — plataforma policial de investigação criminal. **CANONICAL:** `/home/enio/intelink/` (Next.js 16, standalone repo). Backend Python FastAPI em `/home/enio/egos-lab/apps/intelink-api/`. Neo4j local: ~9.781 nós. VPS Neo4j: 83.7M nós (dados públicos). Arquivo legacy: `/home/enio/_archived/intelink-legacy-2026-04-18/`.
- **Read next:**
  - `docs/plans/INTELINK_BRACC_MERGE.md` — Plano completo do merge
  - `TASKS.md` — Tasks ativas do merge
  - `.windsurfrules` — Regras do agente
  - `docs/legal/` — Documentação legal (ETHICS, LGPD, etc.)

<!-- llmrefs:end -->

---

## 🎯 Visão do Produto

EGOS Inteligência (Intelink) é uma plataforma de **inteligência policial criminal** para DHPP/delegacias:

- **Investigação:** Busca por CPF/nome, vínculos entre pessoas, ocorrências REDS
- **Dados locais:** Neo4j local com Person, Occurrence, Vehicle (~9.781 nós)
- **Dados públicos:** Neo4j VPS br-acc (83.7M nós — CNPJ, PEPs, Sanções)
- **Interface:** UI dark (azul/cyan), grafos 2D/3D, relatórios PDF, chat IA

**Canonical:** `/home/enio/intelink/` (este repo — standalone, Next.js 16). Arquivo legacy em `/home/enio/_archived/intelink-legacy-2026-04-18/` (somente leitura). Ver `docs/MIGRATION_HISTORY.md`.

---

## 🏗️ Arquitetura

```
egos-inteligencia/
├── apps/web/                    # Next.js 15 (Frontend unificado)
│   ├── app/
│   │   ├── chat/               # AI Chat com contexto Neo4j
│   │   ├── search/             # Quantum Search (Neo4j + Supabase)
│   │   ├── entity/             # Páginas de entidade (CNPJ, PEP)
│   │   ├── network/            # Visualização de grafos
│   │   └── investigation/      # Gestão de casos (Intelink)
│   ├── components/
│   │   ├── chat/               # UI Chat (do Intelink)
│   │   ├── search/             # UI Search (do Intelink)
│   │   ├── entity/             # Cards CNPJ/PEP (novo)
│   │   └── network/            # Visualização grafo (novo)
│   └── lib/
│       ├── neo4j/              # Client Neo4j (adapter BR-ACC)
│       ├── ai/                 # AI Router (do Intelink)
│       ├── search/             # Quantum Search (adaptado)
│       └── security/           # RBAC, audit (do Intelink)
│
├── api/                         # FastAPI (Backend Python do BR-ACC)
│   └── src/egos_inteligencia/
│       ├── routers/
│       │   ├── chat.py         # Chat endpoints (merge)
│       │   ├── entities.py     # CNPJ, PEP, Sanctions
│       │   ├── search.py       # Neo4j search
│       │   └── graph.py        # Graph traversal
│       └── services/
│           └── neo4j_service.py # Neo4j client
│
├── etl/                         # Pipelines Python (do BR-ACC)
│   ├── scripts/                # 40+ ETLs
│   └── src/etl/
│       └── base.py             # Base ETL class
│
├── neo4j/                       # Schema e queries
│   ├── schema/
│   └── queries/
│
├── infra/                       # Docker, Caddy, scripts
│   └── docker-compose.yml      # Neo4j + API + Next.js
│
└── docs/legal/                  # Documentação legal (BR-ACC)
    ├── ETHICS.md
    ├── LGPD.md
    ├── PRIVACY.md
    ├── TERMS.md
    ├── DISCLAIMER.md
    ├── SECURITY.md
    └── ABUSE_RESPONSE.md
```

---

## 💾 Dados (Neo4j)

| Dataset | Volume | Status |
|---------|--------|--------|
| CNPJ Base | 66 milhões | 🟢 Carregado |
| QSA Sócios | 17 milhões | 🟢 Carregado |
| PEPs | 120 mil | 🟢 Carregado |
| Sanções (CEIS+CNEP) | 23 mil | 🟢 Carregado |
| Global Matches | 7 mil | 🟢 Carregado |

**Infraestrutura:** Neo4j 5.x @ Contabo VPS (204.168.217.125)

---

## 🛠️ Tech Stack

| Layer | Tecnologia | Origem |
|-------|------------|--------|
| **Frontend** | Next.js 16.1.5 (Turbopack), React 19, TailwindCSS | /home/enio/intelink/ |
| **Backend API** | Python 3.12, FastAPI, uvicorn | BR-ACC |
| **Database** | Neo4j 5.x (grafo) | BR-ACC |
| **Cache/Auth** | Supabase PostgreSQL | Intelink |
| **AI/LLM** | OpenRouter (Gemini Flash) | Ambos |
| **Deploy** | Docker Compose @ Contabo | BR-ACC |

---

## 📋 Comandos

```bash
# Desenvolvimento Frontend (canônico)
cd /home/enio/intelink && bun dev   # Porta 3009 (standalone repo)

# Desenvolvimento API
cd api && uv run uvicorn src.egos_inteligencia.main:app --reload --port 8000

# ETL
python etl/scripts/download_ceis.py

# Deploy
docker compose -f infra/docker-compose.yml up -d

# Testes
npm test                             # Frontend
cd api && uv run pytest -x          # Backend
```

---

## 🔒 Governança Legal

Toda a governança legal foi herdada do BR-ACC (mais completa):

- **ETHICS.md** — Uso proibido, linguagem não-acusatória
- **LGPD.md** — Conformidade com LGPD brasileira
- **PRIVACY.md** — Política de privacidade
- **TERMS.md** — Termos de serviço
- **DISCLAIMER.md** — Isenção de responsabilidade
- **SECURITY.md** — Política de segurança
- **ABUSE_RESPONSE.md** — Resposta a abuso

---

## 📁 SSOT Files

| Arquivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Este arquivo — mapa do sistema |
| `TASKS.md` | Todas as tasks ativas (merge + features) |
| `.windsurfrules` | Regras do agente |
| `docs/plans/INTELINK_BRACC_MERGE.md` | Plano detalhado do merge |
| `docs/legal/` | Documentação legal (SSOT) |

---

## 🚦 Status do Merge

| Componente | Origem | Destino | Status |
|------------|--------|---------|--------|
| Docs legais | BR-ACC | `docs/legal/` | ✅ MOVED |
| Neo4j adapter | BR-ACC | `apps/web/lib/neo4j/` | ✅ CREATED |
| API Python base | BR-ACC | `api/` | 🟡 COPIED, NOT VALIDATED |
| ETLs | BR-ACC | `etl/` | ✅ COPIED |
| Frontend base | Intelink | `apps/web/` | ✅ COPIED |
| Chat AI adapter | Intelink + BR-ACC | `apps/web/lib/ai/` | 🟡 CREATED, NOT WIRED |
| Entity/Search/Network pages | Novo sobre base Intelink | `apps/web/app/` | 🟡 SCAFFOLDED |

**Progresso:** foundation concluída; adaptação em andamento com gaps de validação e wiring entre frontend e API Python.

---

## ⚠️ Zonas Protegidas (Frozen)

> **NÃO EDITAR** sem aprovação explícita:
> - `docs/legal/` — Documentação legal (SSOT)
> - Neo4j schema em produção
> - ETL pipelines ativos em produção

---

## 🌐 URLs

| Ambiente | URL |
|----------|-----|
| Produção | https://inteligencia.egos.ia.br |
| API | https://inteligencia.egos.ia.br/api/v1 |
| Neo4j Browser | http://204.168.217.125:7474 |

---

*Documento criado durante merge Intelink + BR-ACC — 2026-04-01*
*Sacred Code: 000.111.369.963.1618*
