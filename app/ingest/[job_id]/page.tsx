'use client';

/**
 * INGEST-005: /ingest/[job_id] — review UI para diffs de documento ingerido.
 * Mostra diff por pessoa (NEW/EXISTING/MERGE/CONFLICT) com checkboxes → gera proposta.
 */

import { useState, use } from 'react';
import { CheckCircle, XCircle, RefreshCw, Send, ArrowLeft, AlertTriangle, PlusCircle, GitMerge } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DiffStatus = 'NEW' | 'EXISTING' | 'MERGE' | 'CONFLICT';

interface FieldDiff {
    field: string;
    current_value: string | null;
    proposed_value: string;
    status: 'new_field' | 'same' | 'changed' | 'conflict';
}

interface PersonDiff {
    extracted: Record<string, string>;
    neo4j_match: Record<string, unknown> | null;
    neo4j_id: string | null;
    overall_status: DiffStatus;
    field_diffs: FieldDiff[];
}

const STATUS_CONFIG: Record<DiffStatus, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
    NEW:      { label: 'Novo',     color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700', icon: <PlusCircle className="w-4 h-4" />, desc: 'Pessoa não encontrada no grafo' },
    EXISTING: { label: 'Idêntico', color: 'text-gray-400 bg-gray-800 border-gray-600',            icon: <CheckCircle className="w-4 h-4" />, desc: 'Dados já presentes no grafo' },
    MERGE:    { label: 'Merge',    color: 'text-sky-400 bg-sky-900/30 border-sky-700',             icon: <GitMerge className="w-4 h-4" />, desc: 'Novos campos para adicionar' },
    CONFLICT: { label: 'Conflito', color: 'text-amber-400 bg-amber-900/30 border-amber-700',       icon: <AlertTriangle className="w-4 h-4" />, desc: 'Valores divergem do grafo' },
};

const FIELD_LABELS: Record<string, string> = {
    nome: 'Nome', cpf: 'CPF', rg: 'RG', data_nascimento: 'Nascimento', nome_mae: 'Mãe',
    nome_pai: 'Pai', sexo: 'Sexo', endereco: 'Endereço', bairro: 'Bairro',
    cidade: 'Cidade', estado: 'UF', telefone: 'Telefone',
};

export default function IngestReviewPage({ params }: { params: Promise<{ job_id: string }> }) {
    const { job_id } = use(params);
    const router = useRouter();

    // In real use this would load from API; here we retrieve from sessionStorage set by ingest API
    const [diffs] = useState<PersonDiff[]>(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(sessionStorage.getItem(`ingest_${job_id}`) || '[]'); } catch { return []; }
    });

    const [selected, setSelected] = useState<Record<string, Set<number>>>(() => {
        const init: Record<string, Set<number>> = {};
        diffs.forEach((d, pi) => {
            if (d.overall_status !== 'EXISTING') {
                init[pi] = new Set(d.field_diffs.map((_, fi) => fi));
            } else {
                init[pi] = new Set();
            }
        });
        return init;
    });

    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggleField(personIdx: number, fieldIdx: number) {
        setSelected(prev => {
            const s = new Set(prev[personIdx] ?? []);
            s.has(fieldIdx) ? s.delete(fieldIdx) : s.add(fieldIdx);
            return { ...prev, [personIdx]: s };
        });
    }

    async function submitProposals() {
        setSubmitting(true);
        setError(null);

        const proposals = diffs
            .map((d, pi) => ({
                person_cpf: d.extracted.cpf,
                person_name: d.extracted.nome,
                items: d.field_diffs
                    .filter((_, fi) => selected[pi]?.has(fi))
                    .map(f => ({
                        field_path: f.field,
                        old_value: f.current_value || undefined,
                        new_value: f.proposed_value,
                        source: `Ingestão de documento (job: ${job_id})`,
                    })),
            }))
            .filter(p => p.person_cpf && p.items.length > 0);

        if (!proposals.length) {
            setError('Selecione pelo menos um campo para criar proposta.');
            setSubmitting(false);
            return;
        }

        let errors = 0;
        for (const proposal of proposals) {
            const r = await fetch('/api/propostas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposal),
            });
            if (!r.ok) errors++;
        }

        if (errors === proposals.length) {
            setError('Todas as propostas falharam. Verifique se está autenticado.');
        } else {
            setDone(true);
        }
        setSubmitting(false);
    }

    if (diffs.length === 0) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Dados não encontrados</h2>
                    <p className="text-gray-400 mb-4">Os dados de revisão expiraram ou o job ID é inválido. Reenvie o documento.</p>
                    <button onClick={() => router.back()} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Voltar</button>
                </div>
            </div>
        );
    }

    if (done) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Propostas enviadas!</h2>
                    <p className="text-gray-400 mb-6">As propostas foram criadas e aguardam votação.</p>
                    <button onClick={() => router.push('/propostas')} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm">Ver fila de propostas</button>
                </div>
            </div>
        );
    }

    const actionableDiffs = diffs.filter(d => d.overall_status !== 'EXISTING');

    return (
        <div className="min-h-screen bg-gray-950 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">📄 Revisar dados extraídos</h1>
                        <p className="text-xs text-gray-500">Job: {job_id} · {diffs.length} pessoa(s) identificada(s)</p>
                    </div>
                </div>

                {diffs.length - actionableDiffs.length > 0 && (
                    <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-400 mb-4">
                        ✅ {diffs.length - actionableDiffs.length} pessoa(s) com dados idênticos ao grafo — nenhuma ação necessária.
                    </div>
                )}

                <div className="space-y-6">
                    {diffs.map((person, pi) => {
                        const cfg = STATUS_CONFIG[person.overall_status];
                        if (person.overall_status === 'EXISTING') return null;

                        return (
                            <div key={pi} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                                {/* Person header */}
                                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">{person.extracted.nome || 'Sem nome'}</p>
                                        {person.extracted.cpf && <p className="text-xs font-mono text-gray-400">{person.extracted.cpf}</p>}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${cfg.color}`}>
                                        {cfg.icon}{cfg.label}
                                    </span>
                                </div>

                                {/* Field diffs */}
                                <div className="divide-y divide-gray-800">
                                    {person.field_diffs.map((diff, fi) => {
                                        const isSelected = selected[pi]?.has(fi) ?? false;
                                        return (
                                            <label key={fi} className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-800 transition-colors ${isSelected ? 'bg-gray-800/50' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleField(pi, fi)}
                                                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-sky-600"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-300 mb-1">
                                                        {FIELD_LABELS[diff.field] || diff.field}
                                                        {diff.status === 'conflict' && <span className="ml-2 text-xs text-amber-400">⚠️ conflito</span>}
                                                        {diff.status === 'new_field' && <span className="ml-2 text-xs text-emerald-400">+ novo</span>}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {diff.current_value && (
                                                            <div className="bg-gray-800 rounded p-2">
                                                                <p className="text-xs text-gray-500 mb-1">Atual</p>
                                                                <p className="text-xs text-gray-300">{diff.current_value}</p>
                                                            </div>
                                                        )}
                                                        <div className="bg-sky-900/20 border border-sky-800 rounded p-2">
                                                            <p className="text-xs text-sky-400 mb-1">Proposto</p>
                                                            <p className="text-xs text-white font-medium">{diff.proposed_value}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">{error}</div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={submitProposals}
                        disabled={submitting}
                        className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Criar propostas com campos selecionados
                    </button>
                    <button
                        onClick={() => router.push('/propostas')}
                        className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
