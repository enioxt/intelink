# AGENTS.md — EGOS Inteligência

> **VERSION:** 1.0.0 | **CREATED:** 2026-04-01 | **MERGE STATUS:** Ativo
> **TYPE:** Intelligence Platform (Merge: Intelink + BR-ACC)
> **URL:** https://inteligencia.egos.ia.br
> **KERNEL SSOT:** `/home/enio/egos/docs/SSOT_REGISTRY.md`

---

<!-- llmrefs:start -->

## LLM Reference Signature

- **Role:** workspace map + governance entrypoint
- **Summary:** EGOS Inteligência — plataforma policial de investigação criminal. Frontend canônico: `egos-lab/apps/egos-inteligencia/apps/web/` (Next.js 16.1.5 + Turbopack, porta 3009). Backend Python FastAPI. Neo4j local: ~9.781 nós (Person, Occurrence, Vehicle). VPS Neo4j: 83.7M nós (dados públicos).
- **Read next:**
  - `docs/plans/INTELINK_BRACC_MERGE.md` — Plano completo do merge
  - `TASKS.md` — Tasks ativas do merge
  - `.windsurfrules` — Regras do agente
  - `docs/legal/` — Documentação legal (ETHICS, LGPD, etc.)

<!-- llmrefs:end -->

---

## 🎯 Visão do Produto

EGOS Inteligência (Intelink) é uma plataforma de **inteligência policial criminal** para DHPP/delegacias:

- **Investigação:** Busca por CPF/nome, vínculos entre pessoas, ocorrências REDS
- **Dados locais:** Neo4j local com Person, Occurrence, Vehicle (~9.781 nós)
- **Dados públicos:** Neo4j VPS br-acc (83.7M nós — CNPJ, PEPs, Sanções)
- **Interface:** UI dark (azul/cyan), grafos 2D/3D, relatórios PDF, chat IA

**Frontend canônico:** `/home/enio/egos-lab/apps/egos-inteligencia/apps/web/` (Next.js 16.1.5, porta 3009). **NÃO confundir** com `/home/enio/intelink/frontend/` (esqueleto abandonado, abril 2026).

---

## 🏗️ Arquitetura

```
egos-inteligencia/
├── apps/web/                    # Next.js 15 (Frontend unificado)
│   ├── app/
│   │   ├── chat/               # AI Chat com contexto Neo4j
│   │   ├── search/             # Quantum Search (Neo4j + Supabase)
│   │   ├── entity/             # Páginas de entidade (CNPJ, PEP)
│   │   ├── network/            # Visualização de grafos
│   │   └── investigation/      # Gestão de casos (Intelink)
│   ├── components/
│   │   ├── chat/               # UI Chat (do Intelink)
│   │   ├── search/             # UI Search (do Intelink)
│   │   ├── entity/             # Cards CNPJ/PEP (novo)
│   │   └── network/            # Visualização grafo (novo)
│   └── lib/
│       ├── neo4j/              # Client Neo4j (adapter BR-ACC)
│       ├── ai/                 # AI Router (do Intelink)
│       ├── search/             # Quantum Search (adaptado)
│       └── security/           # RBAC, audit (do Intelink)
│
├── api/                         # FastAPI (Backend Python do BR-ACC)
│   └── src/egos_inteligencia/
│       ├── routers/
│       │   ├── chat.py         # Chat endpoints (merge)
│       │   ├── entities.py     # CNPJ, PEP, Sanctions
│       │   ├── search.py       # Neo4j search
│       │   └── graph.py        # Graph traversal
│       └── services/
│           └── neo4j_service.py # Neo4j client
│
├── etl/                         # Pipelines Python (do BR-ACC)
│   ├── scripts/                # 40+ ETLs
│   └── src/etl/
│       └── base.py             # Base ETL class
│
├── neo4j/                       # Schema e queries
│   ├── schema/
│   └── queries/
│
├── infra/                       # Docker, Caddy, scripts
│   └── docker-compose.yml      # Neo4j + API + Next.js
│
└── docs/legal/                  # Documentação legal (BR-ACC)
    ├── ETHICS.md
    ├── LGPD.md
    ├── PRIVACY.md
    ├── TERMS.md
    ├── DISCLAIMER.md
    ├── SECURITY.md
    └── ABUSE_RESPONSE.md
```

---

## 💾 Dados (Neo4j)

| Dataset | Volume | Status |
|---------|--------|--------|
| CNPJ Base | 66 milhões | 🟢 Carregado |
| QSA Sócios | 17 milhões | 🟢 Carregado |
| PEPs | 120 mil | 🟢 Carregado |
| Sanções (CEIS+CNEP) | 23 mil | 🟢 Carregado |
| Global Matches | 7 mil | 🟢 Carregado |

**Infraestrutura:** Neo4j 5.x @ Contabo VPS (204.168.217.125)

---

## 🛠️ Tech Stack

| Layer | Tecnologia | Origem |
|-------|------------|--------|
| **Frontend** | Next.js 16.1.5 (Turbopack), React 19, TailwindCSS | egos-lab/apps/egos-inteligencia/apps/web/ |
| **Backend API** | Python 3.12, FastAPI, uvicorn | BR-ACC |
| **Database** | Neo4j 5.x (grafo) | BR-ACC |
| **Cache/Auth** | Supabase PostgreSQL | Intelink |
| **AI/LLM** | OpenRouter (Gemini Flash) | Ambos |
| **Deploy** | Docker Compose @ Contabo | BR-ACC |

---

## 📋 Comandos

```bash
# Desenvolvimento Frontend (canônico)
cd egos-lab/apps/egos-inteligencia/apps/web && npm run dev   # Porta 3009

# Desenvolvimento API
cd api && uv run uvicorn src.egos_inteligencia.main:app --reload --port 8000

# ETL
python etl/scripts/download_ceis.py

# Deploy
docker compose -f infra/docker-compose.yml up -d

# Testes
npm test                             # Frontend
cd api && uv run pytest -x          # Backend
```

---

## 🔒 Governança Legal

Toda a governança legal foi herdada do BR-ACC (mais completa):

- **ETHICS.md** — Uso proibido, linguagem não-acusatória
- **LGPD.md** — Conformidade com LGPD brasileira
- **PRIVACY.md** — Política de privacidade
- **TERMS.md** — Termos de serviço
- **DISCLAIMER.md** — Isenção de responsabilidade
- **SECURITY.md** — Política de segurança
- **ABUSE_RESPONSE.md** — Resposta a abuso

---

## 📁 SSOT Files

| Arquivo | Propósito |
|---------|-----------|
| `AGENTS.md` | Este arquivo — mapa do sistema |
| `TASKS.md` | Todas as tasks ativas (merge + features) |
| `.windsurfrules` | Regras do agente |
| `docs/plans/INTELINK_BRACC_MERGE.md` | Plano detalhado do merge |
| `docs/legal/` | Documentação legal (SSOT) |

---

## 🚦 Status do Merge

| Componente | Origem | Destino | Status |
|------------|--------|---------|--------|
| Docs legais | BR-ACC | `docs/legal/` | ✅ MOVED |
| Neo4j adapter | BR-ACC | `apps/web/lib/neo4j/` | ✅ CREATED |
| API Python base | BR-ACC | `api/` | 🟡 COPIED, NOT VALIDATED |
| ETLs | BR-ACC | `etl/` | ✅ COPIED |
| Frontend base | Intelink | `apps/web/` | ✅ COPIED |
| Chat AI adapter | Intelink + BR-ACC | `apps/web/lib/ai/` | 🟡 CREATED, NOT WIRED |
| Entity/Search/Network pages | Novo sobre base Intelink | `apps/web/app/` | 🟡 SCAFFOLDED |

**Progresso:** foundation concluída; adaptação em andamento com gaps de validação e wiring entre frontend e API Python.

---

## ⚠️ Zonas Protegidas (Frozen)

> **NÃO EDITAR** sem aprovação explícita:
> - `docs/legal/` — Documentação legal (SSOT)
> - Neo4j schema em produção
> - ETL pipelines ativos em produção

---

## 🌐 URLs

| Ambiente | URL |
|----------|-----|
| Produção | https://inteligencia.egos.ia.br |
| API | https://inteligencia.egos.ia.br/api/v1 |
| Neo4j Browser | http://204.168.217.125:7474 |

---

*Documento criado durante merge Intelink + BR-ACC — 2026-04-01*
*Sacred Code: 000.111.369.963.1618*
