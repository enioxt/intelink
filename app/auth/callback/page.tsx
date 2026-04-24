'use client';

/**
 * Auth Callback Page
 * 
 * Handles the OAuth redirect from GitHub via Supabase.
 * Exchanges the code for a session and redirects to the return URL.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Suspense } from 'react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Authenticating...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const supabase = getSupabaseClient();
                if (!supabase) {
                    setStatus('error');
                    setMessage('Authentication service not available');
                    return;
                }

                // Supabase automatically handles the code exchange
                // when detectSessionInUrl is true (which it is in our client config)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[Auth Callback] Error:', error);
                    setStatus('error');
                    setMessage(error.message);
                    return;
                }

                if (session) {
                    setStatus('success');
                    setMessage(`Bem-vindo, ${session.user.user_metadata?.full_name || session.user.email}!`);

                    // Bridge Supabase → intelink_member_id
                    if (session.user.email) {
                        const bridgeRes = await fetch(`/api/auth/bridge`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({ email: session.user.email }),
                        });

                        if (!bridgeRes.ok) {
                            const bridgeError = await bridgeRes.json().catch(() => ({}));
                            setStatus('error');
                            setMessage(bridgeError.error || 'Falha ao vincular a sessão ao membro');
                            return;
                        }

                        const d = await bridgeRes.json();
                        if (d?.member_id) {
                            localStorage.setItem('intelink_member_id', d.member_id);
                            localStorage.setItem('intelink_role', d.system_role || 'member');
                            if (d.telegram_chat_id) localStorage.setItem('intelink_chat_id', String(d.telegram_chat_id));
                            else if (d.phone) localStorage.setItem('intelink_chat_id', d.phone);
                        }
                    }

                    // Brief delay to show success message
                    setTimeout(() => {
                        router.push(returnUrl);
                    }, 1500);
                } else {
                    setStatus('error');
                    setMessage('Authentication failed. Please try again.');
                }
            } catch (err) {
                console.error('[Auth Callback] Error:', err);
                setStatus('error');
                setMessage('An unexpected error occurred');
            }
        };

        handleCallback();
    }, [router, returnUrl]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
                        <p className="text-slate-400">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
                        <p className="text-white font-medium">{message}</p>
                        <p className="text-slate-500 text-sm mt-2">Redirecting...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400 font-medium">{message}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm underline"
                        >
                            Back to login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
