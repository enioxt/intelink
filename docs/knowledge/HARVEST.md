# HARVEST.md — EGOS Inteligência Learnings

> **Sacred Code:** 000.111.369.963.1618  
> **Updated:** 2026-04-01

---

## Session 2026-04-01 — Integration & /diag

### What Worked
- **Rapid API mapping:** 63 endpoints documented in 1 session using grep + read
- **Hook pattern:** React Query + TypeScript hooks scales well (12 hooks created)
- **Build discipline:** TypeScript strict caught 50+ errors pre-build
- **Chat IA page:** Simple UI with suggestions works for transparency tools

### What Didn't Work
- **Document explosion:** Created 12 docs when EGOS rules allow 3-4 max
- **No tests:** 0% coverage after 2h of integration work
- **Neo4j disconnect:** 77M nodes exist but not connected to new system
- **No pre-commit:** Documentation drift not caught automatically

### Patterns Discovered

#### Report SSOT v2.0.0 Compliance
```
Required footer format:
---
Gerado por: [Model] via EGOS Inteligência
Data: DD/MM/YYYY HH:MM UTC-3
Report ID: REPORT-YYYY-NNN
Confiança: alta|media|baixa
Padrão: REPORT_SSOT v2.0.0
```

#### ETL Migration Strategy
```
Options for 77M Neo4j nodes:
A. neo4j-admin dump/load (fast, requires downtime)
B. Dual connection (point to br-acc Neo4j)
C. Fresh start with test data (fastest, loses history)
```

#### Cross-Case Analysis (1st/2nd/3rd Degree)
- 1st: Direct connections (ego network) — IMPLEMENTED
- 2nd: Path finding, intermediaries — PARTIAL
- 3rd: Community detection, ML patterns — NOT IMPLEMENTED

### Critical Rules (EGOS Documentation)
- Max 3-4 docs: TASKS.md, AGENTS.md, SYSTEM_MAP.md, HARVEST.md
- No timestamped docs (*_2026-04-*.md) except in _archived/
- Pre-commit must block doc proliferation
- Consolidate or delete — never leave orphaned docs

### Next Agent Priorities
1. TEST before code (npm run build, uvicorn, curl)
2. NEO4J connection (choose option A/B/C above)
3. SSOT docs (max 100 lines per integration spec)
4. PRE-COMMIT hooks (build + test + doc-check)

### Commands That Work
```bash
# Frontend build
cd frontend && npm run build  # ~60s, must pass

# Backend start
cd api && uvicorn src.egos_inteligencia.main:app --port 8000

# Health check
curl http://localhost:8000/api/v1/health
```

---

*Consolidated learnings | Keep this file <100 lines*
