# EGOS Inteligência — LGPD Compliance Framework

> **Versão:** 1.0.0  
> **Lei:** Lei nº 13.709/2018 (Lei Geral de Proteção de Dados)  
> **Status:** Implementado e Auditável

---

## 📋 Resumo da Conformidade

| Artigo LGPD | Requisito | Implementação | Status |
|--------------|-----------|---------------|--------|
| **Art. 7º** | Base legal | Art. 7º, III — Execução de políticas públicas | ✅ |
| **Art. 9º** | Dados sensíveis | Pseudonimização + acesso controlado | ✅ |
| **Art. 14** | Direitos do titular | Portal do titular + API de exportação | 🟡 |
| **Art. 30** | Registro de operações | Audit log append-only + Merkle tree | ✅ |
| **Art. 31** | Segurança da informação | AES-256-GCM, JWT RS256, RLS | ✅ |
| **Art. 35** | Relatório de impacto | RIPA automatizado | 🟡 |
| **Art. 37** | DPO (Encarregado) | Designação obrigatória | 🔴 |
| **Art. 46** | Subprocessadores | Lista de subprocessadores | 🟡 |

**Legenda:**
- ✅ Implementado
- 🟡 Parcial/Em desenvolvimento
- 🔴 Não implementado

---

## 🔐 Medidas Técnicas de Segurança (Art. 46)

### 1. Criptografia

| Camada | Tecnologia | Implementação |
|--------|-----------|-------------|
| **Transporte** | TLS 1.3 | Caddy reverse proxy |
| **Armazenamento** | AES-256-GCM | RxDB local, Neo4j at-rest |
| **Chaves** | PBKDF2 100k rounds | Derivação de MASP + password |
| **Tokens** | JWT RS256 | Refresh tokens HttpOnly |

**Código de referência:**
- `lib/db/encryption.ts` — Camada de criptografia
- `lib/db/rxdb.ts` — Configuração RxDB com criptografia
- `infra/Caddyfile` — TLS 1.3 configuration

### 2. Controle de Acesso

```
┌─────────────────────────────────────────────────────────┐
│  Nível 0: Público                                       │
│  • Landing page                                         │
│  • Documentação                                         │
│  • Status API                                           │
├─────────────────────────────────────────────────────────┤
│  Nível 1: Autenticado (JWT)                             │
│  • Search (PII mascarado)                               │
│  • Chat (com PII masking)                               │
│  • Dashboard próprio                                    │
├─────────────────────────────────────────────────────────┤
│  Nível 2: MASP Verificado                               │
│  • Dados completos (após verificação)                   │
│  • Export de relatórios                                 │
│  • Compartilhamento                                     │
├─────────────────────────────────────────────────────────┤
│  Nível 3: Admin                                         │
│  • Multi-tenant management                              │
│  • Audit logs                                           │
│  • Configurações de sistema                             │
└─────────────────────────────────────────────────────────┘
```

### 3. Pseudonimização de Dados (Art. 55)

**Regra:** Todo CPF/CNPJ/email/telefone é mascarado em responses API.

**Exemplo:**
```json
// Antes
{
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "email": "joao@email.com"
}

// Depois (API response)
{
  "nome": "J*** S****",
  "cpf": "***.456.***-**",
  "email": "j***@e****.com"
}
```

**Implementação:**
- Middleware `CPFMaskingMiddleware` em todas as rotas
- `lib/pii-scanner.ts` — Detecta e mascara PII

---

## 📜 Registro de Operações (Art. 30)

### Audit Log — Append-Only + Merkle Tree

**Arquitetura:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Entry N-1  │────▶│  Entry N    │────▶│  Entry N+1  │
│  + Hash     │     │  + Hash     │     │  + Hash     │
│  + PrevHash │     │  + PrevHash │     │  + PrevHash │
└─────────────┘     └─────────────┘     └─────────────┘
         │
         ▼
    ┌─────────┐
    │ Merkle  │
    │  Root   │
    └─────────┘
```

**Campos registrados:**
- Timestamp (UTC)
- Ação (enum: auth.login, entity.view, osint.query, etc.)
- Actor ID (user identifier)
- Resource ID (dado acessado)
- IP address
- User agent
- Hash da entrada anterior
- Merkle root atual

**Verificação de integridade:**
```typescript
const audit = getAuditLog();
const { valid, violations } = audit.verifyIntegrity();
// Retorna true se cadeia criptográfica intacta
```

**Retenção:** 5 anos (conforme Art. 30, §4º)

---

## 👤 Direitos do Titular (Art. 14)

### Portal do Titular (Roadmap)

```
┌─────────────────────────────────────────────────────────┐
│  Portal do Titular — intelink.ia.br/titular              │
├─────────────────────────────────────────────────────────┤
│  • Confirmação de existência de tratamento              │
│  • Acesso aos dados (export JSON/PDF)                   │
│  • Correção de dados incompletos                      │
│  • Anonimização/bloqueio (Art. 18)                    │
│  • Portabilidade (export para outro sistema)            │
│  • Revogação de consentimento                           │
│  • Informação sobre compartilhamento                    │
└─────────────────────────────────────────────────────────┘
```

**Status:** 🟡 Interface em desenvolvimento

### API de Exportação

```bash
# Titular solicita seus dados
GET /api/v1/titular/export
Authorization: Bearer [titular-token]

# Response:
{
  "dados_pessoais": { ... },
  "acessos": [ ... ],
  "compartilhamentos": [ ... ],
  "exportado_em": "2026-04-09T10:00:00Z"
}
```

---

## ⚖️ Base Legal (Art. 7º)

### Art. 7º, III — Execução de Políticas Públicas

> "O tratamento de dados pessoais pode ser realizado... quando necessário para a execução de políticas públicas..."

**Aplicação:**
- Inteligência policial é política pública de segurança
- Base legal: Constituição Federal, Art. 144
- Fundamentação: Execução de atribuições legais das forças de segurança

### Art. 7º, VI — Interesse Vital

**Aplicação em casos de:**
- Localização de pessoas desaparecidas
- Prevenção de crimes graves
- Proteção à vida

### Art. 11 — Dados Públicos

> "Dados pessoais públicos podem ser livremente tratados..."

**Fontes públicas utilizadas:**
- Base dos Dados (licença CC0)
- Portal da Transparência
- Diário Oficial
- CNPJ (receita federal)

---

## 📊 Relatório de Impacto (RIPA)

### Checklist RIPA

| Item | Status | Evidência |
|------|--------|-----------|
| Descrição do tratamento | ✅ | `docs/ARCHITECTURE.md` |
| Finalidade | ✅ | Polícia — investigação |
| Base legal | ✅ | Art. 7º, III |
| Dados sensíveis | ✅ | Pseudonimizados |
| Tempo de retenção | ✅ | 5 anos audit, investigações conforme legislação |
| Medidas de segurança | ✅ | AES-256-GCM, JWT, RLS |
| Riscos identificados | ✅ | Documentado abaixo |
| Mitigações | ✅ | Implementadas |

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Vazamento de PII | Baixa | Alto | Criptografia, RLS, masking |
| Acesso não autorizado | Baixa | Alto | JWT RS256, MFA, audit log |
| Perda de dados | Média | Alto | Backups diários, snapshots |
| DDoS | Média | Médio | Cloudflare, rate limiting |
| Processo por LGPD | Baixa | Alto | Compliance framework, DPO |

---

## 🏢 Subprocessadores (Art. 46)

| Subprocessador | Função | Localização | Contrato |
|----------------|--------|-------------|----------|
| **Hetzner** | Hosting | Alemanha (EU) | DPA ✅ |
| **Cloudflare** | CDN + DNS | EUA | DPA ✅ |
| **Supabase** | Database | EUA | DPA 🟡 |
| **OpenRouter** | AI API | EUA | DPA 🟡 |
| **Neo4j** | Graph DB | Local (self-hosted) | N/A |
| **Redis** | Cache | Local (self-hosted) | N/A |

**Ações pendentes:**
- [ ] Assinar DPA com Supabase
- [ ] Assinar DPA com OpenRouter
- [ ] Avaliar subprocessor em UE (GDPR adequacy)

---

## 👨‍💼 Encarregado de Dados (DPO)

**Status:** 🔴 Não designado

**Requisitos LGPD (Art. 41):**
- Pessoa física ou jurídica
- Conhecimento técnico em privacidade
- Acesso direto à alta administração
- Publicamente comunicado

**Recomendação:**
1. Designar DPO interno (Delegado/Oficial)
2. Ou contratar DPO externo (consultoria especializada)
3. Registrar no portal da ANPD
4. Publicar canal de contato: dpo@intelink.ia.br

---

## 📧 Comunicação com Titulares

### Canais Obrigatórios

| Canal | Endereço | Status |
|-------|----------|--------|
| **DPO** | dpo@intelink.ia.br | 🔴 Criar |
| **Titular** | titular@intelink.ia.br | 🔴 Criar |
| **Portal** | intelink.ia.br/titular | 🟡 Em desenvolvimento |
| **Segurança** | security@intelink.ia.br | 🔴 Criar |

### Modelos de Comunicação

**Notificação de Vazamento (72h):**
```
Assunto: Notificação de Incidente de Segurança — EGOS Inteligência

Prezado titular,

Em [DATA], identificamos um incidente de segurança que pode ter afetado seus dados.

[Descrição do incidente]
[Dados potencialmente afetados]
[Medidas tomadas]
[Recomendações ao titular]

Canal para dúvidas: dpo@intelink.ia.br
```

---

## ✅ Checklist de Conformidade

### Implementado ✅
- [x] Criptografia em trânsito (TLS 1.3)
- [x] Criptografia em repouso (AES-256-GCM)
- [x] Pseudonimização de PII em APIs
- [x] Controle de acesso (JWT + RBAC)
- [x] Audit log append-only
- [x] Merkle tree verification
- [x] Rate limiting
- [x] PII masking middleware
- [x] Auto-logout após inatividade
- [x] Backup criptografado

### Em Desenvolvimento 🟡
- [ ] Portal do titular
- [ ] API de exportação de dados
- [ ] Formulário de requisições LGPD
- [ ] RIPA automatizado
- [ ] DPA com todos os subprocessadores

### Não Implementado 🔴
- [ ] Designação de DPO
- [ ] Registro na ANPD
- [ ] Treinamento de colaboradores LGPD
- [ ] Comitê de privacidade
- [ ] Política de retenção documentada

---

## 📚 Referências

- [Lei nº 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — Texto integral
- [ANPD](https://www.gov.br/anpd/) — Autoridade Nacional de Proteção de Dados
- [Guia LGPD para Órgãos Públicos](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/guias-orientativos)

---

## 📝 Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 2026-04-09 | Documento inicial |

---

*LGPD Compliance Framework — EGOS Inteligência*
