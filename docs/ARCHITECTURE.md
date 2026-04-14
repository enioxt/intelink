# EGOS Inteligência — Architecture

> **SSOT:** `docs/ARCHITECTURE.md` | **Audit completo:** 2026-04-14
> **Entry point:** `docs/MASTER_INDEX.md` | **Capacidades:** `../AGENTS.md`

---

## Intenção do Sistema

Plataforma standalone de inteligência investigativa sobre dados públicos brasileiros.
Investigadores mapeiam redes criminais em 83.7M+ registros públicos, detectam padrões
comportamentais via Sacred Math scoring (razão áurea φ), e geram laudos com citação de
fonte — sem expor PII externo.

**Axiomas de design:**
- PII nunca sai do sistema sem mascaramento
- Todo acesso a entidade é auditado (append-only)
- Laudos são não-acusatórios: fontes citadas, gaps documentados, confiança declarada
- Isolamento multi-tenant por unit_id (delegacia/órgão)

---

## Arquitetura Dual-Frontend

```
frontend/ (Next.js — online, produção)          apps/web/ (Next.js — offline-first)
  12 rotas, 138 componentes, 35.9K LOC            RxDB + Automerge CRDT + AES-256-GCM
  ├── /intelink (dashboard)                        ├── /admin/tenants
  ├── /intelink/investigations                     ├── /osint (OSINT dedicado)
  ├── /intelink/docs/search                        ├── /security (audit logs)
  ├── /intelink/vinculos                           └── /dashboard (analytics)
  ├── /intelink/analysis
  ├── /intelink/jobs (5s auto-refresh)
  └── 6 rotas mais                            Propósito: operações de campo sem internet
                                              NÃO deletar — app paralela, não duplicata
            │                                           │
            └──────────────────┬────────────────────────┘
                               ▼
                   api/ (FastAPI Python 3.12)
                   27 routers | 90+ endpoints
                               │
                 ┌─────────────┴─────────────┐
            Neo4j 5.x                    Redis 7
          83.7M+ nós                  cache + rate limit
          25M+ arestas                sessões JWT
          48 queries Cypher
```

---

## Fluxo de Dados Principal

```
[Investigador] → POST /api/v1/auth/login
                       └─ JWT HS256 + refresh (HttpOnly)

[Busca] → GET /api/v1/search?q=nome
              └─ Neo4j full-text (Lucene wildcard) → PII masking → SearchResult[]
              └─ GET /api/v1/search/suggestions?q= → autocomplete real-time

[Chat IA] → POST /api/v1/chat
                └─ OpenRouter (Gemini Flash primário, ~$0.0003/query)
                   ├─ 31 ferramentas tool-calling (OpenAI JSON schema)
                   ├─ Loop até 8 rounds de tool calls
                   ├─ Custo calculado por query (tokens × rate)
                   ├─ Fallback: MODEL_FREE → _fallback_search() Neo4j direto
                   └─ BYOK: header x-openrouter-key aceito

[Entidade] → GET /api/v1/entity/{id}/connections | /timeline | /exposure
[Grafo]    → GET /api/v1/graph/{entity_id}
[NER]      → POST /api/v1/nlp/extract-entities → BERTimbau → spaCy fallback
[Padrões]  → POST /api/v1/patterns/detect → Sacred Math scoring
[Cruzamento] → POST /api/v1/cross_reference/links | /network | /cross-case
```

---

## Stack Completa

```
Frontend / frontend/src/
  Runtime:      Next.js 15, TypeScript, TailwindCSS, Lucide
  Componentes:  138 componentes, 35.900 LOC
  Lib:          95+ módulos (intelligence/, analysis/, auth/, legal/, reports/)
  Search:       GlobalSearch.tsx (710 LOC) — Cmd+K, CPF/placa/nome/apelido
  Graph viz:    EnhancedGraph.tsx (519 LOC) — D3-based network
  Chat:         IntelinkChatbot.tsx (723 LOC) — streaming IA

Frontend / apps/web/
  Runtime:      Next.js 14.2, TypeScript
  Offline:      RxDB 15 (IndexedDB), Automerge CRDT (sync sem servidor)
  Crypto:       AES-256-GCM + PBKDF2 (100k iterations, SHA-256)
  Auth:         tenant-guard.ts + tenant-isolation.ts (isolamento por unit_id)

Backend / api/
  Runtime:      Python 3.12, FastAPI, Uvicorn, Pydantic v2
  27 routers:   90+ endpoints — auth, search, entity, chat, investigation,
                templates, bnmp, patterns, benford, cross_reference, nlp,
                pcmg_ingestion, gazette_monitor, interop, public, meta, monitor
  Middleware:   PII masking | Rate limit (60/min anon, 300/min auth) |
                JWT HS256 | Security headers | Request ID | Input sanitizer
  Queries:      48 arquivos Cypher — schema, CRUD, analytics, patterns públicos

Infra
  Neo4j 5.x    83.7M nós, 25M arestas, APOC plugin
  Redis 7      cache, rate limit, sessões
  Caddy 2      TLS Let's Encrypt automático, reverse proxy
  Docker Compose   5 services (api, frontend, worker, neo4j, redis)
  Terraform    Hetzner provisioning
  Ansible      deployment automation
```

---

## Chat — 31 Ferramentas (Tool-Calling)

Protocolo: **OpenAI JSON schema** compatible. Loop de até **8 rounds** de tool-calling por query.
Custo por query calculado e logado: `(prompt_tokens × 0.00000015) + (completion_tokens × 0.0000006)`.

### Acesso Tiered + BYOK
| Tier | Mensagens/dia | Modelo | Acesso |
|------|--------------|--------|--------|
| Premium | 1-30 | Gemini Flash (premium tier) | Padrão |
| Free | 31-50 | Gemini Flash (free tier) | Automático |
| Esgotado | 50+ | — | BYOK via `x-openrouter-key` |

### Ferramentas por Categoria

**Neo4j / Investigação (5):**
`search_entities` · `get_graph_stats` · `get_entity_connections` · `find_connection_path` (1-6 graus) · `cypher_query` (raw)

**Portal da Transparência / Governo (16):**
`search_emendas` · `search_transferencias` · `search_ceap` · `search_pep_city` · `search_gazettes` (Querido Diário) · `search_votacoes` (Câmara, roll-call) · `search_servidores` · `search_licitacoes` · `search_cpgf` · `search_viagens` · `search_contratos` (+ aditivos) · `search_sancoes` (CEIS+CNEP) · `search_processos` (DataJud, 22 tribunais) · `cnpj_info` · `pncp_licitacoes` · `oab_advogado`

**OSINT / Segurança (6):**
`bnmp_mandados` · `procurados_lookup` · `lista_suja` · `web_search` (Brave + DuckDuckGo fallback) · `hibp_check_email` · `shodan_search` + `shodan_host_lookup` · `analyze_image_metadata` (EXIF)

**Circuit Breaker:** Cada host externo tem `allow(host)` guard — após N falhas consecutivas, requests são skipados pelo TTL configurado.

---

## Módulos de Inteligência

### Sacred Math Scoring (pattern_detector.py, 294 LOC)
Confidence scoring baseado na **razão áurea (φ = 1.618)**:
```
confidence = (keyword_score × φ + pattern_score) / (φ + 1)
```
Threshold mínimo: `φ⁻¹ = 0.618`. Risk levels: `≥0.85→critical` | `≥0.618→high` | `≥0.382→medium`.
Detecta: paranoia, stress financeiro, narcisismo, impulsividade, engano.

### Cross-Reference Engine (452 LOC)
6 níveis graduados (0.0→1.0):
- `≥0.8` → Link forte: "Mesma rede criminosa provável. Unificar investigações?"
- `≥0.5` → Link moderado: "Coordenar diligências"
- `≥0.3` → Link fraco: "Monitorar evolução"
- `<0.3` → Sem vínculo significativo

Força por grau: 1-hop=1.0, 2-hop=0.7, 3-hop=0.4, 4+=<0.1.
Pattern detector integrado após CONNECT-001 (2026-04-14).

### NER Pipeline (BERTimbau)
- **Modelo primário:** `pierreguillou/bert-base-cased-pt-lenerbr` (LeNER-Br — entidades legais PT)
- **Entidades:** PERSON, ORG, LOCATION, MISC
- **Fallback:** spaCy `pt_core_news_*` → retorno vazio com log

### Graph Algorithms (graph-algorithms.ts, 250+ LOC)
- BFS shortest path · Degree centrality (normalizada) · Connected components (DFS) · All paths (DFS max-depth 5)
- **Não implementados ainda:** PageRank, Betweenness centrality, Louvain community detection

### Pramana Confidence System (confidence-system.ts)
Baseado no protocolo Tsun-cha (debate monástico tibetano). 4 níveis visuais:
- `FACT` (verde sólido) — CPF/CNPJ/SINARM validado, documento oficial
- `INFERENCE` (roxo tracejado) — AI/NLP/OCR extraído
- `DISPUTED` (âmbar pontilhado) — Evidência em conflito
- `UNKNOWN` (cinza) — Fonte não classificada

### Sistema de Jornadas (6 etapas)
`setup → entities → relationships → documents → analysis → report`
Cada passo grava: timestamp, entityId, action, visibleConnectionsSnapshot.
Permite audit trail completo e replay de investigação.

### Investigation Templates (5 domínios, 477 LOC)
| Domínio | Entidades-chave | Foco |
|---------|----------------|------|
| Corruption | Person, Company, Contract, PublicOfficial | "Follow the money" |
| Money Laundering | ShellCompany, BankAccount, Country | Fluxos circulares offshore |
| Compliance | Executive, Policy, Violation, Audit | Governança corporativa |
| Journalism | Person, Company, Event | Dados públicos investigativos |
| Criminal | Person, Vehicle, Location, Weapon | Redes criminosas |

---

## Multi-Tenancy (estado atual)

**Isolamento:** por `unit_id` (Supabase FK). Funções em `tenant-isolation.ts`:
`getMemberUnitId` · `canAccessInvestigation` · `canAccessEntity` · `getAccessibleInvestigations` · `applyUnitFilter`

**Bypass:** `system_role == 'super_admin'`.

**Estado:** Isolamento via middleware (temporário). RLS por Supabase planejado para PHASE-3.
**Próximo (DHPP):** isolamento por MASP/email (AUTH-MULTITENANT-001).

---

## Segurança

| Camada | Mecanismo | Fase |
|--------|-----------|------|
| Transporte | TLS 1.3 (Caddy Let's Encrypt auto) | PHASE-1 ✅ |
| Auth | JWT HS256 + bcrypt + HttpOnly refresh | PHASE-1 ✅ |
| PII | Middleware: CPF/CNPJ/email/phone → `***` | PHASE-1 ✅ |
| Secrets | gitleaks em todo commit + CI | PHASE-1 ✅ |
| Tenant | unit_id isolation via middleware | PHASE-2 ✅ (temporário) |
| Offline | AES-256-GCM + PBKDF2 100k iterations | apps/web ✅ |
| RLS | Supabase Row-Level Security | PHASE-3 ⏳ |
| Identidade | MASP + 2FA | PHASE-3 ⏳ |

---

## Testes

```
api/tests/unit/           pytest — lógica de serviço isolada
api/tests/integration/    pytest — endpoints + DB
api/tests/fixtures/       5 casos sintéticos (zero PII real)

frontend/tests/unit/      vitest — lib functions
```

**Regra:** dados sintéticos only. Nunca commitar dados reais de investigação.

---

## Deploy

```bash
rsync -av /home/enio/egos-inteligencia/ root@204.168.217.125:/opt/egos-inteligencia/
bash scripts/deploy-hetzner.sh
curl https://intelink.ia.br/health
npm run sync:check          # drift backend↔frontend (42.7% cobertura estática)
```

| Domínio | Uso | SSL |
|---------|-----|-----|
| `intelink.ia.br` | Produção | Let's Encrypt (Caddy) |
| `inteligencia.egos.ia.br` | Alias EGOS | Let's Encrypt |

---

*Sacred Code: 000.111.369.963.1618*
