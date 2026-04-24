/**
 * POST /api/ingest/document
 * INGEST-001: Recebe arquivo multipart, extrai texto, cross-refa Neo4j, retorna diff para review.
 * Suporta: PDF, DOCX, imagem (JPG/PNG), áudio/vídeo, texto.
 * Mídia grande: fotos → encaminhar para intelink_photo_queue; vídeos > 50MB → aviso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseDocument } from '@/lib/intelink/ingest/parser';
import { extractPersonsFromText } from '@/lib/intelink/ingest/extractor';
import { diffAgainstNeo4j } from '@/lib/intelink/ingest/differ';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
    // Auth: bot token OR Supabase session
    const botToken = request.headers.get('x-intelink-bot-token');
    const isBotCall = botToken && botToken === process.env.TELEGRAM_BOT_TOKEN;
    let userId = 'bot';

    if (!isBotCall) {
        const anonClient = createClient(
            SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        userId = user.id;
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Body deve ser multipart/form-data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 });
    }

    // Size check
    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({
            error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Limite: 50MB.`,
            suggestion: 'Comprima o arquivo ou envie partes menores.'
        }, { status: 413 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const filename = file.name || 'documento';

    // Route photos directly to photo_queue
    if (mimeType.startsWith('image/')) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

        // Store in Supabase Storage
        const storagePath = `ingest/${userId}/${Date.now()}_${filename}`;
        await supabase.storage.from('intelink-photos').upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
        });

        // Add to photo queue for manual review
        const { data: queueEntry } = await supabase
            .from('intelink_photo_queue')
            .insert({
                filename,
                filepath: storagePath,
                caption: (formData.get('caption') as string) ?? null,
                status: 'manual_review',
                match_tier: 4,
                match_confidence: 0.3,
                notes: `uploaded by ${userId}`,
            })
            .select('id')
            .single();

        return NextResponse.json({
            type: 'image',
            routed_to: 'photo_queue',
            queue_id: queueEntry?.id,
            message: 'Imagem enviada para fila de revisão de fotos.',
        });
    }

    // Video: inform size concerns
    if (mimeType.startsWith('video/')) {
        return NextResponse.json({
            error: 'Vídeos devem ser analisados externamente.',
            suggestion: 'Envie áudio extraído do vídeo (MP3/M4A) para transcrição, ou envie capturas de tela relevantes.',
        }, { status: 415 });
    }

    // Parse document
    const buffer = Buffer.from(await file.arrayBuffer());

    let parseResult;
    try {
        parseResult = await parseDocument(buffer, mimeType, filename);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Falha ao processar arquivo: ${msg}` }, { status: 422 });
    }

    if (!parseResult.text.trim()) {
        return NextResponse.json({
            error: 'Nenhum texto extraído do documento.',
            suggestion: 'Verifique se o PDF não é apenas imagem escaneada (use OCR) ou se o arquivo está corrompido.',
        }, { status: 422 });
    }

    // LLM extraction
    let extraction;
    try {
        extraction = await extractPersonsFromText(parseResult.text);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: `Falha na extração LLM: ${msg}` }, { status: 502 });
    }

    if (!extraction.persons.length) {
        return NextResponse.json({
            ok: true,
            persons_found: 0,
            document_summary: extraction.document_summary,
            model_used: extraction.model_used,
            message: 'Nenhuma pessoa identificada no documento.',
            raw_text_preview: parseResult.text.slice(0, 500),
        });
    }

    // Cross-ref with Neo4j
    const diffs = await diffAgainstNeo4j(extraction.persons);

    // Store ingestion job in Supabase for review UI
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: job } = await supabase
        .from('intelink_audit_logs')
        .insert({
            action: 'ingest.document',
            actor_id: userId,
            target_type: 'ingest_job',
            target_id: null,
            details: {
                filename,
                mime_type: mimeType,
                parse_type: parseResult.type,
                persons_found: extraction.persons.length,
                model_used: extraction.model_used,
                document_summary: extraction.document_summary,
                diffs: diffs.map(d => ({
                    cpf: d.extracted.cpf,
                    nome: d.extracted.nome,
                    overall_status: d.overall_status,
                    field_count: d.field_diffs.length,
                })),
            },
        })
        .select('id')
        .single();

    return NextResponse.json({
        ok: true,
        job_id: job?.id,
        filename,
        parse_type: parseResult.type,
        pages: parseResult.pages,
        document_summary: extraction.document_summary,
        model_used: extraction.model_used,
        persons_found: diffs.length,
        diffs,
        next_step: job?.id
            ? `https://intelink.ia.br/ingest/${job.id}`
            : null,
    });
}
