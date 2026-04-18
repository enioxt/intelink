/**
 * ETL-001: /reds-importar — importa planilha REDS enviada como arquivo via Telegram
 * Encaminha o arquivo para /api/ingest/reds e exibe resumo.
 */

import { Command, CommandContext, CommandDependencies, VISUAL } from './types';

export const redsImportarCommand: Command = {
    name: 'reds-importar',
    aliases: ['importar-reds', 'reds-import'],
    description: 'Importa planilha REDS (xlsx/csv) para o grafo Neo4j',

    async execute(ctx: CommandContext, deps: CommandDependencies): Promise<void> {
        const { sendMessage } = deps;
        const { chatId, message } = ctx;

        const doc = message?.document;

        if (!doc) {
            await sendMessage(chatId,
                `📥 *IMPORTAR REDS*\n${VISUAL.separator}\n\n` +
                `Envie um arquivo *.xlsx* ou *.csv* exportado do SIDS/SIME-MG junto com o comando:\n\n` +
                `1. Clique em 📎 (anexo)\n` +
                `2. Selecione o arquivo REDS\n` +
                `3. No campo de legenda, escreva \`/reds-importar\`\n\n` +
                `📋 *Colunas reconhecidas automaticamente:*\n` +
                `• numero_reds / bo / numero_ocorrencia\n` +
                `• data_fato, tipo_ocorrencia, municipio, bairro\n` +
                `• nome, cpf, rg, data_nascimento, nome_mae\n` +
                `• papel (autor/vítima/testemunha)\n\n` +
                `_Arquivo máximo: 20MB · Suporta xlsx e csv (; ou ,)_`
            );
            return;
        }

        const filename = doc.file_name ?? 'arquivo';
        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            await sendMessage(chatId, `❌ Formato não suportado: *${ext}*\n\nEnvie um arquivo *.xlsx* ou *.csv*`);
            return;
        }

        await sendMessage(chatId, `📥 *Processando ${filename}…*\nBaixando e importando para o grafo, aguarde.`);

        // Download file from Telegram
        const botToken = deps.botToken;
        let fileBuffer: Buffer;
        try {
            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`);
            const fileData = await fileRes.json();
            if (!fileData.ok) throw new Error('Não foi possível obter o arquivo do Telegram');
            const filePath = fileData.result.file_path;
            const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
            if (!downloadRes.ok) throw new Error('Falha no download do arquivo');
            fileBuffer = Buffer.from(await downloadRes.arrayBuffer());
        } catch (err) {
            await sendMessage(chatId, `❌ Erro ao baixar arquivo: ${err instanceof Error ? err.message : String(err)}`);
            return;
        }

        // Call ingest API
        try {
            const formData = new FormData();
            formData.append('file', new File([new Uint8Array(fileBuffer)], filename, {
                type: ext === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }));

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
            const res = await fetch(`${appUrl}/api/ingest/reds`, {
                method: 'POST',
                body: formData,
                headers: { 'x-intelink-bot-token': botToken },
            });

            const data = await res.json();

            if (!res.ok) {
                await sendMessage(chatId, `❌ Erro na importação: ${data.error || 'Falha desconhecida'}`);
                return;
            }

            await sendMessage(chatId,
                `✅ *REDS importado com sucesso*\n${VISUAL.separator}\n\n` +
                `📄 Arquivo: *${filename}*\n` +
                `📊 Linhas processadas: *${data.rows_processed}*\n\n` +
                `🗂️ Ocorrências: *${data.occurrences}*\n` +
                `👤 Pessoas: *${data.persons}*\n` +
                `🔗 Vínculos ENVOLVIDO_EM: *${data.links}*\n\n` +
                `_Use \`/buscar [nome/cpf]\` para consultar os novos registros._`
            );
        } catch (err) {
            await sendMessage(chatId, `❌ Erro na importação: ${err instanceof Error ? err.message : String(err)}`);
        }
    },
};
