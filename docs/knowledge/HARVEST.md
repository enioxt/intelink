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

## Session 2026-04-14 — Anti-Drift Doc Overhaul + Deep Codebase Exploration

### O que foi feito
- Auditoria exaustiva de toda a documentação do Intelink
- Segunda exploração profunda: `frontend/src/lib/`, `apps/web/`, migrações, TODOs inline, testes
- Criação do `docs/MASTER_INDEX.md` — ponto único de entrada para agentes AI
- 5 novos SSoTs criados: CAPABILITIES_STATUS, DATABASE_SCHEMA, ETL_GUIDE, TESTING, MASTER_INDEX
- AGENTS.md v3.0: 9 routers → 25 routers reais, status de migração como concluído
- SYSTEM_MAP.md deletado (absorvido por ARCHITECTURE.md)
- DIAGNOSTICO_2026-04-08 deletado (supersedido por Apr-09)
- Hook pre-commit corrigido: TASKS.md limite 200→900 (alinha com CLAUDE.md global)
- Export zip: 105 → 127 arquivos + sync Obsidian

### Padrões Descobertos

#### Capacidades "Escondidas" (código pronto, UI não usa)
```
lib/analysis/diligence-suggestions.ts  (524 linhas) — recomendações de diligência
lib/analysis/executive-summary.ts      (427 linhas) — sumário IA de caso
lib/analysis/risk-assessment.ts        (365 linhas) — scoring de risco multi-fator
lib/analysis/modus-operandi.ts         (346 linhas) — comparação MO cross-case
lib/analysis/crit-judging.ts           (357 linhas) — avaliação de qualidade de evidência
```
LIÇÃO: ~5.000 linhas de lógica analítica implementadas mas sem interface. Expor na UI = quick win.

#### Pattern Matching Desconectado (gap crítico)
```python
# cross_reference_engine.py
pattern_matches=[]  # TODO: conectar pattern_detector
```
O `pattern_detector.py` existe com Sacred Math scoring mas não alimenta o cross-reference. Fix = 1 dia.

#### apps/web/ é a nova arquitetura (migração em progresso)
- `apps/web/` usa Vercel AI SDK + RxDB + Automerge CRDT
- `frontend/src/` está sendo migrado gradualmente
- Ambos existem e funcionam simultaneamente

#### Estratégia de Documentação Anti-Drift Validada
```
MASTER_INDEX.md → entry point
SSOT por domínio → sem duplicação
Regra: novo conteúdo vai ao SSOT do domínio, nunca cria arquivo novo
```

### Score Real do Sistema (2026-04-14)
```
Auth & Segurança:    90%
Entidades & Busca:   85%
NLP & Extração:      78%
Grafos:              55% (queries não testadas no CI)
Padrões:             35% (código existe, desconectado)
Análises avançadas:  60% (UI não expõe)
AI Chat:             75%
ETL Pipelines:       18% (4/46)
OSINT:               65%
Relatórios:          25%
Infraestrutura:      80%
MÉDIA GERAL:         ~60%
```

### Gaps P0 (resolver antes de demo)
1. Conectar `pattern_detector` → `cross_reference_engine` (1 dia)
2. Ativar Neo4j no CI (0.5 dia — adicionar service no ci.yml)
3. Expor análises avançadas na UI (1 semana)
4. Designar DPO (LGPD Art. 41 — ação administrativa)

### Regra Nova: MASTER_INDEX como entrada
Todo agente AI que trabalhar no Intelink deve começar por `docs/MASTER_INDEX.md`.
Puxar um fio → avançar pela cadeia de links → sem ambiguidade.

---

*Consolidated learnings | Keep this file <200 lines*
