# EGOS Inteligência — Architecture

> **SSOT:** `docs/ARCHITECTURE.md` | Max 150 lines | Updated: 2026-04-09

---

## System Intent

Open intelligence platform for Brazilian public data. Investigators map entity relationships across 77M+ public records, detect behavioral patterns, generate sourced reports, and collaborate without exposing real PII externally.

**Design axioms:**
- PII never leaves the system unmasked
- Every entity access is audit-logged (append-only)
- Reports are non-accusatory: sourced, confidence-leveled, gaps documented
- Offline-first: field investigators may have no internet (CRDT sync planned PHASE-3)

---

## Data Flow

```
[Investigator] → [Frontend Next.js]
                      │
                      ├─ Auth: POST /api/v1/auth/login
                      │         └─ JWT RS256 + refresh cookie (HttpOnly)
                      │
                      ├─ Search: POST /api/v1/search
                      │         └─ FastAPI → Neo4j full-text + graph query
                      │                   → PII masked before response
                      │
                      ├─ AI Chat: POST /api/v1/chat
                      │         └─ FastAPI → OpenRouter (Gemini Flash)
                      │                   → context: Neo4j ego network
                      │                   → ATRiAN ethical validation
                      │                   → response streamed + PII masked
                      │
                      ├─ NLP: POST /api/v1/nlp/extract-entities
                      │         └─ BERTimbau NER (PT-BR) → entity list
                      │
                      └─ Reports: POST /api/v1/reports/generate
                                └─ Arkham templates → PDF/MD/HTML
                                └─ Confidence levels + source citations
```

---

## Security Levels

| Layer | Mechanism | Status |
|-------|-----------|--------|
| **Transport** | TLS 1.3 (Caddy auto-cert) | PHASE-1 |
| **Auth** | JWT RS256 + bcrypt 14r + HttpOnly refresh | PHASE-1 |
| **Identity** | MASP (police ID) + 2FA Telegram | PHASE-2 |
| **PII masking** | Middleware: CPF/CNPJ/email/phone → `***` in all API responses | PHASE-1 |
| **Audit log** | Append-only PostgreSQL table, Merkle hash chain | PHASE-2 |
| **Data isolation** | RLS per tenant_id (delegacia/unit) | PHASE-3 |
| **Offline encryption** | RxDB + AES-256-GCM, PBKDF2 key from MASP+password | PHASE-3 |
| **Secret scanning** | gitleaks on every commit + CI | PHASE-1 |

---

## Stack

```
frontend/          Next.js 15 + TypeScript + Tailwind v4
  lib/intelligence/   cross-reference, entity matching, AI router
  lib/analysis/       modus operandi, executive summary, Benford
  lib/detectors/      anomaly detection (financial, behavioral)
  lib/auth/           JWT edge-compatible, RBAC, session
  lib/legal/          Brazilian criminal articles DB

api/               Python 3.12 + FastAPI
  routers/           20+ route modules
  services/nlp/      BERTimbau NER (PT-BR entity extraction)
  services/patterns/ criminal pattern detection (Sacred Math scoring)
  middleware/        PII masking, rate limiting, security headers

infra/
  Neo4j 5.x          77M+ nodes, 25M+ edges (public data graph)
  Redis 7            embedding cache, session store, rate limit
  Caddy 2            TLS termination, reverse proxy
  Docker Compose     single-command local stack
```

---

## Key Modules (ported 2026-04-09)

| Module | Location | Purpose |
|--------|----------|---------|
| `cross-reference-service.ts` | `lib/intelligence/` | Jaro-Winkler entity dedup, 6 confidence levels |
| `benford-anomaly.ts` | `lib/detectors/` | Financial fraud via Benford's Law + chi-squared |
| `modus-operandi.ts` | `lib/analysis/` | MO comparison between cases, serial detection |
| `criminal-articles.ts` | `lib/legal/` | CP, Lei Drogas, Maria da Penha keyword DB |
| `arkham-templates.ts` | `lib/reports/` | Professional intelligence report templates |
| `bertimbau_ner.py` | `api/services/nlp/` | Portuguese NER (BERTimbau + spaCy fallback) |
| `pattern_detector.py` | `api/services/patterns/` | Behavioral patterns + phi/fibonacci scoring |
| `investigation_templates.py` | `api/services/` | Neo4j Cypher templates (corruption, laundering, etc.) |

---

## Test Strategy

```
api/tests/
  unit/              pytest — isolated service logic
  integration/       pytest — API endpoints with test DB
  fixtures/          synthetic_investigations/ (5 realistic cases, zero real PII)

frontend/tests/
  unit/              vitest — lib functions (cross-reference, Benford, etc.)
  e2e/               Playwright — critical user flows (login, search, report gen)
```

**Rule:** synthetic data only. Never commit real investigation data. See `api/tests/fixtures/synthetic_investigations/`.
