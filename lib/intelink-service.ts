/**
 * INTELINK Service - Telegram Bot Handler
 * 
 * Refatorado em 16/12/2025 - Delegação total para Command Registry
 * 
 * @version 2.0.0
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';

// Módulos extraídos
import {
    handleFileUpload as handleFileUploadModule,
    FileUploadDeps
} from './intelink/file-handling';
import {
    sendMessage as sendMessageModule,
    sendMessageHTML as sendMessageHTMLModule,
    answerCallbackQuery as answerCallbackQueryModule,
} from './intelink/telegram-utils';
import { createMessages } from './intelink/messages';
import { routeNaturalLanguage, RouterDeps } from './intelink/ai-router';

// Command Pattern Registry
import { commandRegistry, parseCommand, isAgentActive, handleAgentMessage, hasSugerirSession, handleSugerirMessage, handleSugerirCallback } from './intelink/commands/index';
import type { CommandContext, CommandDependencies } from './intelink/commands/types';
import { getSupabaseAdmin } from '@/lib/api-utils';


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || 'sk-placeholder',
    baseURL: "https://openrouter.ai/api/v1"
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_INTELINK || '';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VISUAL CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VISUAL = {
    separator: '━━━━━━━━━━━━━━━━━━━',
    separatorShort: '───────────',
    formatName: (name: string) => name.toUpperCase()
};

const MENSAGENS = createMessages({ separator: VISUAL.separator, separatorShort: VISUAL.separatorShort });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendPhoto(chatId: number, photoUrl: string, caption?: string) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: photoUrl,
                ...(caption ? { caption, parse_mode: 'Markdown' } : {}),
            }),
        });
    } catch { /* non-critical — photo is best-effort */ }
}

async function sendMessageWithButtons(chatId: number, text: string, buttons: Array<Array<{text: string, callback_data: string}>>) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: buttons }
            })
        });
    } catch (_e) {
        await sendMessage(chatId, text);
    }
}

async function deleteMessage(chatId: number, messageId: number) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId })
        });
    } catch (_e) {
        // Silently fail
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function handleIntelinkUpdate(update: any) {
    // Handler: New chat members
    if (update.message?.new_chat_members) {
        const chatId = update.message.chat.id;
        for (const member of update.message.new_chat_members) {
            if (!member.is_bot) {
                const nome = member.first_name || member.username || 'Agente';
                await sendMessage(chatId, MENSAGENS.BOAS_VINDAS(nome));
            }
        }
        return;
    }

    // Handler: Callback queries (button clicks)
    if (update.callback_query) {
        const { id: cbId, data: cbData, message: cbMsg } = update.callback_query;
        const cbChatId = cbMsg?.chat?.id;
        if (cbChatId && cbData) {
            const { routeCallback } = await import('./intelink/callback-router');
            await routeCallback(cbData, cbChatId, (id, txt, mk) => sendMessage(id, txt, mk));
            await answerCallbackQuery(cbId);
        }
        return;
    }

    if (!update.message) return;

    const { chat, text, from } = update.message;
    const chatId = chat.id;
    const username = from?.username || from?.first_name || 'anônimo';

    // Handler: File uploads — but check caption for commands first (e.g. /reds-importar)
    if (update.message.document || update.message.photo) {
        const caption = update.message.caption?.split('@')[0]?.trim() ?? '';
        if (caption.startsWith('/')) {
            const parsed = parseCommand(caption);
            if (parsed && commandRegistry.has(parsed.command)) {
                const ctx: CommandContext = {
                    chatId, userId: from?.id || 0, username,
                    text: caption, args: parsed.args,
                    chatType: chat.type as any,
                    message: update.message,
                };
                const deps: CommandDependencies = {
                    supabase, sendMessage, sendMessageHTML, sendMessageWithButtons, sendPhoto,
                    botToken: BOT_TOKEN,
                };
                await commandRegistry.execute(parsed.command, ctx, deps);
                return;
            }
        }
        await handleFileUpload(update.message, chatId);
        return;
    }

    const cleanText = text?.split('@')[0].trim();
    console.log(`[Intelink] Msg from ${username} (${chatId}): ${cleanText}`);

    // Handler: Telegram Link Code (6-digit)
    if (cleanText && /^\d{6}$/.test(cleanText.trim())) {
        await handleLinkCode(chatId, cleanText.trim(), from);
        return;
    }

    // Handler: Commands via Registry
    if (cleanText?.startsWith('/')) {
        const parsed = parseCommand(cleanText);
        if (parsed && commandRegistry.has(parsed.command)) {
            const ctx: CommandContext = {
                chatId,
                userId: from?.id || 0,
                username,
                text: cleanText,
                args: parsed.args,
                chatType: chat.type as any,
                message: update.message
            };

            const deps: CommandDependencies = {
                supabase,
                sendMessage,
                sendMessageHTML,
                sendMessageWithButtons,
                sendPhoto,
                botToken: BOT_TOKEN
            };

            const handled = await commandRegistry.execute(parsed.command, ctx, deps);
            if (handled) {
                console.log(`[Intelink] ✅ /${parsed.command} handled`);
                return;
            }
        }
        
        // Unknown command
        await sendMessage(chatId, `❓ Comando não reconhecido: \`${cleanText}\`\n\nDigite \`/ajuda\` para ver os comandos disponíveis.`);
        return;
    }

    // Handler: /sugerir wizard intercept — wizard state takes priority over agent
    if (cleanText && hasSugerirSession(chatId)) {
        await handleSugerirMessage(chatId, cleanText, sendMessage);
        return;
    }

    // Handler: Agent mode intercept — routes to LLM when /agente active
    if (cleanText && isAgentActive(chatId)) {
        await handleAgentMessage(chatId, cleanText, sendMessage);
        return;
    }

    // Handler: Free text — Natural Language AI Router
    if (cleanText) {
        const routerDeps: RouterDeps = {
            supabase,
            openai,
            sendMessage,
            sendMessageHTML,
            botToken: BOT_TOKEN
        };
        await routeNaturalLanguage(chatId, cleanText, routerDeps);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LINK CODE HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleLinkCode(chatId: number, linkCode: string, from: any) {
    console.log(`[Intelink] Checking link code: ${linkCode}`);
    
    const { data: member } = await getSupabaseAdmin()
        .from('intelink_unit_members')
        .select('id, name, phone, telegram_link_expires_at')
        .eq('telegram_link_code', linkCode)
        .maybeSingle();
    
    if (!member) {
        await sendMessage(chatId, `❓ Código não reconhecido.

Se você está tentando vincular sua conta:
1. Acesse o site e faça login com seu telefone
2. Copie o código de 6 dígitos gerado
3. Envie o código aqui

🌐 https://intelink.ia.br/auth`);
        return;
    }

    // Check expiration
    if (new Date() > new Date(member.telegram_link_expires_at)) {
        await sendMessage(chatId, `❌ **Código expirado**

Este código de vinculação já expirou.
Volte ao site e solicite um novo código.`);
        return;
    }
    
    // Link the account
    const { error } = await getSupabaseAdmin()
        .from('intelink_unit_members')
        .update({
            telegram_chat_id: String(chatId),
            telegram_user_id: String(from?.id),
            telegram_username: from?.username || from?.first_name || null,
            telegram_link_code: null,
            telegram_link_expires_at: null
        })
        .eq('id', member.id);
    
    if (!error) {
        console.log(`[Intelink] ✅ Telegram linked for: ${member.name}`);
        await sendMessage(chatId, `✅ **Telegram vinculado com sucesso!**

👤 **${member.name}**
📞 ${member.phone}

${VISUAL.separator}

🔐 Agora você pode:
• Fazer login no sistema web
• Receber códigos de verificação (2FA)

🌐 **Acesse:** https://intelink.ia.br/auth`);
    } else {
        console.error('[Intelink] Link error:', error);
        await sendMessage(chatId, `❌ **Erro ao vincular**\n\nOcorreu um erro. Tente novamente.`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE SEND FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
    await sendMessageModule(BOT_TOKEN, chatId, text, replyMarkup);
}

async function sendMessageHTML(chatId: number, text: string, replyMarkup?: any) {
    await sendMessageHTMLModule(BOT_TOKEN, chatId, text, replyMarkup);
}

async function handleFileUpload(message: any, chatId: number) {
    const deps: FileUploadDeps = {
        supabase,
        botToken: BOT_TOKEN,
        sendMessage: (cId: number, txt: string) => sendMessage(cId, txt)
    };
    await handleFileUploadModule(message, chatId, deps);
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
    await answerCallbackQueryModule(callbackQueryId, BOT_TOKEN, text);
}
