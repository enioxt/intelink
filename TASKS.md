# TASKS — Intelink

> SSOT de tarefas. Atualizar imediatamente ao iniciar ou concluir.  
> Formato: `[x]` = done · `[ ]` = pendente · `[~]` = em andamento

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

### G1 — PIN System (blocker crítico)
- [x] `PIN-001` Tabela Supabase `intelink_member_pins` (user_id, pin_hash bcrypt, attempts, locked_until, last_rotated)
- [x] `PIN-002` API `POST /api/auth/pin/create` — cria PIN 6 dígitos (hash bcrypt rounds=12)
- [x] `PIN-003` API `POST /api/auth/pin/verify` — verifica PIN, lockout após 5 tentativas
- [x] `PIN-004` API `POST /api/auth/pin/recover` — envia token por e-mail (Supabase magic link)
- [x] `PIN-005` Página `/settings/pin` — criar/alterar/recuperar PIN (nudge se não configurado)

### G2 — Tabelas de Propostas (foundation)
- [x] `CONTRIB-001` Tabela `intelink_proposals` (id, proposer_id, person_cpf, status, vote_count, created_at)
- [x] `CONTRIB-002` Tabela `intelink_proposal_items` (id, proposal_id, field_path, old_value, new_value, source, justification, item_status)
- [x] `CONTRIB-003` Tabela `intelink_proposal_votes` (id, proposal_id, item_id, voter_id, vote, pin_verified_at, timestamp)
- [x] `CONTRIB-004` Tabela `intelink_audit_log` (id, action, actor_id, entity_ref, payload_hash, prev_hash — hash-chained tamper-evident)
- [x] `CONTRIB-005` Trigger Supabase: auto-promove item → CONFIRMADO quando 3/3 votos positivos

### G3 — Flow de sugestão pós-busca
- [x] `CONTRIB-006` Botão "✏️ Sugerir edição" no card de pessoa (Telegram + Web)
- [x] `CONTRIB-007` API `POST /api/propostas` — cria proposta com itens; proposer = voto 1 automático
- [x] `CONTRIB-008` Detecção de conflito: se item já tem proposta pendente → bloquear duplicata, mostrar link existente
- [x] `CONTRIB-009` Telegram flow: `/sugerir <cpf>` — wizard campos (nome, nasc, mãe, bairro, fonte, URL)
- [x] `CONTRIB-010` Web form `/propostas/nova?cpf=<cpf>` — formulário por campo com justificativa

### G4 — Quorum UI e notificações
- [x] `CONTRIB-011` Página `/propostas/[id]` — review item-by-item: ✅ Aprovar / ❌ Rejeitar com PIN
- [x] `CONTRIB-012` API `POST /api/propostas/[id]/vote` — registra voto com PIN verify + audit log
- [x] `CONTRIB-013` Badge ⚠️ nos resultados de busca quando há proposta pendente + link para votar
- [x] `CONTRIB-014` Notificação Telegram aos membros quando nova proposta aguarda votos
- [x] `CONTRIB-015` Dashboard `/propostas` — fila de pendentes, votadas, aprovadas, rejeitadas

### G5 — Display de confiança nos resultados
- [x] `CONTRIB-016` `lib/intelink/confidence.ts` — 4 níveis: CONFIRMADO 🟢 / PROVÁVEL 🟡 / NÃO CONFIRMADO 🟠 / REDS OFICIAL 🔵
- [x] `CONTRIB-017` Busca Telegram: exibir badge de confiança por campo quando diverge do REDS
- [x] `CONTRIB-018` Neo4j: propriedades `_confidence` e `_proposal_id` por campo alterado

### G6 — Ingestão de documentos
- [x] `INGEST-001` API `POST /api/ingest/document` — recebe arquivo (PDF/DOC/foto/áudio), detecta tipo
- [x] `INGEST-002` Parser: PDF (pdfjs), DOC (mammoth), imagem (OCR tesseract.js ou Vision API), áudio (Groq Whisper)
- [x] `INGEST-003` LLM extraction: OpenRouter → MiniMax/Gemini 2.0 Flash — extrai campos estruturados do texto
- [x] `INGEST-004` Cross-ref Neo4j: para cada entidade extraída → busca CPF/nome → diff (NEW/EXISTING/MERGE/CONFLICT)
- [x] `INGEST-005` Review UI `/ingest/[job_id]` — diff side-by-side, checkboxes por campo, envio → proposta
- [x] `INGEST-006` Suporte Telegram: `/ingerir` aceita arquivo anexado direto no chat, gera link pro review
- [x] `INGEST-007` Handling de mídia grande: fotos → `intelink_photo_queue`, vídeos → aviso + link externo, docs > 10MB → sugestão compressão

### G7 — Observações simplificadas (1 aprovação)
- [x] `OBS-001` Tabela `intelink_observations` (id, person_cpf, text, author_id, approved_by, status, created_at)
- [x] `OBS-002` Telegram `/observacao <cpf> <texto>` — adiciona observação, solicita 1 aprovação
- [x] `OBS-003` Card de pessoa: exibe observações aprovadas com autor + data

## P1 — Fase H: Telegram /agente (chatbot mode)

- [x] `AGENTE-001` Comando `/agente` ativa modo chatbot — mensagem de ativação + instrução de uso
- [x] `AGENTE-002` `lib/intelink/commands/agente.ts` — router: detecta intenção → chama tool correto
- [x] `AGENTE-003` Tools disponíveis: buscarPessoa, getOccurrences, getLinks, getPhoto, criarProposta, lerObservacoes
- [x] `AGENTE-004` Memória de sessão por chat_id — últimas 10 mensagens no contexto
- [x] `AGENTE-005` LLM: OpenRouter MiniMax M2.5 (melhor custo-benefício, 7.1/10 bench)
- [x] `AGENTE-006` Fallback: se LLM falhar → lista comandos disponíveis
- [x] `AGENTE-007` `/sair` ou timeout 30min → desativa modo agente

## P1 — Fase F: Cleanup legacy + robustez

- [x] `ARCH-001a` Mover `handleAIChat` (intelink-service.ts) → `commands/chat.ts`
- [x] `ARCH-001b` Mover `handleFileUpload` → `commands/upload.ts`
- [x] `ARCH-001c` Mover `handleCallbackQuery` → `commands/callbacks.ts` (usa callback-router.ts)
- [x] `ARCH-001d` Dead wrappers deleted from `intelink-service.ts` após migração zero chamadas
- [x] `BUILD-001` Reativar `typescript.ignoreBuildErrors: false` após fix types
- [x] `AUTH-012` Migrar JWT HS256 → RS256 (2026-04-18) → RS256

## P2 — Novas features (2026-04-18+)

- [x] `DASH-001` Dashboard web: painel de grupos + mapa de rede (vis.js ou D3) na UI Next.js
- [x] `ALERT-002` Persistir chats de alerta em Supabase intelink_audit_logs + in-memory cache (2026-04-18)
- [x] `REPORT-001` /relatorio semanal: digest Neo4j 7 dias (ocorrências, top 5, elos) (2026-04-18)
- [x] `MAP-001` Mapa de calor de ocorrências por bairro/município (Leaflet.js na UI)
- [x] `ETL-002` ETL --since YYYY-MM-DD: filtra por data_fato >= X, skip rows anteriores (2026-04-18)
- [x] `AUDIT-001` auditLog helper + log em /api/intelligence/crit (2026-04-18)

## P2 — Médio prazo

- [x] `ETL-001` Pipeline automático: REDS xlsx/csv → Neo4j (2026-04-18): novos BOs REDS → Neo4j
- [x] `FEAT-005` Análise CRIT real (/crit — 2026-04-18) (capacidade, recurso, intenção, tipo)
- [x] `TEST-001` Testes: unit (vitest 102 pass) + E2E specs + Playwright config (2026-04-18)
- [x] `ML-001` Predição de vínculos Adamic-Adar sem GDS — /vinculos (2026-04-18)
- [x] `ML-002` Clustering WCC Union-Find por co-ocorrência — /grupos (2026-04-18)
- [x] `FRAME-001` Framework licenciável: REST API intelligence, init-delegacia.ts, /alerta (2026-04-18)

---

## Concluído — Sessão 2026-04-17/18

- [x] `AUTH-001` Login email/senha restaurado + GitHub OAuth
- [x] `AUTH-003` Auto-bridge Supabase → RBAC no AuthProvider (2026-04-18)
- [x] `AUTH-004` Fix campo mapeamento systemRole no useRBAC (2026-04-18)
- [x] `AUTH-005` Fix localStorage: phone → `intelink_phone`, telegram → `intelink_chat_id` (2026-04-18)
- [x] `AUTH-006` Bridge endpoint: verificar sessão Supabase antes de expor dados de membro (2026-04-18)
- [x] `AUTH-007` JWT_SECRET: crash em produção se não definido, warning em dev (2026-04-18)
- [x] `AUTH-008` Middleware Next.js enforcement nas rotas protegidas (2026-04-18)
- [x] `AUTH-009` Unificar system_role/systemRole — key localStorage `intelink_role` (2026-04-18)
- [x] `AUTH-010` CSRF: SameSite=strict + assertSameOrigin helper em bridge (2026-04-18)
- [x] `AUTH-011` Rate limiting em /api/auth/bridge — 10req/min por IP (2026-04-18)
- [x] `CSS-001` PostCSS + Tailwind corrigido (postcss.config.js criado 2026-04-17)
- [x] `DATA-001` ETL reception_data.json → Neo4j: 8.074 registros ingeridos (2026-04-17)
- [x] `DEPLOY-001` Deploy VPS Hetzner + Caddy + intelink-web container (2026-04-18)
- [x] `FEAT-001` Dashboard stats reais Neo4j (2026-04-17)
- [x] `FEAT-002` PDF de investigação — CPF lookup + download (2026-04-18)
- [x] `FEAT-003` Busca CPF/nome com FULLTEXT index (2026-04-17)
- [x] `FEAT-004` Tela investigação com Occurrences REDS (2026-04-18)
- [x] `INT-001` Neo4j driver direto no Next.js (2026-04-17)
- [x] `DOC-001` README completo para agentes de IA (2026-04-17)

---

## Dados a Ingerir

| Arquivo | Registros | Status | Task |
|---------|-----------|--------|------|
| `reception_data.json` | 8.242+ | ✅ No Neo4j local | DATA-001 |
| `telegram_photos/*.jpg` | 2.898 fotos | ❌ Não linkadas | PHOTO-001..010 |
| Neo4j local (REDS) | 15.769 nós | ✅ Local · ❌ VPS | DATA-003a..h |
| Neo4j VPS (público) | 83.7M nós | ✅ VPS bracc-neo4j | — |

---

*Atualizado: 2026-04-23 (sessão: plano divulgação pública + auth bulletproof)*

---

## P0 — Fase I: AUTH Bulletproof (Pré-Divulgação) — 2026-04-23+

> Objetivo: signup + verificação obrigatória (email/telegram/whatsapp) + recovery tri-canal.
> Blocker de divulgação pública. Gate de saída: conta não-verificada não acessa nada.

### I1 — Schema + estado

- [x] `AUTH-PUB-001` Migration: adicionar `verified_at`, `verification_channel`, `verification_token_hash`, `verification_token_expires_at`, `verification_attempts` em `intelink_unit_members` (2026-04-23, 13/13 backfilled)
- [x] `AUTH-PUB-001b` Default `verified_at=COALESCE(approved_at, created_at, now())` backfill para rows ativos (2026-04-23)

### I2 — Signup

- [x] `AUTH-PUB-002` Página `/signup` — form nome + email + telefone opcional + senha (2026-04-23)
- [x] `AUTH-PUB-003` `POST /api/auth/signup` — cria Supabase auth user + membro `verified_at=NULL` + rate limit 3/hora/IP + rollback em falha (2026-04-23)
- [x] `AUTH-PUB-004` Validação unicidade: email + telefone (chat_id coletado em /auth/verify) (2026-04-23)

### I3 — Verificação tri-canal

- [x] `AUTH-PUB-005` `POST /api/auth/verify/request` — OTP 6 dígitos, hash bcrypt (rounds=10), TTL 10min + `lib/auth/verification.ts` orquestrador (2026-04-23)
- [x] `AUTH-PUB-006` Email OTP via `lib/email.ts` (Resend) — reaproveita `sendCodeEmail` (2026-04-23)
- [x] `AUTH-PUB-007` Telegram OTP via `sendMessage` — exige `telegram_chat_id` pré-linkado (2026-04-23)
- [ ] `AUTH-PUB-008` WhatsApp OTP — **DEFERRED** para F1-extra (Meta WABA requer CNPJ). Lançar com email+telegram
- [x] `AUTH-PUB-009` Página `/auth/verify` — choose channel + input 6 dígitos + resend timer 60s (2026-04-23)
- [x] `AUTH-PUB-010` `POST /api/auth/verify/confirm` — valida OTP + MAX_ATTEMPTS=5, seta `verified_at` para signup (2026-04-23)
- [x] `AUTH-PUB-011` `middleware.ts` lê cookie `intelink_verified`; sem cookie → redirect `/auth/verify`. Cookie setado por `/api/auth/verify/confirm` e `/api/auth/bridge` (HttpOnly+Secure+SameSite=Strict, 30d) (2026-04-23)

### I4 — Recovery tri-canal

- [x] `AUTH-PUB-012` Reusa `POST /api/auth/verify/request` com `purpose='recovery'` (mesmo OTP orchestrator, TTL 10min) (2026-04-23)
- [x] `AUTH-PUB-013` Página `/recover` — escolhe canal + OTP + nova senha em single flow (2026-04-23)
- [x] `AUTH-PUB-014` `POST /api/auth/recover/reset` — re-valida OTP (defense-in-depth) + `supabase.auth.admin.updateUserById` + audit (2026-04-23)

### I5 — Hardening + eval

- [ ] `AUTH-PUB-015` Rate limit `/verify/request` e `/recover/request`: 5/hora/email, 10/hora/IP
- [ ] `AUTH-PUB-016` Audit log em `intelink_audit_logs` — signup, verify_request, verify_confirm, login, recover_*
- [ ] `AUTH-PUB-017` Golden eval cases: signup+verify email, signup+verify telegram, recovery, unverified_blocked, OTP_expired, OTP_wrong, rate_limit
- [ ] `AUTH-PUB-018` `/auth/verify` polling leve 5s — auto-redirect se verificado em outra aba
- [ ] `AUTH-PUB-019` Decidir: remover GitHub OAuth ou manter só admin?

---

## P0 — Fase J: UI Cleanup (www.intelink.ia.br) — 2026-04-23+

- [ ] `UI-AUDIT-001` Mapa rotas `app/**/page.tsx` — classificar keep/remove/polish
- [ ] `UI-AUDIT-002` Para cada rota keep: bugs, loading/empty/error states
- [ ] `UI-CLEAN-001` Remover rotas `remove` (confirmar antes de deletar)
- [ ] `UI-CLEAN-002` Remover componentes órfãos (grep imports)
- [ ] `UI-CLEAN-003` Purgar mocks/fixtures de produção
- [ ] `UI-POLISH-001` Loading skeletons nas telas principais
- [ ] `UI-POLISH-002` Empty states com CTA
- [ ] `UI-POLISH-003` Error boundaries por route group
- [ ] `UI-POLISH-004` Nav consistente desktop+mobile, esconder por role
- [ ] `UI-POLISH-005` Landing `/` pública (hero + features + CTA)
- [ ] `UI-E2E-001` Playwright 5 fluxos (signup→verify→dash, login→busca, recovery, logout, settings)

---

## P0 — Fase K: Docs Sync para Divulgação — 2026-04-23+

### K1 — Doc sync técnico

- [ ] `DOC-PUB-001` Reescrever `README.md` — O que é / Quem usa / O que faz / Stack / Quickstart / Deploy
- [ ] `DOC-PUB-002` `docs/FEATURES.md` — catálogo completo com status live/beta/planned
- [ ] `DOC-PUB-003` Auditar `docs/CAPABILITIES_STATUS.md` vs código — marcar phantoms / atualizar VERIFIED_AT
- [ ] `DOC-PUB-004` `docs/AUTH.md` — fluxos signup/verify/login/recovery com screenshots
- [ ] `DOC-PUB-005` `docs/SLASH_COMMANDS.md` + `docs/PROVENANCE.md` + `docs/STREAMING.md`
- [ ] `DOC-PUB-006` Auditar `API_REFERENCE.md`, `BOT_ARCHITECTURE.md`, `ETL_GUIDE.md`, `VPS_ARCHITECTURE.md` — drift fix

### K2 — Doc público não-técnico

- [ ] `DOC-PUB-007` `docs/PUBLIC_OVERVIEW.md` — pitch em linguagem simples
- [ ] `DOC-PUB-008` `docs/USE_CASES.md` — 3 casos reais sem PII
- [ ] `DOC-PUB-009` `docs/LGPD_COMPLIANCE.md` — PII masking, ATRiAN, audit, RBAC, retenção

### K3 — Cross-refs e governança

- [ ] `DOC-PUB-010` `egos/docs/CROSS_REPO_CONTEXT_ROUTER.md` entry intelink
- [ ] `DOC-PUB-011` `docs/CHATBOT_EVAL.md` (obrigatório R7)
- [ ] `DOC-PUB-012` Validar R7 + INC-008 em `AGENTS.md`
- [ ] `DOC-PUB-013` Append `docs/MIGRATION_HISTORY.md` — entrada 2026-04-23

---

## P0 — Fase L: Data Safety (contínuo) — 2026-04-23+

- [ ] `DATA-SAFE-001` Backup cron diário: pg_dump Supabase + neo4j-admin dump → `/opt/backups/` (Hermes)
- [ ] `DATA-SAFE-002` `scripts/pre-deploy-check.ts` — valida Neo4j+Supabase conectividade + row counts
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
