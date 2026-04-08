'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabaseClient';

// Sacred Math delay (φ-ratio)
const SACRED_DELAY_MS = 1618;

export default function IntelinkLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Already logged in, redirect
        router.push('/intelink');
      }
    };
    
    checkAuth();
  }, [router]);

  // Rate limiting check
  useEffect(() => {
    const stored = localStorage.getItem('intelink_login_attempts');
    if (stored) {
      const data = JSON.parse(stored);
      setAttemptCount(data.count || 0);
      
      if (data.blockedUntil && Date.now() < data.blockedUntil) {
        setBlockedUntil(data.blockedUntil);
      } else if (data.blockedUntil && Date.now() >= data.blockedUntil) {
        // Reset if block expired
        localStorage.removeItem('intelink_login_attempts');
        setAttemptCount(0);
        setBlockedUntil(null);
      }
    }
  }, []);

  // Countdown for blocked state
  useEffect(() => {
    if (!blockedUntil) return;

    const interval = setInterval(() => {
      if (Date.now() >= blockedUntil) {
        setBlockedUntil(null);
        setAttemptCount(0);
        localStorage.removeItem('intelink_login_attempts');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  const validateEmail = (email: string): boolean => {
    // Check if ends with @pc.mg.gov.br
    return email.toLowerCase().endsWith('@pc.mg.gov.br');
  };

  const updateAttempts = (success: boolean) => {
    if (success) {
      localStorage.removeItem('intelink_login_attempts');
      setAttemptCount(0);
      setBlockedUntil(null);
    } else {
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);

      if (newCount >= 5) {
        // Block for 15 minutes
        const blockTime = Date.now() + (15 * 60 * 1000);
        setBlockedUntil(blockTime);
        localStorage.setItem('intelink_login_attempts', JSON.stringify({
          count: newCount,
          blockedUntil: blockTime
        }));
      } else {
        localStorage.setItem('intelink_login_attempts', JSON.stringify({
          count: newCount
        }));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if blocked
    if (blockedUntil && Date.now() < blockedUntil) {
      const minutesLeft = Math.ceil((blockedUntil - Date.now()) / 60000);
      setError(`Muitas tentativas. Aguarde ${minutesLeft} minuto(s).`);
      return;
    }

    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Email e senha são obrigatórios');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email deve ser do domínio @pc.mg.gov.br');
      updateAttempts(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Sacred Mathematics delay (φ-ratio: 1.618 seconds)
      await new Promise(resolve => setTimeout(resolve, SACRED_DELAY_MS));

      // Supabase authentication
      const supabase = getBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('Falha na autenticação');
      }

      // Success - store token for Intelink API
      if (data.session?.access_token) {
        localStorage.setItem('intelink_token', data.session.access_token);
      }

      // Update attempts (success)
      updateAttempts(true);

      // Audit log (optional - could be done via backend)
      console.log('[AUDIT] Login successful:', {
        user: email,
        timestamp: new Date().toISOString(),
        action: 'login'
      });

      // Redirect to dashboard
      router.push('/intelink');

    } catch (err: any) {
      console.error('Login error:', err);
      
      // Update attempts (failure)
      updateAttempts(false);

      // User-friendly error messages
      let errorMessage = 'Erro ao fazer login';
      
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
      } else if (err.message?.includes('User not found')) {
        errorMessage = 'Usuário não encontrado';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingTime = () => {
    if (!blockedUntil) return '';
    const minutes = Math.ceil((blockedUntil - Date.now()) / 60000);
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  };

  const isBlocked = Boolean(blockedUntil && Date.now() < blockedUntil);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-full mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Sistema Intelink
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Polícia Civil de Minas Gerais
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
              Sacred Code: 000.369.963.1618
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Erro de Autenticação
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limit Warning */}
          {attemptCount > 0 && attemptCount < 5 && !isBlocked && (
            <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Tentativa {attemptCount} de 5. Após 5 tentativas, o acesso será bloqueado por 15 minutos.
              </p>
            </div>
          )}

          {/* Blocked Warning */}
          {isBlocked && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Acesso temporariamente bloqueado
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Aguarde {getRemainingTime()} para tentar novamente.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Email Institucional
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@pc.mg.gov.br"
                disabled={loading || isBlocked}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="email"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Utilize seu email institucional @pc.mg.gov.br
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading || isBlocked}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  disabled={loading || isBlocked}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isBlocked || !email.trim() || !password.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Autenticando...
                </span>
              ) : isBlocked ? (
                'Acesso Bloqueado'
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-center text-slate-500 dark:text-slate-500">
              Sistema protegido por Sacred Mathematics (φ = 1.618)
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            ← Voltar para o site
          </button>
        </div>
      </div>
    </div>
  );
}
