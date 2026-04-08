# AGENTS.md — EGOS Inteligência (Intelink v3)

> **VERSION:** 2.0.0 | **UPDATED:** 2026-04-09 | **STATUS:** SSOT CANÔNICO — ativo
> **TYPE:** Intelligence Platform (Intelink v3 = Intelink + BR-ACC + OSINT)
> **URL:** https://intelink.ia.br
> **KERNEL SSOT:** `/home/enio/egos/docs/SSOT_REGISTRY.md`
> **DECISÃO 2026-04-09:** Este é o único repositório canônico do Intelink v3.
> `egos-lab/apps/intelink` → ARCHIVED | `/home/enio/INTELINK` → ARCHIVED

---

## 🎯 Visão do Produto

EGOS Inteligência é uma plataforma **standalone** de inteligência sobre dados públicos brasileiros, resultado do merge entre:

- **BR-ACC**: Backend Python + Neo4j (83M+ nós)
- **Intelink**: Frontend Next.js + UI/AI sofisticada

**Este projeto é independente** do egos-lab (que será arquivado).

---

## 🏗️ Arquitetura Standalone

```
egos-inteligencia/
├── api/                    # FastAPI (Python 3.12)
│   └── src/
│       └── egos_inteligencia/
│           ├── main.py
│           ├── routers/
│           │   ├── entity.py
│           │   ├── search.py
│           │   ├── graph.py
│           │   └── chat.py
│           └── services/
│               └── neo4j_service.py
│
├── frontend/               # Next.js 15
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── neo4j/        # Client Neo4j
│   │   └── ai/            # AI Router
│   └── package.json
│
├── etl/                    # Pipelines Python
│   └── scripts/
│
├── infra/                  # Docker + Caddy
│   ├── docker-compose.yml
│   └── Caddyfile
│
├── docs/                   # Documentação
│   └── legal/
│
└── scripts/                # Utilitários
    └── deploy-hetzner.sh
```

---

## 🏗️ API FastAPI — Routers Existentes

| Router | Arquivo | Descrição |
|--------|---------|-----------|
| `/api/v1/auth` | `routers/auth.py` | Login JWT + refresh token |
| `/api/v1/entity` | `routers/entity.py` | Lookup de entidades Neo4j |
| `/api/v1/search` | `routers/search.py` | Full-text search |
| `/api/v1/graph` | `routers/graph.py` | Ego network + paths |
| `/api/v1/chat` | `routers/chat.py` + `chat_tools.py` | AI chat + tool calling |
| `/api/v1/investigation` | `routers/investigation.py` | CRUD investigações |
| `/api/v1/analytics` | `routers/analytics.py` | Métricas |
| `/api/v1/patterns` | `routers/patterns.py` | Detecção de padrões |
| `/health` | `routers/health.py` | Health check |

**Middleware existente:** PII masking (CPF/CNPJ) | rate limiting | security headers | request ID

---

## 🚦 Status da Migração (atualizado 2026-04-09)

| Componente | Origem | Status |
|------------|--------|--------|
| Backend API (FastAPI + 60 endpoints) | `egos-inteligencia/api/` | ✅ Existente neste repo |
| Frontend base (Next.js 15) | `egos-inteligencia/frontend/` | ✅ Existente neste repo |
| Cross-reference service | `egos-lab/apps/intelink/lib/intelink/cross-reference-service.ts` | ⏳ CONS-002 |
| Entity matcher + graph algorithms | `egos-lab/apps/intelink/lib/intelink/` | ⏳ CONS-003 |
| Auth completo (JWT, bcrypt, session) | `egos-lab/apps/intelink/lib/auth/` | ⏳ CONS-004 |
| Security audit | `egos-lab/apps/intelink/lib/security/audit.ts` | ⏳ CONS-005 |
| AI router + chat + meta-prompts | `egos-lab/apps/intelink/lib/intelink/ai-router.ts` | ⏳ CONS-006 |
| Componentes UI (30+ componentes) | `egos-lab/apps/intelink/components/intelink/` | ⏳ CONS-007 |
| Arquitetura segurança v3 (RxDB+PBKDF2) | `egos/docs/knowledge/INTELINK_V3_SECURITY_ARCHITECTURE.md` | ⏳ SEC-001..005 |

---

## 📋 Comandos

```bash
# Frontend
cd frontend && npm install && npm run dev  # Porta 3000

# API
cd api && pip install -e . && uvicorn src.egos_inteligencia.main:app --reload

# Infra
docker compose -f infra/docker-compose.yml up -d
```

---

*Sacred Code: 000.111.369.963.1618*
