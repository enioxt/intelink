'use client';

/**
 * AUTH-002-TOTP: /settings/security — TOTP MFA enrollment via Supabase
 *
 * Supabase does NOT support WebAuthn natively (as of 2025).
 * Using TOTP (Time-based OTP) which IS supported natively.
 * Compatible with Google Authenticator, Authy, 1Password, etc.
 */

import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Key, AlertCircle, Loader2, QrCode, CheckCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import Image from 'next/image';

type MFAStep = 'idle' | 'qr' | 'verify' | 'done';

export default function SecuritySettingsPage() {
    const [loading, setLoading]     = useState(true);
    const [step, setStep]           = useState<MFAStep>('idle');
    const [factorId, setFactorId]   = useState('');
    const [qrCode, setQrCode]       = useState('');
    const [secret, setSecret]       = useState('');
    const [code, setCode]           = useState('');
    const [error, setError]         = useState('');
    const [hasMFA, setHasMFA]       = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
    const [sessionEmail, setSessionEmail] = useState('');

    useEffect(() => {
        const checkMFA = async () => {
            try {
                const supabase = getSupabaseClient();
                if (!supabase) return;

                // INTELINK-AUTH-015 (2026-04-22): Supabase MFA requires a Supabase session with sub claim.
                // If user authenticated only via Telegram magic link flow that failed (pre-fix), there's
                // no Supabase session here → listFactors returns 403 "missing sub claim".
                // Surface that clearly instead of a silent error.
                const { data: sessionData } = await supabase.auth.getSession();
                const session = sessionData?.session;
                if (!session?.user?.id) {
                    setHasSupabaseSession(false);
                    return;
                }
                setHasSupabaseSession(true);
                setSessionEmail(session.user.email ?? '');

                const { data } = await supabase.auth.mfa.listFactors();
                const active = data?.totp?.filter(f => f.status === 'verified') ?? [];
                setHasMFA(active.length > 0);
            } catch (e) {
                console.warn('[settings/security] checkMFA error (non-fatal):', e);
            }
            finally { setLoading(false); }
        };
        checkMFA();
    }, []);

    const handleEnroll = async () => {
        setEnrolling(true);
        setError('');
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase indisponível');
            const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
            if (enrollErr) throw enrollErr;
            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setStep('qr');
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setEnrolling(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) { setError('Código deve ter 6 dígitos'); return; }
        setVerifying(true);
        setError('');
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase indisponível');
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;
            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code,
            });
            if (verify.error) throw verify.error;
            setHasMFA(true);
            setStep('done');
        } catch (e: unknown) {
            setError((e as Error).message);
        } finally {
            setVerifying(false);
        }
    };

    const handleUnenroll = async () => {
        if (!confirm('Remover autenticação em 2 etapas? Sua conta ficará menos protegida.')) return;
        setError('');
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase indisponível');
            const { data } = await supabase.auth.mfa.listFactors();
            for (const f of data?.totp ?? []) {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
            setHasMFA(false);
            setStep('idle');
        } catch (e: unknown) {
            setError((e as Error).message);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
            <div className="max-w-xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Shield className="text-cyan-400" size={28} />
                    <div>
                        <h1 className="text-2xl font-bold">Segurança</h1>
                        <p className="text-slate-400 text-sm">Autenticação em 2 etapas (TOTP)</p>
                    </div>
                </div>

                {/* Status card */}
                <div className={`rounded-xl border p-5 mb-6 ${hasMFA ? 'bg-emerald-900/20 border-emerald-700' : 'bg-slate-900/50 border-slate-700'}`}>
                    <div className="flex items-center gap-3">
                        {hasMFA
                            ? <ShieldCheck className="text-emerald-400" size={24} />
                            : <Key className="text-slate-400" size={24} />
                        }
                        <div>
                            <p className="font-semibold">{hasMFA ? 'MFA ativo' : 'MFA desativado'}</p>
                            <p className="text-sm text-slate-400">
                                {hasMFA
                                    ? 'Sua conta está protegida com autenticação em 2 etapas'
                                    : 'Adicione uma camada extra de segurança com Google Authenticator ou similar'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4 text-sm">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                {/* No Supabase session (logged in via Telegram/custom auth only) */}
                {!hasSupabaseSession && step === 'idle' && (
                    <div className="rounded-xl border border-amber-700 bg-amber-900/20 p-5 text-sm">
                        <p className="font-semibold text-amber-300 mb-2">Sessão Supabase necessária para MFA</p>
                        <p className="text-slate-300 mb-3">
                            A autenticação em 2 etapas (TOTP) usa o serviço Supabase e precisa de uma sessão ativa.
                            Você entrou via Telegram — faça login também com seu email para ativar o MFA.
                        </p>
                        <a
                            href="/login?mode=email&returnUrl=%2Fsettings%2Fsecurity"
                            className="inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg"
                        >
                            Fazer login por email
                        </a>
                    </div>
                )}

                {/* Step: idle (with valid Supabase session) */}
                {hasSupabaseSession && step === 'idle' && !hasMFA && (
                    <>
                        {sessionEmail && (
                            <p className="text-xs text-slate-500 mb-2">Sessão: {sessionEmail}</p>
                        )}
                        <button
                            onClick={handleEnroll}
                            disabled={enrolling}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {enrolling ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
                            {enrolling ? 'Gerando QR Code...' : 'Ativar autenticação em 2 etapas'}
                        </button>
                    </>
                )}

                {/* Step: show QR */}
                {step === 'qr' && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold text-lg">1. Escaneie o QR Code</h2>
                        <p className="text-slate-400 text-sm">
                            Abra o Google Authenticator, Authy ou 1Password e escaneie o código abaixo.
                        </p>
                        <div className="flex justify-center bg-white p-4 rounded-lg">
                            <Image src={qrCode} alt="QR Code MFA" width={200} height={200} unoptimized />
                        </div>
                        <details className="text-xs text-slate-500">
                            <summary className="cursor-pointer hover:text-slate-300">Não consegue escanear? Use o código manual</summary>
                            <code className="block mt-2 bg-slate-800 px-3 py-2 rounded break-all">{secret}</code>
                        </details>
                        <button
                            onClick={() => setStep('verify')}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                        >
                            Já escaneei → Verificar código
                        </button>
                    </div>
                )}

                {/* Step: verify code */}
                {step === 'verify' && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 space-y-4">
                        <h2 className="font-semibold text-lg">2. Confirme o código</h2>
                        <p className="text-slate-400 text-sm">Digite o código de 6 dígitos do seu autenticador.</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-cyan-500"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={verifying || code.length !== 6}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {verifying ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            {verifying ? 'Verificando...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setStep('qr')} className="w-full text-slate-500 hover:text-slate-300 text-sm transition-colors">
                            ← Voltar ao QR Code
                        </button>
                    </div>
                )}

                {/* Step: done */}
                {step === 'done' && (
                    <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-6 text-center">
                        <CheckCircle className="text-emerald-400 mx-auto mb-3" size={40} />
                        <h2 className="font-semibold text-lg text-emerald-300">MFA ativado com sucesso!</h2>
                        <p className="text-slate-400 text-sm mt-2">
                            Seu próximo login vai solicitar o código do autenticador.
                        </p>
                    </div>
                )}

                {hasMFA && step !== 'done' && (
                    <button
                        onClick={handleUnenroll}
                        className="mt-6 w-full text-red-400 hover:text-red-300 text-sm border border-red-900/50 hover:border-red-700 rounded-lg py-2 transition-colors"
                    >
                        Remover autenticação em 2 etapas
                    </button>
                )}
            </div>
        </div>
    );
}
