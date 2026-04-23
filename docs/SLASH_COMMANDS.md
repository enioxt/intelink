# Slash Commands — Intelink

> Parser em `lib/intelink/chat-slash-commands.ts` (INTELINK-004).
> Comandos são **server-side short-circuit** — não chegam ao LLM.

---

## Comandos disponíveis

| Comando | Aliases PT-BR | Efeito |
|---|---|---|
| `/help` | `/ajuda`, `/comandos` | Lista comandos disponíveis para o usuário |
| `/link <cpf>` | `/vincular <cpf>`, `/conectar <cpf>` | Vincula chat atual a uma investigação/pessoa |
| `/unlink` | `/desvincular`, `/desconectar` | Remove o vínculo atual |

---

## Fluxo

1. Usuário envia mensagem que começa com `/` (ou alias PT-BR)
2. `chat-slash-commands.ts` parseia → reconhece comando
3. **Short-circuit:** retorna resposta direta sem chamar LLM (economia de tokens + latência ~0ms)
4. Se não reconhecido → passa adiante para o agente LLM

---

## Implementação

```typescript
// lib/intelink/chat-slash-commands.ts (trecho)
export function parseSlashCommand(message: string): SlashResult | null {
    const trimmed = message.trim();
    if (!trimmed.startsWith('/')) return null;
    // ... parser reconhece /help, /link, /unlink e aliases
}
```

Chamado em `app/api/chat/route.ts` antes do fluxo LLM.

---

## Eval coverage

Categoria `slash-commands` no golden dataset — 3/3 pass (100%).

---

## Comandos Telegram-only

Estes existem no bot mas não no chat web:

| Comando | Efeito |
|---|---|
| `/buscar <cpf\|nome>` | Busca pessoa no REDS |
| `/fotos-pendentes` | Lista fotos aguardando revisão |
| `/foto-revisar` | Revisar próxima foto |
| `/foto-merge` | Mergear foto detectada como duplicata |
| `/fonte <id>` | Audit metadata de um registro |
| `/sugerir <cpf>` | Wizard de proposta de edição |
| `/ingerir` | Ingestão documento (anexar arquivo) |
| `/observacao <cpf> <texto>` | Observação simplificada |
| `/relatorio` | Digest semanal |
| `/crit` | Análise CRIT |
| `/vinculos` | Predição Adamic-Adar |
| `/grupos` | Clustering |
| `/alerta <tipo>` | Disparar alerta |
| `/agente` | Ativa modo chatbot conversacional |
| `/sair` | Sai do modo agente |

---

*Última atualização: 2026-04-23 (DOC-PUB-005).*
