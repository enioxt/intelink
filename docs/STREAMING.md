# Streaming (SSE) — Intelink Chat

> Feature opt-in: cliente manda `body.stream=true` para receber SSE incremental.
> INTELINK-002 (commit `b811ca6`).

---

## Contrato

### Request

```http
POST /api/chat
Content-Type: application/json
Cookie: intelink_member_id=<uuid>

{
  "messages": [{ "role": "user", "content": "..." }],
  "mode": "single",
  "stream": true,
  "saveHistory": false
}
```

### Response (SSE)

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive

event: delta
data: {"content":"Primeiro chunk do texto"}

event: tool_start
data: {"name":"buscarPessoa","args":{"cpf":"..."}}

event: tool_end
data: {"name":"buscarPessoa","result_preview":"Encontrado: João Silva"}

event: delta
data: {"content":" ... mais texto após tool"}

event: done
data: {"trajectory":["buscarPessoa"],"linkedInvestigationId":null,"sessionId":"..."}
```

Eventos:
- **`delta`**: chunk de texto do modelo
- **`tool_start`**: começou a chamar uma ferramenta (inclui args)
- **`tool_end`**: terminou, inclui preview (não o resultado completo — economia de banda)
- **`done`**: fim da resposta, inclui trajectory + metadata

---

## Modo single (não-streaming) — default

```http
POST /api/chat
Content-Type: application/json

{ "messages": [...], "mode": "single" }
```

Response:
```json
{
  "response": "texto completo",
  "trajectory": ["buscarPessoa"],
  "linkedInvestigationId": null,
  "sessionId": "...",
  "compliance": { "pii_findings": 0, "atrian_violations": 0 }
}
```

---

## Cliente — exemplo

```typescript
const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: [{ role: 'user', content: 'Busque CPF XXX' }],
        mode: 'single',
        stream: true,
    }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
        const [eventLine, dataLine] = raw.split('\n');
        const event = eventLine.replace(/^event:\s*/, '');
        const data = JSON.parse(dataLine.replace(/^data:\s*/, ''));
        handleEvent(event, data);
    }
}
```

Frontend adoption ainda pendente (INT-FE-002). Hoje ChatContext usa `mode:'single'`.

---

## PII no streaming — cuidado importante

⚠️ **Gap conhecido** (INTELINK-014b): PII masking hoje é aplicado no path `single`, não no SSE delta. Se o modelo ecoar PII no meio de um chunk de streaming, o cliente verá plain antes do masking.

**Mitigação planejada:** aplicar `detectPII` no delta antes de enviar, com buffer pequeno. Tarefa P0 bloqueada por AUTO-INT-002 (pre-commit guard que trava qualquer mudança em stream sem mask).

---

## Latency vs cost

- **SSE streaming:** primeira delta em ~400ms (time-to-first-token)
- **Single mode:** resposta completa em ~2-8s dependendo de tool calls
- Streaming custa mais (muitos chunks pequenos) mas dá UX responsiva

---

## Eval

Categoria `streaming` **planejada** (EVAL-A7) — golden cases para:
1. Primeira delta chega em <1s
2. `tool_start` precede `tool_end` do mesmo tool
3. `done` é o último evento
4. trajectory no done bate com tool_* eventos
5. PII mascarada no delta (depende de INTELINK-014b)

---

*Última atualização: 2026-04-23 (DOC-PUB-005).*
