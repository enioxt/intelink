'use client';

import { useState, useEffect } from 'react';
import { 
  Activity, Users, Database, Search, Shield, 
  Globe, FileText, TrendingUp, Clock, ArrowUpRight 
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock data - will be replaced with API calls
const ACTIVITY_DATA = [
  { name: 'Seg', consultas: 45, entidades: 12 },
  { name: 'Ter', consultas: 62, entidades: 18 },
  { name: 'Qua', consultas: 38, entidades: 8 },
  { name: 'Qui', consultas: 85, entidades: 24 },
  { name: 'Sex', consultas: 72, entidades: 19 },
  { name: 'Sáb', consultas: 28, entidades: 5 },
  { name: 'Dom', consultas: 15, entidades: 3 },
];

const TOOL_USAGE_DATA = [
  { name: 'CNPJ', value: 245, color: '#22c55e' },
  { name: 'HIBP', value: 89, color: '#ef4444' },
  { name: 'Shodan', value: 34, color: '#3b82f6' },
  { name: 'Image', value: 23, color: '#a855f7' },
  { name: 'BNMP', value: 67, color: '#f59e0b' },
];

const TRENDING_SEARCHES = [
  { query: 'CNPJ 12.345.678/0001-90', count: 45, type: 'cnpj' },
  { query: 'Mandados MG - Silva', count: 32, type: 'bnmp' },
  { query: 'Emendas Patos de Minas', count: 28, type: 'emendas' },
  { query: 'email@empresa.com vazado', count: 24, type: 'hibp' },
  { query: '192.168.1.1 análise', count: 19, type: 'shodan' },
];

const SYSTEM_STATS = {
  entities: '77M',
  sources: 12,
  routers: 26,
  queriesToday: 1247,
};

const PIPELINE_STATUS = {
  processing: 2,
  queued: 5,
  completed: 12,
};

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-neutral-500">
                Visão geral do sistema • {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                Sistema Online
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Database className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{SYSTEM_STATS.entities}</p>
                <p className="text-xs text-neutral-500">Entidades Neo4j</p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Globe className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{SYSTEM_STATS.sources}</p>
                <p className="text-xs text-neutral-500">Fontes de Dados</p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Activity className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{SYSTEM_STATS.routers}</p>
                <p className="text-xs text-neutral-500">Routers API</p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <Search className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{SYSTEM_STATS.queriesToday}</p>
                <p className="text-xs text-neutral-500">Consultas Hoje</p>
              </div>
            </GlassCard>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Activity Chart */}
            <GlassCard className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Atividade Semanal
                </h3>
                <Badge variant="secondary">Últimos 7 dias</Badge>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ACTIVITY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#050508', 
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="consultas" fill="#13b6ec" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="entidades" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Tool Usage Pie */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  Uso por Ferramenta
                </h3>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={TOOL_USAGE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {TOOL_USAGE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#050508', 
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {TOOL_USAGE_DATA.map((tool) => (
                  <div key={tool.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tool.color }} />
                    <span className="text-neutral-400">{tool.name}: {tool.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Trending Searches */}
            <GlassCard>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-500" />
                Buscas em Alta
              </h3>
              <div className="space-y-3">
                {TRENDING_SEARCHES.map((search, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-neutral-500 font-mono">#{i + 1}</span>
                      <span className="text-sm truncate max-w-[180px]">{search.query}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{search.count}</Badge>
                      <ArrowUpRight className="w-3 h-3 text-neutral-500" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* PCMG Pipeline Status */}
            <GlassCard>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" />
                PCMG Pipeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm">Processando</span>
                  </div>
                  <span className="font-mono text-emerald-400">{PIPELINE_STATUS.processing}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm">Na Fila</span>
                  </div>
                  <span className="font-mono text-amber-400">{PIPELINE_STATUS.queued}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Concluído</span>
                  </div>
                  <span className="font-mono text-blue-400">{PIPELINE_STATUS.completed}</span>
                </div>
              </div>
            </GlassCard>

            {/* System Health */}
            <GlassCard>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Saúde do Sistema
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-400">API Latency</span>
                    <span className="text-emerald-400">45ms</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-emerald-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-400">Neo4j Connections</span>
                    <span className="text-blue-400">12/50</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full w-[24%] bg-blue-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-400">Cache Hit Rate</span>
                    <span className="text-purple-400">87%</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full w-[87%] bg-purple-500 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-400">Memory Usage</span>
                    <span className="text-amber-400">62%</span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full w-[62%] bg-amber-500 rounded-full" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
