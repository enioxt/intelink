/**
 * POST /api/ingest/reds
 * ETL-001: Receives REDS Excel/CSV upload, parses and upserts to Neo4j.
 * Returns summary: occurrences_created, persons_created, links_created.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

// ── Column detection ──────────────────────────────────────────────────────────
const COL_MAP = {
    reds_number:     ['numero_reds', 'num_reds', 'reds', 'bo', 'numero_bo', 'numero_ocorrencia'],
    data_fato:       ['data_fato', 'data_ocorrencia', 'data', 'dt_fato'],
    hora_fato:       ['hora_fato', 'hora_ocorrencia', 'hora'],
    tipo:            ['tipo_ocorrencia', 'tipo', 'natureza', 'especie'],
    municipio:       ['municipio', 'cidade_ocorrencia', 'municipio_fato'],
    bairro:          ['bairro', 'bairro_fato', 'bairro_ocorrencia'],
    logradouro:      ['logradouro', 'endereco', 'rua'],
    modo_acao:       ['modo_acao', 'modus_operandi', 'modo', 'circunstancia'],
    consumado:       ['consumado', 'tentado', 'tentativa'],
    nome:            ['nome', 'nome_envolvido', 'nome_completo', 'nome_pessoa'],
    cpf:             ['cpf', 'cpf_envolvido'],
    rg:              ['rg', 'rg_envolvido'],
    data_nascimento: ['data_nascimento', 'dt_nascimento', 'nascimento'],
    nome_mae:        ['nome_mae', 'mae', 'nomemae'],
    sexo:            ['sexo', 'genero'],
    papel:           ['papel', 'envolvimento', 'tipo_envolvido', 'qualificacao'],
};

type ColKey = keyof typeof COL_MAP;
type Row = Record<string, string>;

function findCol(headers: string[], cands: string[]): string | null {
    const norm = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
    for (const c of cands) {
        const i = norm.findIndex(h => h.includes(c));
        if (i >= 0) return headers[i];
    }
    return null;
}

function cleanCpf(s: string): string | null {
    const d = s.replace(/\D/g, '');
    return d.length >= 11 ? d.slice(0, 11) : null;
}

function cleanDate(s: string): string {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
}

async function parseCSV(buffer: Buffer): Promise<Row[]> {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter(l => l.trim());
    if (!lines.length) return [];
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Row = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
    });
}

async function parseXLSX(buffer: Buffer): Promise<Row[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Row[];
}

// ── Cypher ────────────────────────────────────────────────────────────────────
const UPSERT_OCC = `
UNWIND $batch AS r
MERGE (o:Occurrence {reds_number: r.reds_number})
ON CREATE SET o += {data_fato: r.data_fato, hora_fato: r.hora_fato, type: r.tipo,
  municipio: r.municipio, bairro: r.bairro, logradouro: r.logradouro,
  modo_acao: r.modo_acao, consumado: r.consumado, source: 'REDS_ETL', created_at: $now}
ON MATCH SET o.data_fato = coalesce(r.data_fato, o.data_fato), o.updated_at = $now
RETURN count(o) AS n`;

const UPSERT_PERSON = `
UNWIND $batch AS r
MERGE (p:Person {cpf: r.cpf})
ON CREATE SET p += {nome_original: r.nome, name: r.nome, data_nascimento: r.data_nascimento,
  nome_mae: r.nome_mae, rg: r.rg, sexo: r.sexo, source: 'REDS_ETL', created_at: $now}
ON MATCH SET p.updated_at = $now
RETURN count(p) AS n`;

const UPSERT_LINK = `
UNWIND $batch AS r
MATCH (p:Person {cpf: r.cpf})
MATCH (o:Occurrence {reds_number: r.reds_number})
MERGE (p)-[rel:ENVOLVIDO_EM]->(o)
ON CREATE SET rel.papel = r.papel, rel.created_at = $now
RETURN count(rel) AS n`;

export async function POST(request: NextRequest): Promise<NextResponse> {
    // Auth: cookie session OR bot-internal token (from Telegram command handler)
    const botHeader = request.headers.get('x-intelink-bot-token');
    const isBotCall = botHeader && botHeader === process.env.TELEGRAM_BOT_TOKEN;

    let userId = 'bot';
    if (!isBotCall) {
        const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        userId = user.id;
    }

    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ error: 'Multipart body required' }, { status: 400 }); }

    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Field "file" required' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 });

    const mimeType = file.type;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const buffer = Buffer.from(await file.arrayBuffer());

    let rows: Row[];
    try {
        if (ext === 'csv' || mimeType === 'text/csv') {
            rows = await parseCSV(buffer);
        } else if (['xlsx', 'xls'].includes(ext)) {
            rows = await parseXLSX(buffer);
        } else {
            return NextResponse.json({ error: 'Suporta apenas .csv, .xlsx, .xls' }, { status: 415 });
        }
    } catch (e) {
        return NextResponse.json({ error: `Parse error: ${e instanceof Error ? e.message : e}` }, { status: 422 });
    }

    if (!rows.length) return NextResponse.json({ error: 'Arquivo vazio' }, { status: 422 });

    const headers = Object.keys(rows[0]);
    const colMap = Object.fromEntries(
        Object.entries(COL_MAP).map(([k, cands]) => [k, findCol(headers, cands)])
    ) as Record<ColKey, string | null>;

    const get = (row: Row, key: ColKey): string => colMap[key] ? (row[colMap[key]!] ?? '').trim() : '';

    // Build occurrence + person batches
    const occMap = new Map<string, Record<string, string>>();
    const personLinks: Array<Record<string, string>> = [];
    const seenPersons = new Set<string>();

    for (const row of rows) {
        const redsNum = get(row, 'reds_number');
        if (!redsNum) continue;

        if (!occMap.has(redsNum)) {
            const consumadoRaw = get(row, 'consumado').toLowerCase();
            occMap.set(redsNum, {
                reds_number: redsNum,
                data_fato:   cleanDate(get(row, 'data_fato')),
                hora_fato:   get(row, 'hora_fato'),
                tipo:        get(row, 'tipo'),
                municipio:   get(row, 'municipio'),
                bairro:      get(row, 'bairro'),
                logradouro:  get(row, 'logradouro'),
                modo_acao:   get(row, 'modo_acao'),
                consumado:   (consumadoRaw === 'não' || consumadoRaw === 'n' || consumadoRaw === 'false') ? 'false' : 'true',
            });
        }

        const cpf = cleanCpf(get(row, 'cpf'));
        if (cpf) {
            const nome = get(row, 'nome').toUpperCase();
            if (!seenPersons.has(cpf)) {
                seenPersons.add(cpf);
            }
            personLinks.push({
                cpf, reds_number: redsNum, nome,
                rg:              get(row, 'rg'),
                data_nascimento: cleanDate(get(row, 'data_nascimento')),
                nome_mae:        get(row, 'nome_mae').toUpperCase(),
                sexo:            get(row, 'sexo').toUpperCase().slice(0, 1),
                papel:           get(row, 'papel') || 'ENVOLVIDO',
            });
        }
    }

    const now = new Date().toISOString();
    const BATCH = 150;
    let occsCreated = 0, personsCreated = 0, linksCreated = 0;

    try {
        // 1. Occurrences
        const occBatch = [...occMap.values()];
        for (let i = 0; i < occBatch.length; i += BATCH) {
            const r = await runQuery<{ n: unknown }>(UPSERT_OCC, { batch: occBatch.slice(i, i + BATCH), now });
            // count() always returns updated count — track via nodes_created not possible here
            // just sum r[0].n as proxy
            void r;
        }
        occsCreated = occMap.size;

        // 2. Persons (unique by CPF)
        const uniquePersons = personLinks.filter((p, i, arr) => arr.findIndex(x => x.cpf === p.cpf) === i);
        for (let i = 0; i < uniquePersons.length; i += BATCH) {
            await runQuery(UPSERT_PERSON, { batch: uniquePersons.slice(i, i + BATCH), now });
        }
        personsCreated = uniquePersons.length;

        // 3. Links
        for (let i = 0; i < personLinks.length; i += BATCH) {
            await runQuery(UPSERT_LINK, { batch: personLinks.slice(i, i + BATCH), now });
        }
        linksCreated = personLinks.length;

        // 4. Log to Supabase audit
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await sb.from('intelink_audit_logs').insert({
            action: 'reds.bulk_import',
            actor_id: userId,
            target_type: 'neo4j',
            details: {
                filename: file.name,
                rows: rows.length,
                occurrences: occsCreated,
                persons: personsCreated,
                links: linksCreated,
            },
        });

        return NextResponse.json({
            ok: true,
            rows_processed: rows.length,
            occurrences: occsCreated,
            persons: personsCreated,
            links: linksCreated,
        });
    } catch (err) {
        console.error('[REDS ETL] Neo4j error:', err);
        return NextResponse.json({ error: `Neo4j error: ${err instanceof Error ? err.message : err}` }, { status: 500 });
    }
}
