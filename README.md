# Intelink — Plataforma de Inteligência Policial

> Sistema integrado de busca, análise de vínculos e geração de inteligência para polícias civis brasileiras.
> Dados sensíveis — acesso restrito por delegacia.

[![eval](https://img.shields.io/badge/eval-48%2F50%20(96%25)-brightgreen)](tests/eval/) [![LGPD](https://img.shields.io/badge/LGPD-compliant-blue)](docs/LGPD_COMPLIANCE.md) [![status](https://img.shields.io/badge/prod-intelink.ia.br-informational)](https://intelink.ia.br)

---

## O que é

Intelink concentra **busca REDS**, **grafo de vínculos** (83.7M nós), **ingestão de documentos** (OCR + NER + extração), **agente conversacional com ferramentas** e **trilha de auditoria hash-chained** em uma única plataforma. Operadores podem pesquisar uma pessoa por CPF/nome, ver ocorrências, co-envolvidos, fotos, observações aprovadas, propor edições com quórum 3/3 e conversar com um agente que busca dados sob demanda.

**Para quem é:** delegacias, divisões de homicídio, unidades de inteligência que querem sair do Excel + PDFs dispersos e ter uma base cruzada, auditável e segura.

**O que NÃO é:** sistema judicial, ferramenta pública de vigilância, ou substituto do REDS oficial.

---

## O que ele faz hoje — capabilities live

| Capability | Descrição | Veja também |
|---|---|---|
| **Busca REDS** | `/buscar <cpf\|nome>` — Neo4j dedicado com BOs, bairros, datas | [docs/API_REFERENCE.md](docs/API_REFERENCE.md) |
| **Grafo 2D/3D** | Visualização de vínculos com drill-down 3 graus | `/graph/[id]`, `/network/[id]` |
| **Sistema de contribuição** | Proposta de edição com quórum 3/3 + audit hash-chained | [docs/FEATURES.md](docs/FEATURES.md) |
| **Ingestão de documentos** | PDF/DOC/OCR/áudio → LLM → entidades estruturadas → diff vs Neo4j | `/ingest/[job_id]` |
| **Agente conversacional** | Comando `/agente` no Telegram + web chat, tool-calling, RAG | [docs/STREAMING.md](docs/STREAMING.md) |
| **Provenance hash-chained** | Toda chamada de ferramenta grava trilha tamper-evident | [docs/PROVENANCE.md](docs/PROVENANCE.md) |
| **Slash commands** | `/help`, `/link <cpf>`, `/unlink` + aliases PT-BR | [docs/SLASH_COMMANDS.md](docs/SLASH_COMMANDS.md) |
| **PII masking** | Detecção + mascaramento de CPF/RG/MASP em todas as saídas | [docs/LGPD_COMPLIANCE.md](docs/LGPD_COMPLIANCE.md) |
| **ATRiAN** | Marcadores epistêmicos, bloqueia alucinação de jurisprudência | [docs/LGPD_COMPLIANCE.md](docs/LGPD_COMPLIANCE.md) |
| **Auth tri-canal** | Signup + verificação obrigatória por email/Telegram/WhatsApp¹ | [docs/AUTH.md](docs/AUTH.md) |
| **MFA TOTP + PIN** | Duplo fator em ações sensíveis | `/settings/security`, `/settings/pin` |
| **Botões portáveis** | Telegram ↔ web usam o mesmo router de callbacks | `lib/intelink/callback-router.ts` |
| **Fotos vinculadas** | 2.898 fotos Telegram → `Person.photo_url` via tier matcher | [TASKS.md — PHOTO-001..010](TASKS.md) |
| **ETL automático** | REDS xlsx/csv → Neo4j, `--since` filter | [docs/ETL_GUIDE.md](docs/ETL_GUIDE.md) |

¹ WhatsApp em fase final — depende de CNPJ Meta WABA. Lançamento com email + Telegram.

Lista completa: [docs/FEATURES.md](docs/FEATURES.md) · status técnico detalhado: [docs/CAPABILITIES_STATUS.md](docs/CAPABILITIES_STATUS.md).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 App Router + TypeScript strict |
| Banco operacional | Supabase Postgres 17 (auth + RBAC + audit hash-chained) |
| Grafo | Neo4j 5.x — REDS dedicado (12.730 Person + 2.092 Occurrence) + público (83.7M nós read-only) |
| LLM | OpenRouter (MiniMax M2.5) + fallback Groq (Llama) |
| Email | Resend (3000/mês free tier) |
| Bot | Telegram webhook + long-polling fallback |
| Deploy | Hetzner VPS + Docker Compose + Caddy |
| Build | Bun 1.x · `oven/bun:1` builder · `node:20-alpine` runner |

Testes: 102 unit (vitest) + golden eval 50 casos behavioral + Playwright E2E + smoke auth flow.

---

## Quickstart — dev local

```bash
git clone /home/enio/intelink && cd intelink
cp .env.example .env.local
# Preencher .env.local com Supabase/Resend/Neo4j/Telegram keys

bun install
bun dev  # http://localhost:3001

# Outro terminal:
bun run eval                              # 50 golden cases behavioral
bun scripts/smoke-auth-flow.ts            # signup+verify+login+recovery
```

---

## Deploy (VPS)

```bash
# Sync (exclui .egos para evitar symlink quebrado no container)
rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.egos' \
  /home/enio/intelink/ root@204.168.217.125:/opt/intelink-nextjs/

# Build + restart
ssh root@204.168.217.125 \
  "cd /opt/intelink-nextjs && docker compose build && docker compose down && docker compose up -d"
```

**Importante:** variáveis `NEXT_PUBLIC_*` são baked no build. Mudar essas exige rebuild com `--build-arg`.

Detalhes completos: [docs/VPS_ARCHITECTURE.md](docs/VPS_ARCHITECTURE.md).

---

## Governança — regras que aplicam aqui

Este repo segue as regras do kernel EGOS (`/home/enio/egos`):

- **R7 (INC-008):** toda capability declarada em manifesto exige eval comportamental — `tests/eval/golden/intelink.ts`. Stubs silenciosos proibidos.
- **§L (proof-of-function):** claim em README/docs precisa ter teste, métrica, ou entrada em manifesto.
- **Doc-Drift Shield:** pre-commit bloqueia drift doc vs código (pré-launch).
- **Audit trail:** cada login, signup, verify, recover e tool-call é logado em `intelink_audit_logs` (hash-chained, tamper-evident).

Referências canônicas:
- `/home/enio/egos/AGENTS.md` — regras R1..R7
- `/home/enio/egos/docs/knowledge/AI_EVAL_STRATEGY.md` — 5 gates mecânicos
- `/home/enio/egos/docs/INCIDENTS/INC-008-phantom-compliance-stubs.md` — origem da R7
- `/home/enio/egos/docs/modules/CHATBOT_SSOT.md` §17 — contrato de integração
- [AGENTS.md](AGENTS.md) deste repo — R7 + INC-008 propagados

---

## Estrutura

```
intelink/
├── app/                 Next.js App Router (61 rotas — ver docs/_current_handoffs/ui-audit-2026-04-23.md)
│   ├── api/auth/        signup, verify/*, recover/*, bridge, pin/*, telegram/callback
│   ├── central/         Dashboard admin de delegacia
│   ├── investigation/   Investigações DHPP
│   └── ...
├── lib/
│   ├── auth/            verification.ts (tri-channel), password, JWT, rate-limit
│   ├── intelligence/    33 módulos: NER, cross-reference, RAG, confidence
│   ├── intelink/        bot runtime: commands/, callback-router, telegram-utils
│   ├── neo4j/           driver + queries (intelink-neo4j + bracc-neo4j)
│   ├── llm/             FallbackProvider (primary + fallback chain)
│   └── security/        rate-limit, middleware
├── supabase/migrations/ SQL migrations versionadas
├── tests/
│   ├── eval/            golden dataset 50 casos + runner + promptfoo
│   └── integration/     smoke flows
├── scripts/             deploy, backup, smoke-auth-flow
└── docs/                FEATURES, AUTH, LGPD, CAPABILITIES_STATUS, etc.
```

---

## Roadmap público

**Fase pré-divulgação (Abr/Mai 2026):**
- ✅ Auth tri-canal (signup + email/telegram OTP + recovery)
- ✅ Golden eval behavioral (96% pass)
- ✅ Audit hash-chained
- 🟡 UI cleanup 61 rotas → ~35 focadas
- 🟡 Docs públicas completas (FEATURES, AUTH, USE_CASES, LGPD)
- 🟡 Backups automáticos VPS + Supabase
- ⏳ WhatsApp (depende CNPJ)
- ⏳ Landing `/` pública

**Fase 2 (Jun/Jul 2026):**
- Langfuse observability
- RAGAS métricas RAG
- Playwright E2E em CI
- Red team noturno automatizado
- Multi-tenant (Opção A) quando 3ª delegacia entrar

---

## Agentes de IA — contexto

**Repo canônico:** `/home/enio/intelink/` (standalone).

**NÃO existe código Intelink ativo em:**
- `/home/enio/intelink-legacy/` — arquivado 2026-04-18, somente leitura
- `/home/enio/egos-lab/apps/egos-inteligencia/` — egos-lab arquivado
- VPS `/opt/intelink-nextjs/` — produção, sincronizado via rsync

Histórico de consolidação: [docs/MIGRATION_HISTORY.md](docs/MIGRATION_HISTORY.md).

---

## Contato / Autoria

**Autor:** Enio Rocha (Patos de Minas, MG) — ecossistema EGOS.
**Licença:** uso interno DHPP + parceiros diretos. Framework open-source separado em planejamento.

---

*Última atualização: 2026-04-23 (DOC-PUB-001 — fase pré-divulgação). Eval 48/50 (96%). 13 membros ativos no piloto.*
