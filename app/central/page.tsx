'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IL } from '@/lib/design/tokens';
import { ILCard } from '@/components/il/ILCard';
import { ILTag } from '@/components/il/ILTag';
import { ConfBadge } from '@/components/il/ConfBadge';
import { ILHeader } from '@/components/il/ILHeader';
import { GlobalSearch } from '@/components/il/GlobalSearch';
import type { ConfidenceKind } from '@/lib/design/tokens';
import { formatCPF, formatSource, isPlaceholderName } from '@/lib/normalize/identifiers';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Neo4jPessoa {
  id: string; name: string; cpf?: string | null; rg?: string | null;
  mae?: string | null; bairro?: string | null; municipio?: string | null;
  source?: string | null; sexo?: string | null; data_nascimento?: string | null;
}
interface Occurrence {
  id: string; reds_number?: string | null; tipo?: string | null;
  data_fato?: string | null; municipio?: string | null; bairro?: string | null;
  envolvidos?: number; vitimas?: number;
}
interface Foto {
  id: string; filename?: string | null; caption?: string | null;
  source?: string | null; linked?: boolean; person_name?: string | null;
}
interface Neo4jStats { Person?: number; Occurrence?: number; Photo?: number; Vehicle?: number; total_relationships?: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sourceConf(source?: string | null): ConfidenceKind {
  if (!source) return 'unconfirmed';
  if (source.includes('REDS')) return 'reds';
  if (source.includes('PDF') || source.includes('dhpp')) return 'probable';
  if (source === 'PHOTO_INGEST') return 'unconfirmed';
  return 'confirmed';
}

function FilterChip({ label, active, count, onClick }: { label: string; active?: boolean; count?: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', fontSize: 12,
      background: active ? 'rgba(6,182,212,0.12)' : 'transparent',
      border: `1px solid ${active ? IL.cyan + '50' : IL.border}`,
      borderRadius: 6, color: active ? IL.cyan : IL.ink2,
      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}{count != null && <span style={{ color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{count.toLocaleString('pt-BR')}</span>}
    </button>
  );
}

// ─── Pessoas Tab ──────────────────────────────────────────────────────────────
function PessoasTab() {
  const [pessoas, setPessoas] = useState<Neo4jPessoa[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hasCpf, setHasCpf] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [source, setSource] = useState('');
  const [offset, setOffset] = useState(0);
  const debounce = useRef<number | undefined>(undefined);
  const LIMIT = 50;

  const load = useCallback(async (q: string, cpf: boolean, photo: boolean, src: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (q) params.set('q', q);
      if (cpf) params.set('has_cpf', '1');
      if (photo) params.set('has_photo', '1');
      if (src) params.set('source', src);
      const res = await fetch(`/api/neo4j/pessoas?${params}`);
      if (res.ok) {
        const d = await res.json();
        setPessoas(d.pessoas ?? []);
        setTotal(d.total ?? 0);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => load(search, hasCpf, hasPhoto, source, offset), 300);
  }, [search, hasCpf, hasPhoto, source, offset, load]);

  const SOURCES = ['REDS_ETL', 'PDF_INGEST', 'PHOTO_INGEST', 'dhpp_cs'];

  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${IL.border}`, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Buscar por nome, CPF, bairro, município..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: IL.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
        />
        <FilterChip label="Tem CPF" active={hasCpf} onClick={() => { setHasCpf(v => !v); setOffset(0); }} />
        <FilterChip label="Tem foto" active={hasPhoto} onClick={() => { setHasPhoto(v => !v); setOffset(0); }} />
        <select value={source} onChange={e => { setSource(e.target.value); setOffset(0); }} style={{ padding: '6px 10px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: source ? IL.cyan : IL.ink2, fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="">Fonte: todas</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: IL.bg2 }}>
              {['', 'Nome', 'CPF', 'Mãe', 'Município', 'Bairro', 'Fonte', 'Conf.', ''].map(h => (
                <th key={h + Math.random()} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>Carregando…</td></tr>
            )}
            {!loading && pessoas.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: IL.dim, fontSize: 12 }}>Nenhuma pessoa encontrada.</td></tr>
            )}
            {!loading && pessoas.map(p => (
              <tr key={p.id} onClick={() => window.location.href = `/pessoa/${encodeURIComponent(p.id)}`}
                style={{ cursor: 'pointer', borderBottom: `1px solid ${IL.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: IL.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', color: IL.cyan }}>
                    {p.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?'}
                  </div>
                </td>
                <td style={{ padding: '8px 12px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: IL.ink, fontWeight: 500 }}>{p.name}</span>
                  {isPlaceholderName(p.name) && <span style={{ marginLeft: 6, fontSize: 9, color: IL.dim, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>placeholder</span>}
                </td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatCPF(p.cpf)}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.mae ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12, whiteSpace: 'nowrap' }}>{p.municipio ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12, whiteSpace: 'nowrap' }}>{p.bairro ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{p.source && <ILTag>{formatSource(p.source)}</ILTag>}</td>
                <td style={{ padding: '8px 12px' }}><ConfBadge kind={sourceConf(p.source)} /></td>
                <td style={{ padding: '8px 12px' }}>
                  <Link href={`/chat?q=${encodeURIComponent('Quem é ' + p.name)}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: IL.dim, textDecoration: 'none' }}>chat →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${IL.border}` }}>
        <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>
          {offset + 1}–{Math.min(offset + LIMIT, total)} de {total.toLocaleString('pt-BR')} pessoas
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset === 0 ? IL.dim : IL.ink, cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Anterior</button>
          <button disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset + LIMIT >= total ? IL.dim : IL.ink, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Próxima →</button>
        </div>
      </div>
    </ILCard>
  );
}

// ─── Ocorrências Tab ──────────────────────────────────────────────────────────
function OcorrenciasTab() {
  const [ocorrencias, setOcorrencias] = useState<Occurrence[]>([]);
  const [total, setTotal] = useState(0);
  const [tipos, setTipos] = useState<{ tipo: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const debounce = useRef<number | undefined>(undefined);
  const LIMIT = 50;

  const load = useCallback(async (q: string, tipo: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (q) params.set('q', q);
      if (tipo) params.set('tipo', tipo);
      const res = await fetch(`/api/neo4j/ocorrencias?${params}`);
      if (res.ok) {
        const d = await res.json();
        setOcorrencias(d.ocorrencias ?? []);
        setTotal(d.total ?? 0);
        if (d.tipos?.length) setTipos(d.tipos);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => load(search, tipoFilter, offset), 300);
  }, [search, tipoFilter, offset, load]);

  const TIPO_COLOR: Record<string, string> = {
    HOMICIDIO: IL.red, PORTE_ARMA: IL.amber, POSSE_ARMA: IL.amber,
    TRAFICO: IL.purple, ROUBO: IL.amber, FURTO: IL.blue,
  };

  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${IL.border}`, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Buscar por nº REDS, bairro, município..." style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: IL.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <select value={tipoFilter} onChange={e => { setTipoFilter(e.target.value); setOffset(0); }} style={{ padding: '6px 10px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: tipoFilter ? IL.cyan : IL.ink2, fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value="">Tipo: todos</option>
          {tipos.map(t => <option key={t.tipo} value={t.tipo}>{t.tipo} ({t.count})</option>)}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: IL.bg2 }}>
            {['REDS', 'Tipo', 'Data', 'Município', 'Bairro', 'Envolvidos', 'Vítimas', ''].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}`, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>Carregando…</td></tr>}
          {!loading && ocorrencias.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: IL.dim, fontSize: 12 }}>Nenhuma ocorrência encontrada.</td></tr>}
          {!loading && ocorrencias.map(o => (
            <tr key={o.id} style={{ cursor: 'pointer', borderBottom: `1px solid ${IL.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
              <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.reds_number ?? '—'}</td>
              <td style={{ padding: '8px 12px' }}>
                {o.tipo && <ILTag color={TIPO_COLOR[o.tipo] ?? IL.ink2}>{o.tipo}</ILTag>}
              </td>
              <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{o.data_fato ?? '—'}</td>
              <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{o.municipio ?? '—'}</td>
              <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{o.bairro ?? '—'}</td>
              <td style={{ padding: '8px 12px', color: (o.envolvidos ?? 0) > 0 ? IL.amber : IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center' }}>{o.envolvidos ?? 0}</td>
              <td style={{ padding: '8px 12px', color: (o.vitimas ?? 0) > 0 ? IL.red : IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center' }}>{o.vitimas ?? 0}</td>
              <td style={{ padding: '8px 12px' }}>
                <Link href={`/chat?q=${encodeURIComponent('Me fale sobre a ocorrência ' + (o.reds_number ?? o.id))}`} style={{ fontSize: 11, color: IL.dim, textDecoration: 'none' }}>chat →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${IL.border}` }}>
        <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>{offset + 1}–{Math.min(offset + LIMIT, total)} de {total.toLocaleString('pt-BR')} ocorrências</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset === 0 ? IL.dim : IL.ink, cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Anterior</button>
          <button disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset + LIMIT >= total ? IL.dim : IL.ink, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Próxima →</button>
        </div>
      </div>
    </ILCard>
  );
}

// ─── Fotos Tab ────────────────────────────────────────────────────────────────
function FotosTab() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState<string>('');
  const [source, setSource] = useState('');
  const [photoModal, setPhotoModal] = useState<Foto | null>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 60;

  const load = useCallback(async (lnk: string, src: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (lnk) params.set('linked', lnk);
      if (src) params.set('source', src);
      const res = await fetch(`/api/neo4j/fotos?${params}`);
      if (res.ok) { const d = await res.json(); setFotos(d.fotos ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(linked, source, offset); }, [linked, source, offset, load]);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <FilterChip label="Todas" active={!linked} onClick={() => { setLinked(''); setOffset(0); }} />
        <FilterChip label="Vinculadas" active={linked === '1'} onClick={() => { setLinked('1'); setOffset(0); }} />
        <FilterChip label="Sem vínculo" active={linked === '0'} onClick={() => { setLinked('0'); setOffset(0); }} />
        {['Telegram', 'REDS', 'Manual'].map(s => (
          <FilterChip key={s} label={s} active={source === s} onClick={() => { setSource(source === s ? '' : s); setOffset(0); }} />
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>Carregando fotos…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {fotos.map(ph => (
              <div key={ph.id} onClick={() => setPhotoModal(ph)} style={{
                aspectRatio: '1', cursor: 'pointer', borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${ph.linked ? IL.border : IL.amber + '50'}`, background: '#152030', position: 'relative',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${encodeURIComponent(ph.filename ?? ph.id)}/file`} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,6,23,0.85), transparent 50%)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {ph.person_name && <div style={{ fontSize: 11, color: IL.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.person_name}</div>}
                  <div style={{ fontSize: 9, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{ph.source ?? '—'}</div>
                  {!ph.linked && <div style={{ marginTop: 2 }}><ILTag color={IL.amber}>sem vínculo</ILTag></div>}
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>{Math.min(offset + LIMIT, total)} de {total.toLocaleString('pt-BR')} fotos</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset === 0 ? IL.dim : IL.ink, cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Anterior</button>
              <button disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset + LIMIT >= total ? IL.dim : IL.ink, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Próxima →</button>
            </div>
          </div>
        </>
      )}

      {/* Modal de foto */}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px, 90vw)', background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '4/3', background: '#152030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${encodeURIComponent(photoModal.filename ?? photoModal.id)}/file`} alt={photoModal.caption ?? ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: 18 }}>
              {photoModal.person_name && <div style={{ fontSize: 14, fontWeight: 600, color: IL.ink, marginBottom: 4 }}>{photoModal.person_name}</div>}
              <div style={{ fontSize: 13, color: IL.ink2, marginBottom: 10 }}>{photoModal.caption ?? '—'}</div>
              <div style={{ display: 'flex', gap: 20, fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                <span>Fonte: {photoModal.source ?? '—'}</span>
                <span>{photoModal.linked ? '✓ Vinculada' : '⚠ Sem vínculo'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a href={`/api/photos/${encodeURIComponent(photoModal.filename ?? photoModal.id)}/file`} download={photoModal.filename ?? photoModal.id} style={{ padding: '7px 14px', background: IL.cyan, color: IL.bg1, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Download</a>
                {photoModal.person_name && <Link href={`/chat?q=${encodeURIComponent('Quem é ' + photoModal.person_name)}`} onClick={() => setPhotoModal(null)} style={{ padding: '7px 14px', background: IL.bg2, border: `1px solid ${IL.border}`, color: IL.cyan, borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>Chat IA sobre a pessoa</Link>}
                <button onClick={() => setPhotoModal(null)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Veículos Tab ────────────────────────────────────────────────────────────
function VeiculosTab() {
  const [veiculos, setVeiculos] = useState<{id:string;placa:string|null;marca:string|null;modelo:string|null;cor:string|null;ano:string|null;envolvidos:number}[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;
  const deb = useRef<number|undefined>(undefined);

  const load = useCallback(async (q: string, off: number) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (q) p.set('q', q);
      const res = await fetch(`/api/neo4j/veiculos?${p}`);
      if (res.ok) { const d = await res.json(); setVeiculos(d.veiculos ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { clearTimeout(deb.current); deb.current = window.setTimeout(() => load(search, offset), 300); }, [search, offset, load]);

  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${IL.border}` }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }} placeholder="Buscar por placa, modelo, marca..." style={{ flex: 1, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: IL.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 12 }}>Carregando…</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: IL.bg2 }}>
            {['Placa', 'Marca', 'Modelo', 'Cor', 'Ano', 'Envolvidos', ''].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}` }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {veiculos.map(v => (
              <tr key={v.id} style={{ borderBottom: `1px solid ${IL.border}`, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ padding: '8px 12px', color: IL.cyan, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v.placa ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{v.marca ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{v.modelo ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{v.cor ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.ano ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: v.envolvidos > 0 ? IL.amber : IL.dim, fontFamily: 'var(--font-mono)' }}>{v.envolvidos}</td>
                <td style={{ padding: '8px 12px' }}>
                  <Link href={`/chat?q=${encodeURIComponent('Quem usa o veículo placa ' + (v.placa ?? v.id))}`} style={{ fontSize: 11, color: IL.dim, textDecoration: 'none' }}>chat →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${IL.border}` }}>
        <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>{Math.min(offset + LIMIT, total)} de {total.toLocaleString('pt-BR')} veículos</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset === 0 ? IL.dim : IL.ink, cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Anterior</button>
          <button disabled={offset + LIMIT >= total} onClick={() => setOffset(o => o + LIMIT)} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset + LIMIT >= total ? IL.dim : IL.ink, cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Próxima →</button>
        </div>
      </div>
    </ILCard>
  );
}

// ─── Vínculos Tab ────────────────────────────────────────────────────────────
function VinculosTab() {
  const [vinculos, setVinculos] = useState<{a_id:string;a_name:string;a_type:string;tipo:string;b_id:string;b_name:string;b_type:string}[]>([]);
  const [tipos, setTipos] = useState<{tipo:string;count:number}[]>([]);
  const [tipoFilter, setTipoFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async (tipo: string, off: number) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (tipo) p.set('tipo', tipo);
      const res = await fetch(`/api/neo4j/vinculos?${p}`);
      if (res.ok) {
        const d = await res.json();
        setVinculos(d.vinculos ?? []);
        if (d.tipos?.length) setTipos(d.tipos);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(tipoFilter, offset); }, [tipoFilter, offset, load]);

  const TIPO_COLOR: Record<string, string> = { ENVOLVIDO_EM: IL.amber, PHOTO_OF: IL.purple, SAME_AS: IL.cyan, VICTIM_IN: IL.red, OCORREU_EM: IL.blue };

  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${IL.border}`, flexWrap: 'wrap' }}>
        <FilterChip label="Todos" active={!tipoFilter} onClick={() => { setTipoFilter(''); setOffset(0); }} />
        {tipos.slice(0, 8).map(t => <FilterChip key={t.tipo} label={`${t.tipo} (${t.count.toLocaleString('pt-BR')})`} active={tipoFilter === t.tipo} onClick={() => { setTipoFilter(tipoFilter === t.tipo ? '' : t.tipo); setOffset(0); }} />)}
      </div>
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: IL.dim, fontSize: 12, fontFamily: 'var(--font-mono)' }}>Carregando…</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: IL.bg2 }}>
            {['De', 'Tipo', 'Para', ''].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}` }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {vinculos.map((v, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${IL.border}` }}>
                <td style={{ padding: '8px 12px', color: IL.ink, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Link href={`/pessoa/${encodeURIComponent(v.a_id)}`} style={{ color: IL.ink, textDecoration: 'none' }}>{v.a_name || v.a_type}</Link>
                </td>
                <td style={{ padding: '8px 12px' }}><ILTag color={TIPO_COLOR[v.tipo] ?? IL.ink2}>{v.tipo}</ILTag></td>
                <td style={{ padding: '8px 12px', color: IL.ink2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.b_type === 'Person' ? <Link href={`/pessoa/${encodeURIComponent(v.b_id)}`} style={{ color: IL.ink2, textDecoration: 'none' }}>{v.b_name || v.b_type}</Link> : (v.b_name || v.b_type)}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <Link href={`/chat?q=${encodeURIComponent('Analise o vínculo entre ' + v.a_name + ' e ' + v.b_name)}`} style={{ fontSize: 11, color: IL.dim, textDecoration: 'none' }}>chat →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${IL.border}` }}>
        <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>{vinculos.length} vínculos · 19.711 total no grafo</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - LIMIT))} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: offset === 0 ? IL.dim : IL.ink, cursor: offset === 0 ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>← Anterior</button>
          <button disabled={vinculos.length < LIMIT} onClick={() => setOffset(o => o + LIMIT)} style={{ padding: '5px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: vinculos.length < LIMIT ? IL.dim : IL.ink, cursor: vinculos.length < LIMIT ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Próxima →</button>
        </div>
      </div>
    </ILCard>
  );
}

// ─── Merge Tab ────────────────────────────────────────────────────────────────
function MergeTab() {
  const [candidates, setCandidates] = useState<{a_id:string;a_name:string;a_cpf:string;a_source:string;b_id:string;b_name:string;b_cpf:string;b_source:string;confidence:number;reason:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [done, setDone] = useState(new Set<string>());

  useEffect(() => {
    fetch('/api/neo4j/merge?limit=50')
      .then(r => r.json())
      .then(d => setCandidates(d.candidates ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function doMerge(primary_id: string, secondary_id: string, key: string) {
    setMerging(key);
    try {
      const res = await fetch('/api/neo4j/merge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id, secondary_id, reason: 'cpf_norm_manual' }),
      });
      if (res.ok) setDone(d => new Set([...d, key]));
    } finally { setMerging(null); }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: IL.dim, fontSize: 13, fontFamily: 'var(--font-mono)' }}>Carregando candidatos a merge…</div>;

  const visible = candidates.filter(c => !done.has(`${c.a_id}:${c.b_id}`));

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '12px 16px', background: IL.surf, border: `1px solid ${IL.amber}40`, borderRadius: 10, fontSize: 13, color: IL.ink2 }}>
        <span style={{ color: IL.amber, fontWeight: 600 }}>⚠ {visible.length} candidatos</span> identificados por CPF normalizado que podem ser a mesma pessoa. Revise e confirme o merge.
      </div>
      {visible.length === 0 && <ILCard hover={false} style={{ padding: 48, textAlign: 'center' }}><div style={{ color: IL.dim }}>Nenhum candidato a merge pendente.</div></ILCard>}
      {visible.map(c => {
        const key = `${c.a_id}:${c.b_id}`;
        return (
          <ILCard key={key} hover={false} style={{ marginBottom: 12, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: IL.ink }}>{c.a_name}</div>
                <div style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>CPF {c.a_cpf || '—'} · {c.a_source || 'desconhecido'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <ILTag color={c.confidence > 0.9 ? IL.cyan : IL.amber}>{Math.round(c.confidence * 100)}%</ILTag>
                <div style={{ fontSize: 9, color: IL.dim, marginTop: 4, fontFamily: 'var(--font-mono)' }}>{c.reason}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: IL.ink }}>{c.b_name}</div>
                <div style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>CPF {c.b_cpf || '—'} · {c.b_source || 'desconhecido'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => doMerge(c.b_id, c.a_id, key)} disabled={merging === key} style={{ padding: '6px 12px', background: IL.cyan, color: IL.bg1, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {merging === key ? '…' : 'Mesclar'}
                </button>
                <button onClick={() => setDone(d => new Set([...d, key]))} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink2, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Ignorar</button>
              </div>
            </div>
          </ILCard>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function CentralContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') ?? 'pessoas';
  const [tab, setTab] = useState(initialTab);
  const [neo4jStats, setNeo4jStats] = useState<Neo4jStats>({});
  const [supaStats, setSupaStats] = useState({ investigations: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/neo4j/stats').then(r => r.json()).catch(() => ({})),
      fetch('/api/stats?scope=basic', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([n, s]) => { setNeo4jStats(n.nodes ?? {}); setSupaStats(s); });
  }, []);

  const setTabNav = useCallback((t: string) => {
    setTab(t);
    router.replace(`/central?tab=${t}`, { scroll: false });
  }, [router]);

  const TABS = [
    { id: 'pessoas',    label: 'Pessoas',     count: neo4jStats.Person },
    { id: 'ocorrencias',label: 'Ocorrências', count: neo4jStats.Occurrence },
    { id: 'fotos',      label: 'Fotos',       count: neo4jStats.Photo },
    { id: 'veiculos',   label: 'Veículos',    count: neo4jStats.Vehicle },
    { id: 'vinculos',   label: 'Vínculos',    count: neo4jStats.total_relationships },
    { id: 'merge',      label: '⚠ Merge',     count: undefined },
    { id: 'operacoes',  label: 'Operações',   count: supaStats.investigations },
  ];

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1}, ${IL.bg0})`, color: IL.ink }}>
      <ILHeader active="central" />
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 32px 64px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Central de Inteligência</h1>
          <div style={{ fontSize: 12, color: IL.ink2, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {(neo4jStats.Person ?? 0).toLocaleString('pt-BR')} pessoas · {(neo4jStats.Occurrence ?? 0).toLocaleString('pt-BR')} ocorrências · {(neo4jStats.Photo ?? 0).toLocaleString('pt-BR')} fotos · {(neo4jStats.total_relationships ?? 0).toLocaleString('pt-BR')} vínculos
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${IL.border}`, marginBottom: 24, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTabNav(t.id)} style={{
              padding: '10px 14px', background: 'transparent', border: 'none', whiteSpace: 'nowrap',
              color: tab === t.id ? IL.cyan : IL.ink2, fontSize: 13,
              borderBottom: `2px solid ${tab === t.id ? IL.cyan : 'transparent'}`,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.label}
              {t.count != null && <span style={{ color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 10 }}>{t.count.toLocaleString('pt-BR')}</span>}
            </button>
          ))}
        </div>

        {tab === 'pessoas'     && <PessoasTab />}
        {tab === 'ocorrencias' && <OcorrenciasTab />}
        {tab === 'fotos'       && <FotosTab />}
        {tab === 'veiculos'    && <VeiculosTab />}
        {tab === 'vinculos'    && <VinculosTab />}
        {tab === 'merge'       && <MergeTab />}
        {tab === 'operacoes' && (
          <ILCard hover={false} style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: IL.ink2, marginBottom: 12 }}>Ver operações na lista principal.</div>
            <Link href="/" style={{ padding: '8px 16px', background: IL.cyan, color: IL.bg1, borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 600, display: 'inline-block' }}>← Ir para Início</Link>
          </ILCard>
        )}
      </main>
      <GlobalSearch />
    </div>
  );
}

export default function CentralPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: IL.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: IL.cyan, fontFamily: 'monospace' }}>Carregando…</div>
      </div>
    }>
      <CentralContent />
    </Suspense>
  );
}
