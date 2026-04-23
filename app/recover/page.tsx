'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, ArrowLeft, AlertCircle, Mail, Send, CheckCircle2, Lock } from 'lucide-react';

type Channel = 'email' | 'telegram';

function RecoverContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [email, setEmail] = useState(initialEmail);
    const [channel, setChannel] = useState<Channel>('email');
    const [step, setStep] = useState<'choose' | 'reset'>('choose');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    channel,
                    purpose: 'recovery',
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error?.message || data.error || 'Falha ao enviar código');
                setLoading(false);
                return;
            }
            setStep('reset');
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

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{6}$/.test(code)) { setError('Digite os 6 dígitos'); return; }
        if (newPassword.length < 8) { setError('Senha mínima de 8 caracteres'); return; }
        if (newPassword !== confirmPassword) { setError('Senhas não conferem'); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/recover/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code,
                    newPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error?.message || data.error || 'Falha ao redefinir senha');
                setLoading(false);
                return;
            }
            setInfo('Senha redefinida. Redirecionando para o login…');
            setTimeout(() => router.push('/login?reset=1'), 1500);
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
                    <h1 className="text-2xl font-bold text-white mb-2">Recuperar senha</h1>
                    <p className="text-slate-400 text-sm">Confirme um canal e redefina a senha.</p>
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

                    {step === 'reset' && (
                        <form onSubmit={resetPassword} className="space-y-4">
                            <div>
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

                            <div>
                                <label className="text-slate-400 text-xs mb-1.5 block">Nova senha <span className="text-slate-600">(mínimo 8)</span></label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        maxLength={128}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-slate-400 text-xs mb-1.5 block">Confirmar senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        maxLength={128}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Redefinindo…' : 'Redefinir senha'}
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
                                {resendTimer > 0 ? `Reenviar em ${resendTimer}s` : 'Não recebeu? Reenviar'}
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

export default function RecoverPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <RecoverContent />
        </Suspense>
    );
}
