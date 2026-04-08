# TASKS.md — EGOS Inteligência

> **UPDATED:** 2026-04-09 | **SSOT:** backlog atômico vivo
> **Roadmap estratégico:** `docs/ROADMAP.md` (fases, não tickets)
> **Sync:** tasks referenciam fase — ex: `[PHASE-1] feat: deploy prod`
> **MAX:** 200 linhas. Arquivar concluídos quando ultrapassar 180.

---

## P0 — Blocker [PHASE-1]

- [ ] **DEPLOY-001**: `./scripts/deploy-hetzner.sh` → validar prod https://intelink.ia.br
- [ ] **TEST-001**: Smoke: `POST /api/v1/auth/login` → `GET /health` → `POST /api/v1/search`
- [ ] **NEO4J-001**: Conectar Neo4j local (77M+ nós) ou seed sintético: `python api/scripts/seed_synthetic_data.py`
- [ ] **BUILD-001**: `cd frontend && npm run build` + corrigir 225 erros de tipo (implicit any)
- [ ] **SEC-001**: `gitleaks` instalado e passando no CI (bloqueia push sem scan)
- [ ] **AUTH-001**: JWT RS256 + bcrypt 14r + HttpOnly refresh cookie — auth flow completo

---

## P1 — Sprint [PHASE-1 / PHASE-2]

- [ ] **[PHASE-1] TEST-API**: ≥ 10 testes integração pytest passando em `api/tests/integration/`
- [ ] **[PHASE-1] CICD-001**: GitHub Actions: lint + build + pytest + gitleaks em cada PR
- [ ] **[PHASE-1] PII-001**: Smoke test: CPF/CNPJ mascarado em 100% das respostas de API
- [ ] **[PHASE-2] NER-001**: `POST /api/v1/nlp/extract-entities` → expor `bertimbau_ner.py`
- [ ] **[PHASE-2] PATTERN-001**: `POST /api/v1/patterns/detect` → expor `pattern_detector.py`
- [ ] **[PHASE-2] TEMPLATE-001**: `GET /api/v1/templates` → expor `investigation_templates.py`
- [ ] **[PHASE-2] PORT-CONNECT**: Ligar `intelligence/`, `analysis/`, `detectors/` às rotas FastAPI

---

## P2 — Backlog [PHASE-2 / PHASE-3]

- [ ] **[PHASE-2] BENFORD-001**: Widget Benford anomaly no frontend
- [ ] **[PHASE-2] MO-001**: UI comparação modus operandi cross-case
- [ ] **[PHASE-3] SEC-002**: RxDB v15 + AES-256-GCM + PBKDF2 (dados locais criptografados)
- [ ] **[PHASE-3] SEC-003**: Audit log append-only + Merkle tree
- [ ] **[PHASE-3] AUTH-002**: MASP + 2FA Telegram + bcrypt 14r
- [ ] **[PHASE-3] CRDT-001**: Automerge v2 — sync offline multi-device
- [ ] **[PHASE-3] ETL-001**: Retomar 46 pipelines ETL (Base dos Dados, RF, TCU)
- [ ] **[PHASE-3] TENANT-001**: Multi-tenant RLS por delegacia (tenant_id)
- [ ] **[PHASE-2] ANALYTICS**: Dashboard Recharts (investigações, entidades, acessos)
- [ ] **[PHASE-2] MOBILE**: PWA responsivo — teste Android tablet

---

## Feito ✅

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
- [ ] **OSINT-002 [P0]**: Integrar Shodan API ao módulo de infraestrutura
- [ ] **OSINT-003 [P0]**: Integrar HaveIBeenPwned ao módulo de dados pessoais  
- [ ] **OSINT-004 [P1]**: Módulo de análise de imagens (metadata + geolocalização)
- [ ] **OSINT-005 [P1]**: Capacitação analistas GeoGuessr + exercícios

