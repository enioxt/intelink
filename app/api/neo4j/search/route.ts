import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';

export const dynamic = 'force-dynamic';

function onlyNumbers(s: string) { return s.replace(/\D/g, ''); }
function norm(s: string) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

/**
 * GET /api/neo4j/search?q=...&limit=...
 * Unified search across Person, Vehicle, Occurrence in Neo4j.
 * Returns results with `type`, `id`, `label`, `detail`, `source`, `href`, `confidence`.
 * href is the canonical detail page for each entity type.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const limit = neo4j.int(limitParam);

    if (q.length < 2) return NextResponse.json({ results: [], query: q });

    try {
        const digits = onlyNumbers(q);
        const results: SearchResult[] = [];

        // ── 1. Person search ─────────────────────────────────────────────────────
        if (digits.length >= 11) {
            // CPF / RG
            const cpfFmt = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
            const rows = await runQuery<Row>(
                `MATCH (p:Person) WHERE p.cpf = $cpf OR p.cpf CONTAINS $digits
                 RETURN p LIMIT $limit`,
                { cpf: cpfFmt, digits, limit }
            );
            results.push(...rows.map(r => personResult(r.p)));
        } else {
            // Full-text name search (falls back to CONTAINS if index not ready)
            let rows: Row[] = [];
            try {
                const safeQ = q.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
                rows = await runQuery<Row>(
                    `CALL db.index.fulltext.queryNodes('personSearch', $query)
                     YIELD node AS p, score
                     RETURN p ORDER BY score DESC LIMIT $limit`,
                    { query: safeQ, limit }
                );
            } catch {
                // fallback: CONTAINS
                rows = await runQuery<Row>(
                    `MATCH (p:Person)
                     WHERE toLower(coalesce(p.name,'')) CONTAINS $q
                        OR toLower(coalesce(p.nome_original,'')) CONTAINS $q
                     RETURN p LIMIT $limit`,
                    { q: norm(q), limit }
                );
            }
            results.push(...rows.map(r => personResult(r.p)));
        }

        // ── 2. Vehicle search (placa) ─────────────────────────────────────────
        if (digits.length >= 7 || /^[A-Z]{3}[-]?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/i.test(q.trim())) {
            const placar = q.replace(/\s|-/g, '').toUpperCase();
            const vRows = await runQuery<VRow>(
                `MATCH (v:Vehicle) WHERE toUpper(v.placa) CONTAINS $placa RETURN v LIMIT 5`,
                { placa: placar }
            );
            results.push(...vRows.map(r => vehicleResult(r.v)));
        }

        // ── 3. REDS / Occurrence search ───────────────────────────────────────
        if (digits.length >= 6 || q.toLowerCase().startsWith('reds') || /\d{4}-\d/.test(q)) {
            const oRows = await runQuery<ORow>(
                `MATCH (o:Occurrence)
                 WHERE o.reds_number CONTAINS $q OR o.reds_number CONTAINS $digits
                 RETURN o LIMIT 5`,
                { q: q.trim(), digits: digits || '___' }
            );
            results.push(...oRows.map(r => occurrenceResult(r.o)));
        }

        // Deduplicate by id
        const seen = new Set<string>();
        const deduped = results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

        return NextResponse.json({ results: deduped, query: q, total: deduped.length });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Neo4j error';
        console.error('[Neo4j Search]', error);
        return NextResponse.json({ error: msg, results: [] }, { status: 503 });
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Neo4jNode { properties: Record<string, unknown>; elementId: string; }
interface Row { p: Neo4jNode; }
interface VRow { v: Neo4jNode; }
interface ORow { o: Neo4jNode; }

interface SearchResult {
    id: string; type: string; label: string; detail: string;
    source: string; confidence: string; href: string; ops?: number;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function personResult(node: Neo4jNode): SearchResult {
    const p = node?.properties ?? {};
    const nameRaw = p.nome_original ?? p.name ?? '';
    const nameFull = Array.isArray(nameRaw) ? (nameRaw as string[])[0] : String(nameRaw);
        const name = nameFull.replace(/^[-_\s]+|[-_\s]+$/g, "").trim() || nameFull;
    const cpf = p.cpf ? String(p.cpf) : null;
    const municipio = p.municipio ?? p.cidade ?? null;
    const detail = [cpf ? `CPF ${cpf}` : null, municipio].filter(Boolean).join(' · ');
    const src = String(p.source ?? '');
    const conf = src.includes('REDS') ? 'reds' : src.includes('PDF') || src.includes('dhpp') ? 'probable' : 'unconfirmed';
    return {
        id: node?.elementId ?? '',
        type: 'PERSON',
        label: name,
        detail,
        source: src || 'Neo4j',
        confidence: conf,
        href: `/pessoa/${encodeURIComponent(node?.elementId ?? '')}`,
    };
}

function vehicleResult(node: Neo4jNode): SearchResult {
    const v = node?.properties ?? {};
    const placa = String(v.placa ?? v.plate ?? 'Placa desconhecida');
    const modelo = [v.marca, v.modelo, v.cor].filter(Boolean).join(' ');
    const detail = [modelo, v.ano].filter(Boolean).join(' · ');
    return {
        id: node?.elementId ?? '',
        type: 'VEHICLE',
        label: placa,
        detail: detail || 'Veículo',
        source: String(v.source ?? 'Neo4j'),
        confidence: 'reds',
        href: `/central?tab=veiculos&q=${encodeURIComponent(placa)}`,
    };
}

function occurrenceResult(node: Neo4jNode): SearchResult {
    const o = node?.properties ?? {};
    const reds = String(o.reds_number ?? o.numero_reds ?? 'REDS');
    const tipo = String(o.type ?? o.tipo ?? '');
    const local = [o.municipio, o.bairro].filter(Boolean).join(' / ');
    const detail = [tipo, local, o.data_fato].filter(Boolean).join(' · ');
    return {
        id: node?.elementId ?? '',
        type: 'OCCURRENCE',
        label: reds,
        detail: detail || 'Ocorrência',
        source: 'REDS',
        confidence: 'reds',
        href: `/central?tab=ocorrencias&q=${encodeURIComponent(reds)}`,
    };
}
