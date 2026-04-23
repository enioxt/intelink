# Features — Intelink (catálogo completo)

> Status: `live` (em produção) · `beta` (live, instável) · `planned` (roadmap)
> Cada feature listada aqui aponta para evidência em código ou teste (§L proof-of-function).

---

## 1. Busca & Identificação

| Feature | Status | Evidência |
|---|---|---|
| Busca por CPF no REDS local | live | `lib/neo4j/router.ts` → `personSearch` fulltext index |
| Busca por nome (fuzzy) | live | `lib/neo4j/router.ts` |
| Busca enriquecida com BOs + co-envolvidos | live | `/api/buscar` + callback `show_bos`/`show_links` |
| Card de pessoa com footer URL web | live | `app/pessoa/[id]/page.tsx`, `app/p/[id]/page.tsx` |
| Card de entidade (CNPJ) | live | `app/entity/[cnpj]/page.tsx` |
| Telegram bot `/buscar` + botões portáveis | live | `lib/intelink/commands/buscar.ts`, `lib/intelink/buttons.ts` |
| Comando `/fonte <id>` — audit metadata | live | `lib/intelink/commands/` |

## 2. Grafo & Vínculos

| Feature | Status | Evidência |
|---|---|---|
| Neo4j VPS dedicado intelink-neo4j (12.730 Person + 2.092 Occurrence) | live | `docs/VPS_ARCHITECTURE.md` |
| Neo4j público bracc-neo4j (83.7M nós, read-only) | live | `lib/neo4j/router.ts` dual-driver |
| Grafo 2D (react-force-graph-2d) | live | `app/graph/[id]/page.tsx` |
| Grafo 3D (three.js + react-force-graph-3d) | live | `app/graph/[id]/3d/page.tsx` |
| Drill-down 3 graus | live | `app/network/[id]/page.tsx` |
| ML Adamic-Adar (predição vínculos) | live | `/vinculos` command — ML-001 |
| Clustering WCC Union-Find | live | `/grupos` — ML-002 |

## 3. Ingestão & ETL

| Feature | Status | Evidência |
|---|---|---|
| PDF parsing (pdfjs) | live | `lib/intelligence/document-parser.ts` |
| DOCX parsing (mammoth) | live | — |
| OCR imagem (tesseract.js) | live | — |
| Áudio → texto (Groq Whisper) | live | — |
| LLM extraction (OpenRouter MiniMax/Gemini) | live | `lib/intelligence/entity-extractor.ts` |
| Cross-ref Neo4j (NEW/EXISTING/MERGE/CONFLICT) | live | `lib/intelligence/cross-reference-engine.ts` |
| Diff UI review (`/ingest/[job_id]`) | live | `app/ingest/[job_id]/page.tsx` |
| Upload via Telegram `/ingerir` | live | `lib/intelink/commands/` |
| ETL REDS xlsx/csv → Neo4j com `--since` | live | `scripts/etl-reds.ts` — ETL-001/002 |
| ETL fotos Telegram → Person.photo_url (2.898 fotos) | live | `scripts/etl-photos.ts` — PHOTO-001..010 |
| ETL reception_data.json → Neo4j (8.074 entradas) | live | DATA-001 |

## 4. Agente & LLM

| Feature | Status | Evidência |
|---|---|---|
| Chat web (`/chat`) com tool-calling | live | `app/api/chat/route.ts` |
| Telegram `/agente` (modo chatbot) | live | `lib/intelink/commands/agente.ts` — AGENTE-001..007 |
| Tools: buscarPessoa, getOccurrences, getLinks, getPhoto, criarProposta, lerObservacoes | live | `app/api/chat/route.ts` |
| SSE streaming opt-in (`body.stream=true`) | live | `streamChatResponse()` — INTELINK-002 |
| Fallback LLM chain (primary + secondary) | live | `lib/llm/llm-provider.ts` — INTELINK-008 |
| Memória sessão 10 turnos | live | AGENTE-004 |
| Slash commands (/help, /link, /unlink) | live | `lib/intelink/chat-slash-commands.ts` — INTELINK-004 |
| RAG context retrieval | live | `lib/intelligence/rag-context-retriever.ts` |
| Judge-LLM rubric eval | live | `tests/eval/lib/judge.ts` — EVAL-B2 |
| Trajectory exposure | live | `app/api/chat/route.ts` response — EVAL-A6 |

## 5. Segurança & Compliance

| Feature | Status | Evidência |
|---|---|---|
| PII detection + masking (CPF/RG/MASP) | live | `lib/pii-scanner.ts` + `lib/shared.ts` — INTELINK-014 |
| ATRiAN validation (epistemic markers) | live | `lib/atrian.ts` |
| Provenance hash-chained | live | `lib/intelligence/provenance.ts` + trigger `audit_log_hash_trigger` — INTELINK-003 |
| Audit log tamper-evident | live | `intelink_audit_logs` table |
| Rate limiting multi-preset | live | `lib/security/rate-limit.ts` |
| CSRF (assertSameOrigin) | live | `/api/auth/bridge` — AUTH-010 |
| JWT RS256 | live | AUTH-012 |
| Middleware route protection | live | `middleware.ts` |

## 6. Auth

| Feature | Status | Evidência |
|---|---|---|
| Signup self-service | live (novo) | `app/signup/page.tsx` — AUTH-PUB-002 |
| Verificação tri-canal (email/telegram/whatsapp¹) | live | `lib/auth/verification.ts` — AUTH-PUB-005..010 |
| Recovery tri-canal | live | `app/recover/page.tsx` — AUTH-PUB-012..014 |
| Login email/senha (Supabase) | live | `app/login/page.tsx` — AUTH-001 |
| Login Telegram widget | live | `/api/auth/telegram/callback` — AUTH-013 |
| GitHub OAuth | live (legacy, TBD) | — |
| PIN 6 dígitos (bcrypt) | live | `/api/auth/pin/*` — PIN-001..005 |
| MFA TOTP | live | `/settings/security` — AUTH-002 |
| Middleware verified_at gate | live (novo) | `middleware.ts` — AUTH-PUB-011 |
| Audit log completo | live | AUTH-PUB-016 |

¹ WhatsApp deferred: requer CNPJ Meta WABA (AUTH-PUB-008).

## 7. Contribuição & Quórum

| Feature | Status | Evidência |
|---|---|---|
| Proposta de edição (CPF + campos) | live | `intelink_proposals` + `intelink_proposal_items` |
| Quórum 3/3 auto-promove para CONFIRMADO | live | Supabase trigger — CONTRIB-005 |
| PIN verify em cada voto | live | CONTRIB-012 |
| Badge confiança 4 níveis (CONFIRMADO/PROVÁVEL/NÃO CONFIRMADO/REDS OFICIAL) | live | `lib/intelink/confidence.ts` — CONTRIB-016 |
| Observações simplificadas (1 aprovação) | live | `intelink_observations` — OBS-001..003 |

## 8. Dashboard & Analytics

| Feature | Status | Evidência |
|---|---|---|
| Dashboard home (stats Neo4j) | live | `/dashboard` — FEAT-001 |
| Painel grupos + mapa rede | live | `/inteligencia/grupos` — DASH-001 |
| Mapa de calor ocorrências | live | `/inteligencia/mapa` — MAP-001 |
| Relatório semanal `/relatorio` | live | REPORT-001 |
| Análise CRIT (capacidade/recurso/intenção/tipo) | live | `/crit` — FEAT-005 |
| Central (dashboard admin delegacia) | live | `/central/*` — 14 sub-rotas |

## 9. Framework & API

| Feature | Status | Evidência |
|---|---|---|
| REST API `/api/intelligence/*` | live | FRAME-001 |
| Init delegacia script | live | `scripts/init-delegacia.ts` |
| Alerta endpoint `/alerta` | live | ALERT-002 |
| Gateway discover `/api/internal/discover` | live | `app/api/internal/discover/route.ts` |
| PDF investigação download | live | FEAT-002 |

## 10. Eval & Observability

| Feature | Status | Evidência |
|---|---|---|
| Golden dataset 50 casos behavioral | live | `tests/eval/golden/intelink.ts` — EVAL-A2 |
| Eval runner canônico `@egos/eval-runner` | live | `packages/eval-runner/` (kernel) + vendored `tests/eval/lib/` |
| Promptfoo YAML layer | live (scaffold) | `tests/eval/promptfooconfig.yaml` — EVAL-B1 |
| Judge-LLM (Haiku 4.5 via OpenRouter) | live | EVAL-B2 |
| CI gate (`eval:ci`) | live | EVAL-A4 |
| Trajectory capture | live | EVAL-A6 |
| Unit tests vitest (102 pass) | live | TEST-001 |
| Playwright E2E specs | live (scaffold) | — |
| Smoke test auth flow | live (novo) | `scripts/smoke-auth-flow.ts` — AUTH-PUB-017 |
| Red team cron | planned | EVAL-B3 |
| RAGAS metrics | planned | EVAL-D1/D2 |
| Langfuse observability | planned | LF-INT-001..003 |

---

## Legenda

- **live:** em produção, coberto por teste/evidência
- **beta:** live mas instável ou com issues abertas
- **planned:** roadmap, sem código ainda

Total: **100+ features live** (contando sub-features com evidência mapeada).

---

## Cross-refs

- Status por capability: [CAPABILITIES_STATUS.md](CAPABILITIES_STATUS.md)
- Auth detalhado: [AUTH.md](AUTH.md)
- Eval detalhado: [CHATBOT_EVAL.md](CHATBOT_EVAL.md)
- Slash commands: [SLASH_COMMANDS.md](SLASH_COMMANDS.md)
- Provenance: [PROVENANCE.md](PROVENANCE.md)
- Streaming: [STREAMING.md](STREAMING.md)
- LGPD: [LGPD_COMPLIANCE.md](LGPD_COMPLIANCE.md)
- VPS: [VPS_ARCHITECTURE.md](VPS_ARCHITECTURE.md)

---

*Última atualização: 2026-04-23 (DOC-PUB-002). Source of truth de claims.*
