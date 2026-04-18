/**
 * Abstração portável de botões (Telegram ↔ WhatsApp)
 * Máximo 3 botões por mensagem — limite do WhatsApp Business API.
 * callback_data (Telegram) → button_reply.id (WhatsApp): mesma string.
 */

export interface ActionButton {
    id: string;     // callback_data / button_reply.id / numeric reply key
    label: string;  // texto exibido
    url?: string;   // se presente, botão é link (não callback)
}

/** Retorna inline_keyboard do Telegram. >3 botões → 2 linhas (linha 1: primeiros 3, linha 2: restantes) */
export function toTelegramKeyboard(buttons: ActionButton[]): { inline_keyboard: object[][] } {
    const toBtn = (b: ActionButton) => b.url
        ? { text: b.label, url: b.url }
        : { text: b.label, callback_data: b.id };

    if (buttons.length <= 3) {
        return { inline_keyboard: [buttons.map(toBtn)] };
    }
    return {
        inline_keyboard: [
            buttons.slice(0, 3).map(toBtn),
            buttons.slice(3).map(toBtn),
        ]
    };
}

/** Gera sufixo numérico fallback para canais sem suporte a botões */
export function numericFallback(buttons: ActionButton[]): string {
    return buttons.slice(0, 3)
        .map((b, i) => `${i + 1}️⃣ ${b.label}`)
        .join('  ');
}

/** Botões padrão de uma entidade Person */
export function personButtons(cpf: string | null, personKey: string): ActionButton[] {
    const id = cpf ?? personKey;
    const webUrl = `https://intelink.ia.br/p/${encodeURIComponent(id)}`;
    return [
        { id: `show_bos:${id}`,        label: '📄 BOs'       },
        { id: `show_links:${id}`,      label: '🔗 Envolvidos' },
        { id: `open_web:${id}`,        label: '🌐 Web', url: webUrl },
        { id: `suggest_edit:${id}`,    label: '✏️ Sugerir edição' },
    ];
}
