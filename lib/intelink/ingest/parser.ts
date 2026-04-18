/**
 * INGEST-002: Parsers de documentos para o pipeline de ingestão.
 * Suporta: PDF, DOCX, imagem (jpg/png via Groq Vision), áudio (Groq Whisper).
 */

import Groq from 'groq-sdk';

export interface ParseResult {
    text: string;
    type: 'pdf' | 'docx' | 'image' | 'audio' | 'text';
    pages?: number;
}

export async function parseDocument(
    buffer: Buffer,
    mimeType: string,
    filename: string
): Promise<ParseResult> {
    if (mimeType === 'application/pdf') {
        return parsePdf(buffer);
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return parseDocx(buffer);
    }
    if (mimeType.startsWith('image/')) {
        return parseImage(buffer, mimeType, filename);
    }
    if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        return parseAudio(buffer, mimeType, filename);
    }
    if (mimeType.startsWith('text/')) {
        return { text: buffer.toString('utf-8'), type: 'text' };
    }
    throw new Error(`Tipo de arquivo não suportado: ${mimeType}`);
}

async function parsePdf(buffer: Buffer): Promise<ParseResult> {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return { text: data.text, type: 'pdf', pages: data.numpages };
}

async function parseDocx(buffer: Buffer): Promise<ParseResult> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, type: 'docx' };
}

async function parseImage(buffer: Buffer, mimeType: string, filename: string): Promise<ParseResult> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await groq.chat.completions.create({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: { url: dataUrl },
                },
                {
                    type: 'text',
                    text: 'Transcreva todo o texto visível nesta imagem. Se for documento policial, preserve nomes, CPFs, datas e números de BO/REDS. Retorne apenas o texto extraído, sem comentários.',
                }
            ],
        }],
        max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content ?? '';
    return { text, type: 'image' };
}

async function parseAudio(buffer: Buffer, mimeType: string, filename: string): Promise<ParseResult> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Groq Whisper expects a File-like object
    const ext = filename.split('.').pop() || 'mp3';
    void ext;
    const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        language: 'pt',
        response_format: 'text',
    });

    return { text: String(transcription), type: 'audio' };
}
