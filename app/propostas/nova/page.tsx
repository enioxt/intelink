'use client';

/**
 * CONTRIB-010: /propostas/nova?cpf=<cpf> — formulário de nova proposta de edição
 * Cada campo REDS pode ser proposto individualmente com fonte + justificativa.
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Send, ChevronDown, RefreshCw, CheckCircle } from 'lucide-react';

const CAMPOS = [
    { key: 'nome', label: 'Nome completo', type: 'text' },
    { key: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
    { key: 'nome_mae', label: 'Nome da mãe', type: 'text' },
    { key: 'nome_pai', label: 'Nome do pai', type: 'text' },
    { key: 'rg', label: 'RG', type: 'text' },
    { key: 'sexo', label: 'Sexo', type: 'select', options: ['M', 'F'] },
    { key: 'endereco', label: 'Endereço', type: 'text' },
    { key: 'bairro', label: 'Bairro', type: 'text' },
    { key: 'cidade', label: 'Cidade', type: 'text' },
    { key: 'estado', label: 'Estado (UF)', type: 'text', maxLength: 2 },
    { key: 'telefone', label: 'Telefone', type: 'text' },
];

interface ProposalItem {
    field_path: string;
    old_value: string;
    new_value: string;
    source: string;
    source_url: string;
    justification: string;
}

function PropostaNovaForm() {
    const params = useSearchParams();
    const router = useRouter();
    const cpf = params.get('cpf') ?? '';

    const [personName, setPersonName] = useState('');
    const [items, setItems] = useState<ProposalItem[]>([]);
    const [showFieldSelector, setShowFieldSelector] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pinRequired, setPinRequired] = useState(false);
    const [hasPin, setHasPin] = useState<boolean | null>(null);

    useEffect(() => {
        // Fetch person name from Neo4j
        if (cpf) {
            fetch(`/api/busca-reds?cpf=${cpf}`)
                .then(r => r.json())
                .then(d => setPersonName(d?.[0]?.nome_original || d?.[0]?.name || ''))
                .catch(() => {});
        }
        // Check PIN status
        fetch('/api/auth/pin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: '000000' }),
        }).then(r => setHasPin(r.status !== 404)).catch(() => {});
    }, [cpf]);

    function addField(field_path: string) {
        if (items.some(i => i.field_path === field_path)) return;
        setItems(prev => [...prev, { field_path, old_value: '', new_value: '', source: '', source_url: '', justification: '' }]);
        setShowFieldSelector(false);
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx));
    }

    function updateItem(idx: number, key: keyof ProposalItem, value: string) {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!items.length) { setError('Adicione pelo menos um campo'); return; }

        const emptyNew = items.find(i => !i.new_value.trim());
        if (emptyNew) { setError(`Preencha o novo valor para "${CAMPOS.find(c => c.key === emptyNew.field_path)?.label || emptyNew.field_path}"`); return; }

        setSubmitting(true);
        setError(null);

        const r = await fetch('/api/propostas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                person_cpf: cpf,
                person_name: personName,
                items: items.map(it => ({
                    field_path: it.field_path,
                    old_value: it.old_value || undefined,
                    new_value: it.new_value,
                    source: it.source || undefined,
                    source_url: it.source_url || undefined,
                    justification: it.justification || undefined,
                })),
            }),
        });

        const data = await r.json();
        if (r.ok) {
            setDone(data.proposal_id);
        } else if (r.status === 409) {
            setError(`Já existe proposta pendente: /propostas/${data.proposal_id}`);
        } else {
            setError(data.error || 'Erro ao criar proposta');
        }
        setSubmitting(false);
    }

    if (done) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-sm">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Proposta enviada!</h2>
                    <p className="text-gray-400 mb-6">Sua proposta foi registrada com seu voto. Aguarde aprovação de 2 membros adicionais.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => router.push(`/propostas/${done}`)} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm">Ver proposta</button>
                        <button onClick={() => router.push('/propostas')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Fila de propostas</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">✏️ Sugerir edição de dados</h1>
                    {cpf && (
                        <p className="text-gray-400 mt-1">
                            CPF: <span className="font-mono text-sky-400">{cpf}</span>
                            {personName && <span className="ml-2 text-gray-300">— {personName}</span>}
                        </p>
                    )}
                    {!hasPin && (
                        <div className="mt-3 p-3 bg-amber-900/30 border border-amber-600 rounded-lg text-sm text-amber-300">
                            ⚠️ Você não tem PIN configurado. <a href="/settings/pin" className="underline">Configurar PIN</a> para votar em propostas.
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Items */}
                    {items.map((item, idx) => {
                        const fieldDef = CAMPOS.find(c => c.key === item.field_path);
                        return (
                            <div key={item.field_path} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-white">{fieldDef?.label || item.field_path}</span>
                                    <button type="button" onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Valor atual (REDS)</label>
                                        <input
                                            type="text"
                                            value={item.old_value}
                                            onChange={e => updateItem(idx, 'old_value', e.target.value)}
                                            placeholder="Deixe vazio se não souber"
                                            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium text-sky-400">Novo valor *</label>
                                        {fieldDef?.type === 'select' ? (
                                            <select
                                                value={item.new_value}
                                                onChange={e => updateItem(idx, 'new_value', e.target.value)}
                                                required
                                                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
                                            >
                                                <option value="">Selecione</option>
                                                {fieldDef.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type={fieldDef?.type || 'text'}
                                                value={item.new_value}
                                                onChange={e => updateItem(idx, 'new_value', e.target.value)}
                                                maxLength={fieldDef?.maxLength}
                                                required
                                                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-sky-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-sky-400"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">Fonte</label>
                                        <input
                                            type="text"
                                            value={item.source}
                                            onChange={e => updateItem(idx, 'source', e.target.value)}
                                            placeholder="Ex: BO 2024/001, documento RG"
                                            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">URL da fonte</label>
                                        <input
                                            type="url"
                                            value={item.source_url}
                                            onChange={e => updateItem(idx, 'source_url', e.target.value)}
                                            placeholder="https://..."
                                            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500">Justificativa</label>
                                    <textarea
                                        value={item.justification}
                                        onChange={e => updateItem(idx, 'justification', e.target.value)}
                                        placeholder="Por que este dado está incorreto ou incompleto?"
                                        rows={2}
                                        className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-sky-500 resize-none"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Add field */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowFieldSelector(v => !v)}
                            className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-sky-600 rounded-xl text-gray-400 hover:text-sky-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Adicionar campo
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFieldSelector ? 'rotate-180' : ''}`} />
                        </button>
                        {showFieldSelector && (
                            <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                                {CAMPOS.filter(c => !items.some(i => i.field_path === c.key)).map(c => (
                                    <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => addField(c.key)}
                                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                                    >
                                        {c.label}
                                    </button>
                                ))}
                                {CAMPOS.every(c => items.some(i => i.field_path === c.key)) && (
                                    <div className="px-4 py-3 text-sm text-gray-500">Todos os campos adicionados</div>
                                )}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !items.length}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar proposta
                    </button>

                    <p className="text-center text-xs text-gray-600">
                        Sua proposta será registrada com seu voto. Requer 2 aprovações adicionais (3/3 total).
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><RefreshCw className="w-8 h-8 text-sky-400 animate-spin" /></div>}>
            <PropostaNovaForm />
        </Suspense>
    );
}
