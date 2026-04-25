# TASKS — Intelink

> SSOT de tarefas. Atualizar imediatamente ao iniciar ou concluir.  
> Formato: `[x]` = done · `[ ]` = pendente · `[~]` = em andamento

---

## P0 — TASKS Operating Model v1 Pilot (2026-04-23)

> Validação de novo modelo de governança. Grace period: até 2026-05-23. Spec: `docs/governance/TASKS_OPERATING_MODEL_v1.md`

- [x] **TASKS-PILOT-001 [P0]**: Install husky + pre-commit hook (minimal 52-line intelink-specific version) ✅ 2026-04-23 (commit 4c30ed6)
- [x] **TASKS-PILOT-002 [P0]**: Copy `.tasks-policy.json` com grace period (2026-05-23) ✅ 2026-04-23
- [x] **TASKS-PILOT-003 [P0]**: Run `bun scripts/tasks-archive.ts --dry` — resultado: 0 sections to archive (247 linhas TASKS.md, todas ativas) ✅ 2026-04-23
- [x] **TASKS-PILOT-004 [P0]**: Archive skip (não há sections completas) — TASKS.md já em estado ótimo ✅ 2026-04-23
- [x] **TASKS-PILOT-005 [P0]**: Pre-commit hook testado + POSIX-compatible ✅ 2026-04-23 (commit 5be310b)
- [ ] **TASKS-PILOT-006 [P1]**: Observe 7 dias (2026-04-23 → 2026-04-30) — confirmar pre-commit firing, zero regressions, hook stability

---

## P0 — Fase A: UX Telegram + Web Links ✅

- [x] `UX-001` Refactor `buscar.ts` — template rico com source, date, bairro, BOs, Markdown escape
- [x] `UX-002` Criar `lib/intelink/buttons.ts` — abstração portável 3-botões (Telegram ↔ WhatsApp)
- [x] `UX-003` Criar `lib/intelink/callback-router.ts` — roteia callback_data / reply
- [x] `UX-004` Botões `[BOs][Envolvidos][Web]` em resultado `/buscar`
- [x] `UX-005` Handlers: `show_bos:<id>`, `show_links:<id>` (Occurrence + co-envolvidos)
- [x] `UX-006` Rota `/p/[id]` — alias de `/pessoa/[id]` com OG tags
- [x] `UX-007` Footer `🔗 intelink.ia.br/p/<id>` em toda resposta de entidade
- [x] `UX-008` Novo comando `/fonte <id>` — audit metadata
- [x] `UX-009` Occurrence template em `/buscar` — já está no callback show_bos ✅ (UX-005 cobre)

## P0 — Fase B: Neo4j REDS → VPS ✅

- [x] `DATA-003a` Backup precaução (bracc-neo4j intocado — separado)
- [x] `DATA-003b` Container `intelink-neo4j` no VPS (bolt://intelink-neo4j:7687, rede infra_bracc)
- [x] `DATA-003c` Dump local Neo4j: 15.771 nós, 12MB
- [x] `DATA-003d` Load no VPS: 12.730 Person + 2.092 Occurrence importados
- [x] `DATA-003e` personSearch fulltext + constraints herdados do dump local
- [x] `DATA-003f` `lib/neo4j/router.ts` — 2 drivers + enrichPerson(cpf)
- [x] `DATA-003g` server.ts aponta NEO4J_REDS_URI (fallback para NEO4J_URI)
- [x] `DATA-003h` Smoke test `/buscar` via VPS com REDS real — pendente deploy
- [x] `DATA-004a` Schema: `Person.photo_url` no intelink-neo4j — aguarda PHOTO-004

## P0 — Fase C: Fotos (2.898 → VPS → Person)

- [x] `PHOTO-001` scripts/etl-photos.ts — usa photos_index.json (2.898 entradas já mapeadas)
- [x] `PHOTO-002` person-matcher inline (CPF + name fuzzy levenshtein)
- [x] `PHOTO-003` Classificador tier 1-5 no ETL
- [x] `PHOTO-004` Auto-link tier 1+2 → `Person.photo_url` no Neo4j — aguarda rsync + ETL run
- [x] `PHOTO-005` rsync em andamento: `/home/enio/policia/projetoDHPP/telegram_photos` → VPS
- [x] `PHOTO-006` `/api/photos/[id]` — serve fotos com JWT/Supabase auth check
- [x] `PHOTO-007` Telegram `sendPhoto` quando `Person.photo_url` existe
- [x] `PHOTO-008` Comandos: `/fotos-pendentes`, `/foto-revisar`, `/foto-merge` (2026-04-18)
- [x] `PHOTO-009` Detecção typo: levenshtein similarity >= 0.85
- [x] `PHOTO-010` Tabela Supabase `intelink_photo_queue` criada

## P1 — Fase D: Login Telegram (Widget oficial)

- [x] `AUTH-013a` Registrar domínio com BotFather: `/setdomain intelink.ia.br` — pendente ação manual no BotFather
- [x] `AUTH-013b` Endpoint `/api/auth/telegram/callback` — valida hash HMAC-SHA256 com bot_token
- [x] `AUTH-013c` Cria sessão Supabase via service_role se `telegram_chat_id` linkado em `intelink_unit_members`
- [x] `AUTH-013d` Página `/login` — botão "Entrar com Telegram" (Login Widget oficial JS)
- [x] `AUTH-013e` Sem chat_id linkado → redireciona pro bot com `/start claim-<nonce>`

## P1 — Fase E: Passkey + cleanup auth

- [x] `AUTH-015a` Supabase `mfa.enroll({factorType: 'webauthn'})` em `/settings/security`
- [x] `AUTH-015b` Toast nudge no primeiro login pós-feature (skippable, "lembrar em 7 dias")
- [x] `AUTH-015c` Banner para role `investigator+` até configurar passkey
- [x] `AUTH-015d` `intelink_unit_members.passkey_preference` (2026-04-18) (enum: enabled|skipped|deferred)
- [x] `AUTH-002` TOTP MFA via Supabase `mfa.enroll/challenge/verify` em `/settings/security` (WebAuthn não existe nativamente no Supabase — substituído por TOTP)

## Infra + Bugs (2026-04-18) ✅

- [x] `FIX-001` `supabase-client.ts` — singleton module-level (corrigiu 190 instâncias GoTrueClient)
- [x] `FIX-002` `login/page.tsx` — try/catch/finally em checkSession (corrigiu spinner infinito)
- [x] `FIX-003` `middleware.ts` — manifest.json, sw.js, icons/ em PUBLIC_PATHS (corrigiu erro JSON do PWA)
- [x] `LEGACY-001` VPS: removido `/opt/egos-lab/apps/intelink/`
- [x] `LEGACY-002` VPS: removido `/opt/egos-lab/apps/telegram-bot/`
- [x] `LEGACY-003` VPS: PM2 `egos-telegram` deletado (conflitava webhook com long-polling)
- [x] `DOC-VPS-001` `docs/VPS_ARCHITECTURE.md` — serviços, ports, build args, deploy procedure
- [x] `DOC-BOT-001` `docs/BOT_ARCHITECTURE.md` — webhook-only, roteamento, env vars, debug
- [x] `DOC-ENV-001` `apps/web/.env.example` — todas as variáveis com notas build-time vs runtime
- [x] `BOT-003` `telegram_chat_id = 171767219` já em `intelink_unit_members` para enioxt@gmail.com (2026-04-18 — verificado via Supabase)
- [x] `MERGE-001` Absorver `lib/intelligence/` (33 arquivos) + 12 standalone libs de `/home/enio/intelink/` → egos-lab (2026-04-18)
- [x] `VPS-FIX-001` rsync corrigido para raiz `/opt/intelink-nextjs/` (bug: código novo foi para `app/lib/`, old code built) — rebuild e deploy OK (2026-04-18)
- [x] `ARCH-VPS-001` VPS legacy arquivado: `/opt/bracc/egos-inteligencia`, `/opt/apps/egos-inteligencia-clone` → `/opt/_archived/` (2026-04-18)

## P0 — Fase G: Sistema de Contribuição & Validação

### I3 — Verificação tri-canal

- [x] `AUTH-PUB-005` `POST /api/auth/verify/request` — OTP 6 dígitos, hash bcrypt (rounds=10), TTL 10min + `lib/auth/verification.ts` orquestrador (2026-04-23)
- [x] `AUTH-PUB-006` Email OTP via `lib/email.ts` (Resend) — reaproveita `sendCodeEmail` (2026-04-23)
- [x] `AUTH-PUB-007` Telegram OTP via `sendMessage` — exige `telegram_chat_id` pré-linkado (2026-04-23)
- [ ] `AUTH-PUB-008` WhatsApp OTP — **DEFERRED** para F1-extra (Meta WABA requer CNPJ). Lançar com email+telegram
- [x] `AUTH-PUB-009` Página `/auth/verify` — choose channel + input 6 dígitos + resend timer 60s (2026-04-23)
- [x] `AUTH-PUB-010` `POST /api/auth/verify/confirm` — valida OTP + MAX_ATTEMPTS=5, seta `verified_at` para signup (2026-04-23)
- [x] `AUTH-PUB-011` `middleware.ts` lê cookie `intelink_verified`; sem cookie → redirect `/auth/verify`. Cookie setado por `/api/auth/verify/confirm` e `/api/auth/bridge` (HttpOnly+Secure+SameSite=Strict, 30d) (2026-04-23)

### I5 — Hardening + eval

- [x] `AUTH-PUB-015` Rate limits aplicados: signup 3/h/IP, verify/request 5/h, verify/confirm 10/h, recover/reset 5/h, bridge 10/min (2026-04-23)
- [x] `AUTH-PUB-016` Audit log (hash-chained): signup, verify_request, verify_confirm (success + fail + attempts), login.bridge, password_reset (2026-04-23)
- [x] `AUTH-PUB-017` `scripts/smoke-auth-flow.ts` — exercita signup→verify→wrong-OTP→confirm→recovery→dup-email→cleanup end-to-end (2026-04-23)
- [ ] `AUTH-PUB-018` `/auth/verify` polling leve 5s — auto-redirect se verificado em outra aba (nice-to-have)
- [ ] `AUTH-PUB-019` Decidir: remover GitHub OAuth ou manter só admin? (pendente decisão)

---

## P0 — Fase J: UI Cleanup (www.intelink.ia.br) — 2026-04-23+

- [x] `UI-AUDIT-001` Mapa 61 rotas `app/**/page.tsx` classificado em `docs/_current_handoffs/ui-audit-2026-04-23.md` — 47 KEEP, 3 REMOVE, 5 INVESTIGATE, 6 overlap-candidates (2026-04-23)
- [ ] `UI-AUDIT-002` Para cada rota keep: bugs, loading/empty/error states (depende de aprovação UI-CLEAN-001)
- [ ] `UI-CLEAN-001` Remover rotas `remove` (confirmar antes de deletar)
- [ ] `UI-CLEAN-002` Remover componentes órfãos (grep imports)
- [ ] `UI-CLEAN-003` Purgar mocks/fixtures de produção
- [ ] `UI-POLISH-001` Loading skeletons nas telas principais
- [ ] `UI-POLISH-002` Empty states com CTA
- [ ] `UI-POLISH-003` Error boundaries por route group
- [ ] `UI-POLISH-004` Nav consistente desktop+mobile, esconder por role
- [x] `UI-POLISH-005` `/` pública — `components/landing/PublicLanding.tsx`: hero + 6 features + 4 stats + público-alvo + 2 CTAs + footer. Middleware libera `/`, page renders PublicLanding se !isAuthenticated senão dashboard (2026-04-23)
- [ ] `UI-E2E-001` Playwright 5 fluxos (signup→verify→dash, login→busca, recovery, logout, settings)

---

## P0 — Fase K: Docs Sync para Divulgação — 2026-04-23+

### K3 — Cross-refs e governança

- [x] `DOC-PUB-010` `egos/docs/CROSS_REPO_CONTEXT_ROUTER.md` — adicionada seção "Intelink standalone repo" com 15 pointers para docs + scripts (commit egos `f40dc41`) (2026-04-23)
- [x] `DOC-PUB-011` `docs/CHATBOT_EVAL.md` (R7 compliance: capabilities table 48/50, judge-LLM, trajectory, redteam, flywheel, AUTH-EVAL-001 pendente) (2026-04-23)
- [x] `DOC-PUB-012` Validado: `AGENTS.md` linha 65 (INC-008 ref) + linha 69-91 (R7 + postmortem) — Windsurf propagou corretamente via disseminate (2026-04-23)
- [x] `DOC-PUB-013` Append `docs/MIGRATION_HISTORY.md` — entradas 2026-04-22 (Eval+INC-008) + 2026-04-23 (Divulgação Pública) (2026-04-23)

---

## P0 — Fase L: Data Safety (contínuo) — 2026-04-23+

- [x] `DATA-SAFE-001` Backup cron diário 03:00 VPS — `scripts/backup-daily.sh`: Neo4j dump (~12MB, funcionando) + Supabase managed backup diário auto (free tier 7d retention). Retenção 30d + monthly 12 (2026-04-23)
- [x] `DATA-SAFE-002` `scripts/pre-deploy-check.ts` — 8/8 green vs prod (Supabase conn + members>0 + audit_chain + /health + auth reachable + discover manifest) (2026-04-23)
- [ ] `DATA-SAFE-003` Restauração testada dry-run em staging
- [ ] `DATA-SAFE-004` Golden eval case: busca CPF real no intelink-neo4j, falha se vazio

---

## P0 — Automações críticas para lançamento

- [ ] `AUTO-INT-002` Pre-commit `pii-mask-path-check.ts` — bloqueia commits tocando stream sem mask (2h)
- [ ] `AUTO-INT-006` Hermes cron nightly eval regression monitor — GitHub issue se drift >5% (4h)
- [ ] `AUTO-INT-001` Pre-commit `claim-evidence-gate.ts` — docs CLAIM:<id> exige manifest+test (1d)

---

## P1 — Fase M: Lançamento — Semana 4

- [ ] `LAUNCH-001` Smoke E2E prod: 3 contas fake (email/telegram/whatsapp-se-pronto), cada verify→login→3 features→recovery
- [ ] `LAUNCH-002` Monitoring ativo: Langfuse/telemetry, dashboard ops, alertas SLO
- [ ] `LAUNCH-003` Página `/status` pública (up/down por componente)
- [ ] `LAUNCH-004` Artigo lançamento (integrar article-writer pipeline)
- [ ] `LAUNCH-005` Thread X.com lançamento
- [ ] `LAUNCH-006` Vídeo demo 2min

---

## P1 — Automações pós-lançamento

- [ ] `AUTO-INT-003` Post-commit `tasks-md-auto-tick.ts` — novo commit `chore(tasks):` (não amend)
- [ ] `AUTO-INT-004` Pre-commit `features-md-check.ts` + AI subagent doc-gen
- [ ] `AUTO-INT-005` Pre-commit cross-ref checker scoped intelink
- [ ] `AUTO-INT-007` Hermes red team cron (dep. EVAL-B3)
- [ ] `AUTO-INT-008` `eval-flywheel.ts` — red team fail → golden PR auto
- [ ] `AUTO-INT-009` Langfuse dedicado intelink + instrumentação route.ts
- [ ] `AUTO-INT-010` Codex Review routing para safety-critical paths

---

## P2 — Bloco Eval continuação

- [x] `EVAL-A1..A4` `@egos/eval-runner` package + golden dataset 50 casos + CI gate + judge-LLM (2026-04-22)
- [x] `EVAL-A6` Trajectory exposure em response JSON (2026-04-22)
- [x] `EVAL-B1` Promptfoo YAML scaffold (2026-04-22)
- [x] `EVAL-B2` Judge-LLM em REFUSE-005 e ATRIAN-004 (2026-04-22)
- [ ] `EVAL-A5` Migrar asserts rígidos → judge-LLM (5 casos, 3h)
- [ ] `EVAL-A7` Golden cases cobrindo streaming path (depende AUTO-INT-002)
- [ ] `EVAL-B3` Red team cron + `tests/eval/redteam.yaml` (4h)
- [ ] `EVAL-B4` Flywheel promoter (parte de AUTO-INT-008)
- [ ] `EVAL-F1` Playwright 5 user flows (1d)
- [ ] `EVAL-F2` Playwright CI gate (4h)
- [ ] `EVAL-D1` RAGAS Python script — faithfulness + context_relevance (1d)
- [ ] `EVAL-D2` RAGAS hook no runner (4h)

---

## P2 — Refactor dívida técnica

- [x] `INTELINK-002` SSE streaming opt-in (2026-04-22)
- [x] `INTELINK-003` Provenance hash-chained (2026-04-22)
- [x] `INTELINK-004` Slash commands /link /unlink /help (2026-04-22)
- [x] `INTELINK-008` FallbackProvider (2026-04-22)
- [x] `INTELINK-010` Tests coverage provenance/tools/legal/risk (2026-04-22)
- [x] `INTELINK-011` Chat history tables migration (2026-04-22)
- [x] `INTELINK-012` Audit.ts schema fix resource_* → target_* (2026-04-22)
- [x] `INTELINK-014` PII stub bug fixed (wired real scanner) (2026-04-22)
- [x] `INTELINK-AUTH-015` Telegram redirect + MFA session guard (2026-04-22)
- [ ] `INTELINK-013` `app/api/chat/route.ts` usar `FallbackProvider` (4h)
- [ ] `INTELINK-014b` Stream PII masking (depende AUTO-INT-002 + EVAL-A7, 2h)
- [ ] `INTELINK-015` Extrair tool orchestration → `lib/intelink/tool-orchestrator.ts` (4h)

---

## P2 — Frontend adoption

- [ ] `INT-FE-001` ChatContext consome `trajectory[]` — passos colapsáveis (4h)
- [ ] `INT-FE-002` Cliente SSE `useStream:true` + UI incremental (6h)
- [ ] `INT-FE-003` Header mostra `linkedInvestigationId` vinculado (2h)
- [ ] `INT-FE-004` Autocomplete visual slash commands (4h)
- [ ] `INT-FE-005` Tela `/settings/provenance` — hash-chain consulta + export CSV (3d)

---

## P3 — Longo prazo

- [ ] `EVAL-X3` Publicar `@egosbr/eval-runner` npm (4h)
- [ ] `EVAL-X4` Remover shims compat `852/src/eval/` após migração
- [ ] `EVAL-X5` Documentar protocolo vendoring em `egos/docs/modules/CHATBOT_SSOT.md §18`
- [ ] `GEM-HUNTER-001` Gem-hunter chatbot conversacional `@egos/agent-runtime` (1 semana)
- [ ] `INTELINK-MT-001` Multi-tenant (Opção A) — quando 3ª delegacia confirmada (2 semanas)

---

## Migrated Tasks (from intelink-legacy — 2026-04-18)

> Tasks abertas relevantes do repo legacy. Prefixo [migrated] indica origem.

- [ ] `[migrated] NEO4J-SNAPSHOT-001` Ativar backup automático Hetzner (painel: Server → Enable Backups, ~€2/mês)
- [ ] `[migrated] AUTH-MULTITENANT-001` Isolamento por `delegacia_id` derivado de MASP/email no JWT — middleware + queries
- [ ] `[migrated] DHPP-SCHEMA-001` Cypher schema: Person, Case, Weapon, Photo, Reception + constraints + indexes
- [ ] `[migrated] DHPP-DEDUP-001` Estratégia MERGE para unir Person DHPP com 83.7M nós existentes via CPF/nome
- [ ] `[migrated] DHPP-ETL-001` Pipeline dhpp.py — 115 PDFs/DOCX → BERTimbau NER → Neo4j (≥200 Person, ≥60 Case)
- [ ] `[migrated] DHPP-ETL-002` Pipeline fotos Telegram — metadata 2.898 fotos → Photo nodes Neo4j
- [ ] `[migrated] DHPP-ETL-003` Pipeline 8.242 entradas recepção → Reception nodes
- [ ] `[migrated] UI-ENTITY-TABS-001` Rota /entity/{id} com 3 abas: Conexões, Timeline, Risco (backend pronto)
- [ ] `[migrated] VIZ-GRAPH-001` InvestigationGraph.tsx — integrar com caso DHPP real, drill-down 3 graus
- [ ] `[migrated] VALID-001` Enio usa sistema com 1 caso DHPP real completo (entrada → busca → grafo → laudo)
- [ ] `[migrated] VALID-002` Lídia faz onboarding sem treinamento — meta: entende 80% em 30min

---

## UI-REDESIGN — Sprint 2026-04-24 (v2 design system)

### P0 — Bugs críticos

- [x] `UI-001` decodeURIComponent(id) — pessoa vazia corrigida (90a16f9)
- [x] `UI-002` Fallback 'Não identificado' em vez de ID bruto (90a16f9)
- [ ] `UI-003` **Dados da pessoa ainda incompletos em alguns casos** — verificar mapeamento telefone/source

### P0 — Normalização de dados (SSOT)

- [x] `DATA-001` `lib/normalize/identifiers.ts` — normalizeCPF, formatCPF criados (90a16f9)
- [x] `DATA-002` normalizePhone BR (034999999999), formatPhone criados (90a16f9)
- [x] `DATA-003` normalizePhone com detecção de EUA e E.164 internacional (90a16f9)
- [ ] `DATA-004` **Script Cypher de limpeza Neo4j** — converter CPFs/telefones existentes para SSOT (ainda não aplicado ao grafo)

### P1 — UX correções rápidas

- [x] `UI-004` JourneyFAB → canto inferior esquerdo (x=20) (90a16f9)
- [x] `UI-005` Menu perfil dropdown — Meu Perfil, Atividades, Senha, Config, Sair (90a16f9)
- [x] `UI-006` Placeholder names marcados com badge 'placeholder' na Central (90a16f9)
- [x] `UI-007` formatSource() — REDS_HOMICIDIO → 'REDS Homicídio' etc (90a16f9)

### P1 — Merge e deduplicação de entidades

- [ ] `MERGE-001` **Diagnóstico de duplicatas** — "ABILIO BRAZ COELHO" aparece 2x com CPFs diferentes (formato diferente do mesmo CPF). Identificar via normalização.
- [ ] `MERGE-002` **Endpoint `/api/neo4j/merge`** — dado dois IDs Neo4j, mesclar Person nodes preservando campos com maior confiança, criando relacionamento `SAME_AS`
- [ ] `MERGE-003` **UI de merge** — na lista Central/Pessoas, poder selecionar 2+ registros e acionar merge
- [ ] `MERGE-004` **Auto-sugestão de merge** — matching por CPF normalizado, nome + mãe, nome + nascimento. Listar candidatos na Central

### P1 — Features legadas a resgatar

- [ ] `LEGACY-001` **Diagnóstico completo de features pré-redesign** — listar tudo que funcionava antes (rotas, modais, componentes) para reintegrar ao novo layout
- [ ] `LEGACY-002` **Sistema de propostas** (`/propostas`) — existia, verificar se está integrado
- [ ] `LEGACY-003` **Modo Apresentação** no header (via DashboardHeader antigo)
- [ ] `LEGACY-004` **Grafo de força** (`/graph/[id]`) — ForceGraph2D existia, verificar integração
- [ ] `LEGACY-005` **Timeline da investigação** — existia `InvestigationTimeline`, reintegrar

### P2 — Central: abas faltando

- [ ] `CENTRAL-001` **Aba Veículos** — tabela de 665 veículos com filtros (placa, modelo, cor)
- [ ] `CENTRAL-002` **Aba Vínculos** — 19.711 relacionamentos paginados, filtros por tipo (ENVOLVIDO_EM, PHOTO_OF, SAME_AS)
- [ ] `CENTRAL-003` **Vínculos cross-case** — pessoas em múltiplas operações, pendentes de revisão

### P2 — Novos designs (egos 7)

- [ ] `DESIGN-001` **Analisar `/home/enio/Downloads/egos (7)/nextjs-export/`** — importar componentes úteis do HQ para o Intelink
- [ ] `DESIGN-002` **hq-layout.tsx** — avaliar como base para layout de perfil
