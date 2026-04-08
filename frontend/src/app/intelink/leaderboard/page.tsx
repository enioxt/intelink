'use client';

import { useEffect, useState } from 'react';
import { Trophy, Users, Building2, Bell, HelpCircle, Plus, Info, ExternalLink } from 'lucide-react';
import { PageHelp } from '@/components/intelink/PageHelp';

interface LeaderRow { name: string; points: number }
interface SuggestionItem { id: string; term: string; suggestion: string; severity: 'warn'|'error'; category?: string|null; delegacia?: string|null; user?: string|null; notes?: string|null; ts: string }

// Mock data para demonstração
const MOCK_USERS: LeaderRow[] = [
  { name: "Investigador Silva", points: 34 },
  { name: "Perito Costa", points: 28 },
  { name: "Delegado Santos", points: 22 },
  { name: "Analista Oliveira", points: 18 },
  { name: "Agente Ferreira", points: 15 },
  { name: "Escrivão Almeida", points: 12 },
];

const MOCK_DELEGACIAS: LeaderRow[] = [
  { name: "1ª DP - Centro", points: 89 },
  { name: "5ª DP - Homicídios", points: 76 },
  { name: "3ª DP - Patrimônio", points: 64 },
  { name: "DEIC", points: 58 },
  { name: "7ª DP - Roubo e Furto", points: 45 },
];

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|undefined>(undefined);
  const [topUsers, setTopUsers] = useState<LeaderRow[]>([]);
  const [topDelegacias, setTopDelegacias] = useState<LeaderRow[]>([]);
  const [recent, setRecent] = useState<SuggestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [showUsers, setShowUsers] = useState(true);
  const [showDelegacias, setShowDelegacias] = useState(true);
  const [showRecent, setShowRecent] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8042/api/v1/intelink';
    async function load() {
      try {
        setLoading(true);
        setError(undefined);
        const res = await fetch(`${API_URL}/leaderboard`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`leaderboard ${res.status}`);
        const data = await res.json();
        const hasData = (data.top_users?.length > 0) || (data.top_delegacias?.length > 0);
        if (!hasData) {
          // Use mock data for empty state
          setUseMock(true);
          setTopUsers(MOCK_USERS);
          setTopDelegacias(MOCK_DELEGACIAS);
          setTotal(147);
        } else {
          setTopUsers(data.top_users || []);
          setTopDelegacias(data.top_delegacias || []);
          setRecent(data.recent || []);
          setTotal(data.total_suggestions || 0);
        }
      } catch (e: any) {
        // On error, show mock data
        setUseMock(true);
        setTopUsers(MOCK_USERS);
        setTopDelegacias(MOCK_DELEGACIAS);
        setTotal(147);
        setError(undefined); // Don't show error, just use mock
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Mock Data Banner */}
      {useMock && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
            <strong>Dados de Demonstração:</strong> Exibindo mock data para visualização. Quando houver contribuições reais, os dados abaixo serão substituídos automaticamente.
          </div>
        </div>
      )}

      {/* Help Section */}
      <PageHelp
        title="Sistema de Leaderboard e Contribuições"
        description="Acompanhe as contribuições da equipe para melhoria do dicionário de dados e correções. Usuários e delegacias ganham pontos por sugestões validadas."
        tips={[
          "Sugestões de erro (severity=error) valem 2 pontos",
          "Sugestões de alerta (severity=warn) valem 1 ponto",
          "Pontos podem ser atribuídos manualmente aos membros da equipe",
          "Toda ação é rastreada para auditoria completa",
          "Equipe pode votar em mudanças de privacidade nas configurações"
        ]}
        variant="compact"
      />

      {/* Como Funciona - Always show when no real data */}
      {useMock && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <HelpCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">
                Como Funciona o Sistema de Pontos
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                O leaderboard incentiva contribuições da equipe para melhoria contínua do sistema.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Métricas de Pontuação
                  </h4>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                    <li>• <strong>Erro crítico:</strong> 2 pontos</li>
                    <li>• <strong>Alerta/sugestão:</strong> 1 ponto</li>
                    <li>• <strong>Pontos manuais:</strong> Variável</li>
                  </ul>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Como Contribuir
                  </h4>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                    <li>• Envie correções de dicionário</li>
                    <li>• Reporte erros encontrados</li>
                    <li>• Sugira melhorias de dados</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button 
                  onClick={() => window.alert('Em breve: Formulário de envio de sugestões. Por ora, use o chatbot para reportar correções.')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Enviar Sugestão
                </button>
                <button 
                  onClick={() => window.alert('Em breve: Interface de atribuição de pontos para membros da equipe.')}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Atribuir Pontos
                </button>
                <a 
                  href="/intelink/docs"
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver Documentação
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-600"/> Leaderboard & Sugestões</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Contribuições dos usuários para melhoria do dicionário e correções. Total de sugestões: {total}</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showUsers} onChange={e=>setShowUsers(e.target.checked)} /> Mostrar usuários</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDelegacias} onChange={e=>setShowDelegacias(e.target.checked)} /> Mostrar delegacias</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showRecent} onChange={e=>setShowRecent(e.target.checked)} /> Mostrar recentes</label>
        </div>
      </div>

      {error && (<div className="p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>)}
      {loading && (<div className="text-slate-600">Carregando...</div>)}

      {!loading && showUsers && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Users className="h-5 w-5"/> Top Usuários</h2>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topUsers.map((u, i) => (
              <li key={u.name + i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <span className="text-sm font-medium">{u.name}</span>
                <span className="text-sm font-bold">{u.points} pts</span>
              </li>
            ))}
            {topUsers.length === 0 && (<li className="text-sm text-slate-600">Sem dados.</li>)}
          </ul>
        </section>
      )}

      {!loading && showDelegacias && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Building2 className="h-5 w-5"/> Top Delegacias</h2>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topDelegacias.map((d, i) => (
              <li key={d.name + i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <span className="text-sm font-medium">{d.name}</span>
                <span className="text-sm font-bold">{d.points} pts</span>
              </li>
            ))}
            {topDelegacias.length === 0 && (<li className="text-sm text-slate-600">Sem dados.</li>)}
          </ul>
        </section>
      )}

      {!loading && showRecent && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Bell className="h-5 w-5"/> Sugestões recentes</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700 text-slate-600">
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Usuário</th>
                  <th className="py-2 pr-3">Delegacia</th>
                  <th className="py-2 pr-3">Termo</th>
                  <th className="py-2 pr-3">Sugestão</th>
                  <th className="py-2 pr-3">Sev.</th>
                  <th className="py-2">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3 text-slate-500">{new Date(s.ts).toLocaleString('pt-BR')}</td>
                    <td className="py-2 pr-3">{s.user || 'anon'}</td>
                    <td className="py-2 pr-3">{s.delegacia || '-'}</td>
                    <td className="py-2 pr-3">{s.term}</td>
                    <td className="py-2 pr-3 font-medium">{s.suggestion}</td>
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded ${s.severity==='error'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{s.severity}</span></td>
                    <td className="py-2">{s.category || '-'}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={7} className="py-3 text-slate-600">Sem sugestões recentes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
