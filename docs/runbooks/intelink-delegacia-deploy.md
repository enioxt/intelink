# Intelink — Deploy Runbook por Delegacia

> **Status:** Opção B (deploy isolado por delegacia) — INTELINK-005
> **Última atualização:** 2026-04-22
> **Aplicabilidade:** N < 3 delegacias. Migração para Opção A (multi-tenant single deploy) quando 3a delegacia for prevista (Karpathy: abstrair só após 3a repetição).

## Contexto da decisão

**Por que Opção B (deploy separado) e não Opção A (row-level multi-tenancy)?**

1. **Isolamento jurídico:** dados policiais sensíveis (REDS, investigações) em pastas/DBs separados elimina risco de leak cross-delegacia em caso de bug em RLS/RBAC.
2. **Soberania operacional:** cada delegacia controla seu uptime, suas chaves OpenRouter, seu pacing de updates. Falha em uma não derruba outras.
3. **Compliance LGPD:** demonstrar isolamento físico/lógico é mais simples para auditoria que demonstrar policies row-level corretas.
4. **Operacionalmente mais barato hoje:** N=1, 2 delegacias = 2-3h/mês de manutenção. N>=3 = revisar.

**Trigger para migrar para Opção A:**
- 3a delegacia confirmada/contratada
- OR custo agregado de Supabase > R$ 500/mês (cada deploy aloca seu projeto)
- OR feature pedida que cruza delegacias (intelligence-sharing)

## Pré-requisitos por delegacia

| Recurso | Quem provê | Notas |
|---------|------------|-------|
| Subdomínio (ex: `dhpp-bh.intelink.ia.br`) | EGOS | DNS A → VPS Hetzner 204.168.217.125 |
| Projeto Supabase próprio | EGOS Supabase org | Free tier suficiente até ~50K rows |
| OpenRouter API key | Delegacia (BYOK) ou EGOS | Budget cap configurado |
| Telegram Bot Token | EGOS BotFather | 1 bot por delegacia |
| Neo4j (opcional) | EGOS | Compartilhado em `bracc-neo4j` se OSINT cross-case |
| JWT_SECRET | Gerado | `openssl rand -base64 32` |
| Credenciais iniciais (admin, investigadores) | EGOS + delegacia | Lista CSV: `nome, email, telefone, role` |

## Rollout — passo a passo (estimativa: 3-4h por delegacia)

### Fase 1 — Preparação (30 min, offline)

1. **Decidir slug** da delegacia: kebab-case curto, ex: `dhpp-bh`, `pcmg-uberlandia`
2. **Provisionar DNS:** Cloudflare/registrar → A record `dhpp-bh.intelink.ia.br` → `204.168.217.125`
3. **Criar projeto Supabase:** dashboard → New Project → nome `intelink-dhpp-bh`. Anotar URL + anon key + service role.
4. **Criar bot Telegram:** BotFather → `/newbot` → nome `Intelink DHPP BH` → `intelink_dhpp_bh_bot`. Anotar token.
5. **Gerar JWT_SECRET:** `openssl rand -base64 32`

### Fase 2 — Migrations Supabase (45 min)

1. SSH no VPS: `ssh root@204.168.217.125`
2. Clone repo intelink em pasta dedicada:
   ```bash
   cd /opt && git clone git@github.com:enioxt/intelink.git intelink-dhpp-bh
   cd intelink-dhpp-bh
   ```
3. Aplicar migrations no novo projeto Supabase:
   ```bash
   # Configurar Supabase CLI temporariamente
   export SUPABASE_PROJECT_REF=<novo-ref>
   bun supabase db push
   ```
   Verificar tabelas criadas: `intelink_investigations`, `intelink_chat_sessions`, `intelink_chat_messages`, `intelink_documents`, `intelink_entities`, `intelink_evidences`.

4. Seed inicial (admin + RBAC):
   ```bash
   # Adaptar scripts/seed-rbac.sql com email do admin da delegacia
   psql $SUPABASE_DB_URL -f scripts/seed-rbac.sql
   ```

### Fase 3 — Deploy container (1h)

1. Criar `.env` no novo deploy:
   ```bash
   cd /opt/intelink-dhpp-bh
   cat > .env <<EOF
   NEXT_PUBLIC_SUPABASE_URL=https://<novo-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
   SUPABASE_SERVICE_ROLE_KEY=<service>
   OPENROUTER_API_KEY=<key>
   OPENROUTER_MODEL=minimax/minimax-m2.5
   JWT_SECRET=<openssl-output>
   TELEGRAM_BOT_TOKEN=<bot-token>
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=intelink_dhpp_bh_bot
   NEXT_PUBLIC_APP_URL=https://dhpp-bh.intelink.ia.br
   NEO4J_URI=bolt://bracc-neo4j:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=<from-bracc-env>
   EOF
   chmod 600 .env
   ```

2. Adaptar `docker-compose.yml`:
   - `container_name: intelink-web-dhpp-bh`
   - `ports: 127.0.0.1:<porta-livre>:3000` — alocar porta acima de 3009 (próxima delegacia: 3010, depois 3011, etc).
   - Mesma rede `infra_bracc` (compartilhada para Neo4j read-only).

3. Build + start:
   ```bash
   docker compose build --no-cache intelink-web
   docker compose up -d intelink-web
   ```

4. Caddy: adicionar bloco em `/opt/bracc/infra/Caddyfile`:
   ```
   dhpp-bh.intelink.ia.br {
       reverse_proxy localhost:3010
   }
   ```
   Reload: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`

### Fase 4 — Validação (30 min)

```bash
# 1. Health
curl -s https://dhpp-bh.intelink.ia.br/api/health
# 2. Manifest
curl -s https://dhpp-bh.intelink.ia.br/api/internal/discover | jq .slug
# 3. Login flow (manual): abrir browser, criar primeira investigação, enviar 1 mensagem chat
# 4. Telegram: enviar /start ao bot, validar resposta
```

Checklist:
- [ ] HTTPS funcionando (Caddy auto-SSL via Let's Encrypt)
- [ ] Login com admin recém-criado
- [ ] 1 investigação criada
- [ ] 1 mensagem de chat persiste (verificar `intelink_chat_messages` no novo Supabase)
- [ ] Telegram `/start` responde
- [ ] OpenRouter usage aparece no dashboard com a key correta

### Fase 5 — Registry no gateway (10 min)

Adicionar entry em `GATEWAY_REGISTRY` env var de `/opt/apps/egos-gateway/.env`:

```json
[
  {"slug":"intelink","url":"http://intelink-web:3000","use_cases":["police-intelligence"],"default":true},
  {"slug":"intelink-dhpp-bh","url":"http://intelink-web-dhpp-bh:3000","use_cases":["police-intelligence-dhpp-bh"]}
]
```

Rebuild gateway: `cd /opt/apps/egos-gateway && docker compose up -d --force-recreate`

Verificar: `curl https://chatbot.egos.ia.br/api/chatbots | jq '.chatbots[].slug'`

## Pós-deploy — handoff para delegacia

1. **Doc de uso:** enviar `docs/USER_GUIDE.md` (TODO criar) traduzido para PT-BR investigador
2. **Treinamento:** sessão de 1h cobrindo investigações, chat, RAG, geração de relatório
3. **Canal de suporte:** WhatsApp/Telegram dedicado por delegacia
4. **Backup:** Supabase point-in-time recovery + dump diário automático para R2

## Custos estimados por delegacia/mês

| Item | Custo (BRL) | Notas |
|------|-------------|-------|
| Supabase Free | 0 | Até 500MB DB / 1GB storage / 50K MAU |
| Supabase Pro (se ultrapassar) | ~140 | $25 USD |
| OpenRouter (MiniMax M2.5) | ~50-200 | Depende de volume |
| VPS (compartilhado) | ~0 | Custo marginal — Hetzner CCX-13 já paga |
| **Total estimado** | **R$ 50-340** | |

## Quando migrar para Opção A (multi-tenant)

**Trigger:** 3a delegacia confirmada.

Plano de migração (high-level — detalhar em runbook separado quando ativar):
1. Adicionar `delegacia_id` em todas tabelas `intelink_*`
2. RLS policies por `delegacia_id` (validar com testes adversariais)
3. Migrar dados de cada deployment isolado para single DB com `delegacia_id` populado
4. Single deploy serve todas delegacias com routing por subdomínio + middleware
5. Manter deploys isolados como fallback rollback por 30 dias

**Não fazer agora.** N=1 ou N=2 não justifica complexidade RLS.

## Rollback de uma delegacia

```bash
ssh root@204.168.217.125
cd /opt/intelink-dhpp-bh
docker compose down
# Backup DB primeiro
pg_dump $SUPABASE_DB_URL > /opt/backups/intelink-dhpp-bh-$(date +%F).sql
# Remover bloco Caddyfile + reload
# Remover entry do GATEWAY_REGISTRY + rebuild gateway
```

DNS pode permanecer apontado (subdomínio inativo) ou ser removido pela delegacia.

---

*Ref: TASKS.md CHATBOT-EVO-INTELINK-005 | CHATBOT_SSOT.md §17 | INC-006 use-case-scoped scoring*
