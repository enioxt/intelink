'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IL } from '@/lib/design/tokens';
import { ConfBadge } from './ConfBadge';
import { ILTag } from './ILTag';
import type { ConfidenceKind } from '@/lib/design/tokens';

interface SearchResult {
  type: 'PERSON' | 'VEHICLE' | 'OCCURRENCE' | 'PHOTO' | 'DOCUMENT';
  id: string;
  label: string;
  detail: string;
  source: string;
  confidence: ConfidenceKind;
  ops?: number;
  href: string;
}

const TYPE_LABEL: Record<string, string> = {
  PERSON: 'Pessoa', VEHICLE: 'Veículo',
  OCCURRENCE: 'Ocorrência', PHOTO: 'Foto', DOCUMENT: 'Documento',
};

// HighlightMatch: renders text with exact match highlighted in cyan,
// non-matching suffix dimmed. Visual feedback as user types.
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) {
    // No match — dim the whole label (suggestion-only result)
    return (
      <span>
        <span style={{ opacity: 0.55 }}>{text}</span>
      </span>
    );
  }
  const pre = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const post = text.slice(idx + query.length);
  return (
    <span>
      <span style={{ color: IL.ink2 }}>{pre}</span>
      <span style={{ color: IL.cyan, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: IL.cyan + '60' }}>{match}</span>
      <span style={{ color: IL.ink2, opacity: 0.7 }}>{post}</span>
    </span>
  );
}

const TYPE_COLOR: Record<string, string> = {
  PERSON: IL.cyan, VEHICLE: IL.amber,
  OCCURRENCE: IL.red, PHOTO: IL.purple, DOCUMENT: IL.blue,
};

async function fetchSearch(q: string): Promise<SearchResult[]> {
  if (q.length < 2) return [];
  const res = await fetch(`/api/neo4j/search?q=${encodeURIComponent(q)}&limit=15`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: Record<string, unknown>) => ({
    type: (r.type as string)?.toUpperCase() ?? 'PERSON',
    id: r.id as string,
    label: r.label as string ?? r.name as string ?? '',
    detail: r.detail as string ?? '',
    source: r.source as string ?? '',
    confidence: (r.confidence as ConfidenceKind) ?? 'unconfirmed',
    ops: r.ops as number,
    href: r.href as string ?? `/pessoa/${r.id}`,
  }));
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Register global opener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__ilOpenSearch = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    const res = await fetchSearch(query);
    setResults(res);
    setSelected(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q, search]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  }, [router]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected].href);
  };

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh', zIndex: 200, backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 92vw)', background: IL.bg1,
          border: `1px solid ${IL.border}`, borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${IL.border}` }}>
          <span style={{ color: IL.ink2, fontSize: 18 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar pessoas, CPFs, placas, telefones, ocorrências..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: IL.ink, fontSize: 16, fontFamily: 'var(--font-inter)',
            }}
          />
          {loading && <span style={{ fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)' }}>…</span>}
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', background: IL.bg2, border: `1px solid ${IL.border}`, borderRadius: 3, color: IL.ink2 }}>esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {q.length > 0 && results.length === 0 && !loading && (
            <div style={{ padding: 24, color: IL.dim, fontSize: 13, textAlign: 'center' }}>
              Nenhum resultado para &quot;{q}&quot;.
            </div>
          )}
          {q.length === 0 && (
            <div style={{ padding: '16px 18px', fontSize: 12, color: IL.ink2 }}>
              Digite para buscar — nome, CPF, placa, nº REDS, telefone...
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => navigate(r.href)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 18px', borderBottom: `1px solid ${IL.border}`,
                cursor: 'pointer',
                background: i === selected ? 'rgba(6,182,212,0.08)' : 'transparent',
              }}
              onMouseEnter={(e) => { setSelected(i); (e.currentTarget as HTMLDivElement).style.background = 'rgba(6,182,212,0.08)'; }}
              onMouseLeave={(e) => { if (i !== selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: TYPE_COLOR[r.type] ?? IL.ink2, textTransform: 'uppercase', letterSpacing: '0.1em', minWidth: 72 }}>
                {TYPE_LABEL[r.type] ?? r.type}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <HighlightMatch text={r.label} query={q} />
                </div>
                <div style={{ color: IL.dim, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detail}</div>
              </div>
              <ConfBadge kind={r.confidence} />
              {r.ops && <ILTag color={IL.cyan}>{r.ops} ops</ILTag>}
              <span style={{ color: IL.dim, fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0 }}>{r.source}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 16, padding: '10px 18px', fontSize: 11, color: IL.dim, fontFamily: 'var(--font-mono)', background: IL.bg0 }}>
          <span>↑↓ navegar</span><span>↵ abrir</span><span>esc fechar</span>
        </div>
      </div>
    </div>
  );
}
