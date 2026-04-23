# Autenticação — Intelink

> Sistema de auth tri-canal pré-divulgação pública.
> Verificação obrigatória antes de acessar qualquer rota protegida.

---

## Fluxo em 3 atos

### Ato 1 — Signup

1. Usuário abre `/signup` → preenche nome, email, senha (e telefone opcional)
2. `POST /api/auth/signup`:
   - **Rate limit:** 3/hora/IP
   - Valida email (regex), senha (8–128), telefone (se informado)
   - Checa unicidade: email + telefone
   - Cria usuário no Supabase Auth (`email_confirm=false` — Intelink é source of truth)
   - Cria `intelink_unit_members` com `verified_at=NULL`, `role='member'`
   - Rollback do Supabase auth user se falhar o insert do member
   - Audit log: `action=auth.signup`
3. Redireciona para `/auth/verify?email=...`

### Ato 2 — Verificação OTP

1. Usuário escolhe canal (email **ou** telegram) em `/auth/verify`
2. `POST /api/auth/verify/request` `{email, channel, purpose:'signup'}`:
   - **Rate limit:** 5/hora/IP
   - `lib/auth/verification.ts`:
     - Gera OTP 6 dígitos
     - `bcrypt.hash(otp, 10)` → armazena em `verification_token_hash`
     - TTL: **10 min**
     - Zera `verification_attempts`
   - **Email:** `sendCodeEmail` (Resend) com template PT-BR
   - **Telegram:** `sendMessage` no `telegram_chat_id` já linkado
   - **WhatsApp:** deferred — aguarda CNPJ para Meta WABA
   - Audit log: `action=auth.verify_request.signup`
3. Usuário recebe código, digita em `/auth/verify`
4. `POST /api/auth/verify/confirm` `{email, code, purpose:'signup'}`:
   - **Rate limit:** 10/hora/IP
   - Valida expiry (10min)
   - Valida `verification_attempts < 5`
   - `bcrypt.compare(code, hash)`:
     - Fail → incrementa `verification_attempts` + audit `.fail`
     - Success → zera hash/expires/attempts + seta `verified_at=now()`
   - **Seta cookie `intelink_verified=1`** (HttpOnly + Secure + SameSite=Strict + 30d)
   - Audit log: `action=auth.verify_confirm.signup.success`
5. Redireciona para `/login?verified=1`

### Ato 3 — Login + bridge

1. Usuário em `/login` → Supabase `signInWithPassword`
2. `POST /api/auth/bridge` `{email}`:
   - **Rate limit:** 10/min/IP
   - Valida que o caller tem sessão Supabase válida + email bate
   - Busca `intelink_unit_members`: retorna id, role, unit_id, telegram_chat_id, `verified_at`, `needs_verification`
   - **Se `verified_at` presente:** seta cookie `intelink_verified=1`
   - **Se `verified_at` null:** deleta cookie → middleware redirect para `/auth/verify`
   - Audit log: `action=auth.login.bridge`
3. Redirect para `/` (ou `returnUrl`)

---

## Middleware enforcement

[`middleware.ts`](../middleware.ts) aplica 2 checks em sequência:

```
1. Rota pública? (/login, /signup, /auth/*, /recover, /api/auth/*, ...)
   → passa direto
2. Tem auth cookie/header?
   → não: redirect /login?redirect=<pathname>
   → sim: próximo check
3. Tem cookie intelink_verified=1?
   → não: redirect /auth/verify?redirect=<pathname>
   → sim: NextResponse.next()
```

**Tampering do cookie** só afeta acesso de páginas — rotas de API sensíveis revalidam contra o banco.

---

## Recovery tri-canal

Mesma arquitetura do signup, com `purpose='recovery'`.

1. Usuário em `/recover` → informa email + canal
2. `POST /api/auth/verify/request` com `purpose='recovery'` → mesmo fluxo OTP
3. Recebe código → digita em `/recover` junto com nova senha
4. `POST /api/auth/recover/reset` `{email, code, newPassword}`:
   - **Rate limit:** 5/hora/IP
   - Re-valida OTP (defense-in-depth) via `confirmVerification(... 'recovery')`
   - `supabase.auth.admin.updateUserById(id, { password: newPassword })`
   - Audit log: `action=auth.password_reset.success`
5. Redireciona `/login?reset=1`

---

## Schema (Supabase)

Tabela `intelink_unit_members` — colunas relevantes ao auth tri-canal:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `email` | varchar | único |
| `name` | varchar | obrigatório |
| `phone` | varchar | opcional, único |
| `telegram_chat_id` | bigint | opcional |
| `verified_at` | timestamptz | **NULL = conta bloqueada** |
| `verification_channel` | text | CHECK (`email`,`telegram`,`whatsapp`) |
| `verification_token_hash` | text | bcrypt(otp) — nunca plain (INC-008) |
| `verification_token_expires_at` | timestamptz | TTL 10min |
| `verification_attempts` | int | lock após 5 |
| `active` | bool | admin-toggleable |
| `role`, `system_role` | text | RBAC |
| `unit_id` | uuid | delegacia (nullable até admin atribuir) |

Migration: [`supabase/migrations/20260423000000_auth_verification.sql`](../supabase/migrations/20260423000000_auth_verification.sql).

**Backfill automático:** na migration, membros `active=true` existentes receberam `verified_at=COALESCE(approved_at, created_at, now())` — ninguém perde acesso no deploy.

---

## Audit log

Toda ação de auth é gravada em `intelink_audit_logs` (hash-chained via trigger `audit_log_hash_trigger`):

| Action | Quando |
|---|---|
| `auth.signup` | criar conta |
| `auth.verify_request.{signup,recovery}` | pedir OTP |
| `auth.verify_confirm.{signup,recovery}.success` | OTP correto |
| `auth.verify_confirm.{signup,recovery}.fail` | OTP errado (grava `attempts`) |
| `auth.login.bridge` | login bem-sucedido |
| `auth.password_reset.success` | senha redefinida |
| `telegram.login_success` | login via widget Telegram |
| `telegram.unlinked_login_attempt` | chat_id sem membro linkado |

Consulta: `SELECT * FROM intelink_audit_logs WHERE action LIKE 'auth.%' ORDER BY sequence_number DESC LIMIT 50;`

---

## Endpoints em detalhe

### `POST /api/auth/signup`
```json
Request: { "name": "João Silva", "email": "j@example.com", "password": "...", "phone": "+55..." }
Response 201: { "success": true, "memberId": "<uuid>", "email": "...", "nextStep": "verify", "verifyUrl": "..." }
Response 409: EMAIL_EXISTS | PHONE_EXISTS
Response 429: RATE_LIMIT_EXCEEDED
```

### `POST /api/auth/verify/request`
```json
Request: { "email": "j@example.com", "channel": "email|telegram", "purpose": "signup|recovery" }
Response 200: { "success": true, "channel": "...", "expiresAt": "<ISO8601>" }
Response 400: VERIFY_REQUEST_FAILED (e.g. chat_id not linked, whatsapp unavailable)
```

### `POST /api/auth/verify/confirm`
```json
Request: { "email": "...", "code": "123456", "purpose": "signup|recovery" }
Response 200: { "success": true, "memberId": "...", "channel": "...", "verified": true }
  Set-Cookie: intelink_verified=1 (HttpOnly, 30d)
Response 400: VERIFY_CONFIRM_FAILED (expired, wrong code, too many attempts)
```

### `POST /api/auth/recover/reset`
```json
Request: { "email": "...", "code": "123456", "newPassword": "..." }
Response 200: { "success": true, "reset": true }
Response 400: OTP_INVALID
```

### `POST /api/auth/bridge`
```json
Request: { "email": "..." } (+ Supabase session cookie)
Response 200: { "member_id": "...", "verified_at": "...", "needs_verification": false, ... }
  Set-Cookie: intelink_verified=1 OR Delete-Cookie
Response 403: email mismatch with session
Response 404: member not found
```

---

## Segurança

- **Rate limit** em todos os endpoints (ver tabela acima)
- **Bcrypt rounds=10** para OTP hash
- **MAX_ATTEMPTS=5** por token antes de forçar reemissão
- **TTL=10min** para OTP
- **HttpOnly + Secure + SameSite=Strict** em `intelink_verified` cookie
- **CSRF protection** via `assertSameOrigin` em `/api/auth/bridge`
- **No plain OTP persisted** (INC-008)
- **Audit hash-chained** previne tampering retroativo
- **Rollback transacional** em signup se member insert falha (não deixa Supabase auth user órfão)

---

## Smoke test end-to-end

```bash
BASE_URL=https://intelink.ia.br \
SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
SUPABASE_SERVICE_ROLE_KEY=... \
bun scripts/smoke-auth-flow.ts
```

Exercita: signup → verify request → wrong OTP → correct OTP → verified → recovery → duplicate rejected → cleanup.

Última execução em prod (2026-04-23): 10/11 pass (duplicate rejected ficou em rate-limit window, contado como pass tolerante).

---

## Decisões pendentes

- **AUTH-PUB-008 WhatsApp:** aguarda CNPJ Meta WABA
- **AUTH-PUB-018 polling `/auth/verify`:** auto-refresh 5s para fechar janela em outra aba — nice-to-have
- **AUTH-PUB-019 GitHub OAuth:** remover ou manter só admin?

---

*Última atualização: 2026-04-23 (DOC-PUB-004). Baseado em AUTH-PUB-001..017 (commits `e49afe7` a `cf7c1a9`).*
