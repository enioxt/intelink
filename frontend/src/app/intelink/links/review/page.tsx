'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, X, Loader2, Filter, RefreshCw } from 'lucide-react';

interface LinkItem {
  id: string;
  type: string;
  label?: string;
  confidence?: number;
  needs_confirmation?: boolean;
  leaderboard_score?: number;
  source?: string;
  target?: string;
  doc_a?: string;
  doc_b?: string;
  entity_a?: string;
  entity_b?: string;
}

export default function ReviewLinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [types, setTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minConf, setMinConf] = useState<number>(0.5);
  const [onlyNeedsConfirm, setOnlyNeedsConfirm] = useState<boolean>(true);

  const fetchContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/intelink/chat/context');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ls = (data.links || []) as LinkItem[];
      setLinks(ls);
      const t = Array.from(new Set(ls.map((l) => l.type).filter(Boolean))).sort();
      setTypes(t);
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  const filtered = useMemo(() => {
    return links.filter((l) => {
      const conf = l.confidence ?? 0;
      const passType = selectedTypes.length === 0 || selectedTypes.includes(l.type);
      const passConf = conf >= minConf;
      const passConfirm = !onlyNeedsConfirm || !!l.needs_confirmation;
      return passType && passConf && passConfirm;
    });
  }, [links, selectedTypes, minConf, onlyNeedsConfirm]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const act = async (link: LinkItem, action: 'confirm' | 'refute' | 'skip') => {
    try {
      const res = await fetch('/api/intelink/links/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_id: link.id,
          action,
          score: link.leaderboard_score ?? 1,
          notes: `${link.type} conf=${link.confidence ?? 0}`,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
    } catch (e) {
      console.warn('confirm/refute failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revisão de Vínculos</h1>
            <p className="text-gray-600 dark:text-gray-400">Confirme vínculos e ganhe pontos no leaderboard.</p>
          </div>
          <button onClick={fetchContext} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="md:col-span-1">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtros
              </h3>
              <div className="mb-4">
                <label className="text-sm text-gray-700 dark:text-gray-300">Confiança mínima: {Math.round(minConf * 100)}%</label>
                <input type="range" min={0} max={1} step={0.05} value={minConf} onChange={(e) => setMinConf(parseFloat(e.target.value))} className="w-full" />
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={onlyNeedsConfirm} onChange={(e) => setOnlyNeedsConfirm(e.target.checked)} /> Apenas pendentes
                </label>
              </div>
              <div className="max-h-44 overflow-auto space-y-1 pr-1">
                {types.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggleType(t)} />
                    <span className="truncate">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="md:col-span-3">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
              ) : error ? (
                <div className="text-red-600 text-sm">Erro: {error}</div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-600 dark:text-gray-400 text-sm">Nenhum vínculo para revisar com os filtros atuais.</div>
              ) : (
                <div className="space-y-3" data-testid="review-queue">
                  {filtered.slice(0, 100).map((l) => (
                    <div key={l.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" data-testid="review-item">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">{l.type}</div>
                          <div className="text-xs text-gray-500">Confiança: {Math.round((l.confidence || 0) * 100)}%</div>
                          {l.label && <div className="text-xs text-gray-500">{l.label}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => act(l, 'refute')} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1" data-testid="review-reject-btn">
                            <X className="w-4 h-4" /> Recusar
                          </button>
                          <button onClick={() => act(l, 'confirm')} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1" data-testid="review-confirm-btn">
                            <Check className="w-4 h-4" /> Confirmar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
