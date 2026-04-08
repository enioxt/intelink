'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, Shield, Palette, Save, LogOut, ArrowLeft } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabaseClient';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  unit: string;
}

interface Preferences {
  theme: 'light' | 'dark' | 'system';
  itemsPerPage: number;
  language: string;
  defaultSort: string;
}

interface NotificationSettings {
  emailOnJobComplete: boolean;
  emailOnImportantDocs: boolean;
  dailySummary: boolean;
  summaryFrequency: 'daily' | 'weekly';
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User Profile
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: '',
    unit: '',
  });

  // Preferences
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'system',
    itemsPerPage: 20,
    language: 'pt-BR',
    defaultSort: 'created_at',
  });

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailOnJobComplete: false,
    emailOnImportantDocs: false,
    dailySummary: false,
    summaryFrequency: 'daily',
  });

  // Load data on mount
  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // TEMPORARY: Modo teste sem autenticação
      // TODO: Re-enable auth after testing phase
      /*
      const supabase = getBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/intelink/auth/login');
        return;
      }

      // Set profile from Supabase
      setProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        role: user.user_metadata?.role || '',
        unit: user.user_metadata?.unit || '',
      });
      */

      // Modo Teste: Dados mocados
      setProfile({
        name: 'Usuário Teste',
        email: 'teste@intelink.dev',
        role: 'Investigador',
        unit: 'Delegacia de Homicídios - SP',
      });

      // Load preferences from localStorage
      const storedPrefs = localStorage.getItem('intelink_preferences');
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }

      const storedNotifs = localStorage.getItem('intelink_notifications');
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs));
      }

    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      // TEMPORARY: Modo teste sem autenticação
      /*
      const supabase = getBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: profile.name,
          role: profile.role,
          unit: profile.unit,
        },
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
      */
      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = () => {
    try {
      localStorage.setItem('intelink_preferences', JSON.stringify(preferences));
      setSuccess('Preferências salvas!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar preferências');
    }
  };

  const saveNotifications = () => {
    try {
      localStorage.setItem('intelink_notifications', JSON.stringify(notifications));
      setSuccess('Notificações atualizadas!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar notificações');
    }
  };

  const handleLogout = async () => {
    try {
      // TEMPORARY: Modo teste sem autenticação
      /*
      const supabase = getBrowserClient();
      await supabase.auth.signOut();
      localStorage.removeItem('intelink_token');
      router.push('/intelink/auth/login');
      */
      
      // Just clear local storage in test mode
      localStorage.removeItem('intelink_preferences');
      localStorage.removeItem('intelink_notifications');
      router.push('/intelink');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Erro ao fazer logout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Configurações
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Gerencie suas preferências e informações pessoais
          </p>
        </div>
        <button
          onClick={() => router.push('/intelink')}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Section 1: Perfil do Usuário */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Perfil do Usuário
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email Institucional
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">
              Email não pode ser alterado
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Cargo/Função
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Ex: Delegado, Investigador"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Unidade/Delegacia
              </label>
              <input
                type="text"
                value={profile.unit}
                onChange={(e) => setProfile({ ...profile, unit: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="Ex: DEIC, DRCPIM"
              />
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>

      {/* Section 2: Preferências de Interface */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Preferências de Interface
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tema
            </label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="system">Sistema</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Itens por Página
            </label>
            <select
              value={preferences.itemsPerPage}
              onChange={(e) => setPreferences({ ...preferences, itemsPerPage: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ordenação Padrão
            </label>
            <select
              value={preferences.defaultSort}
              onChange={(e) => setPreferences({ ...preferences, defaultSort: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="created_at">Data de Criação</option>
              <option value="updated_at">Data de Atualização</option>
              <option value="title">Título</option>
            </select>
          </div>

          <button
            onClick={savePreferences}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Save className="h-4 w-4" />
            Salvar Preferências
          </button>
        </div>
      </div>

      {/* Section 3: Notificações */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Notificações
          </h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.emailOnJobComplete}
              onChange={(e) => setNotifications({ ...notifications, emailOnJobComplete: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Email quando job completa
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Receba notificação quando processamento terminar
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.emailOnImportantDocs}
              onChange={(e) => setNotifications({ ...notifications, emailOnImportantDocs: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Email para documentos importantes
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Alertas sobre documentos marcados como prioritários
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.dailySummary}
              onChange={(e) => setNotifications({ ...notifications, dailySummary: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Resumos periódicos
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Receba resumo de atividades por email
              </p>
            </div>
          </label>

          {notifications.dailySummary && (
            <div className="ml-8">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Frequência dos Resumos
              </label>
              <select
                value={notifications.summaryFrequency}
                onChange={(e) => setNotifications({ ...notifications, summaryFrequency: e.target.value as any })}
                className="w-full max-w-xs px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          )}

          <button
            onClick={saveNotifications}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Save className="h-4 w-4" />
            Salvar Notificações
          </button>
        </div>
      </div>

      {/* Section 4: Segurança */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Segurança
          </h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
              Alterar Senha
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Use o sistema Supabase para alterar sua senha de forma segura
            </p>
            <button
              onClick={() => {
                // In production, this would trigger Supabase password reset email
                alert('Funcionalidade em desenvolvimento. Em breve você receberá um email para redefinir sua senha.');
              }}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Solicitar Redefinição de Senha
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
              Sessão Atual
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Você está conectado como: <strong>{profile.email}</strong>
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Fazer Logout
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Sacred Code:</strong> 000.369.963.1618 (∞△⚡◎φ)
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Sistema protegido por Sacred Mathematics e ETHIK tokens
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
