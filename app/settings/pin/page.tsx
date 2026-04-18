'use client';

/**
 * PIN-005: /settings/pin — criar/alterar/recuperar PIN de votação
 */

import { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, AlertTriangle, Eye, EyeOff, RefreshCw, Mail } from 'lucide-react';

type Mode = 'create' | 'change' | 'recover';

export default function PinSettingsPage() {
    const [hasPin, setHasPin] = useState<boolean | null>(null);
    const [mode, setMode] = useState<Mode>('create');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);

    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [recoveryEmail, setRecoveryEmail] = useState('');

    useEffect(() => {
        // Check if user already has PIN
        fetch('/api/auth/pin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: '000000' }), // probe — will fail but tell us if PIN exists
        }).then(async r => {
            const data = await r.json();
            // 404 = no PIN, 403 = wrong PIN (has PIN), anything else = has PIN
            setHasPin(r.status !== 404);
            setMode(r.status !== 404 ? 'change' : 'create');
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        if (mode === 'recover') {
            setSubmitting(true);
            const r = await fetch('/api/auth/pin/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recoveryEmail }),
            });
            const data = await r.json();
            setMessage({ text: data.message || 'Link enviado!', type: r.ok ? 'success' : 'error' });
            setSubmitting(false);
            return;
        }

        if (newPin !== confirmPin) {
            setMessage({ text: 'Os PINs não coincidem', type: 'error' });
            return;
        }
        if (!/^\d{6}$/.test(newPin)) {
            setMessage({ text: 'PIN deve ter exatamente 6 dígitos', type: 'error' });
            return;
        }

        setSubmitting(true);
        const body: Record<string, string> = { pin: newPin };
        if (mode === 'change') body.current_pin = currentPin;

        const r = await fetch('/api/auth/pin/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await r.json();
        if (r.ok) {
            setMessage({ text: data.message || 'PIN salvo com sucesso!', type: 'success' });
            setHasPin(true);
            setMode('change');
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
        } else {
            setMessage({ text: data.error || 'Erro ao salvar PIN', type: 'error' });
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 py-12 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-900/40 border border-sky-700 mb-4">
                        <KeyRound className="w-8 h-8 text-sky-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">PIN de Votação</h1>
                    <p className="text-gray-400 mt-2">
                        Usado para confirmar votos em propostas de edição de dados.
                    </p>
                </div>

                {/* Status badge */}
                {hasPin !== null && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${hasPin ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-amber-900/30 border border-amber-600'}`}>
                        {hasPin
                            ? <><ShieldCheck className="w-5 h-5 text-emerald-400" /><span className="text-emerald-300 text-sm">PIN configurado</span></>
                            : <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-amber-300 text-sm">PIN não configurado — necessário para votar em propostas</span></>
                        }
                    </div>
                )}

                {/* Mode tabs */}
                <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg">
                    <button
                        onClick={() => setMode(hasPin ? 'change' : 'create')}
                        className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode !== 'recover' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        {hasPin ? 'Alterar PIN' : 'Criar PIN'}
                    </button>
                    <button
                        onClick={() => setMode('recover')}
                        className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === 'recover' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Recuperar
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'recover' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />E-mail da conta
                            </label>
                            <input
                                type="email"
                                value={recoveryEmail}
                                onChange={e => setRecoveryEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sky-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Você receberá um link para redefinir seu PIN.
                            </p>
                        </div>
                    ) : (
                        <>
                            {mode === 'change' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">PIN atual</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? 'text' : 'password'}
                                            value={currentPin}
                                            onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="••••••"
                                            inputMode="numeric"
                                            maxLength={6}
                                            required
                                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-sky-500 pr-12"
                                        />
                                        <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    {mode === 'change' ? 'Novo PIN' : 'PIN (6 dígitos)'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPin ? 'text' : 'password'}
                                        value={newPin}
                                        onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="••••••"
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none focus:border-sky-500 pr-12"
                                    />
                                    <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar PIN</label>
                                <input
                                    type="password"
                                    value={confirmPin}
                                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="••••••"
                                    inputMode="numeric"
                                    maxLength={6}
                                    required
                                    className={`w-full px-4 py-3 bg-gray-900 border rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-600 focus:outline-none ${confirmPin && newPin !== confirmPin ? 'border-red-500' : 'border-gray-700 focus:border-sky-500'}`}
                                />
                                {confirmPin && newPin !== confirmPin && (
                                    <p className="text-xs text-red-400 mt-1">PINs não coincidem</p>
                                )}
                            </div>
                        </>
                    )}

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:text-sky-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        {mode === 'recover' ? 'Enviar link de recuperação' : mode === 'change' ? 'Alterar PIN' : 'Criar PIN'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-6">
                    O PIN é armazenado com hash bcrypt e nunca transmitido em claro.<br />
                    Bloqueio automático após 5 tentativas incorretas.
                </p>
            </div>
        </div>
    );
}
