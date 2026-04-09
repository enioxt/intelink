'use client';

import { useState } from 'react';
import { 
  GitCompare, Brain, Target, Clock, MapPin, Users, 
  FileText, ArrowRight, CheckCircle, AlertCircle, Search,
  BarChart3, Fingerprint, ChevronRight, Filter, Download
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { BenfordWidget, generateDemoData } from '@/components/tools/BenfordWidget';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// Mock cases for comparison
const MOCK_CASES = [
  { 
    id: 'REDS-2024-001234', 
    title: 'Furto em residência - Bairro Funcionários',
    date: '2024-03-15',
    location: 'Belo Horizonte, MG',
    modusOperandi: ['Arrombamento', 'Durante o dia', 'Sem testemunhas'],
    riskScore: 85,
    status: 'active'
  },
  { 
    id: 'REDS-2024-001892', 
    title: 'Furto em residência - Bairro Savassi',
    date: '2024-04-02',
    location: 'Belo Horizonte, MG',
    modusOperandi: ['Arrombamento', 'Durante o dia', 'Porta dos fundos'],
    riskScore: 78,
    status: 'active'
  },
  { 
    id: 'REDS-2023-008921', 
    title: 'Furto em residência - Bairro Lourdes',
    date: '2023-11-20',
    location: 'Belo Horizonte, MG',
    modusOperandi: ['Arrombamento', 'Final de semana', 'Sem alarme'],
    riskScore: 72,
    status: 'closed'
  },
];

// Pattern matching data
const PATTERN_DATA = [
  { subject: 'Horário', A: 80, B: 85, C: 60, fullMark: 100 },
  { subject: 'Local', A: 70, B: 75, C: 65, fullMark: 100 },
  { subject: 'Método', A: 90, B: 85, C: 70, fullMark: 100 },
  { subject: 'Alvo', A: 75, B: 80, C: 55, fullMark: 100 },
  { subject: 'Fuga', A: 60, B: 65, C: 50, fullMark: 100 },
  { subject: 'Timing', A: 85, B: 90, C: 70, fullMark: 100 },
];

// Timeline data
const TIMELINE_EVENTS = [
  { time: '14:30', case: 'REDS-2024-001234', event: 'Entrada do suspeito', type: 'entry' },
  { time: '14:35', case: 'REDS-2024-001892', event: 'Entrada do suspeito', type: 'entry' },
  { time: '14:45', case: 'REDS-2024-001234', event: 'Alarme desativado', type: 'action' },
  { time: '14:50', case: 'REDS-2024-001892', event: 'Saída pelo fundo', type: 'exit' },
  { time: '15:00', case: 'REDS-2024-001234', event: 'Saída pelo fundo', type: 'exit' },
];

interface ComparisonResult {
  similarity: number;
  matchedPatterns: string[];
  uniqueTraits: string[];
  recommendation: string;
}

export default function AnalysisPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCases, setSelectedCases] = useState<string[]>(['REDS-2024-001234', 'REDS-2024-001892']);
  const [activeTab, setActiveTab] = useState<'mo' | 'patterns' | 'timeline'>('mo');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCase = (caseId: string) => {
    setSelectedCases(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const selectedCaseData = MOCK_CASES.filter(c => selectedCases.includes(c.id));

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Análise de Padrões</h1>
              <p className="text-sm text-neutral-500">
                Modus Operandi, correlações cross-case e análise comportamental
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                <Brain className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Case Selector */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-400" />
                Selecionar Casos para Comparação
              </h3>
              <span className="text-sm text-neutral-500">
                {selectedCases.length} casos selecionados
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {MOCK_CASES.map((caseItem) => {
                const isSelected = selectedCases.includes(caseItem.id);
                return (
                  <div
                    key={caseItem.id}
                    onClick={() => toggleCase(caseItem.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs mb-2 ${
                            caseItem.status === 'active' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-neutral-500/20 text-neutral-400'
                          }`}
                        >
                          {caseItem.status === 'active' ? 'Ativo' : 'Fechado'}
                        </Badge>
                        <p className="font-mono text-xs text-neutral-500">{caseItem.id}</p>
                        <p className="text-sm font-medium mt-1 line-clamp-2">{caseItem.title}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {caseItem.date}
                      <MapPin className="w-3 h-3 ml-2" />
                      {caseItem.location}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'mo' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('mo')}
              className={activeTab === 'mo' ? 'bg-blue-600' : ''}
            >
              <Target className="w-4 h-4 mr-2" />
              Modus Operandi
            </Button>
            <Button
              variant={activeTab === 'patterns' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('patterns')}
              className={activeTab === 'patterns' ? 'bg-blue-600' : ''}
            >
              <Fingerprint className="w-4 h-4 mr-2" />
              Padrões Comportamentais
            </Button>
            <Button
              variant={activeTab === 'timeline' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('timeline')}
              className={activeTab === 'timeline' ? 'bg-blue-600' : ''}
            >
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </Button>
          </div>

          {/* MO Comparison Tab */}
          {activeTab === 'mo' && (
            <div className="grid grid-cols-3 gap-6">
              {/* Comparison Table */}
              <GlassCard className="col-span-2">
                <h3 className="font-semibold mb-4">Comparação de Características</h3>
                <div className="space-y-4">
                  {selectedCaseData.map((caseItem, index) => (
                    <div key={caseItem.id} className="p-4 rounded-lg bg-white/[0.03]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-mono text-xs text-neutral-500">{caseItem.id}</p>
                          <p className="font-medium">{caseItem.title}</p>
                        </div>
                        <Badge 
                          className={`
                            ${caseItem.riskScore >= 80 ? 'bg-red-500/20 text-red-400' :
                              caseItem.riskScore >= 70 ? 'bg-amber-500/20 text-amber-400' :
                              'bg-emerald-500/20 text-emerald-400'}
                          `}
                        >
                          Risco: {caseItem.riskScore}%
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {caseItem.modusOperandi.map((trait, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Analysis */}
                <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h4 className="font-medium text-purple-400 flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4" />
                    Análise IA — Similaridade Detectada
                  </h4>
                  <p className="text-sm text-neutral-300">
                    Casos compartilham 3 padrões: <strong>arrombamento durante o dia</strong>, 
                    <strong> sem testemunhas</strong>, e <strong>mesmo perfil de alvo</strong>. 
                    Probabilidade de mesmo autor: <span className="text-red-400 font-bold">87%</span>
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Análise
                    </Button>
                    <Button size="sm" className="bg-purple-600">
                      Gerar Relatório
                    </Button>
                  </div>
                </div>
              </GlassCard>

              {/* Pattern Radar */}
              <GlassCard>
                <h3 className="font-semibold mb-4">Perfil Comportamental</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={PATTERN_DATA}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar
                        name="Caso A"
                        dataKey="A"
                        stroke="#13b6ec"
                        strokeWidth={2}
                        fill="#13b6ec"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Caso B"
                        dataKey="B"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fill="#a855f7"
                        fillOpacity={0.3}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#050508',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#13b6ec]" />
                    Caso A
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#a855f7]" />
                    Caso B
                  </span>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Behavioral Patterns */}
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-purple-400" />
                  Padrões Detectados
                </h3>
                <div className="space-y-3">
                  {[
                    { pattern: 'Horário consistente (14h-15h)', confidence: 95, type: 'temporal' },
                    { pattern: 'Preferência por fundos', confidence: 88, type: 'spatial' },
                    { pattern: 'Desativa alarmes', confidence: 76, type: 'technical' },
                    { pattern: 'Sem violência', confidence: 92, type: 'behavioral' },
                    { pattern: 'Fuga rápida (< 15min)', confidence: 84, type: 'temporal' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                      <div>
                        <p className="text-sm font-medium">{item.pattern}</p>
                        <p className="text-xs text-neutral-500 capitalize">{item.type}</p>
                      </div>
                      <Badge 
                        className={`
                          ${item.confidence >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                            item.confidence >= 80 ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'}
                        `}
                      >
                        {item.confidence}% confiança
                      </Badge>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Benford Analysis */}
              <BenfordWidget 
                data={generateDemoData('anomalous')} 
                title="Análise de Valores (Benford)"
              />

              {/* Pattern History */}
              <GlassCard className="col-span-2">
                <h3 className="font-semibold mb-4">Histórico de Ocorrências Similares</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { month: 'Jan', ocorrencias: 12, resolvidas: 8 },
                      { month: 'Fev', ocorrencias: 15, resolvidas: 10 },
                      { month: 'Mar', ocorrencias: 18, resolvidas: 12 },
                      { month: 'Abr', ocorrencias: 14, resolvidas: 11 },
                      { month: 'Mai', ocorrencias: 20, resolvidas: 14 },
                      { month: 'Jun', ocorrencias: 16, resolvidas: 13 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#050508',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="ocorrencias" fill="#ef4444" name="Ocorrências" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="resolvidas" fill="#22c55e" name="Resolvidas" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <GlassCard>
              <h3 className="font-semibold mb-4">Timeline Comparativa</h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-20 top-0 bottom-0 w-px bg-white/[0.12]" />
                
                <div className="space-y-4">
                  {TIMELINE_EVENTS.map((event, i) => (
                    <div key={i} className="flex items-center gap-6">
                      {/* Time */}
                      <div className="w-16 text-right font-mono text-sm text-neutral-400">
                        {event.time}
                      </div>
                      
                      {/* Dot */}
                      <div className={`
                        w-3 h-3 rounded-full border-2 relative z-10
                        ${event.type === 'entry' ? 'bg-emerald-500 border-emerald-500' :
                          event.type === 'exit' ? 'bg-red-500 border-red-500' :
                          'bg-amber-500 border-amber-500'}
                      `} />
                      
                      {/* Content */}
                      <div className="flex-1 p-3 rounded-lg bg-white/[0.03]">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {event.case}
                          </Badge>
                          <span className={`
                            text-xs capitalize
                            ${event.type === 'entry' ? 'text-emerald-400' :
                              event.type === 'exit' ? 'text-red-400' :
                              'text-amber-400'}
                          `}>
                            {event.type}
                          </span>
                        </div>
                        <p className="text-sm">{event.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Correlação Temporal Detectada
                </h4>
                <p className="text-sm text-neutral-300">
                  Ambos os casos apresentam entrada entre 14:30-14:35 e saída entre 14:50-15:00, 
                  indicando <strong>tempo de permanência consistente de ~30 minutos</strong>. 
                  Sugere autor conhecimento prévio do layout das residências.
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </main>
    </div>
  );
}
