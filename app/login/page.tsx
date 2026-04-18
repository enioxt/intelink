'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, ArrowLeft, AlertCircle, Mail, Lock } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';
    const tgError = searchParams.get('error');
    const TG_ERROR_MSGS: Record<string, string> = {
        invalid_hash: 'Link do Telegram inválido. Tente novamente.',
        expired: 'Link do Telegram expirado. Tente novamente.',
        session_error: 'Erro ao criar sessão. Entre com email/senha.',
        config: 'Autenticação Telegram não configurada.',
    };

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(tgError ? (TG_ERROR_MSGS[tgError] || 'Erro na autenticação Telegram.') : '');
    const [forgotSent, setForgotSent] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const telegramWidgetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const supabase = getSupabaseClient();
                if (!supabase) return;
                const { data: { session } } = await supabase.auth.getSession();
                if (session) router.push(returnUrl);
            } catch {
                // session check failed — show login form
            } finally {
                setCheckingSession(false);
            }
        };
        checkSession();
    }, [router, returnUrl]);

    // AUTH-013d: inject Telegram Login Widget script
    useEffect(() => {
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
        if (!botUsername || !telegramWidgetRef.current) return;
        const container = telegramWidgetRef.current;
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram/callback`);
        script.setAttribute('data-request-access', 'write');
        script.async = true;
        container.appendChild(script);
    }, [checkingSession]);

    const bridgeMember = async (userEmail: string) => {
        try {
            const res = await fetch('/api/auth/bridge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.member_id) {
                    localStorage.setItem('intelink_member_id', data.member_id);
                    localStorage.setItem('intelink_role', data.system_role || 'member');
                    if (data.telegram_chat_id) localStorage.setItem('intelink_chat_id', String(data.telegram_chat_id));
                    if (data.phone) localStorage.setItem('intelink_phone', data.phone);
                    if (data.name) localStorage.setItem('intelink_username', data.name);
                }
            }
        } catch { /* bridge is best-effort */ }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const supabase = getSupabaseClient();
            if (!supabase) { setError('Serviço de autenticação indisponível'); setLoading(false); return; }
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) {
                setError(authError.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : authError.message);
            } else {
                await bridgeMember(email);
                router.push(returnUrl);
            }
        } catch {
            setError('Erro ao autenticar');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) { setError('Serviço de autenticação indisponível'); return; }
        const target = email || prompt('Digite seu email para recuperação:') || '';
        if (!target) return;
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(target, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        });
        if (resetErr) { setError(resetErr.message); }
        else { setForgotSent(true); }
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
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                            <Shield className="w-8 h-8 text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Intelink</h1>
                    <p className="text-slate-400 text-sm">Inteligência Policial</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-4">
                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-400 text-xs mb-1.5 block">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-slate-500 hover:text-cyan-400 text-xs transition-colors"
                            >
                                Esqueceu a senha?
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    {forgotSent && (
                        <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-sm text-emerald-300">
                            Link de recuperação enviado para {email || 'seu email'}. Verifique sua caixa de entrada.
                        </div>
                    )}

                    {/* Divider */}
                    {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && (
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-slate-700" />
                            <span className="text-slate-600 text-xs">ou</span>
                            <div className="flex-1 h-px bg-slate-700" />
                        </div>
                    )}

                    {/* AUTH-013d: Telegram Login Widget */}
                    {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME && (
                        <div className="mt-3">
                            <div ref={telegramWidgetRef} className="flex justify-center" />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Back */}
                <div className="text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-slate-500 hover:text-slate-300 text-sm inline-flex items-center gap-1.5 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Continuar sem login
                    </button>
                </div>
            </div>
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
