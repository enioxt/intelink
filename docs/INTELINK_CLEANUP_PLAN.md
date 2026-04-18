# Intelink Cleanup Plan — 2026-04-18
> Objetivo: absorver tudo de valor das pastas legadas, arquivar ou deletar o resto, ter UMA fonte da verdade.

---

## Estado atual: 4 locais com código Intelink

| Local | Tipo | Status | Ação |
|-------|------|--------|------|
| `/home/enio/egos-lab/apps/egos-inteligencia/` | Next.js 16, TS, 711+ commits | **CANONICAL** ✅ | Manter, é o destino de tudo |
| `/home/enio/intelink/` | Monorepo legado (frontend + API Python + infra) | **LEGACY** 🔴 | Absorver → arquivar |
| `/home/enio/.windsurf/worktrees/egos-inteligencia` | Worktree automático do Windsurf | **VAZIO** 🟡 | Deletar (nenhum arquivo) |
| `/home/enio/egos-lab/projects/00-CORE-intelink/` | 3 docs de plano (sem código) | **DOCS ONLY** 🟡 | Mover docs úteis → canonical/docs, deletar |

**VPS já arquivado** (feito hoje): `/opt/bracc/egos-inteligencia` e `/opt/apps/egos-inteligencia-clone` → `/opt/_archived/`

---

## O que tem em `/home/enio/intelink/` e o que fazer

### A. Frontend (`frontend/src/lib/`) — 5 arquivos não absorvidos

| Arquivo | Tamanho | Ação |
|---------|---------|------|
| `cache.ts` | 211 LOC | **ABSORVER** — cache utilities com TTL, útil |
| `auth.ts` | 192 LOC | **REVISAR** — pode ter algo além do `lib/auth/` atual |
| `gamification.ts` | 126 LOC | **ABSORVER** — canonical tem adapter mas não o core |
| `gamification-adapter.ts` | 269 LOC | **REVISAR** — canonical tem arquivo com mesmo nome, comparar |
| `supabaseClient.ts` | 44 LOC | **DESCARTAR** — stub/mock, canonical tem `supabase-client.ts` completo |

### B. Frontend (`frontend/src/hooks/`) — hooks únicos no legacy

| Hook | Ação |
|------|------|
| `useAIChat.ts` | **ABSORVER** — canonical não tem |
| `useGraph.ts` | **ABSORVER** — canonical não tem |
| `useIntelink.ts` | **ABSORVER** — canonical não tem |
| `useInvestigations.ts` | **ABSORVER** — canonical não tem |
| `usePoliceHints.ts` | **ABSORVER** — canonical não tem |
| `useRAGChatbot.ts` | **ABSORVER** — canonical não tem |
| `useRealtime.ts` | **ABSORVER** — canonical não tem |
| `useRole.ts` | **REVISAR** — canonical tem `useRole.tsx`, comparar |
| `useSpeechToText.ts` | **ABSORVER** — canonical não tem |
| `useStorage.ts` | **ABSORVER** — canonical não tem |
| `useToast.ts/.tsx` | **ABSORVER** — canonical não tem |

### C. Frontend (`frontend/src/components/`) — componentes únicos

| Componente | Ação |
|------------|------|
| `ErrorBoundary.tsx` | **ABSORVER** — canonical não tem |
| `LoadingSkeleton.tsx` | **ABSORVER** — canonical não tem |
| `ThemeProvider.tsx` | **REVISAR** — canonical tem providers/ThemeProvider? |
| `ui-lab/` | **ABSORVER** — canonical não tem esta subdir |

### D. API Python (`api/`) — FastAPI completo, único

| Módulo | LOC | Status |
|--------|-----|--------|
| `routers/pcmg_ingestion.py` | 665 | ETL PCMG — único, sem equivalente TypeScript |
| `routers/search.py` | 191 | Search API Python — equivalente parcial em Next.js |
| `routers/templates.py` | 187 | Report templates — único |
| `routers/public.py` | 211 | API pública — único |
| Total | ~7K LOC | **PRESERVAR** como módulo separado |

**Decisão:** A API Python não vai para o canonical Next.js — é um serviço separado.
Ação: Mover `intelink/api/` → `egos-lab/apps/intelink-api/` (novo app no monorepo) e arquivar o resto.

### E. Infra (`infra/`) — Ansible + Terraform

| Asset | Ação |
|-------|------|
| `infra/ansible/` | **MOVER** → `egos-lab/apps/egos-inteligencia/docs/infra/ansible/` |
| `infra/terraform/` | **MOVER** → `egos-lab/apps/egos-inteligencia/docs/infra/terraform/` |
| `infra/Caddyfile` | **VERIFICAR** se difere do VPS atual, mover se diferente |

### F. Dados (`data/dhpp/`)

| Asset | Ação |
|-------|------|
| 4x XLSX resultados (5-8) ~5MB | **MOVER** → `/home/enio/policia/projetoDHPP/inputDHPP/` (já tem outros XLSX lá) |

### G. Docs (`docs/`)

| Doc | Ação |
|-----|------|
| `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATABASE_SCHEMA.md` | **MOVER** → canonical `docs/` se não existir |
| `ETL_GUIDE.md` | **MOVER** → canonical `docs/` |
| `MASTER_INDEX.md` | Já existe equivalente no canonical — DESCARTAR |
| `knowledge/`, `osint/`, `reports/` | **MOVER** → canonical `docs/` |
| `archive/` | DESCARTAR (já arquivado) |

### H. Scripts (`scripts/`)

| Script | Ação |
|--------|------|
| `deploy-hetzner.sh`, `health-check.sh`, `neo4j-backup.sh` | **MOVER** → canonical `scripts/` se não existir equivalente |
| `check_compliance_pack.py`, `run_integrity_gates.py` etc | **MOVER** → canonical `scripts/` |

### I. Root docs (TASKS.md, AGENTS.md, README.md)

- `TASKS.md` legacy (43K) — **REVISAR** tasks abertas, migrar as relevantes para canonical TASKS.md
- `README.md` legacy (17K) — **REVISAR** seções úteis para canonical README
- `AGENTS.md` legacy — DESCARTAR (canonical tem AGENTS.md atualizado)

---

## `/home/enio/egos-lab/projects/00-CORE-intelink/`

| Arquivo | Ação |
|---------|------|
| `PLAN_ORCHESTRATION.md` | **MOVER** → canonical `docs/` |
| `PLAN_TELEMETRY.md` | **MOVER** → canonical `docs/` |
| `README.md` | DESCARTAR |

---

## Execução: Fases

### Fase 1 — Frontend lib (5 arquivos) ✅ parcial → completar
- [ ] `CLEAN-001` Absorver `cache.ts` → canonical `lib/`
- [ ] `CLEAN-002` Absorver `gamification.ts` → canonical `lib/`
- [ ] `CLEAN-003` Revisar `gamification-adapter.ts` vs canonical — merge se necessário
- [ ] `CLEAN-004` Revisar `auth.ts` vs canonical `lib/auth/` — extrair o que faltar
- [ ] `CLEAN-005` Descartar `supabaseClient.ts` (stub)

### Fase 2 — Hooks únicos (11 hooks)
- [ ] `CLEAN-006` Copiar todos os hooks únicos → canonical `hooks/`
- [ ] `CLEAN-007` Revisar `useRole.ts` vs `useRole.tsx` no canonical — consolidar

### Fase 3 — Componentes únicos
- [ ] `CLEAN-008` Copiar `ErrorBoundary.tsx`, `LoadingSkeleton.tsx`, `ui-lab/` → canonical `components/`
- [ ] `CLEAN-009` Revisar `ThemeProvider.tsx`

### Fase 4 — API Python
- [ ] `CLEAN-010` Criar `egos-lab/apps/intelink-api/` e mover `intelink/api/` para lá
- [ ] `CLEAN-011` Adicionar README explicando que é o serviço Python separado

### Fase 5 — Infra, dados, docs, scripts
- [ ] `CLEAN-012` Mover `infra/` → canonical `docs/infra/`
- [ ] `CLEAN-013` Mover XLSX data → `/home/enio/policia/projetoDHPP/inputDHPP/`
- [ ] `CLEAN-014` Mover docs únicos → canonical `docs/`
- [ ] `CLEAN-015` Mover scripts úteis → canonical `scripts/`

### Fase 6 — TASKS.md legacy: migrar tasks abertas
- [ ] `CLEAN-016` Ler TASKS.md legacy, identificar tasks [ ] abertas relevantes
- [ ] `CLEAN-017` Migrar para canonical TASKS.md com prefixo `[migrated]`

### Fase 7 — Arquivar e deletar
- [ ] `CLEAN-018` Arquivar `/home/enio/intelink/` → `/home/enio/_archived/intelink-legacy-2026-04-18/`
- [ ] `CLEAN-019` Deletar `/home/enio/.windsurf/worktrees/egos-inteligencia/` (vazio)
- [ ] `CLEAN-020` Deletar `/home/enio/egos-lab/projects/00-CORE-intelink/` (docs movidos)

---

## O que NÃO tocar

- `/home/enio/policia/` — repositório separado (Python, OVM, casos reais). Não é Intelink frontend.
- VPS `/opt/intelink-nextjs/` — produção, não mexer sem rebuild
- `/home/enio/egos-lab/apps/egos-inteligencia/` — canonical, destino de tudo

---

## Resultado esperado

```
ANTES:
  /home/enio/intelink/          (4.000+ arquivos, 43K TASKS, duplicatas)
  /home/enio/.windsurf/worktrees/egos-inteligencia/  (vazio)
  /home/enio/egos-lab/projects/00-CORE-intelink/     (3 docs)
  /home/enio/egos-lab/apps/egos-inteligencia/        (canonical)

DEPOIS:
  /home/enio/_archived/intelink-legacy-2026-04-18/   (arquivo read-only)
  /home/enio/egos-lab/apps/egos-inteligencia/        (canonical + tudo absorvido)
  /home/enio/egos-lab/apps/intelink-api/             (API Python preservada)
```

---

*Criado: 2026-04-18 | Autor: Claude Code + Enio*
