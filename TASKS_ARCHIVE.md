# TASKS_ARCHIVE.md — Completed sections


## Archived 2026-04-23

### G1 — PIN System (blocker crítico)
- [x] `PIN-001` Tabela Supabase `intelink_member_pins` (user_id, pin_hash bcrypt, attempts, locked_until, last_rotated)
- [x] `PIN-002` API `POST /api/auth/pin/create` — cria PIN 6 dígitos (hash bcrypt rounds=12)
- [x] `PIN-003` API `POST /api/auth/pin/verify` — verifica PIN, lockout após 5 tentativas
- [x] `PIN-004` API `POST /api/auth/pin/recover` — envia token por e-mail (Supabase magic link)
- [x] `PIN-005` Página `/settings/pin` — criar/alterar/recuperar PIN (nudge se não configurado)


---

### G2 — Tabelas de Propostas (foundation)
- [x] `CONTRIB-001` Tabela `intelink_proposals` (id, proposer_id, person_cpf, status, vote_count, created_at)
- [x] `CONTRIB-002` Tabela `intelink_proposal_items` (id, proposal_id, field_path, old_value, new_value, source, justification, item_status)
- [x] `CONTRIB-003` Tabela `intelink_proposal_votes` (id, proposal_id, item_id, voter_id, vote, pin_verified_at, timestamp)
- [x] `CONTRIB-004` Tabela `intelink_audit_log` (id, action, actor_id, entity_ref, payload_hash, prev_hash — hash-chained tamper-evident)
- [x] `CONTRIB-005` Trigger Supabase: auto-promove item → CONFIRMADO quando 3/3 votos positivos


---

### G3 — Flow de sugestão pós-busca
- [x] `CONTRIB-006` Botão "✏️ Sugerir edição" no card de pessoa (Telegram + Web)
- [x] `CONTRIB-007` API `POST /api/propostas` — cria proposta com itens; proposer = voto 1 automático
- [x] `CONTRIB-008` Detecção de conflito: se item já tem proposta pendente → bloquear duplicata, mostrar link existente
- [x] `CONTRIB-009` Telegram flow: `/sugerir <cpf>` — wizard campos (nome, nasc, mãe, bairro, fonte, URL)
- [x] `CONTRIB-010` Web form `/propostas/nova?cpf=<cpf>` — formulário por campo com justificativa


---

### G4 — Quorum UI e notificações
- [x] `CONTRIB-011` Página `/propostas/[id]` — review item-by-item: ✅ Aprovar / ❌ Rejeitar com PIN
- [x] `CONTRIB-012` API `POST /api/propostas/[id]/vote` — registra voto com PIN verify + audit log
- [x] `CONTRIB-013` Badge ⚠️ nos resultados de busca quando há proposta pendente + link para votar
- [x] `CONTRIB-014` Notificação Telegram aos membros quando nova proposta aguarda votos
- [x] `CONTRIB-015` Dashboard `/propostas` — fila de pendentes, votadas, aprovadas, rejeitadas


---

### G5 — Display de confiança nos resultados
- [x] `CONTRIB-016` `lib/intelink/confidence.ts` — 4 níveis: CONFIRMADO 🟢 / PROVÁVEL 🟡 / NÃO CONFIRMADO 🟠 / REDS OFICIAL 🔵
- [x] `CONTRIB-017` Busca Telegram: exibir badge de confiança por campo quando diverge do REDS
- [x] `CONTRIB-018` Neo4j: propriedades `_confidence` e `_proposal_id` por campo alterado


---

### G6 — Ingestão de documentos
- [x] `INGEST-001` API `POST /api/ingest/document` — recebe arquivo (PDF/DOC/foto/áudio), detecta tipo
- [x] `INGEST-002` Parser: PDF (pdfjs), DOC (mammoth), imagem (OCR tesseract.js ou Vision API), áudio (Groq Whisper)
- [x] `INGEST-003` LLM extraction: OpenRouter → MiniMax/Gemini 2.0 Flash — extrai campos estruturados do texto
- [x] `INGEST-004` Cross-ref Neo4j: para cada entidade extraída → busca CPF/nome → diff (NEW/EXISTING/MERGE/CONFLICT)
- [x] `INGEST-005` Review UI `/ingest/[job_id]` — diff side-by-side, checkboxes por campo, envio → proposta
- [x] `INGEST-006` Suporte Telegram: `/ingerir` aceita arquivo anexado direto no chat, gera link pro review
- [x] `INGEST-007` Handling de mídia grande: fotos → `intelink_photo_queue`, vídeos → aviso + link externo, docs > 10MB → sugestão compressão


---

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


---

### I1 — Schema + estado

- [x] `AUTH-PUB-001` Migration: adicionar `verified_at`, `verification_channel`, `verification_token_hash`, `verification_token_expires_at`, `verification_attempts` em `intelink_unit_members` (2026-04-23, 13/13 backfilled)
- [x] `AUTH-PUB-001b` Default `verified_at=COALESCE(approved_at, created_at, now())` backfill para rows ativos (2026-04-23)


---

### I2 — Signup

- [x] `AUTH-PUB-002` Página `/signup` — form nome + email + telefone opcional + senha (2026-04-23)
- [x] `AUTH-PUB-003` `POST /api/auth/signup` — cria Supabase auth user + membro `verified_at=NULL` + rate limit 3/hora/IP + rollback em falha (2026-04-23)
- [x] `AUTH-PUB-004` Validação unicidade: email + telefone (chat_id coletado em /auth/verify) (2026-04-23)


---

### I4 — Recovery tri-canal

- [x] `AUTH-PUB-012` Reusa `POST /api/auth/verify/request` com `purpose='recovery'` (mesmo OTP orchestrator, TTL 10min) (2026-04-23)
- [x] `AUTH-PUB-013` Página `/recover` — escolhe canal + OTP + nova senha em single flow (2026-04-23)
- [x] `AUTH-PUB-014` `POST /api/auth/recover/reset` — re-valida OTP (defense-in-depth) + `supabase.auth.admin.updateUserById` + audit (2026-04-23)


---

### K1 — Doc sync técnico

- [x] `DOC-PUB-001` Reescrever `README.md` — badges eval/LGPD/prod, capabilities table, stack, quickstart, deploy (`rsync --exclude='.egos'` fix), governança, roadmap (2026-04-23)
- [x] `DOC-PUB-002` `docs/FEATURES.md` — 10 categorias, 100+ features com status live/beta/planned e evidência código (2026-04-23)
- [x] `DOC-PUB-003` `docs/CAPABILITIES_STATUS.md` — adicionado header HISTÓRICO (2026-04-14) + cross-ref para FEATURES.md, AUTH.md, CHATBOT_EVAL.md. Full audit diferido para DOC-PUB-003-B pós-divulgação (2026-04-23)
- [x] `DOC-PUB-004` `docs/AUTH.md` — fluxos signup/verify/login/recovery + schema + endpoints + segurança + smoke (2026-04-23)
- [x] `DOC-PUB-005` `docs/SLASH_COMMANDS.md` + `docs/PROVENANCE.md` + `docs/STREAMING.md` (2026-04-23)
- [x] `DOC-PUB-006` Auditado: `API_REFERENCE.md` + `ETL_GUIDE.md` com banner histórico (Python API legacy em egos-lab/apps/intelink-api); `BOT_ARCHITECTURE.md` + `VPS_ARCHITECTURE.md` OK (Next.js/Docker atual) (2026-04-23)


---

### K2 — Doc público não-técnico

- [x] `DOC-PUB-007` `docs/PUBLIC_OVERVIEW.md` — pitch linguagem simples (o que é, para quem, por que, pronto hoje, próximo, autoria, modelo) (2026-04-23)
- [x] `DOC-PUB-008` `docs/USE_CASES.md` — 4 casos anonimizados (busca Telegram, ingest DHPP, agente conversacional, recovery fora do expediente) + métricas piloto (2026-04-23)
- [x] `DOC-PUB-009` `docs/LGPD_COMPLIANCE.md` — bases legais (art.7,11), controles técnicos (PII/ATRiAN/audit/RBAC/criptografia/rate-limit), direitos titular, retenção, DPO-gap (2026-04-23)

