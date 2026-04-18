# Intelink — Police Intelligence Platform

> **Standalone repository** — Next.js 16 + TypeScript + Neo4j + Supabase  
> Sistema de inteligência policial (uso restrito — dados sensíveis)

---

## Para agentes de IA — leia isso primeiro

**Este é o repo canônico e único do Intelink.**  
Ao receber `/start "trabalhar no intelink"` ou similar, este é o caminho:

```
/home/enio/intelink/       ← CANONICAL (este repo)
```

**NÃO existe mais código Intelink ativo em:**
- `/home/enio/intelink-legacy/` — arquivado em 2026-04-18, somente leitura
- `/home/enio/egos-lab/apps/egos-inteligencia/` — egos-lab está sendo arquivado
- VPS `/opt/intelink-nextjs/` — produção, sincronizado via rsync deste repo

Ver [docs/MIGRATION_HISTORY.md](docs/MIGRATION_HISTORY.md) para entender o histórico completo de pastas e o que foi absorvido de onde.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 App Router + TypeScript strict |
| Banco | Supabase (auth + RBAC) + Neo4j 5.x (grafo 83.7M nós) |
| Deploy | Hetzner VPS 204.168.217.125, Docker Compose, Caddy |
| Bot | Telegram webhook, OpenRouter (minimax/minimax-m1) |
| Build | Bun, `oven/bun:1` builder + `node:20-alpine` runner |

---

## Estrutura

```
intelink/
├── app/                  # Next.js App Router — rotas e API routes
├── lib/                  # Lógica core
│   ├── intelligence/     # 33 módulos: NER, cross-reference, RAG, confidence
│   ├── intelink/         # Runtime Telegram bot (commands/, ai-router.ts)
│   ├── auth/             # Auth server-side (JWT, RBAC, CSRF)
│   ├── neo4j/            # Driver Neo4j + queries
│   └── ...
├── components/           # UI components
├── hooks/                # React hooks (incluindo hooks absorvidos do legacy)
├── docs/                 # Documentação
│   ├── MIGRATION_HISTORY.md   ← história das pastas
│   ├── infra/            # Ansible + Terraform
│   └── ...
├── scripts/              # Deploy, backup, compliance checks
├── TASKS.md              # Tasks ativas (incluindo migradas do legacy)
└── AGENTS.md             # Regras para agentes de IA neste repo
```

---

## Deploy (VPS)

```bash
# Sincronizar código novo para VPS
rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' \
  /home/enio/intelink/ root@204.168.217.125:/opt/intelink-nextjs/

# Rebuild e restart
ssh root@204.168.217.125 "cd /opt/intelink-nextjs && docker compose build && docker compose down && docker compose up -d"
```

**Importante:** `NEXT_PUBLIC_*` vars são baked no build. Mudar essas vars exige rebuild com `--build-arg`.

---

## Variáveis de ambiente

Ver [apps/web/.env.example](apps/web/.env.example) → ou `.env.local` no VPS em `/opt/intelink-nextjs/.env.local`.

---

## Arquivo de referência

Se precisar de código ou decisões do passado, consulte:
- **`/home/enio/intelink-legacy/`** — repo antigo (somente leitura, fora do workspace)
- [docs/MIGRATION_HISTORY.md](docs/MIGRATION_HISTORY.md) — índice do que foi absorvido e de onde
