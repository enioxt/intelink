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

*Atualizado: 2026-04-18 (sessão 5c — Deploy VPS OK, webhook 200, DATA-003h smoke test ✅)*
