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

---

## 2026-04-22 — Fase Eval + INC-008

- **Golden eval harness canônico** extraído para `egos/packages/eval-runner/` (EVAL-A1) e vendorizado em `tests/eval/lib/`
- **Dataset 50 casos** behavioral em `tests/eval/golden/intelink.ts` (EVAL-A2..A6)
- **Promptfoo YAML layer** + judge-LLM (Haiku 4.5) — EVAL-B1/B2
- **INC-008 fix crítico:** `lib/shared.ts` tinha stubs silenciosos (`return []`, `return text`) retornando no-op para `scanForPII` e `sanitizeText`. Wired para `lib/pii-scanner.ts`. 151 unit tests + typecheck + lint estavam verdes enquanto PII vazava. Postmortem: `/home/enio/egos/docs/INCIDENTS/INC-008-phantom-compliance-stubs.md`.
- **R7 propagado** (kernel governance): capability declarada exige eval comportamental. Commit `45f12c8`.
- **Auth fixes** INTELINK-AUTH-015: Telegram redirect para `/auth/callback` (não `#access_token` leak) + MFA session guard em `/settings/security`

Commits chave: `b92e9d9` (eval-runner), `83608f3` (INC-008 fix), `0129362` (auth-015), `2b74c9f` (judge-LLM), `ec272d7` (TASKS v2.81.0).

---

## 2026-04-23 — Fase Divulgação Pública (em progresso)

**AUTH Bulletproof (Fase I, AUTH-PUB-001..017):**
- Schema: colunas `verified_at`, `verification_channel`, `verification_token_hash`, `verification_token_expires_at`, `verification_attempts` em `intelink_unit_members` (migration `20260423000000_auth_verification.sql`)
- Backfill: 13/13 membros ativos grandfathered como verified
- Novo fluxo: signup self-service (`/signup`) → verify tri-canal (`/auth/verify`) → login (Supabase) → recover (`/recover`)
- Canais: email (Resend) + Telegram (bot sendMessage). WhatsApp deferred (requer CNPJ)
- Middleware gate: cookie `intelink_verified=1` (HttpOnly+Secure+SameSite=Strict, 30d). Sem cookie → redirect `/auth/verify`
- OTP: 6 dígitos, bcrypt rounds=10, TTL 10min, MAX_ATTEMPTS=5
- Rate limits: signup 3/h/IP, verify/request 5/h, verify/confirm 10/h, recover/reset 5/h
- Audit hash-chained: 6 novas actions (`auth.signup`, `auth.verify_*`, `auth.login.bridge`, `auth.password_reset.*`)
- Smoke E2E: `scripts/smoke-auth-flow.ts` — 10/11 pass against prod (duplicate blocked by rate limit)

**Fix collateral:** Supabase trigger `init_user_ethik_points` removido — referenciava tabela `ethik_points` inexistente, bloqueava `auth.admin.createUser` com erro obscuro.

**Docs pré-divulgação (Fase K, DOC-PUB-001..013, parcial):**
- `README.md` reescrito (público)
- `docs/FEATURES.md` — catálogo 100+ features live com evidência
- `docs/AUTH.md` — fluxos + schema + endpoints + segurança
- `docs/CHATBOT_EVAL.md` — R7 compliance (48/50 eval)
- `docs/SLASH_COMMANDS.md`, `docs/PROVENANCE.md`, `docs/STREAMING.md`
- `docs/LGPD_COMPLIANCE.md` — bases legais + controles técnicos + direitos do titular
- `docs/_current_handoffs/ui-audit-2026-04-23.md` — 61 rotas classificadas (47 keep / 3 remove / 5 investigate)

**VPS deploy fix:** `.egos` symlink excluído do rsync — estava criando symlink quebrado no container, quebrando build.

**Próximo (blockers do lançamento):**
- DATA-SAFE-001: backup cron diário Supabase + Neo4j
- UI-CLEAN-001: deletar rotas órfãs (após aprovação)
- UI-POLISH-001..005: loading/empty/error + landing `/` pública
- LAUNCH-001..006: smoke prod + monitoring + artigo + thread

Commits chave deste dia: `e49afe7` (AUTH-PUB-001), `2b8cd0c` (signup), `2073666` (verify), `935815e` (middleware+recovery), `cf7c1a9` (smoke+audit), `b0a8949` (docs wave 1).

---

*Última atualização: 2026-04-23 | Claude Code + Enio Rocha*
