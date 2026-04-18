'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, User, FileSearch, AlertTriangle, Shield, MapPin,
    Calendar, Hash, Users, Loader2, ChevronRight, Download
} from 'lucide-react';
import Link from 'next/link';

interface Occurrence {
    id: string;
    reds_number: string | null;
    type: string | null;
    data_fato: string | null;
    bairro: string | null;
    cidade: string | null;
    delegacia: string | null;
    descricao: string | null;
    rel_type: string;
}

interface CoInvolved {
    id: string;
    name: string;
    cpf: string;
    shared_occurrences: number;
}

interface Person {
    id: string;
    name: string;
    cpf: string;
    rg: string;
    bairro: string;
    cidade: string;
    delegacia: string;
    source: unknown;
    telefone: string | null;
    labels: string[];
}

interface PersonData {
    person: Person;
    occurrences: Occurrence[];
    co_involved: CoInvolved[];
    stats: {
        total_occurrences: number;
        as_suspect: number;
        as_victim: number;
        co_involved_count: number;
    };
}

function relLabel(rel: string) {
    if (rel === 'VICTIM_IN') return { label: 'Vítima', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Envolvido', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
}

function formatDate(d: string | null) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

export default function PessoaPage() {
    const params = useParams();
    const router = useRouter();
    const id = decodeURIComponent(params?.id as string);

    const [data, setData] = useState<PersonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'ocorrencias' | 'vinculos'>('ocorrencias');
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    const handleDownloadPdf = async () => {
        setDownloadingPdf(true);
        try {
            const isCpf = /^\d{11}$/.test(id);
            const pdfUrl = isCpf
                ? `/api/neo4j/pessoa/pdf?cpf=${encodeURIComponent(id)}`
                : `/api/neo4j/pessoa/pdf?id=${encodeURIComponent(id)}`;
            const res = await fetch(pdfUrl);
            if (!res.ok) throw new Error('Erro ao gerar PDF');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_${data?.person.name?.replace(/\s+/g, '_').slice(0, 30) ?? 'pessoa'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* silently ignore */ }
        finally { setDownloadingPdf(false); }
    };

    useEffect(() => {
        if (!id) return;
        // CPF (11 digits) comes from br-acc search results; elementId otherwise
        const isCpf = /^\d{11}$/.test(id);
        const apiUrl = isCpf
            ? `/api/neo4j/pessoa?cpf=${encodeURIComponent(id)}`
            : `/api/neo4j/pessoa?id=${encodeURIComponent(id)}`;
        fetch(apiUrl)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setData(d);
            })
            .catch(() => setError('Erro ao carregar dados'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-white text-lg">{error || 'Pessoa não encontrada'}</p>
                <button onClick={() => router.back()} className="mt-4 text-cyan-400 hover:text-cyan-300 flex items-center gap-2 mx-auto">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
            </div>
        </div>
    );

    const { person, occurrences, co_involved, stats } = data;
    const isREDS = (person.source as string[])?.includes?.('reds') || String(person.source).includes('reds');

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Topbar */}
            <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center gap-4">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-white">{person.name || 'Sem nome'}</h1>
                    <p className="text-xs text-slate-400">Perfil de pessoa — Neo4j local</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {downloadingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        {downloadingPdf ? 'Gerando...' : 'PDF'}
                    </button>
                    {isREDS && (
                        <span className="px-2 py-1 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded">
                            REDS
                        </span>
                    )}
                    {person.labels.includes('ReceptionPerson') && (
                        <span className="px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded">
                            Recepção
                        </span>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
                {/* Dados pessoais */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 shrink-0">
                            <User className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                            {person.cpf && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">CPF</p>
                                    <p className="text-sm font-mono text-white">{person.cpf}</p>
                                </div>
                            )}
                            {person.rg && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">RG</p>
                                    <p className="text-sm font-mono text-white">{person.rg}</p>
                                </div>
                            )}
                            {(person.bairro || person.cidade) && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Localização</p>
                                    <p className="text-sm text-white">{[person.bairro, person.cidade].filter(Boolean).join(', ')}</p>
                                </div>
                            )}
                            {person.delegacia && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Delegacia</p>
                                    <p className="text-sm text-white">{person.delegacia}</p>
                                </div>
                            )}
                            {person.telefone && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Telefone</p>
                                    <p className="text-sm text-white">{String(person.telefone)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: FileSearch, label: 'Total Ocorrências', value: stats.total_occurrences, color: 'cyan' },
                        { icon: Shield, label: 'Como Envolvido', value: stats.as_suspect, color: 'red' },
                        { icon: AlertTriangle, label: 'Como Vítima', value: stats.as_victim, color: 'amber' },
                        { icon: Users, label: 'Co-envolvidos', value: stats.co_involved_count, color: 'purple' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                            <Icon className={`w-5 h-5 text-${color}-400 mx-auto mb-2`} />
                            <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
                            <p className="text-xs text-slate-400 mt-1">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-xl p-1">
                    {(['ocorrencias', 'vinculos'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === tab
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {tab === 'ocorrencias' ? `Ocorrências REDS (${stats.total_occurrences})` : `Co-envolvidos (${stats.co_involved_count})`}
                        </button>
                    ))}
                </div>

                {/* Ocorrências */}
                {activeTab === 'ocorrencias' && (
                    <div className="space-y-3">
                        {occurrences.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p>Nenhuma ocorrência REDS vinculada</p>
                            </div>
                        ) : occurrences.map(occ => {
                            const { label, color } = relLabel(occ.rel_type);
                            return (
                                <div key={occ.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className={`px-2 py-0.5 text-xs rounded border ${color}`}>{label}</span>
                                                {occ.reds_number && (
                                                    <span className="text-xs font-mono text-slate-400">
                                                        <Hash className="w-3 h-3 inline mr-0.5" />{String(occ.reds_number)}
                                                    </span>
                                                )}
                                                {occ.data_fato && (
                                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />{formatDate(String(occ.data_fato))}
                                                    </span>
                                                )}
                                            </div>
                                            {occ.type && (
                                                <p className="text-sm font-medium text-white mb-1">{String(occ.type)}</p>
                                            )}
                                            {(occ.bairro || occ.cidade) && (
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {[occ.bairro, occ.cidade].filter(Boolean).map(String).join(', ')}
                                                </p>
                                            )}
                                            {occ.delegacia && (
                                                <p className="text-xs text-slate-500 mt-1">{String(occ.delegacia)}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Co-envolvidos */}
                {activeTab === 'vinculos' && (
                    <div className="space-y-3">
                        {co_involved.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                <p>Nenhum co-envolvido encontrado</p>
                            </div>
                        ) : co_involved.map(co => (
                            <Link
                                key={co.id}
                                href={`/pessoa/${encodeURIComponent(co.id)}`}
                                className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/40 hover:bg-slate-800 transition-colors group"
                            >
                                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 shrink-0">
                                    <User className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{co.name || 'Sem nome'}</p>
                                    {co.cpf && <p className="text-xs font-mono text-slate-400">{co.cpf}</p>}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-purple-400">{co.shared_occurrences}</p>
                                    <p className="text-xs text-slate-500">ocorrência{co.shared_occurrences !== 1 ? 's' : ''} em comum</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
