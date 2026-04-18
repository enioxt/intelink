# Telegram Bot Architecture — Intelink

## Overview

The Telegram bot (`IntelinkBOT`) runs as a **webhook-only** service inside the Docker Compose stack alongside the Next.js web app.

**No PM2.** The previous PM2 long-polling process (`egos-telegram`) was deleted — it caused 409 Conflict with the webhook.

## Webhook

- URL: `https://intelink.ia.br/api/telegram/webhook`
- Registered via: `POST https://api.telegram.org/bot<TOKEN>/setWebhook`
- Verified via: `GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

## Message routing

```
incoming message
  → /api/telegram/webhook (Next.js API route)
    → isCommand('/start') → onboard user
    → isCommand('/relatorio') → generate report
    → isCommand('/grupo') → group query
    → free text → routeNaturalLanguage() → OpenRouter (qwen-plus default)
```

Free text handler (`routeNaturalLanguage`) uses `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`. If `OPENROUTER_API_KEY` is missing the bot returns a fallback error message.

## Required env vars

| Var | Source |
|-----|--------|
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `OPENROUTER_API_KEY` | OpenRouter dashboard |
| `OPENROUTER_MODEL` | Default: `alibaba/qwen-plus` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings |

## Telegram Login Widget (web)

The login page injects the Telegram Login Widget when `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=IntelinkBOT` is set at build time.

Widget flow:
1. User clicks "Login com Telegram" → Telegram authenticates user
2. Redirect to `/api/auth/telegram/callback?hash=...`
3. Server verifies HMAC hash with `TELEGRAM_BOT_TOKEN`
4. Creates Supabase session → redirects to `/`

**BotFather setup required:** `/setdomain` on `IntelinkBOT` → `intelink.ia.br`

## Member bridging

After any login (email or Telegram), `/api/auth/bridge` is called with the user's email to:
1. Look up `intelink_unit_members` by email
2. Return `member_id`, `system_role`, `telegram_chat_id`, `phone`, `name`
3. Store in `localStorage` for RBAC on the client

## Debugging

```bash
# Check webhook status
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# Check bot logs
docker compose logs bot --tail=50

# Re-register webhook if lost
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://intelink.ia.br/api/telegram/webhook"
```
