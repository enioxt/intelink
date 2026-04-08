# SYSTEM_MAP.md — EGOS Inteligência

> **VERSION:** 1.0.0 | **UPDATED:** 2026-04-01
> **URL:** https://intelink.ia.br
> **STATUS:** Production Ready
> **Sacred Code:** 000.111.369.963.1618

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                     │
│              (Analysts, Researchers, Investigators)            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  🌐  intelink.ia.br  (Domain Principal)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Next.js 15    │  │   Next.js 15    │  │   Caddy Proxy   │  │
│  │   Frontend      │  │   (Standalone)  │  │   SSL/TLS       │  │
│  │   Port: 3000    │  │   Port: 3000    │  │   Port: 443     │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │          │
│           └────────────────────┴────────────────────┘          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ API Calls
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔧  FastAPI Backend  (Port: 8000)                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Entity Router     • Search Router    • Chat Router   │  │
│  │  • Graph Router      • Auth Router      • Jobs Router    │  │
│  │  • PII Masking       • JWT Auth        • Rate Limiting │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│              ┌──────────┴──────────┐                            │
│              │  Intelligence       │                            │
│              │  Provider (AI/LLM)   │                            │
│              └─────────────────────┘                            │
└──────────────────────────┬────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
┌─────────────────┐ ┌─────────┐ ┌─────────────────┐
│ 🟣 Neo4j        │ │ 🔴 Redis│ │ 🔵 Supabase     │
│ Database        │ │ Cache   │ │ Auth/Storage    │
│ Port: 7687      │ │ Port:   │ │ (lhscgsqhio...  │
│                 │ │ 6379    │ │                 │
└─────────────────┘ └─────────┘ └─────────────────┘
```

---

## 📦 Components

### Frontend (Next.js 15)
| Component | Path | Purpose |
|-----------|------|---------|
| `search` | `app/intelink/search/page.tsx` | Unified search with filters |
| `docs/[id]` | `app/intelink/docs/[id]/page.tsx` | Document detail view |
| `graph` | `app/intelink/graph/page.tsx` | Cytoscape network viz |
| `chat` | `app/intelink/chat/page.tsx` | AI chat with Neo4j context |
| `jobs` | `app/intelink/jobs/page.tsx` | Background job monitoring |

### Backend (Python FastAPI)
| Module | File | Purpose |
|--------|------|---------|
| `entity` | `routers/entity.py` | Entity CRUD + lookup |
| `search` | `routers/search.py` | Full-text + semantic search |
| `auth` | `routers/auth.py` | JWT authentication |
| `graph` | `routers/graph.py` | Network graph queries |
| `chat` | `routers/chat.py` | AI conversation + tools |

### Integrations
| Source | Features | Status |
|--------|----------|--------|
| **Carteira Livre** | UI components, input masks | ✅ Integrated |
| **Forja** | WhatsApp Evolution API | ✅ Integrated |
| **852** | Gamification, ATRiAN, PII | ✅ Integrated |
| **BR-ACC** | Entity patterns, exposure scoring | ✅ Merged |

---

## 🔐 Security

| Layer | Implementation |
|-------|----------------|
| Auth | JWT (HS256) + bcrypt |
| Rate Limiting | slowapi (60/min anon, 300/min auth) |
| PII Protection | CPF/CNPJ masking middleware |
| CORS | Whitelist: intelink.ia.br, inteligencia.egos.ia.br |
| Headers | SecurityHeadersMiddleware |

---

## 🌐 Domains

| Domain | Purpose | SSL |
|--------|---------|-----|
| `intelink.ia.br` | **Production (Primary)** | Let's Encrypt |
| `inteligencia.egos.ia.br` | Alias/Canonical EGOS | Let's Encrypt |
| `localhost:3000` | Dev frontend | — |
| `localhost:8000` | Dev API | — |

---

## 🚀 Deploy

```bash
# 1. Clone / sync code
rsync -av --delete /home/enio/egos-inteligencia/ root@204.168.217.125:/opt/egos-inteligencia/

# 2. Deploy
cd /opt/egos-inteligencia
./scripts/deploy-hetzner.sh

# 3. Verify
curl https://intelink.ia.br/api/health
```

---

*Sacred Code: 000.111.369.963.1618*
