# VPS Architecture — Intelink

**VPS:** Hetzner 204.168.217.125  
**SSH:** `ssh -i ~/.ssh/hetzner_ed25519 root@204.168.217.125`

## Services

| Service | Path | Port | Managed by |
|---------|------|------|------------|
| Next.js web app | `/opt/intelink-nextjs/` | 3009 | Docker Compose |
| Telegram bot | `/opt/intelink-nextjs/` (same compose) | — | Docker Compose |
| Caddy reverse proxy | `/opt/bracc/infra/Caddyfile` | 80/443 | systemd |
| Neo4j | `/opt/neo4j/` | 7474/7687 | Docker Compose |

## Caddy routing

```
intelink.ia.br → localhost:3009
```

## Docker Compose — Next.js

File: `/opt/intelink-nextjs/docker-compose.yml`

Build args are mandatory for `NEXT_PUBLIC_*` vars — they are baked at image build time, not injected at runtime.

```bash
# Rebuild after code changes or env var changes for NEXT_PUBLIC_* vars
docker compose build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --build-arg NEXT_PUBLIC_APP_URL=https://intelink.ia.br \
  --build-arg NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=IntelinkBOT

docker compose up -d
docker compose logs -f --tail=50
```

## Environment — `/opt/intelink-nextjs/.env.local`

See `apps/web/.env.example` for full variable reference.

Runtime-only vars (do NOT need rebuild): `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `OPENROUTER_API_KEY`, `JWT_SECRET`.

Build-time vars (need `docker compose build`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

## Deploy procedure

```bash
ssh -i ~/.ssh/hetzner_ed25519 root@204.168.217.125
cd /opt/intelink-nextjs

# 1. Pull latest code (rsync from local or git pull)
rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' \
  /home/enio/intelink/ \
  root@204.168.217.125:/opt/intelink-nextjs/

# 2. Rebuild image (always --no-cache after source changes)
source .env.local
docker compose build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  --build-arg NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

# 3. Restart
docker compose down && docker compose up -d

# 4. Verify
curl -s -o /dev/null -w "%{http_code}" https://intelink.ia.br/login
# Expect: 200
```

## Legacy paths (REMOVED 2026-04-18)

- `/opt/egos-lab/apps/intelink/` — deleted
- `/opt/egos-lab/apps/telegram-bot/` — deleted
- PM2 `egos-telegram` process — deleted (`pm2 delete egos-telegram && pm2 save`)
