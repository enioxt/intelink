# LGPD Compliance — Intelink

> Como o Intelink respeita a LGPD (Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018).
> Esse documento é **adendo técnico** — a política oficial deve ser ajustada com assessoria jurídica.

---

## Bases legais aplicáveis (art. 7º, 11)

O tratamento de dados no Intelink baseia-se em:

1. **Execução de políticas públicas** (art. 7º, III) — atividade de inteligência e investigação policial civil
2. **Legítimo interesse** (art. 7º, IX) — apuração de infração penal (somente para agentes autorizados)
3. **Proteção da vida** (art. 7º, IV e art. 11, II, f) — casos envolvendo crimes contra a pessoa

Dados sensíveis (art. 5º, II) são tratados exclusivamente por autoridades policiais no exercício de função pública, com controle de acesso por delegacia (RBAC).

---

## Controles técnicos implementados

### 1. PII masking (art. 6º, VII — segurança)

**Detecção + mascaramento** em todas as saídas do chatbot:
- CPF (regex 3+3+3-2 com validação de dígitos)
- RG (múltiplos formatos estaduais)
- MASP (matrícula policial)
- Telefone (+55 formato)
- E-mail

Implementação: `lib/pii-scanner.ts` + `lib/shared.ts` (INTELINK-014).

**Evidência:** golden dataset tem 5 casos cobrindo cenários onde o modelo poderia ecoar PII — 5/5 pass. Postmortem do bug silencioso: `INC-008`.

### 2. ATRiAN — anti-hallucination (art. 6º, V — qualidade)

`lib/atrian.ts` bloqueia o chatbot de:
- Inventar jurisprudência
- Citar leis inexistentes
- Afirmar fatos sem marcador epistêmico quando incerto

**Evidência:** 4 golden cases ATRiAN — 4/4 pass.

### 3. Audit hash-chained (art. 6º, VI — transparência + art. 37 — registros)

Toda ação é registrada em `intelink_audit_logs` com:
- Quem (`actor_id`)
- O que (`action`, `details`)
- Quando (`created_at`)
- Sobre o quê (`target_type`, `target_id`)
- Tamper-evident via `hash` + `prev_hash` chain

Garante rastreabilidade para auditoria ANPD ou interna.

Detalhes: [PROVENANCE.md](PROVENANCE.md).

### 4. Controle de acesso (art. 46 — medidas de segurança)

- **Auth obrigatória** antes de qualquer rota protegida (middleware)
- **Verificação de canal** (email/Telegram) antes da conta ser ativada (AUTH-PUB-011)
- **RBAC** por delegacia (`unit_id` + `role` + `system_role`)
- **MFA TOTP** disponível em `/settings/security`
- **PIN 6 dígitos** para ações sensíveis (votação de propostas)

### 5. Minimização (art. 6º, III)

- Dados coletados no signup: **somente** nome, email, senha, telefone opcional
- Telegram chat_id só é linkado quando usuário vincula voluntariamente (`/link`)
- WhatsApp opcional (quando Meta WABA estiver disponível)

### 6. Criptografia em trânsito e repouso

- **HTTPS/TLS 1.3** (Caddy auto-renew Let's Encrypt)
- **Supabase Postgres 17** — encryption-at-rest (AWS managed)
- **Neo4j VPS** — Docker volume com disk encryption (ZFS/LUKS no Hetzner)
- **Passwords:** Supabase Auth (bcrypt/argon2)
- **OTPs:** bcrypt rounds=10 no banco (nunca plain, INC-008)
- **PINs:** bcrypt rounds=12

### 7. Rate limiting (art. 46 — prevenção de incidentes)

Previne enumeração, brute force, DoS:
- signup 3/h/IP, verify/request 5/h, verify/confirm 10/h, recover/reset 5/h
- bridge 10/min/IP
- chat 10/min/IP (LLM endpoints)
- upload 20/min/IP

---

## Direitos do titular (art. 18)

Como atender cada direito:

| Direito | Como |
|---|---|
| Confirmação da existência | Via email ao DPO |
| Acesso aos dados | Export JSON via `/api/gdpr/export` (**planejado** LGPD-EXP-001) |
| Correção | Sistema de proposta com quórum 3/3 (operadores) OU request ao DPO (usuários finais) |
| Anonimização/bloqueio/eliminação | `UPDATE intelink_unit_members SET active=false, email=...` + Supabase auth delete. Audit log **preservado** por base legal (atos oficiais) |
| Portabilidade | Export JSON (planejado) |
| Informação sobre compartilhamento | Este documento + política oficial |
| Revogação de consentimento | N/A — base legal é execução de política pública, não consentimento |

---

## Retenção

| Tipo de dado | Retenção | Base |
|---|---|---|
| Audit logs | Indefinida | Valor histórico de atos oficiais |
| Dados de investigação (Neo4j) | Indefinida | Interesse público/investigação |
| Sessões ativas | 30 dias inativo → revogadas | Segurança |
| OTPs | 10 minutos | Segurança |
| Recuperação de senha | 7 dias (Supabase magic link) | Segurança |
| Dados temporários (uploads em queue) | 30 dias → purga | Minimização |

---

## Incidentes

### Registro
Qualquer incidente de segurança (vazamento, acesso indevido) deve ser:
1. Logado em `intelink_audit_logs` com `action='incident.<tipo>'`
2. Notificado ao DPO em ≤24h
3. Se envolver dados pessoais em escala → notificar ANPD em ≤72h (LGPD art. 48)

### Incidentes conhecidos
- **INC-008** (2026-04-22): PII stubs silenciosos vazaram dados por meses em eval env. **Corrigido** antes de produção. Postmortem: `/home/enio/egos/docs/INCIDENTS/INC-008-phantom-compliance-stubs.md`.

---

## DPO (Data Protection Officer)

**Não designado formalmente ainda** — gap conhecido, LGPD-DPO-001 planejado.

Contato atual: Enio Rocha (enioxt@gmail.com).

---

## Cross-refs

- [AUTH.md](AUTH.md) — fluxo completo de auth
- [PROVENANCE.md](PROVENANCE.md) — audit hash-chain
- [FEATURES.md](FEATURES.md) — catálogo de features de segurança
- [CHATBOT_EVAL.md](CHATBOT_EVAL.md) — eval de PII/ATRiAN

Kernel:
- `/home/enio/egos/docs/legal/` — política LGPD template
- `/home/enio/egos/docs/INCIDENTS/INC-008-*.md`

---

*Última atualização: 2026-04-23 (DOC-PUB-009). Revisar com assessoria jurídica antes de lançamento público.*
