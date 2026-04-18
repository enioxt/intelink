# Intelink — Histórico de Migração de Pastas
> Documento para agentes de IA e desenvolvedores entenderem a origem deste repo.

---

## Por que este documento existe

O Intelink cresceu rapidamente em múltiplos locais ao mesmo tempo. Em 2026-04-18 foi feita uma consolidação completa: **tudo que importava foi absorvido aqui**, e os legados foram arquivados fora do workspace.

---

## Mapa de pastas — antes vs depois

### Antes (2026-04-18)

| Caminho | Conteúdo | Status |
|---------|----------|--------|
| `/home/enio/intelink/` | Monorepo legado: frontend Next.js + API Python + infra | Era o "principal" mas desatualizado |
| `/home/enio/egos-lab/apps/egos-inteligencia/` | Next.js 16, 711+ commits, canonical temporário | Dentro do egos-lab (sendo arquivado) |
| `/home/enio/egos-lab/projects/00-CORE-intelink/` | 3 docs de planejamento | Somente docs |
| `/home/enio/.windsurf/worktrees/egos-inteligencia/` | Worktree automático | Vazio |
| VPS `/opt/egos-lab/apps/intelink/` | Deploy antigo | Arquivado |
| VPS `/opt/bracc/egos-inteligencia` | Deploy antigo | Arquivado |
| VPS `/opt/apps/egos-inteligencia-clone` | Clone duplicado | Arquivado |
| VPS `/opt/intelink-nextjs/` | Deploy atual (produção) | Ativo |

### Depois (2026-04-18)

| Caminho | Status |
|---------|--------|
| `/home/enio/intelink/` | **CANONICAL** ✅ — este repo standalone |
| `/home/enio/intelink-legacy/` | **ARQUIVO** 🔒 — somente leitura, fora do workspace |
| `/home/enio/egos-lab/apps/intelink-api/` | API Python preservada (FastAPI ~7K LOC) |
| VPS `/opt/intelink-nextjs/` | Produção — sincronizado deste repo |

---

## O que foi absorvido (de onde → para onde)

### De `egos-lab/apps/egos-inteligencia/apps/web/` (base principal)
- Toda a aplicação Next.js: `app/`, `lib/`, `components/`, `hooks/`, `providers/`
- `TASKS.md`, `AGENTS.md`, `docs/`
- Commits: migração foi feita como novo `git init` (egos-lab era monorepo, história não portável limpa)

### De `intelink-legacy/frontend/src/lib/` (5 arquivos adicionais)
| Arquivo | Destino | Nota |
|---------|---------|------|
| `cache.ts` | `lib/cache.ts` | Cache utilities com TTL |
| `gamification.ts` | `lib/gamification.ts` | Core gamification (Zustand) |
| `gamification-adapter.ts` | `lib/gamification-adapter.ts` | Adapter XP/leaderboard |
| `auth.ts` | `lib/auth-client.ts` | Zustand auth store (renomeado para não conflitar) |
| `supabaseClient.ts` | **descartado** | Stub/mock — canonical tem `supabase-client.ts` completo |

### De `intelink-legacy/frontend/src/hooks/` (11 hooks)
`useAIChat`, `useGraph`, `useIntelink`, `useInvestigations`, `usePoliceHints`,
`useRAGChatbot`, `useRealtime`, `useSpeechToText`, `useStorage`, `useToast`, `useToast.tsx`

### De `intelink-legacy/frontend/src/components/` (3 componentes + 1 dir)
`ErrorBoundary.tsx`, `LoadingSkeleton.tsx`, `ThemeProvider.tsx`, `ui-lab/`

### De `intelink-legacy/api/` (API Python)
→ `egos-lab/apps/intelink-api/` — preservada como app separado no monorepo egos-lab.
FastAPI ~7K LOC: PCMG ingestion, search, templates, public API, ETL pipelines.

### De `intelink-legacy/infra/`
→ `docs/infra/` — Ansible playbook + Terraform para VPS Hetzner

### De `intelink-legacy/data/dhpp/`
→ `/home/enio/policia/projetoDHPP/inputDHPP/` — 4 XLSX de resultados REDS

### De `intelink-legacy/docs/`
→ `docs/` — API_REFERENCE.md, ETL_GUIDE.md, CAPABILITIES_STATUS.md, knowledge/, osint/, reports/

### De `intelink-legacy/scripts/`
→ `scripts/` — deploy-hetzner.sh, health-check.sh, neo4j-backup.sh, compliance checks

### De `egos-lab/projects/00-CORE-intelink/`
→ `docs/` — PLAN_ORCHESTRATION.md, PLAN_TELEMETRY.md

---

## Onde encontrar código do passado

Se precisar consultar algo que existia antes:

```bash
# Código do monorepo legado (somente leitura — FORA do workspace)
ls /home/enio/intelink-legacy/

# API Python (FastAPI) — separada do Next.js
ls /home/enio/egos-lab/apps/intelink-api/

# Dados policiais (Python, casos reais) — repo separado
ls /home/enio/policia/
```

**Regra:** `intelink-legacy/` é arquivo de referência. Nunca commitar nele. Nunca usar como base de trabalho.

---

## Decisão de arquitetura

**Por que standalone e não dentro do /egos (kernel)?**

- `egos/` é o kernel de orquestração (agents, runtime, governança) — infraestrutura
- Intelink é um **produto** específico (plataforma policial) — não é infraestrutura
- Standalone = deploy independente, sem arrastar o kernel junto

**Por que saiu do egos-lab?**

- `egos-lab/` está sendo progressivamente arquivado (experimentos, apps que cresceram para repos próprios)
- O Intelink cresceu o suficiente para merecer repo próprio

---

*Migração executada: 2026-04-18 | Claude Code + Enio Rocha*
