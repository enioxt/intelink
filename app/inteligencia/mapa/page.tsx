'use client';

export const dynamic = 'force-dynamic';

/**
 * MAP-001: /inteligencia/mapa — Distribuição de Ocorrências
 *
 * Painel com:
 * - Barras por município (top 20)
 * - Barras por tipo de crime (top 10)
 * - Linha temporal por mês
 */

import { useEffect, useState, useCallback } from 'react';
import { MapPin, RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

interface MapaData {
    period: { since: string; days: number };
    municipios: { name: string; count: number }[];
    tipos: { name: string; count: number }[];
    timeline: { mes: string; count: number }[];
}

export default function MapaPage() {
    const [data, setData]     = useState<MapaData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');
    const [days, setDays]     = useState(30);
    const [tipo, setTipo]     = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ days: String(days) });
            if (tipo) params.set('tipo', tipo);
            const res = await fetch(`/api/intelligence/mapa?${params}`);
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [days, tipo]);

    useEffect(() => { load(); }, [load]);

    const totalOccs = data?.municipios.reduce((s, m) => s + m.count, 0) ?? 0;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <MapPin className="text-green-400" size={28} />
                        <div>
                            <h1 className="text-2xl font-bold">Distribuição de Ocorrências</h1>
                            <p className="text-gray-400 text-sm">
                                Por município · tipo de crime · linha do tempo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-6 flex-wrap">
                    <select
                        value={days}
                        onChange={e => setDays(Number(e.target.value))}
                        className="bg-gray-800 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value={7}>Últimos 7 dias</option>
                        <option value={30}>Últimos 30 dias</option>
                        <option value={90}>Últimos 90 dias</option>
                        <option value={365}>Último ano</option>
                    </select>
                    <input
                        value={tipo}
                        onChange={e => setTipo(e.target.value)}
                        placeholder="Filtrar tipo (ex: homicidio)"
                        className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none w-52"
                    />
                </div>

                {data && (
                    <div className="text-sm text-gray-400 mb-4">
                        {totalOccs} ocorrências desde {data.period.since}
                        {tipo && ` · tipo: "${tipo}"`}
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded-lg p-3 mb-4">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* Municípios */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin size={16} className="text-green-400" />
                                <h2 className="font-semibold">Ocorrências por Município (top 20)</h2>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.municipios} layout="vertical" margin={{ left: 90 }}>
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={{ fill: '#d1d5db', fontSize: 11 }}
                                        width={90}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                        labelStyle={{ color: '#f3f4f6' }}
                                    />
                                    <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tipos de crime */}
                        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-orange-400" />
                                <h2 className="font-semibold">Ocorrências por Tipo de Crime</h2>
                            </div>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.tipos}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        angle={-25}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                    />
                                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Timeline */}
                        {data.timeline.length > 0 && (
                            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="font-semibold">Tendência Temporal (por mês)</h2>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={data.timeline}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="mes" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#60a5fa"
                                            strokeWidth={2}
                                            dot={{ fill: '#3b82f6', r: 3 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {loading && !data && (
                    <div className="text-center text-gray-500 py-20">
                        <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-green-500" />
                        Carregando dados...
                    </div>
                )}
            </div>
        </div>
    );
}
