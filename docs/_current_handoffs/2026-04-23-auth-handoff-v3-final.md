# AUTH REDIRECT BUG — HANDOFF v3 (final session close)

**Data:** 2026-04-23  
**Sessão:** 3ª (opus-mode ativo)  
**Status:** Parcialmente corrigido localmente, **NADA em produção ainda**  
**Próxima ação:** outra janela decide prioridades

---

## 🎯 TL;DR DO ESTADO ATUAL

- ✅ **Causa raiz identificada e confirmada com evidência no bundle de produção**
- ✅ **8 commits aplicados localmente** — build passa, tudo verde
- ❌ **ZERO deploys em produção** — bundle em prod ainda é versão antiga (inclui uma build que tem meu fix inicial de csrf, mas sem `NEXT_PUBLIC_APP_URL` inlined)
- 🚧 **Restam: Passo 2 (script), Passo 3 (deploy), Passo 4 (Caddy), Passo 5 (test e2e)**

---

## 📋 CAUSA RAIZ (CONFIRMADO via inspeção do bundle em prod)

**Bundle em produção `/app/.next/server/chunks/*.js` contém:**
```javascript
let f = new Set(["http://localhost:3009","http://localhost:3000","http://localhost:3001"]);
// ...
if (!f.has(origin)) return NextResponse.json({success:false,error:"Origin não permitida"},{status:403})
```

**Nenhum domínio de produção está no allowlist.** Todo POST real de browser (com header `Origin: https://...`) dá **403 "Origin não permitida"**.

### Por quê (mecânica precisa)

1. `lib/auth/csrf.ts` antigo lia `process.env.NEXT_PUBLIC_APP_URL`
2. Next.js **inlina `NEXT_PUBLIC_*` em BUILD-time**, não runtime
3. `docker build` não injeta vars do `.env` (só o runtime via `env_file:`)
4. No build: `NEXT_PUBLIC_APP_URL` = `undefined` → `undefined ?? ''` = `''`
5. Set deduplicou, ficou só localhosts
6. `.env` no VPS tem `NEXT_PUBLIC_APP_URL=https://intelink.ia.br` mas isso **não entra no bundle depois do build**

### Consequência em cascata (3 bugs em combo)

**R1** — [app/login/page.tsx:36 em prod](app/login/page.tsx#L36) (versão antiga ainda): `if (session) router.push(returnUrl)` sem validar bridge. Sessão Supabase fantasma no localStorage cria loop /login ↔ /central.

**R2** — CSRF 403 (o bundle bug acima).

**R3** — [AuthProvider.tsx:123](providers/AuthProvider.tsx#L123) + [app/page.tsx:241](app/page.tsx#L241) em prod: logout não chama `supabase.auth.signOut()`. Session Supabase sobrevive.

### Descobertas extras (não mencionadas pelo agente prévio)
- **Supabase usa localStorage, NÃO cookie** — [lib/supabase-client.ts:29](lib/supabase-client.ts#L29) `storageKey: 'intelink-auth-token'`. Middleware procura `sb-*-auth-token` cookie que não existe.
- **Bridge aceitava qualquer email quando callerEmail=null** — [app/api/auth/bridge/route.ts:59 antigo] vulnerabilidade de enumeração reversa.
- **Script de deploy aponta pra path errado**: `scripts/deploy-hetzner.sh` usa `/opt/egos-inteligencia`, container real está em `/opt/intelink-nextjs`.
- **useRole consulta tabela INEXISTENTE**: [hooks/useRole.tsx:154 antigo] `.from('intelink_members')` — tabela real é `intelink_unit_members`. Bug silencioso: usuários admin ficavam marcados como "contributor".
- **Caddy serve apex+www no mesmo bloco sem redirect** — `/opt/bracc/infra/Caddyfile` linha ~intelink: `intelink.ia.br, www.intelink.ia.br { reverse_proxy intelink-web:3000 }`. Dois "sites" separados do ponto de vista de cookies.
- **Service worker NÃO é o problema**: `/sw.js` explicitamente pula `/login` e `/api/auth/*` — já verificado.

---

## 📊 DADOS EM PRODUÇÃO (Supabase `egos-lab` — project_id `lhscgsqhiooyatkebose`)

**CONFIRMADO via execute_sql MCP:**
- `enioxt@gmail.com` **EXISTE** em `auth.users` (id `ed67c41f-afaa-4d0f-b81e-bc8f14c8fffa`), senha válida, email confirmado, last_sign_in `2026-04-23 13:49 UTC`
- `enioxt@gmail.com` **EXISTE** em `intelink_unit_members` (id `7a62c0fa-e690-4165-ad88-1ca09aa1b737`), `system_role=super_admin`, verificado
- Total `intelink_unit_members`: 14
- Total `auth.users`: 2 (apenas `enioxt@gmail.com` + `test@egos.local`)
- Sessões JWT ativas: 4

**Implicação:** Os dados do `enioxt@gmail.com` estão corretos. O bug é 100% de código/infra, não de dados. 12 dos 14 membros não podem logar email/senha (sem conta em `auth.users`), mas isso é dívida separada.

---

## ✅ COMMITS LOCAIS (8 total, NENHUM em produção)

```
[aafa9f7] fix(auth): useRole reads from /api/v2/auth/verify, removes dead queries   (Etapa 2)
[0986a71] fix(auth): bridge rejects unauthenticated callers (callerEmail=null)      (Etapa 2)
[335ae74] fix(auth): AuthProvider bridge call sends Authorization Bearer            (Etapa 1)
[62473b8] fix(auth): logout also ends Supabase session in both call sites           (Etapa 1)
[342ad65] fix(auth): /login validates bridge before redirecting                     (Etapa 1)
[27ff092] fix(auth): CSRF accepts both apex and www origins                          (Etapa 1 — SUPERSEDED)
[536f10e] fix(auth): bridge endpoint now creates JWT session + sets auth cookies   (sessão anterior)
[+1 pendente não commitado] lib/auth/csrf.ts — hardcode apex+www, remove NEXT_PUBLIC dependency
```

**Commit do csrf refactor final está pendente** — feito e buildado (build verde, `intelink.ia.br` + `www.intelink.ia.br` aparecem no bundle `.next/server/chunks/[root-of-the-server]__62da52dd._.js`), **mas NÃO foi `git add` + `git commit`** ainda.

---

## 🔍 ESTADO DO CÓDIGO ATUALMENTE NO DISCO (não no VPS)

### `lib/auth/csrf.ts` (modificado, não commitado)
```typescript
function buildAllowedOrigins(): Set<string> {
    const origins = new Set<string>([
        'https://intelink.ia.br',
        'https://www.intelink.ia.br',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3009',
    ]);
    const extra = (process.env.ALLOWED_ORIGINS ?? '')
        .split(',').map(s => s.trim()).filter(Boolean);
    extra.forEach(o => origins.add(o));
    return origins;
}
const ALLOWED_ORIGINS = buildAllowedOrigins();
```
**Build local verificado**: `.next/server/chunks` contém `"https://intelink.ia.br"` e `"https://www.intelink.ia.br"` literalmente no bundle.

### Outros arquivos (já commitados)
- `app/login/page.tsx` — `checkSession` valida bridge antes de push, limpa Supabase se falhar
- `providers/AuthProvider.tsx` — bridge com Authorization Bearer, logout com signOut
- `app/page.tsx` — handleLogout com supabase.auth.signOut
- `app/api/auth/bridge/route.ts` — rejeita callerEmail=null com 401
- `hooks/useRole.tsx` — usa `/api/v2/auth/verify`, remove query em tabela inexistente

---

## 🖥️ ESTADO DO VPS (Hetzner 204.168.217.125)

**Acesso:** `ssh -i ~/.ssh/hetzner_ed25519 root@204.168.217.125` (autorizado pelo user)

### Containers relevantes
- `intelink-web` — porta 127.0.0.1:3009, healthy, iniciado `2026-04-23T11:54:45 UTC`
- `infra-caddy-1` — reverse proxy ativo
- `intelink-neo4j` — banco de grafos do intelink

### Paths
- **Path real do app no VPS:** `/opt/intelink-nextjs` (NÃO é repo git, sync via rsync)
- **Caddyfile:** `/opt/bracc/infra/Caddyfile`
- **`.env` em prod:** `/opt/intelink-nextjs/.env` contém `NEXT_PUBLIC_APP_URL=https://intelink.ia.br`
- **Script deploy local (BROKEN):** `/home/enio/intelink/scripts/deploy-hetzner.sh` aponta pra `/opt/egos-inteligencia` (path que não existe)

### Bundle em prod vs código em prod (divergência interessante)
- Código fonte em `/opt/intelink-nextjs/lib/auth/csrf.ts` tem versão **antiga** (só 3 entradas + env) — mtime `Apr 18 14:22`
- Mas bundle compilado `/app/.next/server/chunks/*.js` contém `localhost:3009` — que é MINHA adição no Fix 1.1
- **Inferência:** alguém (eu em sessão anterior? outro agente?) deployou parte dos fixes mas não todos. O `.next` foi buildado mais recente que o fonte. Arqueologia necessária se importar.

### DNS (confirmado via registro.br screenshot do user)
```
A  intelink.ia.br       204.168.217.125
A  www.intelink.ia.br   204.168.217.125
```
Ambos → mesmo IP. Ambos respondem HTTP 200 sem redirect.

---

## 🧪 TESTES EXECUTADOS E RESULTADOS

### Curl direto em prod (confirmando 403)
```bash
curl -X POST https://intelink.ia.br/api/auth/bridge \
  -H "Origin: https://intelink.ia.br" \
  -H "Content-Type: application/json" \
  -d '{"email":"enioxt@gmail.com"}'
# → HTTP 403 {"success":false,"error":"Origin não permitida"}
```
Os 3 Origins (apex, www, cross) todos deram 403. Confirma que o bundle allowlist não contém nenhum domínio de produção.

### Build local após refactor final
```
✓ Compiled successfully in 25.5s
```
Grep no bundle após build:
```
"https://intelink.ia.br"
"https://www.intelink.ia.br"
```
Ambos presentes. Refactor funciona.

### Teste de páginas estáticas (via curl, sem JS)
```
/          HTTP 200
/login     HTTP 200
/signup    HTTP 200
/sw.js     servindo (SW não intercepta /login)
```

---

## 🚧 PASSOS PENDENTES (NÃO EXECUTADOS)

### Passo 2 — Corrigir `scripts/deploy-hetzner.sh`
Linha 13: `DEPLOY_PATH="${DEPLOY_PATH:-/opt/egos-inteligencia}"` → `/opt/intelink-nextjs`  
Adicionar `docker compose build --no-cache` para garantir rebuild.

### Passo 3 — Deploy em produção
```bash
# commit csrf refactor pendente
git add lib/auth/csrf.ts
git commit -m "fix(auth): CSRF hardcoded apex+www, independent of NEXT_PUBLIC_APP_URL

Prod bundle had empty ALLOWED_ORIGINS because NEXT_PUBLIC_APP_URL is
inlined at build time, but Docker build doesn't receive .env vars.
Hardcode the canonical domains; allow runtime extension via
ALLOWED_ORIGINS env (server-only, no NEXT_PUBLIC_)."

# sync para VPS
rsync -av --delete \
  --exclude .git --exclude node_modules --exclude .next --exclude .venv \
  /home/enio/intelink/ root@204.168.217.125:/opt/intelink-nextjs/

# rebuild + restart
ssh root@204.168.217.125 "cd /opt/intelink-nextjs && docker compose build --no-cache intelink-web && docker compose up -d intelink-web"
```

### Passo 4 — Caddy redirect www → apex
Editar `/opt/bracc/infra/Caddyfile`:
```caddyfile
www.intelink.ia.br {
    redir https://intelink.ia.br{uri} 301
}
intelink.ia.br {
    reverse_proxy intelink-web:3000
    header { ... (mantém os existentes) }
}
```
Reload: `ssh root@204.168.217.125 "docker exec infra-caddy-1 caddy reload --config /etc/caddy/Caddyfile"`

### Passo 5 — Teste e2e em aba anônima
1. `https://intelink.ia.br/login` — deve mostrar formulário
2. Submit `enioxt@gmail.com` + senha (senha do user, ele sabe)
3. Esperado: dashboard em `/central` com nome "ENIO" no header, role super_admin
4. Verificar cookies: `intelink_access`, `intelink_refresh`, `intelink_verified` todos presentes
5. Logout → deve voltar pra /login, cookies e localStorage limpos
6. Clicar "Entrar" novamente → formulário limpo, sem loop

---

## 📚 INVESTIGAÇÕES PARALELAS (user mencionou mas não executadas)

User pediu na última mensagem:
> "comece a investigação simples, testando desde o inicio vá removendo possíveis barreiras, depois inserindo novamente"

**Feito parcialmente:**
- ✅ Confirmado que só existe 1 tela de login (sem duplicidade)
- ✅ Service worker não intercepta auth routes
- ✅ Middleware libera /login (publicPath)
- ✅ Páginas estáticas carregam 200
- ❌ **Não testado em browser real** — Playwright desconectou no início dessa sessão, só pude curl

User também pediu (em mensagem interrompida):
> "investigar mais o que já temos ... /start de tempos em tempos ... triggers no claude.md, pre-commit, /start /end ... cron jobs hermes ... gem hunter ... repositórios públicos, artigos, conversas, arquivos, vps, redes sociais ... hq.egos.ia.br ... Banda Cognitiva (Crítico + Apoiador + Questionador) ... absorver outra janela"

**NÃO executado** — a mensagem foi interrompida pelo user antes de autorização. Pode ser contexto estratégico para sessão futura (EGOS-wide pattern), não para o fix pontual do intelink.

---

## 🔗 ARQUIVOS-CHAVE (anchors para próximo agente)

### Auth frontend
- `app/login/page.tsx` — login form + checkSession
- `app/page.tsx` — root + checkAuth + handleLogout
- `providers/AuthProvider.tsx` — runBridgeIfNeeded + logout
- `components/landing/PublicLanding.tsx` — landing (links pra /login, /signup)
- `hooks/useRole.tsx` — permissions

### Auth backend
- `app/api/auth/bridge/route.ts` — Supabase → JWT bridge
- `app/api/v2/auth/verify/route.ts` — session verification
- `app/api/v2/auth/login/route.ts` — server-side password login (não usado pelo front atualmente)
- `app/api/v2/auth/logout/route.ts`
- `lib/auth/csrf.ts` — CSRF allowlist (MODIFICADO, não commitado)
- `lib/auth/session.ts` — createSession, setAuthCookies, getAccessTokenFromRequest
- `lib/auth/constants.ts` — COOKIE_NAMES, COOKIE_OPTIONS
- `lib/supabase-client.ts` — Supabase JS client config
- `middleware.ts` — route protection (nota: ainda usa query param `redirect`, não `returnUrl` em prod)

### Infra
- `scripts/deploy-hetzner.sh` — path BROKEN (ver Passo 2)
- `Dockerfile` — check se tem ARG de build
- `docker-compose.yml` — build context

### Outros handoffs gerados nesta investigação
- `docs/_current_handoffs/2026-04-23-auth-redirect-complete-handoff.md` (v1 — investigação inicial)
- `docs/_current_handoffs/2026-04-23-auth-final-handoff.md` (v2 — dados Supabase)
- `docs/_current_handoffs/2026-04-23-auth-handoff-v3-final.md` (este — estado atual)
- `docs/AUTH_FIX_2026-04-23.md` (nota técnica do fix do bridge da sessão anterior)

---

## 🎭 CLASSIFICAÇÃO DAS ASSERÇÕES (opus-mode)

**CONFIRMADO** (evidência direta no código/bundle/DB):
- Bundle prod não tem `intelink.ia.br` no CSRF Set
- `enioxt@gmail.com` existe em ambas tabelas, super_admin, verified
- Container iniciou `2026-04-23T11:54:45 UTC` (6h antes do user testar)
- Script de deploy aponta pra path errado
- Caddy serve apex+www no mesmo bloco sem redirect
- Supabase usa localStorage (`intelink-auth-token` storageKey)
- 8 commits locais, build verde, 0 em prod
- useRole antigo consulta `intelink_members` (tabela inexistente)

**INFERIDO** (lógica consistente mas não visualizado diretamente):
- User está em loop /login ↔ /central ao clicar "Entrar" (consistente com sintomas + código em prod)
- Bug primário que bloqueia tudo é CSRF 403 (o resto já está corrigido localmente)
- Deploy anterior parcial explica por que bundle tem `localhost:3009` mas não domínios prod

**HIPÓTESE** (não validado):
- User pode estar vendo service worker cacheando algo antigo (verificado: SW não intercepta /login, mas pode cachear landing)
- Dockerfile pode ter ARGs que resolveriam problema alternativo (não verificado)
- Podem haver outros NEXT_PUBLIC_* com mesmo problema de build-time em outros arquivos

**AÇÃO NECESSÁRIA** (próximo agente decide):
- Commit + deploy dos 8 commits + refactor csrf
- Correção script de deploy
- Configuração Caddy redirect
- Teste e2e

---

## 🎯 RECOMENDAÇÃO MÍNIMA PRO PRÓXIMO AGENTE

**Se objetivo = user consegue fazer login hoje:**
Foco absoluto: commit csrf refactor → sync VPS → rebuild container → teste. Passos 4 e 5 secundários.

**Se objetivo = robustez de auth:**
Fazer tudo, incluindo Caddy redirect e script fix. ~30 min total.

**Se objetivo = investigação EGOS-wide** (última mensagem do user, interrompida):
Outra sessão, outro escopo. Não misturar com o fix pontual ou vai alucinar e travar de novo.

---

## 🔑 CREDENCIAIS/ACESSOS DISPONÍVEIS

- SSH VPS: `ssh -i ~/.ssh/hetzner_ed25519 root@204.168.217.125` (funciona)
- Supabase MCP: project `egos-lab` (`lhscgsqhiooyatkebose`) acessível via `mcp__claude_ai_Supabase__*`
- Git repo: `git@github.com:enioxt/intelink.git` (branch main, user autenticado)
- Docker no VPS: `docker compose` em `/opt/intelink-nextjs/` com network `infra_bracc`

---

## ⚠️ RISCOS / ARMADILHAS CONHECIDAS

1. **Não rodar `scripts/deploy-hetzner.sh` sem corrigir o path** — cria `/opt/egos-inteligencia` novo, container continua rodando código velho.
2. **`docker compose build` sem `--no-cache` pode reaproveitar layer antigo** — bundle antigo persiste.
3. **Cuidado com Caddy reload** — outros serviços dependem do mesmo Caddyfile (bracc, egos-site, guard-brasil, etc). Sintaxe errada = todos caem.
4. **Sessão Supabase persistente no browser do user** — se só deployar sem o Fix 1.2 deployado, user ainda entra em loop. Os 8 commits são complementares; deploy parcial não resolve.
5. **User é NON-TECHNICAL** — explicações precisam ser diretas, sem jargão excessivo. Ele valida por UX, não por logs.
6. **User está frustrado** — 3ª sessão no mesmo bug. Eficiência > elegância.

---

## 📞 CONTATO COM O USER

User: Enio Rocha (enioxt@gmail.com)  
Idioma: português brasileiro  
Preferência: explicações diretas, sem emojis a menos que peça, commits pequenos atômicos  
Autorização dada nesta sessão: rebuild VPS + editar Caddyfile + reload

---

**Último commit local antes deste handoff:** `aafa9f7`  
**Branch:** main

### Working tree status (snapshot final)

**Modified, não commitado:**
- `lib/auth/csrf.ts` — refactor sem NEXT_PUBLIC (build verde, ver Passo 3)
- `app/auth/callback/page.tsx` — **DESCOBERTO AO FECHAR**: tem fix consistente com os outros (adiciona `Authorization: Bearer ${session.access_token}` no bridge call + tratamento de erro). Provavelmente feito em outra janela do Claude Code rodando em paralelo (user mencionou "absorva a outra janela"). Revisar antes de commitar — parece correto e alinhado com R5.

**Untracked (todos são docs criados nesta trilha de investigação):**
- `docs/AUTH_FIX_2026-04-23.md`
- `docs/_current_handoffs/2026-04-23-auth-final-handoff.md`
- `docs/_current_handoffs/2026-04-23-auth-handoff-v3-final.md` (este)
- `docs/_current_handoffs/2026-04-23-auth-redirect-complete-handoff.md`
- `docs/_current_handoffs/2026-04-23-auth-redirect-resolved.md`

### Sugestão de ordem de commit ao retomar
1. `git add app/auth/callback/page.tsx lib/auth/csrf.ts` → commit único "fix(auth): CSRF hardcoded + Supabase callback sends Bearer"
2. `git add docs/` → commit "docs(auth): investigation handoffs 2026-04-23"
3. Push + deploy (Passo 3 em diante)

Fim do handoff v3.
