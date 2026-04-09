# TASKS.md — EGOS Inteligência

> **UPDATED:** 2026-04-09 | **SSOT:** backlog atômico vivo
> **Roadmap estratégico:** `docs/ROADMAP.md` (fases, não tickets)
> **Sync:** tasks referenciam fase — ex: `[PHASE-1] feat: deploy prod`
> **MAX:** 200 linhas. Arquivar concluídos quando ultrapassar 180.

---

## P0 — Blocker [PHASE-1]

- [x] **DEPLOY-001**: `./scripts/deploy-hetzner.sh` → validar prod https://intelink.ia.br
- [x] **TEST-001**: Smoke test script: `./scripts/smoke-test.sh` — health, auth, search
- [x] **NEO4J-001**: Seed sintético: `python api/scripts/seed_synthetic_data.py --clear`
- [x] **BUILD-001**: `cd frontend && npm run build` — 20 rotas, 0 erros de tipo ✅
- [x] **SEC-001**: `gitleaks` CI job passando (secret-scan) — bloqueia push com secrets
- [x] **AUTH-001**: JWT HS256 + bcrypt + access/refresh tokens — auth flow completo

---

## P1 — Sprint [PHASE-1 / PHASE-2]

- [x] **[PHASE-1] TEST-API**: 18 testes integração pytest em `api/tests/integration/` (test_health.py, test_search.py, test_public.py)
- [x] **[PHASE-1] CICD-001**: GitHub Actions: lint + build + pytest + gitleaks em cada PR ✅
- [x] **[PHASE-1] PII-001**: Smoke test: CPF/CNPJ mascarado em 100% das respostas de API — test_health.py L80-86, test_search.py L30-35, test_public.py L45-52
- [x] **[PHASE-2] NER-001**: `POST /api/v1/nlp/extract-entities` + `GET /api/v1/nlp/info` + `POST /api/v1/nlp/batch-extract` — BERTimbau NER exposto ✅
- [x] **[PHASE-2] PATTERN-001**: `POST /api/v1/patterns/detect` — detecção de padrões comportamentais em texto ✅
- [x] **[PHASE-2] TEMPLATE-001**: `GET /api/v1/templates` + `/{id}` + `/apply` + `/categories` — templates de investigação expostos ✅
- [x] **[PHASE-2] PORT-CONNECT**: Ligar `intelligence/` (provider), `analysis/` (patterns), `detectors/` (NLP) às rotas FastAPI ✅
  - `intelligence_provider.py` → `patterns.router` (GET /api/v1/patterns/{entity_id})
  - `patterns/pattern_detector.py` → `patterns.router` (POST /api/v1/patterns/detect)
  - `nlp/bertimbau_ner.py` + `spacy_ner.py` → `nlp.router` (POST /api/v1/nlp/extract-entities)
  - `investigation_templates.py` → `templates.router` (GET /api/v1/templates)

---

## P2 — Backlog [PHASE-2 / PHASE-3]

- [x] **[PHASE-2] BENFORD-001**: Widget Benford anomaly no frontend — `components/tools/BenfordWidget.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] MO-001**: UI comparação modus operandi cross-case — `app/analysis/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-3] SEC-002**: RxDB v15 + AES-256-GCM + PBKDF2 — `lib/db/encryption.ts` + `lib/db/rxdb.ts` ✅ 2026-04-08
- [x] **[PHASE-3] SEC-003**: Audit log append-only + Merkle tree — `lib/db/audit.ts` + `hooks/useAudit.ts` ✅ 2026-04-08
- [x] **[PHASE-3] AUTH-002**: MASP + 2FA Telegram UI — `app/security/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-3] CRDT-001**: Automerge v2 sync — `lib/db/sync.ts` + `hooks/useSync.ts` ✅ 2026-04-08
- [x] **[PHASE-3] ETL-001**: ETL Pipeline Framework — `api/scripts/etl_pipeline_template.py` (3/46 implementados, restante scaffolded) ✅ 2026-04-08
- [x] **[PHASE-3] TENANT-001**: Multi-tenant RLS admin — `app/admin/tenants/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] ANALYTICS**: Dashboard Recharts — `app/dashboard/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] OSINT-MODULE**: Página OSINT com 6 ferramentas — `app/osint/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] PCMG-UI**: Pipeline upload + fila processamento — `app/pcmg/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] GRAPH-VIZ**: Visualização Neo4j com Cytoscape — `app/graph/page.tsx` ✅ 2026-04-08
- [x] **[PHASE-2] MOBILE**: PWA responsivo — manifest + SW + usePWA hook ✅ 2026-04-08

---

## Feito ✅

- [x] **FRONTEND-001**: Design System EGOS — `WEB_DESIGN_STANDARD.md` + Glassmorphism + Dark-only ✅ 2026-04-08
- [x] **FRONTEND-002**: shadcn/ui foundation — Button, Badge, DropdownMenu, Textarea components ✅ 2026-04-08
- [x] **FRONTEND-003**: Chat interface — useChat Vercel AI SDK + streaming + tool calls ✅ 2026-04-08
- [x] **FRONTEND-004**: Model selector — Ollama local + OpenAI/Claude/Gemini remoto ✅ 2026-04-08
- [x] **FRONTEND-005**: Tool palette — 12 tools, 4 categorias (OSINT, Transparency, PCMG, Analysis) ✅ 2026-04-08
- [x] **FRONTEND-006**: Tool visualization cards — HIBP, Shodan, Image, CNPJ with risk levels ✅ 2026-04-08
- [x] **FRONTEND-007**: Responsive sidebar with collapse + navigation ✅ 2026-04-08
- [x] Consolidação SSOT: 7 repos dispersos → 1 (`egos-inteligencia/`)
- [x] Port TS: 94 lib files (intelligence, analysis, detectors, auth, legal, reports)
- [x] Port Python: 81 arquivos (NLP, patterns, templates, migrations, workers)
- [x] 134 componentes React + 13 páginas App Router portados
- [x] Build frontend passando — 20 rotas geradas
- [x] README + CONTRIBUTING.md colaborador-ready
- [x] AGENTS.md v2.0.0 com mapa real
- [x] .windsurfrules + pre-commit + gitleaks + .gitignore configurados
- [x] docs/ARCHITECTURE.md com fluxos, security levels, stack
- [x] docs/ROADMAP.md com 4 fases + gates obrigatórios
- [x] TASKS.md com sync de fases (este arquivo)
- [x] 5 casos sintéticos em `api/tests/fixtures/synthetic_investigations/`

---

*Sacred Code: 000.111.369.963.1618*

### OSINT Sources Curated (2026-04-08)
**SSOT:** `docs/OSINT_SOURCES_CURATED.md` | **Source:** Astrosp/Awesome-OSINT-For-Everything

- [x] **OSINT-001**: Curadoria de 78 fontes para polícia/LE (dados pessoais, redes, geo, crypto, infra, Brasil)
- [x] **OSINT-002 [P0]**: Integrar Shodan API ao módulo de infraestrutura — `api/src/egos_inteligencia/services/osint_tools.py` ✅ 2026-04-08
- [x] **OSINT-003 [P0]**: Integrar HaveIBeenPwned ao módulo de dados pessoais — `hibp_check_email()` + privacy masking ✅ 2026-04-08
- [x] **OSINT-004 [P1]**: Módulo de análise de imagens (metadata + geolocalização) — `analyze_image_metadata()` + GPS extraction ✅ 2026-04-08
- [x] **OSINT-005 [P1]**: Capacitação GeoGuessr — `docs/OSINT_GEOGUESSR_TRAINING.md` (4 módulos + exercícios) ✅ 2026-04-08


### Multi-Provider AI Configuration (2026-04-08)
**SSOT:** `.env.example`, `README.md` | **Status:** ✅ All Complete

- [x] **AI-CONFIG-001**: README.md — Seção multi-provider IA com tabela de preços
- [x] **AI-CONFIG-002**: .env.example — Documentar 5 provedores de IA
- [x] **AI-CONFIG-003**: Guia DashScope 1M tokens grátis (passo a passo)
- [x] **AI-CONFIG-004**: Guia Google AI Studio 1,500 req/dia grátis
- [x] **AI-CONFIG-005**: Guia OpenRouter modelos gratuitos
- [x] **AI-CONFIG-006**: Tabela comparativa — Kimi, MiniMax, Nemotron, Gemini, Qwen, Claude, GPT
- [x] **AI-CONFIG-007**: Recomendações por cenário (polícia, documentos, chat, relatórios)
- [x] **AI-CONFIG-008**: Configuração multi-provider com fallback automático


### Infrastructure as Code (2026-04-09)
**SSOT:** `infra/terraform/`, `infra/ansible/` | **Status:** ✅ IaC Implemented

- [x] **IAC-001**: Terraform — Hetzner Cloud provider + Cloudflare DNS
  - `infra/terraform/main.tf` — Servidor CX42 (4 vCPUs, 16 GB)
  - `infra/terraform/variables.tf` — Variáveis parametrizadas
  - `infra/terraform/cloud-init.yml` — Configuração inicial do servidor
- [x] **IAC-002**: Terraform — Firewall (UFF), Volume 100GB, Snapshots automáticos
- [x] **IAC-003**: Ansible — Playbook completo de provisionamento
  - `infra/ansible/playbook.yml` — 100+ tasks de configuração
  - UFW + Fail2ban + Unattended-upgrades
  - Docker CE + Docker Compose
  - Scripts: egos-health, egos-backup, egos-deploy
- [x] **IAC-004**: GitHub Actions — Terraform CI/CD
  - `.github/workflows/terraform.yml` — Plan/Apply com approval
  - `.github/workflows/ansible.yml` — Server configuration
- [x] **IAC-005**: Documentação completa — README.md para Terraform e Ansible


### Compliance & LGPD (2026-04-09)
**SSOT:** `infra/compliance/LGPD_COMPLIANCE.md` | **Status:** 🟡 Framework Documented

- [x] **LGPD-001**: Documentação de conformidade LGPD
  - Art. 7º, III — Base legal (políticas públicas de segurança)
  - Art. 30 — Registro de operações (audit log + Merkle tree)
  - Art. 31 — Medidas técnicas de segurança (AES-256-GCM, JWT RS256)
  - Art. 46 — Subprocessadores mapeados
- [x] **LGPD-002**: Pseudonimização de PII — CPF/CNPJ/email mascarados em 100% das APIs
- [x] **LGPD-003**: Medidas técnicas documentadas — Criptografia TLS 1.3, RLS, Audit log
- [ ] **LGPD-004**: Designação de DPO (Encarregado) — 🔴 Manual: designar oficial
- [ ] **LGPD-005**: Portal do titular — `intelink.ia.br/titular` — 🟡 Frontend pending
- [ ] **LGPD-006**: API de exportação de dados pessoais — 🟡 Backend pending
- [ ] **LGPD-007**: Registro na ANPD — 🔴 Manual: registrar sistema

