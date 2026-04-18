'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, User, FileSearch, Loader2, MapPin, Hash,
    AlertCircle, ChevronRight, Shield
} from 'lucide-react';
import Link from 'next/link';

interface Occurrence {
    reds: unknown;
    type: unknown;
    data: unknown;
    bairro: unknown;
}

interface SearchResult {
    id: string;
    name: string;
    cpf: string;
    bairro: string;
    cidade: string;
    delegacia: string;
    source: unknown;
    occurrence_count: number;
    occurrences: Occurrence[];
}

function formatDate(d: unknown) {
    if (!d) return '';
    try { return new Date(String(d)).toLocaleDateString('pt-BR'); } catch { return String(d); }
}

function BuscaContent() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSearch = useCallback(async (q: string) => {
        if (q.length < 2) return;
        setLoading(true);
        setError('');
        setSearched(true);
        try {
            const res = await fetch(`/api/neo4j/search?q=${encodeURIComponent(q)}&limit=30`);
            const data = await res.json();
            if (data.error) setError(data.error);
            else setResults(data.results ?? []);
        } catch {
            setError('Erro ao buscar. Verifique a conexão com o Neo4j.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800/60 border-b border-slate-700 px-6 py-5">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                            <Shield className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Busca REDS</h1>
                            <p className="text-xs text-slate-400">Pesquisa no grafo local — pessoas e ocorrências</p>
                        </div>
                    </div>

                    {/* Search form */}
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Nome, CPF (11 dígitos), ou parte do nome..."
                                autoFocus
                                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || query.length < 2}
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Buscar
                        </button>
                    </form>

                    {/* Quick filters */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                        <span className="text-xs text-slate-500">Exemplos:</span>
                        {['João Silva', 'Maria', '123.456'].map(ex => (
                            <button
                                key={ex}
                                onClick={() => { setQuery(ex); handleSearch(ex); }}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="max-w-4xl mx-auto px-6 py-6">
                {error && (
                    <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-16">
                        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Consultando Neo4j...</p>
                    </div>
                )}

                {!loading && searched && results.length === 0 && !error && (
                    <div className="text-center py-16">
                        <FileSearch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Nenhum resultado para <span className="text-white">"{query}"</span></p>
                        <p className="text-slate-500 text-sm mt-2">Tente com menos palavras ou verifique o CPF</p>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <>
                        <p className="text-sm text-slate-400 mb-4">
                            <span className="text-white font-medium">{results.length}</span> pessoa{results.length !== 1 ? 's' : ''} encontrada{results.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-3">
                            {results.map(r => (
                                <Link
                                    key={r.id}
                                    href={`/pessoa/${encodeURIComponent(r.id)}`}
                                    className="flex items-start gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20 shrink-0 mt-0.5">
                                        <User className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className="text-sm font-semibold text-white truncate">{r.name || 'Sem nome'}</p>
                                            {r.occurrence_count > 0 && (
                                                <span className="px-1.5 py-0.5 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded shrink-0">
                                                    {r.occurrence_count} ocorrência{r.occurrence_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {r.cpf && (
                                            <p className="text-xs font-mono text-slate-400 mb-1">
                                                <Hash className="w-3 h-3 inline mr-0.5" />{r.cpf}
                                            </p>
                                        )}
                                        {(r.bairro || r.cidade) && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                                                <MapPin className="w-3 h-3" />
                                                {[r.bairro, r.cidade].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {/* Preview de ocorrências */}
                                        {r.occurrences.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {r.occurrences.slice(0, 3).map((o, i) => (
                                                    <span key={i} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                                                        {o.type ? String(o.type).split(' ').slice(0, 3).join(' ') : 'Ocorrência'}
                                                        {o.data ? ` · ${formatDate(o.data)}` : ''}
                                                    </span>
                                                ))}
                                                {r.occurrence_count > 3 && (
                                                    <span className="text-xs text-slate-500 px-2 py-0.5">
                                                        +{r.occurrence_count - 3} mais
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors mt-1 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                {/* Initial state */}
                {!searched && !loading && (
                    <div className="text-center py-20">
                        <Search className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg font-medium mb-2">Busca no grafo local</p>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">
                            Pesquise por nome ou CPF para encontrar pessoas e suas ocorrências REDS vinculadas
                        </p>
                        <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
                            {[
                                { icon: User, label: 'Pessoas', value: '12.730' },
                                { icon: FileSearch, label: 'Ocorrências', value: '2.092' },
                                { icon: Shield, label: 'Vínculos', value: '11.853' },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                                    <Icon className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                                    <p className="text-lg font-bold text-white">{value}</p>
                                    <p className="text-xs text-slate-500">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BuscaRedsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <BuscaContent />
        </Suspense>
    );
}
