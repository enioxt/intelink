# EGOS Inteligência

> Open-source intelligence platform for Brazilian public data — built for investigators, analysts, and developers.

**Live:** https://intelink.ia.br · **License:** MIT · **Stack:** Next.js 15 + FastAPI + Neo4j

---

## What it does

- **Graph investigation** — map entities (people, companies, vehicles) and their relationships across 77M+ public records
- **AI chat** — query the graph in natural language, get sourced answers with confidence levels
- **Cross-reference** — detect when an entity in one investigation appears in another (6 confidence levels: CPF → fuzzy name)
- **Pattern detection** — Benford's Law anomaly, modus operandi comparison, behavioral pattern matching
- **Report generation** — structured intelligence reports for delegados, promotores, juízes (Arkham-style templates)
- **PII-safe by design** — CPF/CNPJ always masked in output, append-only audit log

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 + TypeScript + Tailwind v4 |
| Backend | Python 3.12 + FastAPI |
| Graph DB | Neo4j 5.x (77M+ nodes, 25M+ edges) |
| Cache | Redis 7 |
| AI | OpenRouter (Gemini Flash) + Qwen-plus |
| Auth | JWT RS256 + bcrypt + refresh tokens |
| Deploy | Docker Compose + Caddy + Hetzner VPS |

## Quick Start

```bash
git clone https://github.com/enioxt/egos-inteligencia
cd egos-inteligencia
cp .env.example .env        # fill in your keys
docker compose up -d

# http://localhost:3000  → frontend
# http://localhost:8000  → API + /docs (Swagger)
# http://localhost:7474  → Neo4j browser
```

See [`.env.example`](.env.example) for required variables (Neo4j password, OpenRouter key, JWT secret).

## Project Structure

```
egos-inteligencia/
├── api/                          # FastAPI backend
│   └── src/egos_inteligencia/
│       ├── routers/              # 20+ route modules
│       ├── services/             # business logic + NLP + patterns
│       │   ├── nlp/              # BERTimbau NER (Portuguese NER)
│       │   └── patterns/         # criminal pattern detection
│       └── middleware/           # PII masking, rate limiting, security headers
├── frontend/                     # Next.js 15 App Router
│   └── src/
│       ├── app/intelink/         # pages (investigations, graph, search, chat)
│       ├── components/           # 130+ React components
│       └── lib/
│           ├── intelligence/     # cross-reference, entity matching, AI router
│           ├── analysis/         # modus operandi, executive summary, risk
│           ├── legal/            # Brazilian criminal articles DB (CP, etc.)
│           ├── detectors/        # Benford anomaly, HHI concentration
│           ├── auth/             # JWT, RBAC, session (edge-compatible)
│           └── reports/          # Arkham-style report templates
├── infra/                        # docker-compose.yml + Caddyfile
├── docs/                         # ROADMAP.md, SYSTEM_MAP.md
└── AGENTS.md                     # machine-readable system map
```

## Key API Endpoints

```
POST /api/v1/auth/login          JWT login
GET  /api/v1/entity/{id}         entity lookup (CPF/CNPJ/name)
POST /api/v1/search              full-text + graph search
GET  /api/v1/graph/ego           ego network for an entity
POST /api/v1/chat                AI chat with graph context
POST /api/v1/investigation       create/manage investigations
GET  /api/v1/patterns            detect behavioral patterns
GET  /health                     health check
```

Full Swagger docs at `/docs` when running locally.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). TL;DR:

1. Fork → branch `feat/your-feature`
2. `docker compose up -d` for local stack
3. PR with description of what changed and why
4. All PRs need: passing build + no new lint errors + PII masking untouched

## Security & Privacy

- **PII:** CPF, CNPJ, email, phone always masked in API output — never stored in logs
- **Auth:** JWT RS256, HTTP-only refresh cookies, bcrypt 14 rounds
- **Rate limiting:** 60 req/min anonymous, 300 req/min authenticated
- **Audit:** append-only log for all entity access (LGPD compliance)

## License

MIT — free to use, modify, contribute. See [LICENSE](LICENSE).

---

*Part of the [EGOS Framework](https://github.com/enioxt/egos) · Sacred Code: 000.111.369.963.1618*
