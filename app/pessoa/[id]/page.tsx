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

interface Photo { id: string; filename?: string; caption?: string; date?: string; source?: string; }
interface NearLink { name: string; relation: string; evidence?: string; strength?: 'strong' | 'medium' | 'weak'; href?: string; }
interface PersonData {
  id: string; name: string; cpf?: string; rg?: string; mae?: string;
  nasc?: string; municipio?: string; bairro?: string;
  source?: string; centrality?: number; hub_in_ops?: number;
  photos?: Photo[]; near_links?: NearLink[];
  counts?: { ocorrencias: number; documentos: number; vinculos: number; operacoes: number; };
}

function strengthColor(s?: 'strong' | 'medium' | 'weak') {
  return s === 'strong' ? IL.cyan : s === 'medium' ? IL.amber : IL.dim;
}

function PhotoModal({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 90vw)', background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ aspectRatio: '4/3', background: '#152030', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/photos/${photo.id}/file`} alt={photo.caption ?? ''} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }} />
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: IL.ink2, marginBottom: 12 }}>{photo.caption ?? '—'}</div>
          <div style={{ display: 'flex', gap: 20, fontSize: 12, color: IL.ink2, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
            <span>Data: {photo.date ?? '—'}</span>
            <span>Fonte: {photo.source ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`/api/photos/${photo.id}/file`} download={photo.filename ?? photo.id} style={{ padding: '7px 14px', background: IL.cyan, color: IL.bg1, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Download</a>
            <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PessoaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [person, setPerson] = useState<PersonData | null>(null);
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
          setPerson({ id, name: `Pessoa ${id}`, counts: { ocorrencias: 0, documentos: 0, vinculos: 0, operacoes: 0 } });
        }
      } catch {
        setPerson({ id, name: `Pessoa ${id}`, counts: { ocorrencias: 0, documentos: 0, vinculos: 0, operacoes: 0 } });
      } finally {
        setLoading(false);
      }
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
  const conf: ConfidenceKind = p.source === 'REDS_ETL' ? 'reds' : p.source === 'PDF_INGEST' ? 'probable' : 'unconfirmed';

  const TABS = [
    { id: 'resumo', label: 'Resumo' },
    { id: 'ocorrencias', label: `Ocorrências (${p.counts?.ocorrencias ?? 0})` },
    { id: 'vinculos', label: `Vínculos (${p.counts?.vinculos ?? 0})` },
    { id: 'docs', label: `Documentos (${p.counts?.documentos ?? 0})` },
    { id: 'hist', label: 'Histórico' },
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
              {p.municipio && <span>{p.municipio}</span>}
              {p.bairro && <span>{p.bairro}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button style={{ padding: '8px 14px', background: IL.cyan, color: IL.bg1, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Adicionar a operação</button>
              <button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
              <button style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Exportar perfil</button>
              <Link href={`/chat?q=${encodeURIComponent('Me fale sobre ' + p.name)}`} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink2, borderRadius: 8, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>Chat IA</Link>
            </div>
          </div>
        </div>

        {/* Photos */}
        {p.photos && p.photos.length > 0 && (
          <ILCard hover={false} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: IL.ink2, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Fotos ({p.photos.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {p.photos.slice(0, 8).map(ph => (
                <div key={ph.id} onClick={() => setPhotoModal(ph)} style={{ aspectRatio: '1', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${IL.border}`, background: '#152030', position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${ph.id}/file`} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.1'; }} />
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
              {([['Nome', p.name, conf], ['CPF', p.cpf ?? '—', 'reds'], ['RG', p.rg ?? '—', 'confirmed'], ['Mãe', p.mae ?? '—', 'probable'], ['Nascimento', p.nasc ?? '—', 'reds'], ['Município', p.municipio ?? '—', 'reds'], ['Bairro', p.bairro ?? '—', 'unconfirmed']] as [string, string, ConfidenceKind][]).map(([l, v, c]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${IL.border}`, fontSize: 13 }}>
                  <span style={{ color: IL.ink2 }}>{l}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: IL.ink, fontFamily: (l === 'CPF' || l === 'RG') ? 'var(--font-mono)' : 'inherit' }}>{v}</span>
                    <ConfBadge kind={c} />
                  </div>
                </div>
              ))}
            </ILCard>

            <ILCard hover={false}>
              <div style={{ fontSize: 11, color: IL.amber, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Análise</div>
              {p.centrality != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${IL.border}` }}>
                  <span style={{ color: IL.ink2, fontSize: 13 }}>Centralidade</span>
                  <span style={{ color: IL.amber, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.centrality.toFixed(2)}</span>
                </div>
              )}
              {p.hub_in_ops != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${IL.border}` }}>
                  <span style={{ color: IL.ink2, fontSize: 13 }}>Hub em</span>
                  <span style={{ color: IL.ink, fontWeight: 600 }}>{p.hub_in_ops} operações</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${IL.border}` }}>
                <span style={{ color: IL.ink2, fontSize: 13 }}>Fonte</span>
                <ILTag color={CONF[conf].color}>{CONF[conf].label}</ILTag>
              </div>
              <div style={{ marginTop: 14 }}>
                <Link href={`/chat?q=${encodeURIComponent('/analisar ' + p.name)}`} style={{ display: 'block', padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 8, color: IL.cyan, fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>
                  Analisar no Chat IA
                </Link>
              </div>
            </ILCard>

            {p.near_links && p.near_links.length > 0 && (
              <ILCard hover={false} style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: IL.cyan, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Vínculos próximos</div>
                {p.near_links.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i > 0 ? `1px solid ${IL.border}` : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: strengthColor(l.strength), flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: IL.ink, fontWeight: 500, minWidth: 200 }}>{l.name}</span>
                    <ILTag color={IL.cyan}>{l.relation}</ILTag>
                    {l.evidence && <span style={{ color: IL.ink2, fontSize: 12, fontStyle: 'italic', flex: 1 }}>{l.evidence}</span>}
                    {l.href && <Link href={l.href} style={{ fontSize: 11, color: IL.cyan, textDecoration: 'none' }}>abrir →</Link>}
                  </div>
                ))}
              </ILCard>
            )}
          </div>
        )}

        {tab !== 'resumo' && (
          <ILCard hover={false} style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: IL.ink2, marginBottom: 12 }}>Em desenvolvimento.</div>
            <Link href={`/chat?q=${encodeURIComponent('Me mostre ' + tab + ' de ' + p.name)}`} style={{ color: IL.cyan, fontSize: 13, textDecoration: 'none' }}>Perguntar ao Chat IA →</Link>
          </ILCard>
        )}
      </main>

      {photoModal && <PhotoModal photo={photoModal} onClose={() => setPhotoModal(null)} />}
      <GlobalSearch />
    </div>
  );
}
