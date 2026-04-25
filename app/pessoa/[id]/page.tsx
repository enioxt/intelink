'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { IL, CONF } from '@/lib/design/tokens';
import { ILCard } from '@/components/il/ILCard';
import { ILTag } from '@/components/il/ILTag';
import { ConfBadge } from '@/components/il/ConfBadge';
import { ILHeader } from '@/components/il/ILHeader';
import { GlobalSearch } from '@/components/il/GlobalSearch';
import type { ConfidenceKind } from '@/lib/design/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Photo { id: string; filename?: string; caption?: string; date?: string; source?: string; }
interface CoInvolved { id: string; name: string; cpf?: string; shared_occurrences: number; }
interface Occurrence { id: string; reds_number?: string | null; type?: string | null; data_fato?: string | null; bairro?: string | null; rel_type?: string; }
interface PersonData {
  id: string; name: string; cpf?: string; rg?: string; mae?: string;
  nasc?: string; municipio?: string; bairro?: string; cidade?: string; telefone?: string;
  source?: string; centrality?: number; hub_in_ops?: number; labels?: string[];
  photos?: Photo[];
  co_involved?: CoInvolved[];
  occurrences?: Occurrence[];
  stats?: { total_occurrences: number; as_suspect: number; as_victim: number; co_involved_count: number; };
}

function sourceConf(source?: string): ConfidenceKind {
  if (!source) return 'unconfirmed';
  if (source.includes('REDS')) return 'reds';
  if (source.includes('PDF') || source.includes('dhpp')) return 'probable';
  return 'unconfirmed';
}

// ─── Photo Modal ──────────────────────────────────────────────────────────────
function PhotoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(640px, 90vw)', background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ aspectRatio: '4/3', background: '#152030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${encodeURIComponent(photo.filename ?? photo.id)}/file`} alt={photo.caption ?? ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }} />
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: IL.ink2, marginBottom: 10 }}>{photo.caption ?? '—'}</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
            <span>Data: {photo.date ?? '—'}</span>
            <span>Fonte: {photo.source ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/api/photos/${encodeURIComponent(photo.filename ?? photo.id)}/file`} download={photo.filename ?? photo.id} style={{ padding: '7px 14px', background: IL.cyan, color: IL.bg1, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Download</a>
            <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs content ─────────────────────────────────────────────────────────────
function OcorrenciasTab({ ocorrencias, stats }: { ocorrencias?: Occurrence[]; stats?: PersonData['stats'] }) {
  const TIPO_COLOR: Record<string, string> = { HOMICIDIO: IL.red, PORTE_ARMA: IL.amber, POSSE_ARMA: IL.amber, TRAFICO: IL.purple };
  if (!ocorrencias || ocorrencias.length === 0) {
    return <ILCard hover={false} style={{ padding: 48, textAlign: 'center' }}><div style={{ color: IL.dim, fontSize: 13 }}>Nenhuma ocorrência vinculada.</div></ILCard>;
  }
  return (
    <div>
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[['Total', stats.total_occurrences, IL.ink], ['Suspeito', stats.as_suspect, IL.amber], ['Vítima', stats.as_victim, IL.red], ['Co-envolvidos', stats.co_involved_count, IL.cyan]].map(([label, val, color]) => (
            <ILCard key={String(label)} hover={false} style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: color as string, fontFamily: 'var(--font-mono)' }}>{val}</div>
              <div style={{ fontSize: 11, color: IL.ink2, marginTop: 4 }}>{label}</div>
            </ILCard>
          ))}
        </div>
      )}
      <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: IL.bg2 }}>
            {['REDS', 'Tipo', 'Data', 'Bairro', 'Papel'].map(h => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {ocorrencias.map(o => (
              <tr key={o.id} style={{ borderBottom: `1px solid ${IL.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.reds_number ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>{o.type && <ILTag color={TIPO_COLOR[o.type] ?? IL.ink2}>{o.type}</ILTag>}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{o.data_fato ?? '—'}</td>
                <td style={{ padding: '8px 12px', color: IL.ink2, fontSize: 12 }}>{o.bairro ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  {o.rel_type === 'VICTIM_IN' && <ILTag color={IL.red}>Vítima</ILTag>}
                  {o.rel_type === 'ENVOLVIDO_EM' && <ILTag color={IL.amber}>Suspeito</ILTag>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ILCard>
    </div>
  );
}

function VinculosTab({ coInvolved }: { coInvolved?: CoInvolved[] }) {
  if (!coInvolved || coInvolved.length === 0) {
    return <ILCard hover={false} style={{ padding: 48, textAlign: 'center' }}><div style={{ color: IL.dim, fontSize: 13 }}>Nenhum co-envolvido encontrado.</div></ILCard>;
  }
  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: IL.bg2 }}>
          {['Nome', 'CPF', 'Ocorrências em comum', ''].map(h => (
            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}` }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {coInvolved.map(c => (
            <tr key={c.id} onClick={() => window.location.href = `/pessoa/${encodeURIComponent(c.id)}`}
              style={{ cursor: 'pointer', borderBottom: `1px solid ${IL.border}` }}
              onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
              <td style={{ padding: '10px 12px', color: IL.ink, fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: '10px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.cpf ?? '—'}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: c.shared_occurrences > 2 ? IL.amber : IL.ink2 }}>{c.shared_occurrences}</span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 11, color: IL.cyan }}>ver →</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ILCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js may pass the path segment still URL-encoded; always decode once.
  const rawId = use(params).id;
  const id = decodeURIComponent(rawId);
  const [person, setPerson] = useState<PersonData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [tab, setTab] = useState('resumo');
  const [photoModal, setPhotoModal] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/neo4j/pessoa?id=${encodeURIComponent(id)}`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setPerson(d.person ?? d);
        } else {
          setPerson({ id, name: 'Não identificado' });
        }
      } catch {
        setPerson({ id, name: 'Não identificado' });
      } finally {
        setLoading(false);
      }

      // Load photos from Neo4j graph
      try {
        const pRes = await fetch(`/api/neo4j/fotos?person_id=${encodeURIComponent(id)}&limit=20`);
        if (pRes.ok) {
          const pd = await pRes.json();
          setPhotos((pd.fotos ?? []).map((f: Record<string, unknown>) => ({
            id: String(f.id ?? ''),
            filename: f.filename ? String(f.filename) : null,
            caption: f.caption ? String(f.caption) : null,
            date: null,
            source: f.source ? String(f.source) : null,
          })));
        }
      } catch { /* non-fatal */ }
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: IL.cyan, fontFamily: 'var(--font-mono)', fontSize: 13 }}>Carregando…</div>
    </div>
  );

  const p = person!;
  const initials = p.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'IL';
  const conf = sourceConf(p.source);
  const allPhotos = photos.length > 0 ? photos : (p.photos ?? []);
  const occurrences = p.occurrences ?? [];
  const coInvolved = p.co_involved ?? [];

  const TABS = [
    { id: 'resumo',     label: 'Resumo' },
    { id: 'ocorrencias',label: `Ocorrências (${p.stats?.total_occurrences ?? occurrences.length})` },
    { id: 'vinculos',   label: `Vínculos (${p.stats?.co_involved_count ?? coInvolved.length})` },
    { id: 'fotos',      label: `Fotos (${allPhotos.length})` },
    { id: 'chat',       label: 'Chat IA' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${IL.bg0}, ${IL.bg1}, ${IL.bg0})`, color: IL.ink }}>
      <ILHeader />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 64px' }}>
        <Link href="/central?tab=pessoas" style={{ fontSize: 12, color: IL.ink2, textDecoration: 'none' }}>← Central / Pessoas</Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginTop: 16, marginBottom: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 12, flexShrink: 0, background: '#152030', border: `2px solid ${IL.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: IL.amber, fontFamily: 'var(--font-mono)' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{p.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: IL.ink2 }}>
              {p.cpf && <span style={{ fontFamily: 'var(--font-mono)' }}>CPF {p.cpf} <ConfBadge kind="reds" /></span>}
              {p.rg && <span style={{ fontFamily: 'var(--font-mono)' }}>RG {p.rg}</span>}
              {p.nasc && <span>Nasc {p.nasc}</span>}
              {(p.municipio ?? p.cidade) && <span>{p.municipio ?? p.cidade}</span>}
              {p.bairro && <span>{p.bairro}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button style={{ padding: '8px 14px', background: IL.cyan, color: IL.bg1, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Adicionar a operação</button>
              <button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
              <button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => { navigator.clipboard?.writeText(`/api/neo4j/pessoa?id=${encodeURIComponent(id)}`); }}>
                Copiar ID
              </button>
              <Link href={`/chat?q=${encodeURIComponent('Me fale tudo sobre ' + p.name + (p.cpf ? ' CPF ' + p.cpf : ''))}`} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink2, borderRadius: 8, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>Chat IA →</Link>
              <Link href={`/graph/${encodeURIComponent(id)}`} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink2, borderRadius: 8, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>Grafo →</Link>
            </div>
          </div>
        </div>

        {/* Fotos strip */}
        {allPhotos.length > 0 && (
          <ILCard hover={false} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fotos ({allPhotos.length})</span>
              {allPhotos.length > 8 && <button onClick={() => setTab('fotos')} style={{ fontSize: 11, color: IL.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas →</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {allPhotos.slice(0, 8).map(ph => (
                <div key={ph.id} onClick={() => setPhotoModal(ph)} style={{ aspectRatio: '1', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${IL.border}`, background: '#152030', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${encodeURIComponent(ph.filename ?? ph.id)}/file`} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.1'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,6,23,0.85), transparent 50%)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 9, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{ph.source ?? ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </ILCard>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${IL.border}`, marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', whiteSpace: 'nowrap', color: tab === t.id ? IL.cyan : IL.ink2, fontSize: 13, borderBottom: `2px solid ${tab === t.id ? IL.cyan : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>{t.label}</button>
          ))}
        </div>

        {tab === 'resumo' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ILCard hover={false}>
              <div style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Identificação</div>
              {([
                ['Nome', p.name, conf],
                ['CPF', p.cpf ?? '—', 'reds'],
                ['RG', p.rg ?? '—', 'confirmed'],
                ['Mãe', p.mae ?? '—', 'probable'],
                ['Nascimento', p.nasc ?? '—', 'reds'],
                ['Município', p.municipio ?? p.cidade ?? '—', 'reds'],
                ['Bairro', p.bairro ?? '—', 'unconfirmed'],
                ['Telefone', p.telefone ?? '—', 'unconfirmed'],
              ] as [string, string, ConfidenceKind][]).map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${IL.border}`, fontSize: 13 }}>
                  <span style={{ color: IL.ink2 }}>{l}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: IL.ink, fontFamily: (l === 'CPF' || l === 'RG' || l === 'Telefone') ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                    {v !== '—' && <ConfBadge kind={c} />}
                  </div>
                </div>
              ))}
              <div style={{ padding: '8px 0', fontSize: 10, color: IL.dim, fontFamily: 'var(--font-mono)' }}>
                ID (Neo4j): {id.slice(0, 40)}…
              </div>
            </ILCard>

            <ILCard hover={false}>
              <div style={{ fontSize: 11, color: IL.amber, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Resumo de atividade</div>
              {[
                ['Ocorrências', String(p.stats?.total_occurrences ?? occurrences.length), IL.ink],
                ['Como suspeito', String(p.stats?.as_suspect ?? 0), IL.amber],
                ['Como vítima', String(p.stats?.as_victim ?? 0), IL.red],
                ['Co-envolvidos', String(p.stats?.co_involved_count ?? coInvolved.length), IL.cyan],
                ['Fotos', String(allPhotos.length), IL.purple],
                ['Fonte', p.source ?? 'Desconhecida', IL.ink2],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${IL.border}` }}>
                  <span style={{ color: IL.ink2, fontSize: 13 }}>{l}</span>
                  <span style={{ color: c as string, fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={`/chat?q=${encodeURIComponent('/analisar ' + p.name)}`} style={{ flex: 1, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 8, color: IL.cyan, fontSize: 12, textAlign: 'center', textDecoration: 'none', display: 'block' }}>Analisar via Chat IA</Link>
                <Link href={`/graph/${encodeURIComponent(id)}`} style={{ flex: 1, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 8, color: IL.ink2, fontSize: 12, textAlign: 'center', textDecoration: 'none', display: 'block' }}>Ver grafo</Link>
              </div>
            </ILCard>

            {coInvolved.length > 0 && (
              <ILCard hover={false} style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: IL.cyan, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Co-envolvidos (ocorrências em comum)</div>
                {coInvolved.slice(0, 5).map((c, i) => (
                  <div key={c.id} onClick={() => window.location.href = `/pessoa/${encodeURIComponent(c.id)}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: i > 0 ? `1px solid ${IL.border}` : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: IL.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: IL.cyan, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                      {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <span style={{ fontSize: 14, color: IL.ink, fontWeight: 500, flex: 1 }}>{c.name}</span>
                    {c.cpf && <span style={{ color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.cpf}</span>}
                    <ILTag color={c.shared_occurrences > 2 ? IL.amber : IL.ink2}>{c.shared_occurrences} ocorrências</ILTag>
                    <span style={{ fontSize: 11, color: IL.cyan }}>ver →</span>
                  </div>
                ))}
                {coInvolved.length > 5 && (
                  <button onClick={() => setTab('vinculos')} style={{ marginTop: 8, fontSize: 12, color: IL.cyan, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>Ver todos {coInvolved.length} co-envolvidos →</button>
                )}
              </ILCard>
            )}
          </div>
        )}

        {tab === 'ocorrencias' && <OcorrenciasTab ocorrencias={occurrences} stats={p.stats} />}
        {tab === 'vinculos' && <VinculosTab coInvolved={coInvolved} />}

        {tab === 'fotos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {allPhotos.map(ph => (
              <div key={ph.id} onClick={() => setPhotoModal(ph)} style={{ aspectRatio: '1', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${IL.border}`, background: '#152030', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${encodeURIComponent(ph.filename ?? ph.id)}/file`} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.1'; }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,6,23,0.85), transparent 50%)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {ph.caption && <div style={{ fontSize: 10, color: IL.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ph.caption}</div>}
                  <div style={{ fontSize: 9, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{ph.source}</div>
                </div>
              </div>
            ))}
            {allPhotos.length === 0 && <ILCard hover={false} style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center' }}><div style={{ color: IL.dim, fontSize: 13 }}>Nenhuma foto vinculada.</div></ILCard>}
          </div>
        )}

        {tab === 'chat' && (
          <ILCard hover={false} style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 15, color: IL.ink, marginBottom: 8 }}>Chat IA sobre {p.name}</div>
            <div style={{ fontSize: 13, color: IL.ink2, marginBottom: 24 }}>Pergunte sobre vínculos, ocorrências, análises.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[`Quem é ${p.name}?`, `Quais crimes envolvem ${p.name}?`, `Quem tem vínculos com ${p.name}?`, `/analisar ${p.name}`].map(q => (
                <Link key={q} href={`/chat?q=${encodeURIComponent(q)}`} style={{ padding: '9px 16px', background: IL.surf, border: `1px solid ${IL.border}`, borderRadius: 999, color: IL.ink, fontSize: 13, textDecoration: 'none' }}>{q}</Link>
              ))}
            </div>
          </ILCard>
        )}
      </main>

      {photoModal && <PhotoModal photo={photoModal} onClose={() => setPhotoModal(null)} />}
      <GlobalSearch />
    </div>
  );
}
