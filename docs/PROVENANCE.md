# Provenance — Hash-chained Audit Trail

> Toda chamada de ferramenta do agente grava trilha tamper-evident.
> INTELINK-003 (commit `8868d5b`).

---

## Por que

**Problema:** se um dado foi alterado ou uma ferramenta foi chamada no passado, precisamos provar o quê, quando, por quem, e que o log não foi adulterado depois.

**Solução:** hash chain (Merkle-like) onde cada row contém o hash da row anterior. Mudar qualquer registro retroativamente invalida todos os subsequentes.

---

## Schema

Tabela `intelink_audit_logs`:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `action` | varchar | ex: `tool.call.buscarPessoa`, `auth.signup` |
| `actor_id` | varchar | quem fez a ação |
| `actor_name` | varchar | opcional (cacheado para auditoria rápida) |
| `actor_role` | varchar | role no momento da ação |
| `target_type` | varchar | ex: `member`, `tool_call`, `investigation` |
| `target_id` | varchar | id do recurso afetado |
| `target_name` | varchar | opcional |
| `details` | jsonb | payload estruturado |
| `ip_address` | varchar | IP do caller |
| `user_agent` | text | UA HTTP |
| `created_at` | timestamptz | `now()` default |
| `sequence_number` | bigint | ordem global monotônica |
| `prev_hash` | varchar | hash da row anterior |
| `hash` | varchar | hash desta row (preenchido por trigger) |

Trigger `audit_log_hash_trigger`:
- Pega `sequence_number` do último row + 1
- Lê `prev_hash` do último row
- Compute `hash = sha256(sequence_number || action || actor_id || target_id || details || prev_hash)`
- Preenche `sequence_number` + `prev_hash` + `hash` automaticamente

Aplicações **não devem** setar esses 3 campos manualmente — o trigger cuida.

---

## Como gravar

```typescript
import { getSupabaseAdmin } from '@/lib/api-utils';

const supabase = getSupabaseAdmin();
await supabase.from('intelink_audit_logs').insert({
    action: 'tool.call.buscarPessoa',
    actor_id: memberId,
    actor_name: memberName,
    target_type: 'person',
    target_id: cpf,
    details: { query, matched_count, duration_ms },
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0],
});
```

Helpers:
- `lib/intelligence/provenance.ts` → `logToolCall()` e `getProvenance()`
- `lib/auth/verification.ts` → `audit()` interno

---

## Como consultar

### Trilha de um recurso
```sql
SELECT * FROM intelink_audit_logs
WHERE target_id = '<uuid>'
ORDER BY sequence_number;
```

### Ações de um usuário
```sql
SELECT action, created_at, target_type, details
FROM intelink_audit_logs
WHERE actor_id = '<uuid>'
ORDER BY sequence_number DESC
LIMIT 100;
```

### Validação de integridade (hash chain)
```sql
-- Para cada row, recomputar o hash e comparar com prev_hash da próxima.
-- Se divergir em algum ponto → log foi adulterado.
-- Script: scripts/validate-audit-chain.ts (planejado — AUDIT-VALID-001)
```

---

## Retenção

**Indefinida por enquanto** — dados de auditoria policial têm valor histórico.
Se volume virar problema, considerar:
- Partitioning por mês
- Archival para S3 após 1 ano (mantém query → colder storage)
- LGPD: direito ao esquecimento NÃO se aplica a audit de atos oficiais

---

## UI

- `/admin/audit` — viewer de logs recentes (filtros por action/actor/target)
- `/central/auditoria` — mesma função em escopo de unidade (pending audit consolidação UI-CLEAN-002)

---

## Performance

- Index em `(actor_id, sequence_number DESC)` para queries por usuário
- Index em `(target_type, target_id, sequence_number DESC)` para queries por recurso
- Trigger adiciona ~2ms por insert (bench em 2026-04-18)

---

## Eval

Categoria `provenance` no golden dataset + testes unit em `tests/integration/provenance.test.ts` — INTELINK-010.

---

*Última atualização: 2026-04-23 (DOC-PUB-005).*
