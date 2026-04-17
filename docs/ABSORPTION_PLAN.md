# egos-inteligencia Absorption Plan
> **SSOT:** `docs/ABSORPTION_PLAN.md`
> **Status:** PLANNING
> **Updated:** 2026-04-17
> **Approved:** EI-ABSORB-001

---

## Context

`egos-inteligencia` (Intelink v3) absorbs capabilities from two source repos:

| Source | Status | Migration target |
|--------|--------|-----------------|
| `br-acc` | ABSORBING — 83.7M Neo4j nodes, FastAPI 18 routers | Neo4j layer + ETL pipelines |
| `policia` | ABSORBING — Groq transcription, CS→DOCX, investigation templates | Investigation module |

**Rule:** Never rename `br-acc` back. Never delete until all data+routes are verified live in egos-inteligencia.

---

## Migration Matrix

### Layer 1: Data (Neo4j)

| Component | Source | Target | Status | Gate |
|-----------|--------|--------|--------|------|
| 83.7M entity nodes | br-acc Neo4j | egos-inteligencia Neo4j | NOT STARTED | data parity test |
| 18 OSINT routers | br-acc FastAPI | egos-inteligencia API | PARTIAL (25 routers merged) | endpoint parity |
| Graph schema (labels/rels) | br-acc | `docs/DATABASE_SCHEMA.md` | PARTIAL | schema audit |
| Indexes + constraints | br-acc | egos-inteligencia | NOT STARTED | perf benchmark |

### Layer 2: ETL Pipelines

| Pipeline | Source | Status | Notes |
|----------|--------|--------|-------|
| CPF/CNPJ enrichment | br-acc | NOT STARTED | 46 public sources mapped |
| Receita Federal base | br-acc | NOT STARTED | 42M records |
| Cadastro Nacional PF | br-acc | NOT STARTED | 220M records |
| Relações societárias | br-acc | NOT STARTED | graph edges |
| OSINT scrapers (78 sources) | br-acc | PARTIAL | `docs/osint/OSINT_SOURCES_CURATED.md` |

### Layer 3: Investigation Module (from policia)

| Component | Source | Target | Status |
|-----------|--------|--------|--------|
| Groq transcription pipeline | policia | `api/src/modules/transcription/` | NOT STARTED |
| CS→DOCX generator | policia | `api/src/modules/reports/` | NOT STARTED |
| Investigation templates | policia | `api/src/modules/investigation/` | EXISTS (template) |
| OVM workflows | policia | `api/src/modules/ocr/` | NOT STARTED |
| Bertimbau NER PT-BR | egos-inteligencia | live | ✅ |
| spaCy NER PT-BR | egos-inteligencia | live | ✅ |
| cross_reference_engine.py | egos-inteligencia | live | ✅ |

### Layer 4: API Routing

| Route group | Source | egos-inteligencia equivalent | Gap |
|-------------|--------|------------------------------|-----|
| `/persons/*` | br-acc (18) | `/api/v1/persons/*` (partial) | expand coverage |
| `/companies/*` | br-acc | `/api/v1/companies/*` | expand coverage |
| `/relationships/*` | br-acc | `/api/v1/graph/*` | rename + merge |
| `/transcription/*` | policia | NOT PRESENT | add module |
| `/reports/*` | policia | NOT PRESENT | add module |
| `/chatbot-manifest` | egos-inteligencia | ✅ LIVE (`/api/v1/_internal/chatbot-manifest`) | — |

---

## Absorption Phases

### Phase 1 — Schema + Data Parity (P0, current sprint)
- [ ] EI-ABSORB-002: Audit br-acc Neo4j schema vs egos-inteligencia — produce diff
- [ ] EI-ABSORB-003: Decision: mirror Neo4j (same VPS) vs merge into single instance
- [ ] EI-ABSORB-004: Document br-acc shim pattern (abstraction layer to decouple before cut-over)
- [ ] EI-ABSORB-005: Enumerate policia capabilities worth absorbing (Groq transcription priority)

### Phase 2 — Route Migration (next sprint)
- [ ] Migrate top 5 br-acc routes to egos-inteligencia with parity tests
- [ ] Add `/transcription` module from policia (Groq API wiring)
- [ ] Update `docs/API_REFERENCE.md` with merged endpoint list

### Phase 3 — Data Migration (post-validation)
- [ ] ETL re-run or incremental sync into merged Neo4j
- [ ] Verify 83.7M node count in target
- [ ] Run cross-reference engine against merged graph

### Phase 4 — Decommission
- [ ] br-acc: read-only archive after data parity confirmed
- [ ] policia: archive after investigation module live in egos-inteligencia
- [ ] Update REPO_MAP.md + MEMORY.md classification

---

## Decision Needed

| Decision | Options | Owner | Deadline |
|----------|---------|-------|----------|
| Neo4j merge strategy | (A) same instance, (B) separate + federation | Enio | before Phase 2 |
| Transcription module | (A) port policia code, (B) rewrite against Groq SDK | EI team | before Phase 2 |
| br-acc decommission date | depends on data parity | Enio | after Phase 3 |

---

## Dependencies

- VPS Hetzner: both br-acc + egos-inteligencia run on same VPS (204.168.217.125)
- Neo4j instance: confirm if separate containers or shared (`docker ps` on VPS)
- Groq API key: present in egos-inteligencia `.env`? (check before Phase 2)

---

## Verification Gate (before each phase cutover)

```bash
# Phase 1 gate
bun run typecheck               # 0 errors
bun test                        # 0 failures
# query node count in target
ssh vps "cypher-shell -u neo4j 'MATCH (n) RETURN count(n)'"
```

---

*EI-ABSORB-001 — created 2026-04-17*
