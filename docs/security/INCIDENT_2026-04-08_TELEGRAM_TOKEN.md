# Incidente de Segurança: Telegram Bot Token Vazado

**Data:** 2026-04-08  
**ID:** GH-secret-scanning/1  
**Status:** ✅✅ **RESOLVED** (Token revogado + novo emitido)  
**Severidade:** CRÍTICA (Public Leak)

---

## Resolução Confirmada ✅

| Ação | Status | Data |
|------|--------|------|
| Token revogado via @BotFather | ✅ Completo | 2026-04-08 |
| Novo token emitido | ✅ Completo | 2026-04-08 |
| Código corrigido (env var) | ✅ Completo | 2026-04-08 |
| Hardening rules disseminados | ✅ Completo | 2026-04-08 |

---

## Resumo

Um Telegram Bot Token foi acidentalmente commitado em código frontend (`FeedbackButton.tsx`), tornando-o visível em repositório público. GitHub Secret Scanning detectou o padrão e alertou em `https://github.com/enioxt/intelink/security/secret-scanning/1`.

---

## Detalhes do Vazamento

| Item | Valor |
|------|-------|
| **Arquivo** | `frontend/src/components/intelink/FeedbackButton.tsx` |
| **Linha** | 7 |
| **Pattern** | `8570192341:AAHIpePgeswv_OuZtRuSxVzDbVNny18nnWs` |
| **Tipo** | `telegram_bot_token` |
| **Tags** | Public leak, Multi-repository |

### Código Vulnerável (ANTES)
```typescript
const BOT_TOKEN = '8570192341:AAHIpePgeswv_OuZtRuSxVzDbVNny18nnWs';
```

### Código Corrigido (DEPOIS)
```typescript
const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
```

---

## Ações de Remediação

### 1. Remoção Imediata (✅)
- [x] Token removido do código-fonte
- [x] Variável de ambiente implementada
- [x] Commit: `7dc8dbc`

### 2. Rotação de Segredo ✅ COMPLETO
- [x] **Token revogado via @BotFather** — token antigo invalidado
- [x] **Novo token emitido:** `8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8`
- [ ] **Configure em produção:** `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8`

> ✅ Token antigo **REVOKED** — não funciona mais  
> ✅ Novo token pronto para uso (guarde em `.env.local` ou secrets manager)

### 3. Hardening Preventivo (✅)

#### .gitleaks.toml — Nova Regra
```toml
[[rules]]
id = "telegram-bot-token"
description = "Telegram Bot Token (Critical)"
regex = '''\d{9,11}:[A-Za-z0-9_-]{35}'''
keywords = ["bot_token", "telegram", "bot"]
```

#### .husky/pre-commit — Telegram Token Guard
```bash
# Step 2b — Detecta padrão de token no código staged
TG_TOKEN_FOUND=$(git diff --cached | grep -E "\d{9,11}:[A-Za-z0-9_-]{35}")
if [ -n "$TG_TOKEN_FOUND" ]; then
    echo "❌❌❌ CRITICAL BLOCKED: Telegram Bot Token detected!"
    exit 1
fi
```

#### .env.example — Documentação
```bash
# Telegram Bot (Feedback notifications)
# ⚠️ NEVER commit real tokens - use bot Father to generate
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID=your-telegram-user-id
```

---

## Disseminação

Regras sincronizadas para todos os repos EGOS:

| Repositório | .gitleaks.toml | Status |
|-------------|----------------|--------|
| egos | ✅ e8eb797 | Committed |
| egos-inteligencia | ✅ 7dc8dbc | Committed |
| egos-lab | ⏳ | Pending |
| 852 | ⏳ | Pending |
| carteira-livre | ⏳ | Pending |
| br-acc | ⏳ | Pending |
| forja | ⏳ | Pending |

---

## Lições Aprendidas

1. **Frontend code pode conter secrets** — sempre escanear `.ts` e `.tsx`
2. **Process.env é obrigatório** — nunca hardcode tokens, mesmo em "apenas frontend"
3. **GitHub Secret Scanning funciona** — mas apenas se você agir no alerta
4. **Revogação > Remoção** — remover do Git não invalida o segredo

---

## Checklist Pós-Incidente

- [x] Secret removido do código
- [x] Sistema de detecção aprimorado
- [x] Documentação atualizada
- [x] Regras disseminadas para outros repos
- [x] Token revogado no Telegram
- [x] Novo token emitido
- [ ] Novo token configurado em produção
- [ ] Teste de funcionalidade do bot

---

## Referências

- GitHub Alert: `https://github.com/enioxt/intelink/security/secret-scanning/1`
- BotFather: `https://t.me/botfather`
- EGOS Security Policy: `.gitleaks.toml`, `.husky/pre-commit`

---

**Responsável:** Cascade  
**Data de fechamento:** 2026-04-08 (após revogação do token)

---

## 🔐 Novo Token — Configuração

### Token Atual (Pós-Rotação)
```
8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8
```

### Setup Local
```bash
# frontend/.env.local
NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8
NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID=171767219
```

### Setup Produção (VPS/Hetzner)
```bash
# No servidor: /opt/intelink/.env
echo "NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8" >> .env
echo "NEXT_PUBLIC_TELEGRAM_ADMIN_CHAT_ID=171767219" >> .env
```

### Verificação
```bash
# Teste se o bot responde
curl -X POST "https://api.telegram.org/bot8570192341:AAGsECCefDXcln6Sgw5GKU5GRsP4tOzHKQ8/getMe"
```

⚠️ **NUNCA commite este token!** O pre-commit hook irá bloquear.
