'use client';

/**
 * CONTRIB-011: /propostas/[id] — review item-by-item com votação por PIN
 */

import { useState, useEffect, use } from 'react';
import { CheckCircle, XCircle, RefreshCw, KeyRound, ArrowLeft, Lock } from 'lucide-react';

interface ProposalItem {
    id: string;
    field_path: string;
    old_value: string | null;
    new_value: string;
    source: string | null;
    source_url: string | null;
    justification: string | null;
    item_status: 'pending' | 'approved' | 'rejected';
    votes_for: number;
    votes_against: number;
}

interface Proposal {
    id: string;
    person_cpf: string;
    person_name: string | null;
    status: string;
    vote_count: number;
    created_at: string;
    intelink_proposal_items: ProposalItem[];
    intelink_proposal_votes: Array<{ voter_id: string; vote: string; item_id: string }>;
}

const FIELD_LABELS: Record<string, string> = {
    nome: 'Nome', data_nascimento: 'Data de nascimento', nome_mae: 'Nome da mãe', nome_pai: 'Nome do pai',
    rg: 'RG', sexo: 'Sexo', endereco: 'Endereço', bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado', telefone: 'Telefone',
};

export default function PropostaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [loading, setLoading] = useState(true);
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [votes, setVotes] = useState<Record<string, 'approve' | 'reject'>>({});
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    async function loadProposal() {
        const r = await fetch(`/api/propostas?status=pending`);
        const list = await r.json() as Proposal[];
        const found = list.find(p => p.id === id);
        if (!found) {
            // Try other statuses
            for (const s of ['approved', 'rejected', 'partial']) {
                const r2 = await fetch(`/api/propostas?status=${s}`);
                const list2 = await r2.json() as Proposal[];
                const f2 = list2.find(p => p.id === id);
                if (f2) { setProposal(f2); setLoading(false); return; }
            }
        }
        setProposal(found || null);
        setLoading(false);
    }

    useEffect(() => { loadProposal(); }, [id]);

    function setVote(item_id: string, vote: 'approve' | 'reject') {
        setVotes(prev => ({ ...prev, [item_id]: vote }));
    }

    async function submitVotes() {
        if (!pin || pin.length !== 6) { setMessage({ text: 'PIN de 6 dígitos obrigatório', type: 'error' }); return; }
        const voteList = Object.entries(votes).map(([item_id, vote]) => ({ item_id, vote }));
        if (!voteList.length) { setMessage({ text: 'Selecione seu voto para pelo menos um item', type: 'error' }); return; }

        setSubmitting(true);
        setMessage(null);

        const r = await fetch(`/api/propostas/${id}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, votes: voteList }),
        });
        const data = await r.json();

        if (r.ok) {
            setMessage({ text: 'Votos registrados com sucesso!', type: 'success' });
            setPin('');
            setVotes({});
            await loadProposal();
        } else {
            setMessage({ text: data.error || 'Erro ao votar', type: 'error' });
        }
        setSubmitting(false);
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
    );

    if (!proposal) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
            Proposta não encontrada.
        </div>
    );

    const isPending = proposal.status === 'pending';

    return (
        <div className="min-h-screen bg-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <a href="/propostas" className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </a>
                    <div>
                        <h1 className="text-xl font-bold text-white">
                            {proposal.person_name || `CPF ${proposal.person_cpf}`}
                        </h1>
                        <p className="text-xs text-gray-500 font-mono">
                            {proposal.person_cpf} · {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                            · status: <span className={`font-medium ${isPending ? 'text-amber-400' : proposal.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>{proposal.status}</span>
                        </p>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4 mb-6">
                    {proposal.intelink_proposal_items.map(item => {
                        const myVote = votes[item.id];
                        const isResolved = item.item_status !== 'pending';
                        const votedBefore = proposal.intelink_proposal_votes.some(v => v.item_id === item.id);

                        return (
                            <div key={item.id} className={`bg-gray-900 border rounded-xl p-4 ${isResolved ? 'opacity-70 border-gray-700' : 'border-gray-600'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-white">{FIELD_LABELS[item.field_path] || item.field_path}</span>
                                    {isResolved ? (
                                        <span className={`text-xs px-2 py-1 rounded-full ${item.item_status === 'approved' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                                            {item.item_status === 'approved' ? '✅ Aprovado' : '❌ Rejeitado'}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-500">{item.votes_for}/3 votos · {item.votes_against} rejeição(ões)</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-1">Atual (REDS)</p>
                                        <p className="text-sm text-gray-300">{item.old_value || <span className="italic text-gray-600">não informado</span>}</p>
                                    </div>
                                    <div className="bg-sky-900/20 border border-sky-800 rounded-lg p-3">
                                        <p className="text-xs text-sky-400 mb-1">Proposto</p>
                                        <p className="text-sm text-white font-medium">{item.new_value}</p>
                                    </div>
                                </div>

                                {(item.source || item.justification) && (
                                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                                        {item.source && <p>📂 Fonte: {item.source}{item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-sky-400 underline">link</a>}</p>}
                                        {item.justification && <p>💬 {item.justification}</p>}
                                    </div>
                                )}

                                {isPending && !isResolved && !votedBefore && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setVote(item.id, 'approve')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${myVote === 'approve' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-emerald-900/40 hover:text-emerald-400'}`}
                                        >
                                            <CheckCircle className="w-4 h-4" /> Aprovar
                                        </button>
                                        <button
                                            onClick={() => setVote(item.id, 'reject')}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${myVote === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-red-900/40 hover:text-red-400'}`}
                                        >
                                            <XCircle className="w-4 h-4" /> Rejeitar
                                        </button>
                                    </div>
                                )}
                                {votedBefore && !isResolved && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Você já votou neste item</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* PIN + Submit */}
                {isPending && Object.keys(votes).length > 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                <KeyRound className="w-4 h-4 inline mr-1" /> Confirmar com PIN
                            </label>
                            <input
                                type={showPin ? 'text' : 'password'}
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="••••••"
                                inputMode="numeric"
                                maxLength={6}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-sky-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Sem PIN? <a href="/settings/pin" className="text-sky-400 underline">Configure aqui</a>
                            </p>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            onClick={submitVotes}
                            disabled={submitting || pin.length !== 6}
                            className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                            Confirmar {Object.keys(votes).length} voto(s)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
