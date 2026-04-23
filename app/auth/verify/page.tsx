'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, ArrowLeft, AlertCircle, Mail, Send, CheckCircle2 } from 'lucide-react';

type Channel = 'email' | 'telegram';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';
    const purpose = (searchParams.get('purpose') as 'signup' | 'recovery') || 'signup';

    const [email, setEmail] = useState(initialEmail);
    const [channel, setChannel] = useState<Channel>('email');
    const [step, setStep] = useState<'choose' | 'code'>(initialEmail ? 'choose' : 'choose');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const requestCode = async () => {
        setError('');
        setInfo('');
        if (!email) { setError('Email obrigatório'); return; }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), channel, purpose }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error?.message || data.error || 'Falha ao enviar código');
                setLoading(false);
                return;
            }
            setStep('code');
            setResendTimer(60);
            setInfo(
                channel === 'email'
                    ? `Código enviado para ${email}. Verifique sua caixa de entrada (e spam).`
                    : 'Código enviado no seu Telegram.',
            );
        } catch {
            setError('Erro de rede');
        } finally {
            setLoading(false);
        }
    };

    const confirmCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{6}$/.test(code)) {
            setError('Digite os 6 dígitos');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), code, purpose }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error?.message || data.error || 'Código inválido');
                setLoading(false);
                return;
            }
            if (purpose === 'recovery') {
                // Verified → allow password reset. Forward code+email for confirm route.
                router.push(`/recover?email=${encodeURIComponent(email)}&verified=1`);
                return;
            }
            // Signup verified → success screen then login
            setInfo('Conta verificada! Redirecionando para o login…');
            setTimeout(() => router.push('/login?verified=1'), 1500);
        } catch {
            setError('Erro de rede');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <Shield className="w-8 h-8 text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {purpose === 'recovery' ? 'Recuperar senha' : 'Verificar conta'}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {purpose === 'recovery'
                            ? 'Confirme sua identidade para redefinir a senha.'
                            : 'Confirme um canal de contato antes de acessar.'}
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
                    {step === 'choose' && (
                        <>
                            <div className="mb-4">
                                <label className="text-slate-400 text-xs mb-1.5 block">Email da conta</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-400 text-xs mb-2">Receber código por:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setChannel('email')}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                                            channel === 'email'
                                                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                    >
                                        <Mail className="w-4 h-4" />
                                        <span className="text-sm">Email</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setChannel('telegram')}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                                            channel === 'telegram'
                                                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                    >
                                        <Send className="w-4 h-4" />
                                        <span className="text-sm">Telegram</span>
                                    </button>
                                </div>
                                <p className="text-slate-600 text-xs mt-2">
                                    WhatsApp em breve. Telegram requer chat_id vinculado à conta.
                                </p>
                            </div>

                            <button
                                onClick={requestCode}
                                disabled={loading}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Enviando…' : 'Enviar código'}
                            </button>
                        </>
                    )}

                    {step === 'code' && (
                        <form onSubmit={confirmCode}>
                            <div className="mb-4">
                                <label className="text-slate-400 text-xs mb-1.5 block">Código de 6 dígitos</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    required
                                    maxLength={6}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length !== 6}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Verificando…' : 'Verificar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (resendTimer > 0) return;
                                    requestCode();
                                }}
                                disabled={resendTimer > 0 || loading}
                                className="w-full text-slate-400 hover:text-cyan-300 text-xs py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {resendTimer > 0
                                    ? `Reenviar em ${resendTimer}s`
                                    : 'Não recebeu? Reenviar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('choose'); setCode(''); setError(''); setInfo(''); }}
                                className="w-full text-slate-500 hover:text-slate-300 text-xs py-2 transition-colors"
                            >
                                Trocar canal
                            </button>
                        </form>
                    )}

                    {info && (
                        <div className="mt-4 flex items-start gap-2 text-emerald-300 text-sm bg-emerald-900/30 border border-emerald-700 rounded-lg p-3">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{info}</span>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-slate-500 hover:text-slate-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar ao login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
