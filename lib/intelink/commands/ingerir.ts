/**
 * INGEST-006: /ingerir — aceita arquivo anexado direto no Telegram.
 * Baixa o arquivo, chama /api/ingest/document e retorna link para review UI.
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';

export const ingerirCommand: Command = {
    name: 'ingerir',
    aliases: ['ingest', 'documento', 'doc'],
    description: 'Ingere documento PDF/imagem/áudio e extrai dados de pessoas',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { chatId, message } = ctx;
        const { sendMessage, botToken } = deps;

        // Check for attached file
        const doc = message?.document;
        const photo = message?.photo;
        const audio = message?.audio || message?.voice;

        if (!doc && !photo && !audio) {
            await sendMessage(chatId,
                `📄 *INGESTÃO DE DOCUMENTO*\n${VISUAL.separator}\n\n` +
                `Envie um documento (PDF, DOCX, imagem ou áudio) com o comando \`/ingerir\` como legenda.\n\n` +
                `Formatos suportados:\n` +
                `• 📄 PDF, DOCX\n` +
                `• 🖼️ JPG, PNG (OCR automático)\n` +
                `• 🎙️ MP3, M4A, OGG (transcrição Whisper)\n\n` +
                `_Dados extraídos são cruzados com o grafo REDS para revisão antes de qualquer alteração._`
            );
            return;
        }

        await sendMessage(chatId, `📥 Recebendo arquivo... aguarde.`);

        try {
            // Get file_id from Telegram message
            let fileId: string | undefined;
            let mimeType = 'application/octet-stream';
            let filename = 'documento';

            if (doc) {
                fileId = doc.file_id;
                mimeType = doc.mime_type || mimeType;
                filename = doc.file_name || filename;
            } else if (photo) {
                // Take largest photo
                const largest = photo[photo.length - 1];
                fileId = largest?.file_id;
                mimeType = 'image/jpeg';
                filename = `foto_${Date.now()}.jpg`;
            } else if (audio) {
                fileId = audio.file_id;
                mimeType = audio.mime_type || 'audio/ogg';
                filename = audio.file_name || `audio_${Date.now()}.ogg`;
            }

            if (!fileId) {
                await sendMessage(chatId, `❌ Não consegui identificar o arquivo.`);
                return;
            }

            // Get download URL from Telegram
            const fileInfoRes = await fetch(
                `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
            );
            const fileInfo = await fileInfoRes.json() as { ok: boolean; result: { file_path: string } };
            if (!fileInfo.ok) throw new Error('Falha ao obter URL do arquivo');

            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
            const fileRes = await fetch(fileUrl);
            const fileBuffer = await fileRes.arrayBuffer();

            // Build FormData and call ingest API
            const formData = new FormData();
            formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);

            const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3009';
            const ingestRes = await fetch(`${APP_URL}/api/ingest/document`, {
                method: 'POST',
                headers: {
                    // Pass telegram_chat_id for auth bypass
                    'x-telegram-chat-id': String(chatId),
                    'x-supabase-service': 'telegram',
                },
                body: formData,
                signal: AbortSignal.timeout(60000),
            });

            const data = await ingestRes.json() as {
                ok?: boolean;
                persons_found?: number;
                document_summary?: string;
                model_used?: string;
                job_id?: string;
                next_step?: string;
                routed_to?: string;
                message?: string;
                error?: string;
                suggestion?: string;
            };

            if (!ingestRes.ok) {
                await sendMessage(chatId,
                    `❌ *Erro na ingestão*\n\n${data.error || 'Falha desconhecida'}` +
                    (data.suggestion ? `\n\n💡 ${data.suggestion}` : '')
                );
                return;
            }

            if (data.routed_to === 'photo_queue') {
                await sendMessage(chatId,
                    `🖼️ *Imagem adicionada à fila de fotos*\n\n${data.message || ''}\n\n` +
                    `Use \`/fotos-pendentes\` para revisar.`
                );
                return;
            }

            const personsFound = data.persons_found ?? 0;
            if (personsFound === 0) {
                await sendMessage(chatId,
                    `📄 *Documento processado*\n\n` +
                    `${data.document_summary || 'Sem resumo disponível'}\n\n` +
                    `⚠️ Nenhuma pessoa identificada no documento.`
                );
                return;
            }

            const reviewUrl = data.next_step || `https://intelink.ia.br/ingest/${data.job_id}`;
            await sendMessage(chatId,
                `✅ *Extração concluída!*\n${VISUAL.separator}\n\n` +
                `📋 *Resumo:* ${data.document_summary || 'Documento processado'}\n` +
                `👥 *${personsFound} pessoa(s) encontrada(s)*\n` +
                `🤖 Modelo: ${data.model_used || 'LLM'}\n\n` +
                `Revise e confirme os dados antes de criar uma proposta:\n` +
                `🔗 ${reviewUrl}`,
                { inline_keyboard: [[{ text: '📋 Revisar dados', url: reviewUrl }]] }
            );

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await sendMessage(chatId, `❌ Erro ao processar arquivo: ${msg}`);
        }
    }
};
