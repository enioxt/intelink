# EGOS Inteligência (Intelink) — MASTER INDEX
> **SSOT:** `docs/MASTER_INDEX.md`
> **Para agentes AI:** Comece aqui. Puxe um fio, avance pela cadeia de links.
> **Atualizado:** 2026-04-14

---

## O que é este sistema?

**Intelink v3** é uma plataforma standalone de inteligência sobre dados públicos brasileiros.
Investigadores mapeiam relacionamentos entre entidades em 77M+ registros públicos, detectam padrões comportamentais, e geram laudos com citação de fonte — sem expor PII externo.

```
Stack: Next.js 15 + FastAPI (Python 3.12) + Neo4j 5 + Redis 7
Deploy: intelink.ia.br (Hetzner VPS 204.168.217.125)
```

---

## Mapa de Documentação — SSOT por Domínio

| Domínio | SSOT | O que cobre |
|---------|------|------------|
| **Arquitetura geral** | `docs/ARCHITECTURE.md` | Data flow, stack, segurança, módulos-chave |
| **Capacidades e status real** | `docs/CAPABILITIES_STATUS.md` | O que funciona vs stub vs não existe |
| **API Reference (25 routers)** | `docs/API_REFERENCE.md` | Todos endpoints, parâmetros, auth |
| **Schema do banco** | `docs/DATABASE_SCHEMA.md` | Neo4j labels, relações, Postgres migrations |
| **ETL Pipelines** | `docs/ETL_GUIDE.md` | Framework, 4 implementados, como adicionar novos |
| **Testes** | `docs/TESTING.md` | Estratégia, fixtures, cobertura, CI |
| **Fontes OSINT** | `docs/osint/OSINT_SOURCES_CURATED.md` | 78 fontes mapeadas |
| **LGPD Compliance** | `infra/compliance/LGPD_COMPLIANCE.md` | Arts. 7-46, gaps, DPO |
| **Segurança / Incidentes** | `docs/security/INCIDENT_*.md` | Histórico de incidentes |
| **Backlog de tarefas** | `TASKS.md` | Todas as tasks por fase (P0-P2) |
| **Agentes e routers** | `AGENTS.md` | Visão executiva, status de migração |
| **Roadmap de fases** | `docs/ROADMAP.md` | PHASE-1 → PHASE-4, gates, timelines |
| **Knowledge base** | `docs/knowledge/` | Decisões técnicas, diagnósticos, planos de dados |
| **Diagnóstico atual** | `docs/SYSTEM_DIAGNOSTIC_2026-04-09.md` | Estado do sistema em 2026-04-09 |

---

## Como Navegar (para Agentes AI)

### Passo 1 — Entender o sistema (5 min)
```
1. Este arquivo (MASTER_INDEX.md) — visão geral
2. docs/ARCHITECTURE.md — data flow e stack
3. docs/CAPABILITIES_STATUS.md — o que está realmente pronto
```

### Passo 2 — API e Backend (drill-down)
```
4. docs/API_REFERENCE.md — 25 routers, cada endpoint
5. docs/DATABASE_SCHEMA.md — Neo4j + Postgres schema
6. api/src/egos_inteligencia/services/ — código dos serviços
```

### Passo 3 — Frontend
```
7. docs/ARCHITECTURE.md#frontend-lib — lib/intelligence/, lib/analysis/, etc.
8. apps/web/README.md — nova arquitetura (Vercel AI SDK, RxDB)
9. frontend/src/lib/ — 25.000 linhas de lógica de negócio
```

### Passo 4 — Dados e ETL
```
10. docs/ETL_GUIDE.md — como os dados entram
11. docs/knowledge/BASES_DADOS_PUBLICAS_MAPEAMENTO_2026-04-08.md — 46 fontes mapeadas
12. api/scripts/etl_pipeline_template.py — template de novo pipeline
```

### Passo 5 — Qualidade e Compliance
```
13. docs/TESTING.md — estratégia de testes, o que está coberto
14. infra/compliance/LGPD_COMPLIANCE.md — requisitos legais
15. TASKS.md — gaps conhecidos e roadmap
```

---

## Estado Atual por Fase

| Fase | Status | O que está pronto |
|------|--------|------------------|
| **PHASE-1 Foundation** | ✅ 95% | Auth, PII masking, Neo4j, Docker, CI/CD, 4 ETL |
| **PHASE-2 Intelligence** | 🟡 60% | NER, cross-reference, patterns, Cytoscape — UI não usa análises avançadas |
| **PHASE-3 Scale** | 🔴 15% | Schema multi-tenant pronto, RLS não enforced, CRDT não integrado |
| **PHASE-4 Platform** | 🔴 0% | Marketplace, SDK, federação — visão |

---

## Gaps Críticos (bloqueiam produção real)

1. **Pattern matching desconectado** — `cross_reference_engine.py` retorna `pattern_matches=[]` vazio
2. **42/46 ETL pipelines ausentes** — framework existe, pipelines não escritos
3. **Testes Neo4j pulados no CI** — `@requires_neo4j` skip por padrão
4. **DPO não designado** — LGPD Art. 41, risco regulatório ANPD
5. **Portal do titular ausente** — LGPD Art. 14, `/titular` endpoint não existe
6. **Análises avançadas não expostas na UI** — `diligence-suggestions`, `executive-summary`, `risk-assessment`, `modus-operandi` implementados mas sem página frontend

---

## Estrutura de Diretórios

```
egos-inteligencia/
├── README.md                — Visão geral + quickstart
├── AGENTS.md                — Executivo: produto, arquitetura, status
├── TASKS.md                 — Backlog completo por fase
├── CLAUDE.md                — Regras injetadas do kernel EGOS
├── CONTRIBUTING.md          — Como contribuir
│
├── docs/
│   ├── MASTER_INDEX.md      ← VOCÊ ESTÁ AQUI
│   ├── ARCHITECTURE.md      — Stack, data flow, segurança, módulos
│   ├── CAPABILITIES_STATUS.md — Status real (código ✅/⚠️/🔴)
│   ├── API_REFERENCE.md     — 25 routers, todos os endpoints
│   ├── DATABASE_SCHEMA.md   — Neo4j + Postgres schema
│   ├── ETL_GUIDE.md         — Como adicionar pipelines de dados
│   ├── TESTING.md           — Estratégia de testes
│   ├── ROADMAP.md           — PHASE-1 a PHASE-4
│   ├── FRONTEND_ARCHITECTURE.md — Frontend detalhado
│   ├── osint/               — Módulo de OSINT
│   │   ├── OSINT_SOURCES_CURATED.md — 78 fontes mapeadas
│   │   └── OSINT_GEOGUESSR_TRAINING.md — Treinamento OSINT
│   ├── knowledge/           — Decisões técnicas pontuais
│   │   ├── HARVEST.md       — Aprendizados
│   │   ├── BASES_DADOS_PUBLICAS_MAPEAMENTO_2026-04-08.md
│   │   ├── PCMG_PIPELINE_GUIDE.md
│   │   ├── DEEP_CODEBASE_ANALYSIS.md — Análise exaustiva do frontend/backend
│   │   ├── GAPS_AND_LIMITATIONS.md   — Roadmaps, gaps críticos e planos de ação
│   │   └── LEGACY_FEATURES_BACKLOG.md — Features das v2/v4 para portar (i2 schema, PWA, Quorum)
│   ├── security/
│   │   └── INCIDENT_2026-04-08_TELEGRAM_TOKEN.md
│   └── _current_handoffs/
│       └── handoff_*.md
│
├── api/                     — FastAPI (Python 3.12)
│   └── src/egos_inteligencia/
│       ├── routers/         — 25 módulos de rota
│       ├── services/        — 30+ serviços
│       ├── services/nlp/    — BERTimbau + spaCy
│       ├── services/patterns/ — Sacred Math scoring
│       ├── middleware/      — PII, rate limit, headers
│       └── models/          — Pydantic schemas
│
├── frontend/                — Next.js 15 (legado → migrando para apps/web/)
│   └── src/lib/
│       ├── intelligence/    — cross-reference, ai-router, graph-algorithms
│       ├── analysis/        — modus-operandi, executive-summary, risk
│       ├── detectors/       — Benford, ghost-employees, HHI
│       ├── legal/           — criminal-articles (100+ artigos CP/etc)
│       └── reports/         — Arkham templates, export PDF/DOCX
│
├── apps/web/                — Next.js 14.2 (nova arquitetura)
│   ├── app/                 — 8 páginas (chat, graph, osint, pcmg, etc.)
│   └── lib/db/              — RxDB, Automerge CRDT, AES-256-GCM
│
├── infra/
│   ├── docker-compose.yml   — Stack local completo
│   ├── Caddyfile            — TLS + reverse proxy
│   ├── terraform/           — Hetzner CX42 IaC
│   ├── ansible/             — Provisionamento VPS
│   └── compliance/          — LGPD_COMPLIANCE.md
│
├── etl/
│   └── pipelines/           — 4 implementados: bnmp, datajud, pcmg_doc, pcmg_video
│
└── scripts/
    ├── deploy-hetzner.sh    — Deploy para VPS
    ├── seed_synthetic_data.py — Dados de teste
    └── etl_pipeline_template.py — Template base ETL
```

---

## Regras de Manutenção desta Documentação

1. **Novo conteúdo** → vai ao SSOT do domínio (tabela acima), nunca criar arquivo novo sem justificativa
2. **Status de features** → atualizar `docs/CAPABILITIES_STATUS.md`
3. **Novos endpoints** → atualizar `docs/API_REFERENCE.md`
4. **Novos ETL** → atualizar `docs/ETL_GUIDE.md`
5. **Decisões técnicas** → `docs/knowledge/HARVEST.md`
6. **Nunca duplicar**: se o conteúdo existe em outro SSOT, fazer referência cruzada, não copiar

---

*Gerado em 2026-04-14 | Parte do sistema anti-drift do EGOS*
