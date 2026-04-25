'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IL } from '@/lib/design/tokens';
import { ILCard } from '@/components/il/ILCard';
import { ILTag } from '@/components/il/ILTag';
import { ConfBadge } from '@/components/il/ConfBadge';
import { ILHeader } from '@/components/il/ILHeader';
import { GlobalSearch } from '@/components/il/GlobalSearch';
import type { ConfidenceKind } from '@/lib/design/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Person {
  id: string; name: string; cpf?: string; mae?: string; bairro?: string; municipio?: string;
  ops?: number; vinculos?: number; score?: number; sources?: string[]; conf?: ConfidenceKind;
  source?: string;
}
interface Occurrence { reds_number?: string; tipo?: string; data_fato?: string; municipio?: string; bairro?: string; }
interface Photo { id: string; filename?: string; caption?: string; date?: string; source?: string; linked?: boolean; person?: string; }
interface Neo4jStats { Person?: number; Occurrence?: number; Photo?: number; Vehicle?: number; total_relationships?: number; }

// ─── Subcomponents ────────────────────────────────────────────────────────────

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

function PessoasTab() {
  const [pessoas, setPessoas] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/entities?limit=100', { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setPessoas((d.entities ?? []).map((e: Record<string, unknown>) => ({
            id: e.id as string, name: e.name as string ?? '',
            cpf: (e.metadata as Record<string, unknown>)?.cpf as string,
            ops: 0, vinculos: 0,
            conf: 'unconfirmed' as ConfidenceKind,
            source: e.type as string,
          })));
        }
      } catch { /* show empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = pessoas.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || (p.cpf ?? '').includes(search));

  return (
    <ILCard hover={false} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: `1px solid ${IL.border}`, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CPF, mãe, bairro..." style={{ flex: 1, minWidth: 200, padding: '8px 12px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 6, color: IL.ink, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <FilterChip label="Tem CPF" />
        <FilterChip label="Em operação" />
        <FilterChip label="Score alto" />
        <FilterChip label="Com foto" />
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: IL.dim, fontSize: 13, fontFamily: 'var(--font-mono)' }}>Carregando…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: IL.bg2 }}>
              {['', 'Nome', 'CPF', 'Mãe', 'Bairro', 'Ops', 'Vínc.', 'Fontes', 'Conf.'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: IL.ink2, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${IL.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => window.location.href = `/pessoa/${p.id}`} style={{ cursor: 'pointer', borderBottom: `1px solid ${IL.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: IL.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', color: IL.cyan }}>
                    {p.name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? '?'}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: IL.ink, fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '10px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.cpf ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: IL.ink2, fontSize: 12 }}>{p.mae ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: IL.ink2, fontSize: 12 }}>{p.bairro ?? '—'}</td>
                <td style={{ padding: '10px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{p.ops ?? 0}</td>
                <td style={{ padding: '10px 12px', color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{p.vinculos ?? 0}</td>
                <td style={{ padding: '10px 12px' }}>
                  {p.source && <ILTag>{p.source}</ILTag>}
                </td>
                <td style={{ padding: '10px 12px' }}><ConfBadge kind={p.conf ?? 'unconfirmed'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ padding: 12, fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)', borderTop: `1px solid ${IL.border}` }}>
        {filtered.length} de {pessoas.length} · Grafo Neo4j: 16.140 pessoas
      </div>
    </ILCard>
  );
}

function FotosTab() {
  const [fotos, setFotos] = useState<Photo[]>([]);
  const [filterUnlinked, setFilterUnlinked] = useState(false);
  const [photoModal, setPhotoModal] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    // Photos are in Neo4j, not Supabase — load via neo4j endpoint
    // For now show placeholder state
    setFotos([]);
  }, []);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <FilterChip label="Todas" active={!filterUnlinked} onClick={() => setFilterUnlinked(false)} />
        <FilterChip label="Não vinculadas" active={filterUnlinked} onClick={() => setFilterUnlinked(true)} />
        <FilterChip label="Telegram" />
        <FilterChip label="REDS" />
        <FilterChip label="Manual" />
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 13 }}>Carregando…</div>
      ) : fotos.length === 0 ? (
        <ILCard hover={false} style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: IL.ink2, marginBottom: 8 }}>2.718 fotos no grafo Neo4j</div>
          <div style={{ fontSize: 12, color: IL.dim, marginBottom: 16 }}>Endpoint de listagem de fotos em desenvolvimento.</div>
          <Link href="/busca-reds" style={{ color: IL.cyan, fontSize: 13, textDecoration: 'none' }}>Buscar pessoas com fotos via REDS →</Link>
        </ILCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {fotos.map(ph => (
            <div key={ph.id} onClick={() => setPhotoModal(ph)} style={{ aspectRatio: '1', cursor: 'pointer', borderRadius: 10, overflow: 'hidden', border: `1px solid ${IL.border}`, background: '#152030', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${ph.id}/file`} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.1'; }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,6,23,0.85), transparent 50%)', padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {ph.person && <div style={{ fontSize: 11, color: IL.ink, fontWeight: 500 }}>{ph.person}</div>}
                <div style={{ fontSize: 9, color: IL.ink2, fontFamily: 'var(--font-mono)' }}>{ph.source}</div>
                {!ph.linked && <ILTag color={IL.amber}>sem vínculo</ILTag>}
              </div>
            </div>
          ))}
        </div>
      )}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 90vw)', background: IL.bg1, border: `1px solid ${IL.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ aspectRatio: '4/3', background: '#152030' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${photoModal.id}/file`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: IL.ink2, marginBottom: 8 }}>{photoModal.caption ?? '—'}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
                <span>Fonte: {photoModal.source ?? '—'}</span>
                <span>Data: {photoModal.date ?? '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`/api/photos/${photoModal.id}/file`} download style={{ padding: '6px 12px', background: IL.cyan, color: IL.bg1, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Download</a>
                <button onClick={() => setPhotoModal(null)} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${IL.border}`, color: IL.ink, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function CentralContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') ?? 'pessoas';
  const [tab, setTab] = useState(initialTab);
  const [neo4jStats, setNeo4jStats] = useState<Neo4jStats>({});
  const [supaStats, setSupaStats] = useState({ investigations: 0, entities: 0, relationships: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/neo4j/stats').then(r => r.json()).catch(() => ({})),
      fetch('/api/stats?scope=central', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([n, s]) => { setNeo4jStats(n.nodes ?? {}); setSupaStats(s); });
  }, []);

  const setTabNav = useCallback((t: string) => {
    setTab(t);
    router.replace(`/central?tab=${t}`, { scroll: false });
  }, [router]);

  const TABS = [
    { id: 'pessoas', label: 'Pessoas', count: neo4jStats.Person },
    { id: 'ocorrencias', label: 'Ocorrências', count: neo4jStats.Occurrence },
    { id: 'fotos', label: 'Fotos', count: neo4jStats.Photo },
    { id: 'veiculos', label: 'Veículos', count: neo4jStats.Vehicle },
    { id: 'operacoes', label: 'Operações', count: supaStats.investigations },
    { id: 'vinculos', label: 'Vínculos', count: neo4jStats.total_relationships },
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

        {/* Tabs */}
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

        {tab === 'pessoas' && <PessoasTab />}
        {tab === 'fotos' && <FotosTab />}
        {(tab === 'ocorrencias' || tab === 'veiculos' || tab === 'operacoes' || tab === 'vinculos') && (
          <ILCard hover={false} style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: IL.ink2, marginBottom: 12 }}>Aba <strong style={{ color: IL.ink }}>{TABS.find(t => t.id === tab)?.label}</strong> em desenvolvimento.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/busca-reds`} style={{ padding: '8px 16px', background: IL.bg2, border: `1px solid ${IL.border}`, color: IL.cyan, borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>Busca REDS →</Link>
              <Link href={`/chat?q=${encodeURIComponent('Analise os ' + TABS.find(t => t.id === tab)?.label?.toLowerCase() + ' do sistema')}`} style={{ padding: '8px 16px', background: IL.bg2, border: `1px solid ${IL.border}`, color: IL.ink2, borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>Perguntar ao Chat IA →</Link>
            </div>
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
