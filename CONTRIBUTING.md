# Contributing to EGOS Inteligência

Thanks for your interest. This is an open intelligence platform — contributions are welcome.

## Setup

```bash
git clone https://github.com/enioxt/egos-inteligencia
cd egos-inteligencia
cp .env.example .env        # fill in: NEO4J_PASSWORD, OPENROUTER_API_KEY, JWT_SECRET
docker compose up -d        # starts Neo4j + Redis + API + Frontend
```

- Frontend: http://localhost:3000
- API + Swagger: http://localhost:8000/docs
- Neo4j: http://localhost:7474 (user: neo4j, pass: from .env)

**Without Neo4j data:** the API returns empty graphs but auth and chat still work. Load sample data with `python api/scripts/seed_synthetic_data.py`.

## How to contribute

1. **Check open issues** before starting — avoid duplicate work
2. **Fork** the repo, create a branch: `feat/your-feature` or `fix/the-bug`
3. **Make your changes** — keep PRs small and focused (one thing per PR)
4. **Open a PR** with:
   - What changed and why (2-3 sentences is enough)
   - Screenshot or curl output if it's UI/API
5. A maintainer will review within 48h

## Rules (non-negotiable)

- **PII masking must never be weakened.** CPF/CNPJ/email always masked in output. Tests in `api/tests/`.
- **No hardcoded secrets.** Use `.env` — check `.env.example` for the list.
- **Audit log is append-only.** Don't add UPDATE/DELETE to the audit tables.
- **Reports must be non-accusatory.** Follow the report standard: sourced, confidence-leveled, gaps documented.

## Project structure

See [`README.md`](README.md#project-structure) for the full tree. Key entry points:

| Want to... | Look at |
|-----------|---------|
| Add an API endpoint | `api/src/egos_inteligencia/routers/` |
| Add a service/algorithm | `api/src/egos_inteligencia/services/` |
| Add a page | `frontend/src/app/intelink/` |
| Add a component | `frontend/src/components/intelink/` |
| Add an analysis module | `frontend/src/lib/analysis/` or `lib/intelligence/` |
| Change the AI prompt | `frontend/src/lib/intelligence/system-prompt.ts` |

## For AI agents

Read `AGENTS.md` first — it has the full capability map, API surface, and migration status. The SSOT for tasks is `TASKS.md`.

## Questions?

Open a GitHub issue or reach out via the [EGOS community](https://github.com/enioxt/egos).
