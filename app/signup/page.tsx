'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, ArrowLeft, AlertCircle, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

function SignupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/central';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const supabase = getSupabaseClient();
                if (!supabase) return;
                const { data: { session } } = await supabase.auth.getSession();
                if (session) router.push(returnUrl);
            } catch {
                // session check failed — show signup form
            } finally {
                setCheckingSession(false);
            }
        };
        checkSession();
    }, [router, returnUrl]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Senha deve ter no mínimo 8 caracteres');
            return;
        }
        if (password !== passwordConfirm) {
            setError('Senhas não conferem');
            return;
        }
        if (!name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    phone: phone.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erro ao criar conta');
                setLoading(false);
                return;
            }

            // Redirect to verify page — user picks channel there
            router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        } catch {
            setError('Erro de rede. Tente novamente.');
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <Shield className="w-8 h-8 text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Criar conta</h1>
                    <p className="text-slate-400 text-sm">Inteligência Policial — Intelink</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Nome completo *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="João Silva"
                                    required
                                    maxLength={120}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Email *</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    maxLength={254}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">
                                Telefone (opcional) <span className="text-slate-600">— para verificação por WhatsApp/SMS futuramente</span>
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+55 11 90000-0000"
                                    maxLength={20}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Senha * <span className="text-slate-600">(mínimo 8 caracteres)</span></label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    maxLength={128}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Confirmar senha *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={passwordConfirm}
                                    onChange={e => setPasswordConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                    maxLength={128}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex items-start gap-2 text-slate-400 text-xs">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-cyan-500" />
                            <span>Após criar a conta, você precisará verificar por email ou Telegram antes de acessar.</span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Criando conta...' : 'Criar conta'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-4 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="text-center space-y-2">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors block w-full"
                    >
                        Já tem conta? Entrar
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="text-slate-500 hover:text-slate-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
