/**
 * PDF Report — Pessoa Neo4j
 * GET /api/neo4j/pessoa/pdf?id=<elementId>
 * Gera relatório policial de pessoa com ocorrências REDS e co-envolvidos
 */

import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { runQuery } from '@/lib/neo4j/server';
import { jsPDF } from 'jspdf';

export const dynamic = 'force-dynamic';

function formatDate(d: unknown): string {
    if (!d) return '—';
    try { return new Date(String(d)).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

function nameStr(raw: unknown): string {
    if (Array.isArray(raw)) return (raw as string[])[0] ?? '';
    return String(raw ?? '');
}

function str(v: unknown): string {
    if (v == null || v === 'null' || v === 'undefined') return '—';
    return String(v);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim() ?? '';
    const cpf = searchParams.get('cpf')?.trim().replace(/\D/g, '') ?? '';
    if (!id && !cpf) return NextResponse.json({ error: 'id or cpf required' }, { status: 400 });

    try {
        const personRows = await runQuery<{ p: { properties: Record<string, unknown>; elementId: string; labels: string[] } }>(
            id
                ? `MATCH (p:Person) WHERE elementId(p) = $id RETURN p LIMIT 1`
                : `MATCH (p:Person) WHERE p.cpf = $cpf RETURN p LIMIT 1`,
            id ? { id } : { cpf }
        );
        if (!personRows.length) return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 });

        // Use actual elementId for subsequent queries
        const resolvedId = personRows[0].p.elementId;

        const props = personRows[0].p.properties;
        const name = nameStr(props.nome_original ?? props.name);

        const occRows = await runQuery<{ o: { properties: Record<string, unknown> }; rel_type: string }>(
            `MATCH (p:Person)-[r]->(o:Occurrence) WHERE elementId(p) = $id
             RETURN o, type(r) AS rel_type ORDER BY o.data_fato DESC LIMIT $limit`,
            { id: resolvedId, limit: neo4j.int(50) }
        );

        const coRows = await runQuery<{ co: { properties: Record<string, unknown>; elementId: string }; shared: number }>(
            `MATCH (p:Person)-[:ENVOLVIDO_EM|VICTIM_IN]->(o:Occurrence)<-[:ENVOLVIDO_EM|VICTIM_IN]-(co:Person)
             WHERE elementId(p) = $id AND elementId(co) <> $id
             WITH co, count(o) AS shared ORDER BY shared DESC RETURN co, shared LIMIT $limit`,
            { id: resolvedId, limit: neo4j.int(10) }
        );

        // Build PDF
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = 210, margin = 15, contentW = W - margin * 2;
        let y = margin;

        const addPage = () => { doc.addPage(); y = margin; };
        const checkY = (needed: number) => { if (y + needed > 285) addPage(); };

        // ── Header ──────────────────────────────────────────────────────────
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, W, 28, 'F');
        doc.setTextColor(34, 211, 238); // cyan-400
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INTELINK — RELATÓRIO POLICIAL', margin, 13);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | CONFIDENCIAL`, margin, 21);
        doc.text('USO RESTRITO — SIGILO POLICIAL', W - margin, 21, { align: 'right' });
        y = 36;

        // ── Dados pessoais ───────────────────────────────────────────────────
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
        doc.setTextColor(34, 211, 238);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DADOS PESSOAIS', margin + 3, y + 5.5);
        y += 12;

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('NOME:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(name || '—', margin + 18, y); y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('CPF:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(str(props.cpf), margin + 18, y);
        doc.setFont('helvetica', 'bold');
        doc.text('RG:', margin + 70, y); doc.setFont('helvetica', 'normal'); doc.text(str(props.rg), margin + 82, y); y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('CIDADE:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(str(props.cidade), margin + 18, y);
        doc.setFont('helvetica', 'bold');
        doc.text('BAIRRO:', margin + 70, y); doc.setFont('helvetica', 'normal'); doc.text(str(props.bairro), margin + 84, y); y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('DELEGACIA:', margin, y); doc.setFont('helvetica', 'normal'); doc.text(str(props.delegacia), margin + 24, y); y += 10;

        // ── Resumo estatístico ───────────────────────────────────────────────
        const asS = occRows.filter(r => r.rel_type === 'ENVOLVIDO_EM').length;
        const asV = occRows.filter(r => r.rel_type === 'VICTIM_IN').length;
        const boxes = [
            { label: 'Total Ocorrências', val: String(occRows.length) },
            { label: 'Envolvido', val: String(asS) },
            { label: 'Vítima', val: String(asV) },
            { label: 'Co-envolvidos', val: String(coRows.length) },
        ];
        const bw = contentW / 4;
        boxes.forEach((b, i) => {
            const bx = margin + i * bw;
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(bx, y, bw - 2, 16, 2, 2, 'F');
            doc.setTextColor(34, 211, 238);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(b.val, bx + bw / 2 - 1, y + 9, { align: 'center' });
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(b.label, bx + bw / 2 - 1, y + 14, { align: 'center' });
        });
        y += 22;

        // ── Ocorrências REDS ─────────────────────────────────────────────────
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
        doc.setTextColor(34, 211, 238);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`OCORRÊNCIAS REDS (${occRows.length})`, margin + 3, y + 5.5);
        y += 12;

        if (occRows.length === 0) {
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text('Nenhuma ocorrência vinculada no grafo local.', margin, y); y += 8;
        } else {
            occRows.forEach((row, idx) => {
                checkY(18);
                const op = row.o.properties;
                const isVictim = row.rel_type === 'VICTIM_IN';
                const rowBg = idx % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
                doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
                doc.rect(margin, y, contentW, 16, 'F');

                // Role badge
                doc.setFillColor(isVictim ? 251 : 254, isVictim ? 191 : 202, isVictim ? 36 : 202);
                doc.roundedRect(margin + 2, y + 3, 22, 5, 1, 1, 'F');
                doc.setTextColor(isVictim ? 120 : 180, 0, 0);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.text(isVictim ? 'VÍTIMA' : 'ENVOLVIDO', margin + 13, y + 6.5, { align: 'center' });

                doc.setTextColor(30, 30, 30);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(str(op.reds_number ?? op.numero_reds).replace('null', '—'), margin + 27, y + 6.5);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                const typeText = String(op.type ?? op.tipo ?? 'Ocorrência').slice(0, 55);
                doc.text(typeText, margin + 27, y + 12);
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(7);
                const location = [op.bairro, op.cidade].filter(Boolean).map(String).join(', ') || '—';
                doc.text(`${formatDate(op.data_fato)}  |  ${location}`, W - margin, y + 6.5, { align: 'right' });
                doc.text(str(op.delegacia).slice(0, 40), W - margin, y + 12, { align: 'right' });
                y += 17;
            });
        }

        // ── Co-envolvidos ────────────────────────────────────────────────────
        if (coRows.length > 0) {
            y += 4;
            checkY(20);
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F');
            doc.setTextColor(34, 211, 238);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`CO-ENVOLVIDOS (${coRows.length})`, margin + 3, y + 5.5);
            y += 12;

            coRows.forEach((row, idx) => {
                checkY(12);
                const cp = row.co.properties;
                const coName = nameStr(cp.nome_original ?? cp.name);
                const rowBg = idx % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
                doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
                doc.rect(margin, y, contentW, 10, 'F');
                doc.setTextColor(30, 30, 30);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text(coName || '—', margin + 3, y + 6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(str(cp.cpf), margin + 80, y + 6.5);
                doc.setTextColor(34, 211, 238);
                doc.text(`${row.shared} ocorrência${row.shared !== 1 ? 's' : ''} em comum`, W - margin, y + 6.5, { align: 'right' });
                y += 11;
            });
        }

        // ── Footer ───────────────────────────────────────────────────────────
        const pageCount = doc.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
            doc.setPage(p);
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 288, W, 10, 'F');
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('INTELINK — Sistema de Inteligência Policial | DOCUMENTO SIGILOSO', margin, 294);
            doc.text(`Pág. ${p}/${pageCount}`, W - margin, 294, { align: 'right' });
        }

        const pdfBytes = doc.output('arraybuffer');
        const safeName = (name || 'pessoa').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
        return new NextResponse(pdfBytes, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="relatorio_${safeName}_${Date.now()}.pdf"`,
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erro ao gerar PDF';
        console.error('[PDF Pessoa]', error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
