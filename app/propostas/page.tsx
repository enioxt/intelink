'use client';

/**
 * CONTRIB-015: /propostas — fila de propostas pendentes, aprovadas, rejeitadas
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle, XCircle, Clock, ChevronRight, Filter } from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected' | 'partial';

interface Proposal {
    id: string;
    person_cpf: string;
    person_name: string;
    status: Status;
    vote_count: number;
    notes: string | null;
    created_at: string;
    intelink_proposal_items: Array<{ id: string; field_path: string; new_value: string; item_status: string }>;
    intelink_proposal_votes: Array<{ voter_id: string; vote: string }>;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
    pending:  { label: 'Pendente',  color: 'text-amber-400 bg-amber-900/30 border-amber-700',   icon: <Clock className="w-4 h-4" /> },
    approved: { label: 'Aprovado',  color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700', icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { label: 'Rejeitado', color: 'text-red-400 bg-red-900/30 border-red-700',         icon: <XCircle className="w-4 h-4" /> },
    partial:  { label: 'Parcial',   color: 'text-sky-400 bg-sky-900/30 border-sky-700',          icon: <CheckCircle className="w-4 h-4" /> },
};

export default function PropostasPage() {
    const router = useRouter();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [filter, setFilter] = useState<Status>('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/propostas?status=${filter}`)
            .then(r => r.json())
            .then(d => { setProposals(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [filter]);

    return (
        <div className="min-h-screen bg-gray-950 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white">📋 Propostas de edição</h1>
                    <button
                        onClick={() => router.push('/propostas/nova')}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-lg transition-colors"
                    >
                        + Nova proposta
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg">
                    {(['pending', 'approved', 'rejected', 'partial'] as Status[]).map(s => {
                        const cfg = STATUS_CONFIG[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`flex-1 py-2 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${filter === s ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {cfg.label}
                            </button>
                        );
                    })}
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>Nenhuma proposta {STATUS_CONFIG[filter].label.toLowerCase()}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {proposals.map(p => {
                            const cfg = STATUS_CONFIG[p.status];
                            const itemCount = p.intelink_proposal_items?.length ?? 0;
                            const voteCount = p.intelink_proposal_votes?.length ?? 0;
                            const createdAt = new Date(p.created_at).toLocaleDateString('pt-BR');

                            return (
                                <button
                                    key={p.id}
                                    onClick={() => router.push(`/propostas/${p.id}`)}
                                    className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl p-4 text-left transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
                                                    {cfg.icon}{cfg.label}
                                                </span>
                                                <span className="text-xs text-gray-500">{createdAt}</span>
                                            </div>
                                            <p className="font-medium text-white truncate">
                                                {p.person_name || `CPF ${p.person_cpf}`}
                                            </p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{p.person_cpf}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                                <span>{itemCount} campo{itemCount !== 1 ? 's' : ''}</span>
                                                <span>·</span>
                                                <span>{voteCount}/3 votos</span>
                                                {p.intelink_proposal_items?.slice(0, 3).map(i => (
                                                    <span key={i.id} className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                                                        {i.field_path}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
