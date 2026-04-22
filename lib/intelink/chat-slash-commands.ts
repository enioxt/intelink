/**
 * INTELINK-004: Server-side slash command parser for chat input.
 *
 * Detects commands like `/link <investigation-id>`, `/unlink`, `/help`
 * in the user's last message and short-circuits before the LLM call.
 *
 * Reused by web chat (app/api/chat/route.ts) and Telegram bot (lib/intelink/agente.ts).
 */

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export type SlashCommand =
    | { kind: 'link'; investigationId: string }
    | { kind: 'unlink' }
    | { kind: 'help' }
    | { kind: 'none' };

export function parseSlashCommand(text: string | undefined | null): SlashCommand {
    if (!text || typeof text !== 'string') return { kind: 'none' };
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return { kind: 'none' };

    const lower = trimmed.toLowerCase();

    if (lower === '/help' || lower === '/ajuda') return { kind: 'help' };
    if (lower === '/unlink' || lower === '/desvincular') return { kind: 'unlink' };

    if (lower.startsWith('/link') || lower.startsWith('/vincular')) {
        const m = trimmed.match(UUID_RE);
        if (!m) return { kind: 'none' };
        return { kind: 'link', investigationId: m[0].toLowerCase() };
    }

    return { kind: 'none' };
}

export function helpMessage(): string {
    return [
        'COMANDOS DISPONÍVEIS',
        '',
        '/link <investigation-id>  — vincular esta conversa a uma investigação',
        '/vincular <investigation-id>  — alias português',
        '/unlink  — remover vínculo com investigação',
        '/desvincular  — alias português',
        '/help, /ajuda  — exibir esta ajuda',
        '',
        'Quando vinculado, eu consigo consultar entidades, relacionamentos e evidências do caso.',
    ].join('\n');
}
