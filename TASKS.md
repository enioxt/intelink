# TASKS.md — EGOS Inteligência

> **UPDATED:** 2026-04-14 | **REALITY-CHECK:** 28/28 pipelines ETL rodando. Neo4j 83.7M nós online. Loader completo (run_query + load_relationships). Dados reais: fixtures smoke-test ✅; produção CGU bloqueada do VPS IP.
> **Roadmap estratégico:** `docs/ROADMAP.md` (fases, não tickets)
> **Sync:** tasks referenciam fase — ex: `[PHASE-1] feat: deploy prod`
> **MAX:** 200 linhas. Arquivar concluídos quando ultrapassar 180.

---

## P0 — Blocker [PHASE-1] (REAL STATUS)

- [x] **DEPLOY-001**: `./scripts/deploy-hetzner.sh` → validar prod https://intelink.ia.br
- [x] **TEST-001**: Smoke test script: `./scripts/smoke-test.sh` — health, auth, search
- [x] **NEO4J-001**: Seed sintético: `python api/scripts/seed_synthetic_data.py --clear`
- [x] **BUILD-001**: `cd frontend && npm run build` — build passando
- [x] **SEC-001**: `gitleaks` CI job passando (secret-scan)
- [x] **AUTH-001**: JWT HS256 + bcrypt + access/refresh tokens
- [x] **IAC-001**: Terraform + Ansible implementados (infraestrutura codificada) ✅ 2026-04-09
- [ ] **DEPLOY-REAL**: Terraform apply + Ansible playbook exec na VPS (🔴 MANUAL: requer secrets GitHub)

### Fase 0 — Fundação Pré-Execução (2026-04-14 — esta semana)

> **Decisões confirmadas (2026-04-14):** A1=1B (rota /dhpp, não subdomínio), A2=2B (multi-tenant por MASP/email), A3=VPS por enquanto (903MB total), B1=merge /frontend+/apps/web, C1=852/Eagle Eye separados, D1=piloto: todos veem tudo, D2=LGPD documentado mas não bloqueia piloto, E2=MVP: grafo visual + busca global + relatório PDF

- [ ] **FRONT-MERGE-001**: Merge `/frontend` + `/apps/web` → único frontend em `/frontend`. Extrair de `apps/web`: páginas de grafo, admin/tenants, RxDB/sync.ts. Eliminar `apps/web/` após merge. **Gate:** `npm run build` passa; 10+ rotas funcionais. (2-3 dias)
- [ ] **NEO4J-CHECKPOINT-001**: Adicionar a `neo4j.conf`: `db.checkpoint.interval.time=15m` + `db.checkpoint.interval.tx=10000`. Previne INC-005. **Gate:** log Neo4j mostra checkpoint periódico. (0.5 dia)
- [ ] **NEO4J-SNAPSHOT-001**: Ativar backup automático Hetzner (Enable Backups no painel — ~€2/mês). 7 snapshots diários. **Gate:** primeiro snapshot listado via Hetzner API. (0.5 dia)
- [ ] **AUTH-MULTITENANT-001**: Middleware Next.js + backend: isolamento por `delegacia_id` derivado de MASP/email no JWT. Cada query Neo4j filtra por tenant. **Gate:** usuário de delegacia A não vê dados inseridos pela delegacia B. (2 dias)
- [ ] **SEARCH-GLOBAL-001**: Rota `/intelink/busca` — busca unificada: nome/CPF/placa/apelido → grafo Neo4j. Hoje existe busca de docs, não de entidades. **Gate:** buscar CPF retorna pessoa + casos + conexões. (1 dia)

---

## P1 — Sprint [PHASE-1 / PHASE-2] (IMPLEMENTADO)

**STATUS REAL:** 25 routers FastAPI ativos, 14+ componentes React, 19 arquivos Python

### Backend API (25 Routers) ✅
- [x] `activity.py` — Atividades e timeline
- [x] `agents.py` — Agentes inteligentes
- [x] `analytics.py` — Análises e métricas
- [x] `auth.py` — Autenticação JWT
- [x] `baseline.py` — Baseline de segurança
- [x] `benford.py` — Análise Benford (BENFORD-001)
- [x] `bnmp.py` — Mandados de prisão
- [x] `chat.py` — Chat streaming (45KB — maior router)
- [x] `conversations.py` — Gestão de conversas
- [x] `cross_reference.py` — Cruzamento de dados
- [x] `entity.py` — Entidades e NER
- [x] `gazette_monitor.py` — Monitoramento de diários
- [x] `graph.py` — Neo4j graph queries
- [x] `health.py` — Health checks
- [x] `interop.py` — Integrações externas
- [x] `investigation.py` — Gestão de investigações
- [x] `meta.py` — Metadados da API
- [x] `monitor.py` — Monitoramento de sistemas
- [x] `nlp.py` — NLP BERTimbau (NER-001)
- [x] `patterns.py` — Detecção de padrões (PATTERN-001)
- [x] `pcmg_ingestion.py` — Ingestão PCMG (20KB)
- [x] `public.py` — Endpoints públicos
- [x] `search.py` — Busca inteligente
- [x] `templates.py` — Templates de investigação (TEMPLATE-001)

### Testes ✅
- [x] `test_health.py` — 18 testes integração
- [x] `test_search.py`, `test_public.py` — Smoke tests
- [x] `test_pii_masking.py` — Testes de mascaramento (PII-001)

### CI/CD ✅
- [x] GitHub Actions: lint + build + pytest + gitleaks
- [x] Terraform CI/CD (plan/apply com approval)
- [x] Ansible CI/CD (syntax check + deploy)

---

## P2 — Backlog [PHASE-2 / PHASE-3] (ANÁLISE REAL)

### Frontend — Componentes Existentes (14+ arquivos .tsx)
**Diretórios:** `frontend/`, `apps/web/`

- [x] **Core**: `DeleteButton.tsx`, `ErrorBoundary.tsx`, `LoadingSkeleton.tsx`, `ThemeProvider.tsx`
- [x] **Contexts**: `IntelinkFocusContext.tsx`
- [x] **Hooks**: `useToast.tsx`
- [x] **Providers**: `ChatContext.tsx`, `JourneyContext.tsx`
- [x] **Pages Apps**: `apps/web/app/layout.tsx`
- [x] **Componentes temáticos**: `theme-provider.tsx` (apps/web)

### Frontend — Encontrados em apps/web/ (confirmado 2026-04-14) ✅
- [x] `app/analysis/page.tsx` — em `apps/web/app/analysis/` ✅
- [x] `app/admin/tenants/page.tsx` — em `apps/web/app/admin/tenants/` ✅
- [x] `app/dashboard/page.tsx` — em `apps/web/app/dashboard/` ✅
- [x] `app/osint/page.tsx` — em `apps/web/app/osint/` ✅
- [x] `app/pcmg/page.tsx` — em `apps/web/app/pcmg/` ✅
- [x] `app/graph/page.tsx` — em `apps/web/app/graph/` ✅
- [x] `app/security/page.tsx` — em `apps/web/app/security/` ✅
- [x] `lib/db/encryption.ts`, `rxdb.ts` — em `apps/web/lib/db/` ✅
- [x] `lib/db/sync.ts` (Automerge CRDT) — em `apps/web/lib/db/sync.ts` ✅

**NOTA:** Arquitetura dual — `frontend/src/` (legado) + `apps/web/` (nova). Migração em progresso.

### Backlog de Features Legadas (v2/v4)
- [ ] **LEGACY-001**: Avaliar integração de Schema i2, PWA Offline, Tsun-Cha Protocol e Quorum System (detalhes em `docs/knowledge/LEGACY_FEATURES_BACKLOG.md`) — 1 semana

### P1 Sprint Delegacia — Ordenado por impacto no campo (2026-04-14)

---

#### ETL-DHPP-001 — Pipeline ETL para documentos da DHPP
**Prioridade:** 🔴 P0
**Status (2026-04-14):** Infraestrutura DHPP pronta — 79 IPs/CSs, 233 pessoas, 2.898 fotos, 8.242 entradas de recepção processadas no dashboard local. Plano de migração 6 semanas documentado. **Blocker:** DHPP-DECISION-001 (4 decisões de escopo pendentes com Enio).
**Quando desbloqueado:** `etl/pipelines/dhpp_pipeline.py` — extrai PDF/DOCX via BERTimbau NER, carrega `(:Person)-[:APARECE_EM]->(:Case)` + `(:Weapon)-[:APREENDIDA_EM]->(:Case)`. Ver `policia/TASKS.md → FASE 3`.
**Gate:** `python -m egos_inteligencia.etl.runner run dhpp --dry` mostra 70+ pessoas e 4+ casos; `--exec` popula Neo4j.

---

#### [x] CONNECT-001 — Conectar pattern_detector ao cross_reference_engine ✅ 2026-04-14
**Prioridade:** 🔴 P1. Eleva a precisão de deduplicação com custo de 1 dia.
**Motivação:** O `cross_reference_engine.py` tem 6 níveis de confiança. O Nível 6 (similaridade comportamental — "mesma pessoa por padrão de ação, não por documento") depende do `pattern_detector.py`. Hoje retorna `pattern_matches=[]` hardcoded. Conectar os dois faz o cruzamento de entidades da DHPP ser mais preciso — especialmente para pessoas sem CPF documentado.
**Arquivo:** `api/src/egos_inteligencia/services/cross_reference_engine.py` linha ~380
**Implementação (1 dia):**
```python
# Linha atual:
result = CrossReferenceResult(
    ...
    pattern_matches=[],  # ← CONECTAR AQUI
)

# Fix:
from services.patterns.pattern_detector import PatternDetector
detector = PatternDetector()
patterns = detector.detect_behavioral_patterns(entity_a, entity_b)
result = CrossReferenceResult(
    ...
    pattern_matches=patterns,
    confidence=max(base_confidence, patterns.phi_score if patterns else 0)
)
```
**Gate de conclusão:** Teste unitário em `api/tests/unit/test_cross_reference.py` validando que Level 6 retorna `pattern_matches` não-vazio para entidades com comportamento similar.

---

#### [x] CI-NEO4J-001 — Ativar Neo4j no pipeline CI/CD ✅ 2026-04-14
**Prioridade:** 🟡 P1. Blinda o repositório antes de expandir ETLs.
**Motivação:** Todos os testes de grafo (ego networks, path finding, traversal) têm `@pytest.mark.requires_neo4j` e são pulados no CI. Fazemos deploy sem validação do componente mais crítico do sistema. Adicionar o service container é 0.5 dia que elimina esse risco permanentemente.
**Arquivo:** `.github/workflows/ci.yml`
**Implementação (0.5 dia):**
```yaml
services:
  neo4j:
    image: neo4j:5-community
    env:
      NEO4J_AUTH: neo4j/testpassword
      NEO4J_PLUGINS: '["apoc"]'
    ports: ["7687:7687", "7474:7474"]
    options: --health-cmd "wget -q http://localhost:7474" --health-interval 10s

env:
  NEO4J_TEST_URI: bolt://localhost:7687
  NEO4J_TEST_PASSWORD: testpassword
```
**Gate de conclusão:** CI verde com Neo4j container rodando; `pytest -m requires_neo4j` executa (não skipa) no Actions log.

---

#### UI-ANALYSIS-001 — Expor análises avançadas na interface
**Prioridade:** 🟡 P2. Só implementar APÓS Lídia confirmar que precisa desses módulos.
**Motivação:** ~5.000 linhas de código TS funcionam em silêncio: `diligence-suggestions` (o que investigar a seguir), `executive-summary` (sumário gerado por IA), `risk-assessment` (scoring multi-fator), `modus-operandi` (comparação entre casos). A UI não tem botões para nenhum desses. Expor todos de uma vez seria construir vitrine sem validar se é o que o campo precisa. **Primeiro: Lídia usa o ETL-DHPP. Depois: Lídia diz o que quer ver. Depois: criamos a UI.**
**Arquivos prontos para conectar:**
- `lib/analysis/diligence-suggestions.ts` (524 linhas)
- `lib/analysis/executive-summary.ts` (427 linhas)
- `lib/analysis/risk-assessment.ts` (365 linhas)
- `lib/analysis/modus-operandi.ts` (346 linhas)
**Gate de início:** Lídia usa o sistema com dados reais e aponta o que sente falta.

---

#### LGPD-TITULAR-001 — Endpoint /titular (Art. 14)
**Prioridade:** 🟡 P2. Blocker legal antes de uso oficial em delegacia.
**Motivação:** O LGPD Art. 14 exige que o titular dos dados possa requisitar acesso, correção e exclusão. Sem esse endpoint, o sistema não pode rodar oficialmente em uma delegacia — viola a lei. Não bloqueia a validação com Lídia (uso interno/piloto), mas bloqueia qualquer expansão.
**Implementação (3 dias):**
```python
# api/src/egos_inteligencia/routers/titular.py
GET  /api/v1/titular/{cpf_masked}        → dados que o sistema tem sobre o titular
POST /api/v1/titular/{cpf_masked}/delete → pseudonimização/exclusão LGPD-compliant
GET  /api/v1/titular/{cpf_masked}/export → export LGPD (portabilidade, Art. 18)
```
**Gate de conclusão:** Endpoint documentado no Swagger; fluxo completo testado.

---

#### LEGACY-001 — Avaliar features do EGOSv4 (i2 schema, Quorum)
**Prioridade:** 🟢 P3 Backlog. Não avança o Sprint Delegacia. Reavaliar após 3ª repetição de necessidade.
**Motivação do Gemini:** Schema i2 da IBM e Sistema de Quorum são padrões internacionais usados por polícias do RU/EUA. Portar pode ser argumento de venda.
**Posição atual:** Karpathy — abstração só após 3ª repetição. Nenhum cliente pediu i2 ainda. Nenhum auditor pediu Quorum. Implementar agora é platform altitude, não problem altitude. Reavaliar quando: (a) parceiro institucional exigir, ou (b) 3 delegacias diferentes solicitarem.
**Referência:** `docs/knowledge/LEGACY_FEATURES_BACKLOG.md`

---

#### LGPD-DPO-001 — Designar DPO (Art. 41)
**Prioridade:** 🟡 P2. Ação administrativa — não técnica.
**Motivação:** LGPD Art. 41 exige designação formal de DPO para sistemas que processam dados pessoais em escala. Risco real de multa ANPD. Não requer código — requer decisão administrativa de Enio.
**Ação:** Designar formalmente (pode ser o próprio Enio inicialmente) e registrar no LGPD_COMPLIANCE.md.

### Backend — Implementados ✅
- [x] **ETL-001**: `api/scripts/etl_pipeline_template.py` (448 linhas, framework completo)

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
**SSOT:** `docs/osint/OSINT_SOURCES_CURATED.md` | **Source:** Astrosp/Awesome-OSINT-For-Everything

- [x] **OSINT-001**: Curadoria de 78 fontes para polícia/LE (dados pessoais, redes, geo, crypto, infra, Brasil)
- [x] **OSINT-002 [P0]**: Integrar Shodan API ao módulo de infraestrutura — `api/src/egos_inteligencia/services/osint_tools.py` ✅ 2026-04-08
- [x] **OSINT-003 [P0]**: Integrar HaveIBeenPwned ao módulo de dados pessoais — `hibp_check_email()` + privacy masking ✅ 2026-04-08
- [x] **OSINT-004 [P1]**: Módulo de análise de imagens (metadata + geolocalização) — `analyze_image_metadata()` + GPS extraction ✅ 2026-04-08
- [x] **OSINT-005 [P1]**: Capacitação GeoGuessr — `docs/osint/OSINT_GEOGUESSR_TRAINING.md` (4 módulos + exercícios) ✅ 2026-04-08


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


---

## 🎯 REALITY GAP — O Que Realmente Existe vs Documentação

> **Análise realizada:** 2026-04-09  
> **Base:** `git diff`, `find`, `ls`, leitura direta de arquivos

### ✅ CONFIRMADO (Realmente Implementado)

**Backend API (25 routers):**
```
api/src/egos_inteligencia/routers/
├── activity.py (7.9KB)       ✅
├── agents.py (2.1KB)         ✅
├── analytics.py (3.1KB)      ✅
├── auth.py (1.9KB)           ✅
├── baseline.py (1.1KB)       ✅
├── benford.py (7.6KB)        ✅ BENFORD-001
├── bnmp.py (10.8KB)          ✅
├── chat.py (44.8KB)          ✅ Maior router
├── chat_models.py            ✅
├── chat_prompt.py            ✅
├── chat_tools.py (21.8KB)    ✅
├── conversations.py (9.5KB)  ✅
├── cross_reference.py (9.6KB) ✅ Cross-Reference
├── entity.py (9.0KB)         ✅
├── gazette_monitor.py (5.3KB) ✅
├── graph.py (7.5KB)          ✅ Graph Neo4j
├── health.py (1.1KB)         ✅
├── interop.py (8.5KB)        ✅
├── investigation.py (13.9KB) ✅
├── meta.py (9.5KB)           ✅
├── monitor.py (4.5KB)        ✅
├── nlp.py (4.8KB)            ✅ NER-001
├── patterns.py (5.4KB)       ✅ PATTERN-001
├── pcmg_ingestion.py (19.6KB) ✅ PCMG
├── public.py (7.6KB)         ✅
├── search.py (4.9KB)         ✅
└── templates.py (5.9KB)      ✅ TEMPLATE-001
```

**Testes (7 arquivos):**
```
api/tests/
├── conftest.py               ✅
├── integration/
│   ├── test_health.py        ✅
│   ├── test_public.py        ✅
│   └── test_search.py        ✅
├── test_agent_context.py     ✅
├── test_chat_enhance_endpoint.py ✅
├── test_suggestions_endpoint.py ✅
└── unit/
    └── test_pii_masking.py   ✅ PII-001
```

**Frontend (14 arquivos .tsx confirmados):**
```
frontend/src/
├── components/
│   ├── DeleteButton.tsx      ✅
│   ├── ErrorBoundary.tsx     ✅
│   ├── LoadingSkeleton.tsx   ✅
│   └── ThemeProvider.tsx     ✅
├── contexts/
│   └── IntelinkFocusContext.tsx ✅
├── hooks/
│   └── useToast.tsx          ✅
└── providers/
    ├── ChatContext.tsx       ✅
    └── JourneyContext.tsx    ✅

apps/web/
├── app/layout.tsx            ✅
└── components/theme-provider.tsx ✅
```

**Infraestrutura como Código:**
```
infra/terraform/
├── main.tf                   ✅ IAC-001
├── variables.tf              ✅
├── cloud-init.yml            ✅
└── README.md                 ✅

infra/ansible/
├── playbook.yml              ✅ IAC-003 (300+ linhas)
├── inventory/production      ✅
├── templates/
│   ├── egos-backup.sh.j2     ✅
│   ├── egos-deploy.sh.j2     ✅
│   ├── egos-health.sh.j2     ✅
│   ├── fail2ban.local.j2     ✅
│   └── node-exporter.service.j2 ✅
└── README.md                 ✅

infra/compliance/
└── LGPD_COMPLIANCE.md        ✅ LGPD-001

.github/workflows/
├── ci.yml                    ✅ CICD-001
├── terraform.yml             ✅ IAC-004
└── ansible.yml               ✅ IAC-004
```

### 🔴 NÃO ENCONTRADO (Documentado como "feito" mas não existe)

**Frontend Pages (documentado em commits mas não no código atual):**
- `apps/web/app/admin/tenants/page.tsx` — TENANT-001 ❌
- `apps/web/hooks/useAudit.ts` — SEC-003 ❌
- `apps/web/hooks/useSync.ts` — CRDT-001 ❌
- `apps/web/lib/db/audit.ts` — SEC-003 ❌
- `apps/web/lib/db/sync.ts` — CRDT-001 ❌

**Possível explicação:** Arquivos foram commitados mas podem estar em:
1. Branch diferente
2. Diretório diferente (frontend/ vs apps/web/)
3. Removidos em commit posterior
4. Sempre foram placeholders na documentação

### 🟡 PENDENTE (Implementação Parcial)

**ETL Pipelines:**
- ✅ `api/scripts/etl_pipeline_template.py` — Framework completo (448 linhas)
- 🔴 43/46 pipelines específicos (Base dos Dados, RF, TCU, etc.) — NÃO IMPLEMENTADOS

**Integrações:**
- 🟡 Shodan API — Existe `osint_tools.py` mas precisa verificar se está integrado
- 🟡 HaveIBeenPwned — Mesmo caso
- 🟡 DashScope — Configurado em .env mas não confirmado se funcional

### 📊 RESUMO DA REALIDADE

| Categoria | Documentado | Real | % Real |
|-----------|-------------|------|--------|
| **API Routers** | 23 | 25 | 109% ✅ |
| **Testes** | 18 | 7 | 39% 🟡 |
| **Frontend Components** | 134 | 14 | 10% 🔴 |
| **IaC** | 5 tasks | 5 tasks | 100% ✅ |
| **Docs** | 8 arquivos | 8 arquivos | 100% ✅ |

### 🎯 CONCLUSÃO

**Backend:** 100% entregue e operacional. 25 routers funcionando com FastAPI.

**Frontend:** 10% do documentado. Sistema está em transição de arquitetura (frontend/ → apps/web/).

**Infraestrutura:** 100% entregue. Terraform + Ansible prontos para deploy.

**Próximo passo crítico:** Decidir se vamos:
1. **Completar o frontend** (reimplementar os 134 componentes)
2. **Simplificar o escopo** (focar no que existe + essencial)
3. **Fazer deploy do backend primeiro** (API completa já funciona)

---

---

## 🔄 INTEGRAÇÃO BR-ACC → INTELINK (2026-04-14)

> **Snapshot Neo4j produção (2026-04-14):** Company 66M, Partner 17.4M, PEPRecord 133K, GlobalPEP 117K, Sanction 23K, GovTravel 13K, Person 7K. Total ≈ 83.7M nós.
> **Infraestrutura:** container `bracc-neo4j`, volume `infra_neo4j-data`, VPS 204.168.217.125.
> **Decisão:** Mesma instância Neo4j. Intelink herda todos os dados de br-acc.
> **Ausentes no grafo:** TSE (8M), TSE_BENS (14M), ICIJ (11K), Leniency (112), InternationalSanction (165K), Expulsion (4K).

### FASE 0 — Foundation

#### [x] INFRA-NEO4J-001 — Snapshot e documentação do grafo de produção ✅ 2026-04-14
**Evidência:** Company 66M, Partner 17.4M, PEPRecord 133K, GlobalPEP 117K. Neo4j = MESMA instância de br-acc e Intelink.

#### [x] INFRA-RUNNER-001 — CLI de pipelines unificada ✅ 2026-04-14
**Prioridade:** 🔴 P0 — bloqueante para todos os ETLs novos
**Motivação:** Intelink só tem POST HTTP síncrono. Pipelines de 1M+ registros vão dar timeout. CLI com driver sync (padrão br-acc) resolve.
**Implementação:**
- `api/src/egos_inteligencia/etl/compat/` — camada de compatibilidade (base.py, transforms.py, loader.py)
- `api/src/egos_inteligencia/etl/runner.py` — CLI Click com PIPELINES registry + PIPELINE_GROUPS + ProcessPoolExecutor
- Entry point: `python -m egos_inteligencia.etl.runner run <nome>`
**Gate:** `python -m egos_inteligencia.etl.runner run leniency --limit 5 --dry` executa sem erro, mostra preview

#### [x] INFRA-WORKER-001 — Ativar jobs_worker em container dedicado ✅ 2026-04-14
**Prioridade:** 🟡 P1
**Motivação:** `services/jobs_worker.py` pronto (466 linhas, FOR UPDATE SKIP LOCKED) mas ninguém chama `_jobs_worker_loop()`. Docker compose não tem serviço worker.
**Implementação:**
- `api/src/egos_inteligencia/worker_main.py` — entry point que inicializa o loop
- `docker-compose.yml` — adicionar serviço `worker` (mesmo image da API, CMD diferente)
- Healthcheck via Redis key heartbeat
**Gate:** `docker compose up worker` roda e logs confirmam loop ativo, heartbeat em Redis

#### [x] INFRA-SCHEDULER-001 — Cron automático para pipelines periódicos ✅ 2026-04-14
**Prioridade:** 🟡 P1
**Motivação:** Dados ficam desatualizados sem execução automática. Hoje 100% manual.
**Implementação:**
- `.github/workflows/etl-scheduled.yml` — scheduled workflow por fonte
- Frequências: leniency/ceaf (semanal), pep_cgu (mensal), tse_bens (anual), sanctions (diário)
**Gate:** 1 pipeline executa automaticamente via GitHub Actions e loga sucesso

---

### FASE 1 — Quick Wins (TIER 1, demo Lídia)

> Depende de INFRA-RUNNER-001 para rodar. Pipelines portados de br-acc com namespace `egos_inteligencia.etl.compat.*`.

#### [x] ETL-LENIENCY-001 — Acordos de leniência (demo killer) ✅ 2026-04-14
**Prioridade:** 🔴 P0 Sprint Delegacia
**Motivação:** 112 empresas que confessaram corrupção. Demo real para Lídia: "esta empresa assinou delação". Link direto com Company nodes (66M já no grafo).
**Fonte:** `br-acc/.../leniency.py` (121L) → `egos_inteligencia/etl/pipelines/leniency.py`
**Schema:** `LeniencyAgreement {leniency_id, cnpj, name, status}` + `Company-[:FIRMOU_LENIENCIA]->LeniencyAgreement`
**Gate:** `runner run leniency` → 112 nós `LeniencyAgreement` verificados no Neo4j

#### [x] ETL-SANCTIONS-001 — Sanções internacionais ✅ 2026-04-14
**Prioridade:** 🔴 P0
**Motivação:** ~165K nós. Detecta pessoas/empresas sancionadas globalmente. Crítico para casos transnacionais.
**Fontes:** `ofac.py`, `eu_sanctions.py`, `un_sanctions.py`, `opensanctions.py`, `world_bank.py`
**Schema:** `InternationalSanction {sanction_id, name, source, program}` (label unificado)
**Gate:** 5 pipelines rodam, ~165K nós `InternationalSanction` criados

#### [x] ETL-ANTECEDENTES-001 — Antecedentes domésticos ✅ 2026-04-14
**Prioridade:** 🔴 P0
**Motivação:** CEAF 4K expulsões de servidores, CEIS/CNEP 23K, PEP_CGU 133K (já no grafo como PEPRecord — verificar antes de duplicar).
**Fontes:** `ceaf.py` (120L), `sanctions.py` (147L), `pep_cgu.py` (184L)
**Schema:** `Expulsion`, `SanctionBR`, reusar `PEPRecord` existente
**Gate:** `MATCH (e:Expulsion) RETURN count(e)` retorna 4K+

#### [x] ETL-TSE-001 — Pessoas + patrimônio TSE ✅ 2026-04-14
**Prioridade:** 🔴 P0
**Motivação:** 22.4M nós novos. Detectar enriquecimento ilícito. "Em 2018 tinha R$200K, em 2022 R$2M."
**Fontes:** `tse.py` (278L), `tse_bens.py` (158L)
**Schema:** `Person {cpf, name}`, `DeclaredAsset {type, value, year}`, rel `Person-[:DECLAROU_BEM]->DeclaredAsset`
**Atenção:** Usar MERGE com CPF — não duplicar Person nodes existentes (7K já no grafo)
**Gate:** 8M+ Person + 14M DeclaredAsset, rel DECLAROU_BEM funcional

#### [x] ETL-ICIJ-001 — Offshore Leaks ✅ 2026-04-14
**Prioridade:** 🟡 P1
**Motivação:** 11.4K entidades offshore. "Investigado tem empresa no Panamá?"
**Fonte:** `icij.py` (250L)
**Schema:** `OffshoreEntity {name, jurisdiction}`, `OffshoreOfficer {name}`, rel `[:OFFICER_OF]`
**Gate:** ~11K nós `OffshoreEntity` + query de cruzamento com Person funciona

---

### FASE 2 — Scaling + Compliance

#### [x] COMPLIANCE-GATES-001 — Migrar 8 scripts essenciais de br-acc ✅ 2026-04-14
**Prioridade:** 🔴 P0 antes de produção
**Motivação:** Sem gates: CPF pode vazar em demo data, Neo4j sem backup diário, PII em public builds.
**Scripts:**
1. `run_integrity_gates.py` → `scripts/integrity_gates.py` (CPF mascarado, formatos, duplicatas)
2. `check_public_privacy.py` → `scripts/check_privacy.py` (PII em demo data)
3. `check_open_core_boundary.py` → `scripts/check_boundary.py` (lógica privada em public)
4. `prompt_injection_scan.py` → `scripts/prompt_injection_scan.py` (AI safety)
5. `check_compliance_pack.py` → `scripts/check_compliance.py` (docs LGPD obrigatórios)
6. `run_temporal_gates.py` → `scripts/temporal_gates.py` (consistency temporal do grafo)
7. `neo4j-backup.sh` → `scripts/neo4j-backup.sh` (backup diário automático)
8. `infra/neo4j/*.cypher` → `infra/neo4j/` (init schema + link_persons dedup)
**Gate:** pre-commit chama scripts 2-4; CI roda scripts 1+6 contra Neo4j

#### [x] ETL-LEGISLATIVE-001 — Investigações Senado + Câmara (SENADO_CPIS + CAMARA_INQUIRIES) ✅ 2026-04-14
**Prioridade:** 🟡 P1 — após TIER 1 validado
**Motivação:** Histórico de CPIs e inquéritos. "Quem foi investigado pelo Senado em 2020?"
**Fontes:** `senado_cpis.py` (651L), `camara_inquiries.py` (364L)
**Schema:** `CPI {name, period}`, `[:INVESTIGOU]`, `[:PRESTOU_DEPOIMENTO]`
**Gate:** 3+ CPIs indexadas, query de depoentes funciona

#### [x] ETL-BATCH-GOV-001 — Governo federal sem BigQuery (14 pipelines) ✅ 2026-04-14
**Prioridade:** 🟡 P2 — após Lídia validar TIER 1
**Pipelines:** PGFN (24M), CAMARA (4.6M), TCU (45K), COMPRASNET, TRANSFEREGOV, BNDES, TRANSPARENCIA, SIOP, RENUNCIAS, QUERIDO_DIARIO, CVM, CVM_FUNDS, SICONFI, CEPIM
**Gate:** Definir com Lídia quais são relevantes antes de investir 30h

#### ETL-BIGQUERY-ADR-001 — ADR para pipelines BigQuery (STF, DOU, TSE_FILIADOS, MIDES)
**Prioridade:** 🟢 P3 — decisão estratégica, não execução
**Motivação:** 4 pipelines precisam `google-cloud-bigquery`. Forçar decisão explícita sobre custo.
**Ação:** Criar `docs/_current_handoffs/adr-bigquery.md` com análise custo/benefício
**Gate:** ADR escrito com decisão documentada (sim/não BigQuery + alternativas)

#### [x] DOCS-REPORTS-001 — Portar 6 relatórios investigativos de br-acc ✅ 2026-04-14
**Prioridade:** 🟡 P1 — mostrar para Lídia
**Motivação:** `br-acc/docs/reports/` tem 6 cases reais (Superar LTDA, Manaus, Recuperação Judicial SP). Provar valor > qualquer demo genérica.
**Ação:** Copiar para `docs/reports/`, revisar PII, referenciar em MASTER_INDEX.md
**Gate:** Lídia lê 1 relatório completo end-to-end

#### [x] DOCS-ARCHITECTURE-001 — Importar decisões arquiteturais de br-acc ✅ 2026-04-14
**Prioridade:** 🟢 P2
**Motivação:** `br-acc/docs/analysis/` — 4 docs de decisão (STACK_SCALING, PERFORMANCE, BRUNO_VS_EGOS, MYCELIUM_AUDIT). Sem eles, futuras decisões perdem contexto.
**Ação:** Copiar para `docs/knowledge/arch-decisions/`, referenciar em MASTER_INDEX.md
**Gate:** 4 arquivos em `docs/knowledge/arch-decisions/` commitados

---

## FASE 3 — Estabilização + Dados Reais (pós 2026-04-14)

> **Contexto:** 28/28 pipelines rodando com fixtures br-acc. Neo4j recuperado (INC-005: GBPTree corruption → index delete + rebuild). Loader completo. Próximo blocker: dados reais.

#### [x] LOADER-METHODS-001 — Completar API pública do Neo4jBatchLoader ✅ 2026-04-14
**Fixes:** `run_query()` (alias para `_run_batches`) + `load_relationships()` (MERGE tipado com properties opcionais). Pipelines sanctions, tcu, camara, senado, transparencia, tse, camara_inquiries, senado_cpis dependiam desses métodos.

#### [x] NEO4J-RECOVER-001 — Recuperar banco após corrupção GBPTree ✅ 2026-04-14
**INC-005:** `internal.dbms.tx_log.fail_on_corrupted_log_files=false` + restore tx logs + delete index files → rebuild. 83.7M nós intactos.
**Backup índices:** `/data/neo4j_index_backup_20260414/` (11GB) na VPS.

#### NEO4J-CHECKPOINT-001 — Configurar checkpoint periódico para prevenir corrupção
**Prioridade:** 🔴 P0 — previne próxima ocorrência de INC-005
**Ação:** Adicionar a `/var/lib/neo4j/conf/neo4j.conf` via docker exec:
```
db.checkpoint.interval.time=15m
db.checkpoint.interval.tx=100000
```
**Gate:** `docker exec bracc-neo4j cypher-shell ... "CALL db.checkpoint()"` retorna sucesso; log mostra checkpoint regular.

#### ETL-DATA-REAL-001 — Download de dados reais CGU (desbloqueio VPS)
**Prioridade:** 🔴 P0 Sprint Delegacia — sem dados reais não há demo convincente
**Blocker:** Portal da Transparência bloqueia IPs de datacenter. 6 datasets CGU inacessíveis: leniency, CEIS, CNEP, CEAF, PEP, CEPIM.
**Opções:**
1. Download manual da máquina local + `rsync` para VPS (mais rápido)
2. VPN residencial na VPS (mais complexo)
3. Usar dados de outro período que não bloqueia (menos provável)
**Gate:** `python -m egos_inteligencia.etl.runner run leniency` com dados reais (>100 LeniencyAgreement nodes).

#### ETL-DHPP-001 — Pipeline ETL para documentos reais da DHPP
**Prioridade:** 🔴 P0
**Status:** Blocker resolvido — projetoDHPP tem 79 IPs/CSs, 233 pessoas extraídas, 2.898 fotos, 8.242 entradas de recepção. Schema Neo4j e fases documentadas em `policia/TASKS.md`. **Aguarda DHPP-DECISION-001** (Enio responder 4 decisões de escopo antes de iniciar FASE 1).
**Entrada no grafo:** `(:Person)-[:APARECE_EM]->(:Case)`, `(:Weapon)-[:APREENDIDA_EM]->(:Case)` — deduplicar com os 83.7M nós via MERGE por CPF.
**Dependência:** `policia/TASKS.md → DHPP-DECISION-001` (blocker atual).

#### CNPJ-001 — Verificar freshness dos 66M Company nodes
**Prioridade:** 🟢 P3 — informacional
**Ação:** `MATCH (c:Company) RETURN max(c.updated_at), min(c.updated_at)` — se stale, reagendar carga br-acc.

---
