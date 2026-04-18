'use client';

/**
 * DASH-001: /inteligencia/grupos — Painel de Grupos Criminais
 *
 * Visualiza grupos detectados via WCC Union-Find (API /api/intelligence/grupos).
 * Força de rede via react-force-graph-2d (lazy load — browser only).
 */

import { useEffect, useState, useCallback } from 'react';
import { Users, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

// Force graph only runs in browser
const ForceGraph2D = nextDynamic(
    () => import('react-force-graph-2d').then(m => m.default),
    { ssr: false, loading: () => <div className="text-gray-400 text-sm">Carregando grafo...</div> }
);

interface GroupMember { cpf: string; name: string }
interface Group { id: number; size: number; totalWeight: number; members: GroupMember[] }
interface GruposResponse { totalEdges: number; groups: Group[] }

interface GraphNode { id: string; name: string; group: number; val: number }
interface GraphLink { source: string; target: string; weight: number }

function buildGraph(groups: Group[]): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const seen = new Set<string>();

    for (const g of groups) {
        for (const m of g.members) {
            if (!seen.has(m.cpf)) {
                seen.add(m.cpf);
                nodes.push({ id: m.cpf, name: m.name, group: g.id, val: 3 });
            }
        }
        for (let i = 0; i < g.members.length; i++) {
            for (let j = i + 1; j < g.members.length; j++) {
                links.push({ source: g.members[i].cpf, target: g.members[j].cpf, weight: g.totalWeight });
            }
        }
    }
    return { nodes, links };
}

const GROUP_COLORS = [
    '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
    '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f59e0b',
];

export default function GruposPage() {
    const [data, setData]     = useState<GruposResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');
    const [tipo, setTipo]     = useState('');
    const [minWeight, setMinWeight] = useState(2);
    const [view, setView]     = useState<'table' | 'graph'>('table');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ minWeight: String(minWeight) });
            if (tipo) params.set('tipo', tipo);
            const res = await fetch(`/api/intelligence/grupos?${params}`);
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [tipo, minWeight]);

    useEffect(() => { load(); }, [load]);

    const graph = data ? buildGraph(data.groups) : { nodes: [], links: [] };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="text-blue-400" size={28} />
                        <div>
                            <h1 className="text-2xl font-bold">Grupos Criminais</h1>
                            <p className="text-gray-400 text-sm">
                                Clustering por co-ocorrência recorrente (WCC Union-Find)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                        <Filter size={14} className="text-gray-400" />
                        <input
                            value={tipo}
                            onChange={e => setTipo(e.target.value)}
                            placeholder="Tipo de crime (ex: roubo)"
                            className="bg-transparent text-sm outline-none w-40"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                        <span className="text-gray-400 text-sm">Min. co-ocorrências:</span>
                        <input
                            type="number"
                            value={minWeight}
                            onChange={e => setMinWeight(Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-transparent text-sm outline-none w-12"
                            min={1}
                        />
                    </div>
                    <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                        {(['table', 'graph'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1 rounded text-sm ${view === v ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                            >
                                {v === 'table' ? '📋 Lista' : '🕸️ Grafo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats bar */}
                {data && (
                    <div className="flex gap-4 mb-4 text-sm text-gray-400">
                        <span>{data.groups.length} grupos</span>
                        <span>{data.groups.reduce((s, g) => s + g.size, 0)} pessoas</span>
                        <span>{data.totalEdges} elos analisados</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded-lg p-3 mb-4">
                        <AlertTriangle size={16} />
                        {error === '{"error":"Unauthorized"}' ? 'Não autenticado — faça login' : error}
                    </div>
                )}

                {/* Table View */}
                {view === 'table' && (
                    <div className="space-y-3">
                        {data?.groups.map((g, i) => (
                            <div key={g.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full mt-1"
                                            style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }}
                                        />
                                        <div>
                                            <h3 className="font-semibold">Grupo {g.id}</h3>
                                            <p className="text-gray-400 text-xs">
                                                {g.size} membros · {g.totalWeight} co-ocorrências
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        g.totalWeight >= 10 ? 'bg-red-900 text-red-200' :
                                        g.totalWeight >= 5  ? 'bg-orange-900 text-orange-200' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {g.totalWeight >= 10 ? '🔴 Alto' : g.totalWeight >= 5 ? '🟠 Médio' : '🟡 Baixo'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {g.members.map(m => (
                                        <a
                                            key={m.cpf}
                                            href={`/p/${m.cpf}`}
                                            className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 transition-colors"
                                            title={m.cpf}
                                        >
                                            {m.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {!loading && data?.groups.length === 0 && (
                            <div className="text-center text-gray-500 py-12">
                                Nenhum grupo encontrado com os filtros atuais.
                            </div>
                        )}
                    </div>
                )}

                {/* Force Graph View */}
                {view === 'graph' && data && (
                    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden" style={{ height: 500 }}>
                        <ForceGraph2D
                            graphData={graph}
                            nodeLabel={(n: any) => `${n.name}\n${n.id}`}
                            nodeColor={(n: any) => GROUP_COLORS[(n.group - 1) % GROUP_COLORS.length]}
                            nodeVal={(n: any) => n.val}
                            linkWidth={(l: any) => Math.min(l.weight, 5)}
                            linkColor={() => '#374151'}
                            backgroundColor="#111827"
                            onNodeClick={(n: any) => window.open(`/p/${n.id}`, '_blank')}
                            width={undefined}
                            height={500}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
