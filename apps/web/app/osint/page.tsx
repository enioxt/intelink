'use client';

import { useState } from 'react';
import { 
  Shield, Globe, ImageIcon, Search, User, Mail, 
  Server, Smartphone, ArrowRight, Loader2 
} from 'lucide-react';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { HIBPCard } from '@/components/tools/HIBPCard';
import { ShodanCard } from '@/components/tools/ShodanCard';
import { ImageAnalysisCard } from '@/components/tools/ImageAnalysisCard';

interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
  inputType: 'text' | 'email' | 'ip' | 'file';
  color: string;
}

const TOOLS: ToolConfig[] = [
  {
    id: 'hibp',
    name: 'Have I Been Pwned',
    description: 'Verifique se um email foi vazado em breaches conhecidos',
    icon: Shield,
    placeholder: 'email@exemplo.com',
    inputType: 'email',
    color: 'text-red-400',
  },
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Análise de infraestrutura e dispositivos conectados',
    icon: Globe,
    placeholder: '192.168.1.1 ou dominio.com',
    inputType: 'ip',
    color: 'text-blue-400',
  },
  {
    id: 'image',
    name: 'Análise de Imagem',
    description: 'Extração de metadados EXIF e dados forenses',
    icon: ImageIcon,
    placeholder: 'Selecione uma imagem...',
    inputType: 'file',
    color: 'text-purple-400',
  },
  {
    id: 'username',
    name: 'Busca por Username',
    description: 'Verificar presença em redes sociais (placeholder)',
    icon: User,
    placeholder: 'username',
    inputType: 'text',
    color: 'text-amber-400',
  },
  {
    id: 'phone',
    name: 'Validação Telefone',
    description: 'Validar e formatar números de telefone BR (placeholder)',
    icon: Smartphone,
    placeholder: '(31) 98765-4321',
    inputType: 'text',
    color: 'text-emerald-400',
  },
  {
    id: 'domain',
    name: 'Análise de Domínio',
    description: 'WHOIS, DNS, e histórico de domínio (placeholder)',
    icon: Server,
    placeholder: 'exemplo.com.br',
    inputType: 'text',
    color: 'text-cyan-400',
  },
];

// Mock results for demo
const MOCK_HIBP_RESULT = {
  email: 'usuario@gmail.com',
  breaches_found: 3,
  breaches: [
    { name: 'Adobe', title: 'Adobe', domain: 'adobe.com', breach_date: '2013-10-04', data_classes: ['Email addresses', 'Passwords'], is_verified: true, is_sensitive: false },
    { name: 'LinkedIn', title: 'LinkedIn', domain: 'linkedin.com', breach_date: '2012-05-05', data_classes: ['Email addresses', 'Passwords', 'Usernames'], is_verified: true, is_sensitive: false },
  ],
  exposed_data_types: ['Email addresses', 'Passwords', 'Usernames'],
  high_risk_data: ['Passwords'],
  risk_level: 'high' as const,
  status: 'compromised' as const,
  recommendation: 'Altere suas senhas imediatamente e ative 2FA.'
};

const MOCK_SHODAN_RESULT = {
  ip: '192.168.1.1',
  ports: [80, 443, 8080, 22],
  hostnames: ['router.local'],
  city: 'São Paulo',
  country: 'Brasil',
  isp: 'Vivo',
  os: 'Linux',
  last_update: '2026-04-08',
  vulnerabilities: { total: 2, critical: 0, high: 1, medium: 1, low: 0, list: [{ cve: 'CVE-2023-1234', severity: 'high' as const, summary: 'Vulnerabilidade SSH' }] },
  risk_indicators: ['Porta 22 aberta', 'Serviço web não-padrão'],
  risk_level: 'medium' as const,
  query_url: 'https://www.shodan.io/host/192.168.1.1'
};

export default function OSINTPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string>('hibp');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!inputValue.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock results based on tool
    if (selectedTool === 'hibp') {
      setResult({ type: 'hibp', data: MOCK_HIBP_RESULT });
    } else if (selectedTool === 'shodan') {
      setResult({ type: 'shodan', data: MOCK_SHODAN_RESULT });
    }
    
    setIsLoading(false);
  };

  const activeTool = TOOLS.find(t => t.id === selectedTool)!;
  const ActiveIcon = activeTool.icon;

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">OSINT Brasil</h1>
              <p className="text-sm text-neutral-500">
                Open Source Intelligence para investigações
              </p>
            </div>
            <Badge variant="outline" className="border-red-500/30 text-red-400">
              <Shield className="w-3 h-3 mr-1" />
              LGPD Compliant
            </Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Tool Selector */}
          <div className="grid grid-cols-3 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = selectedTool === tool.id;
              
              return (
                <GlassCard
                  key={tool.id}
                  hover
                  onClick={() => {
                    setSelectedTool(tool.id);
                    setInputValue('');
                    setResult(null);
                  }}
                  className={isActive ? 'border-white/[0.12] bg-white/[0.06]' : ''}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-white/[0.03] ${tool.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{tool.name}</h3>
                      <p className="text-sm text-neutral-500 mt-1">{tool.description}</p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Search Area */}
          <GlassCard elevated>
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-2 rounded-lg bg-white/[0.03] ${activeTool.color}`}>
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold">{activeTool.name}</h2>
                <p className="text-sm text-neutral-500">{activeTool.description}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  type={activeTool.inputType === 'email' ? 'email' : 'text'}
                  placeholder={activeTool.placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="bg-neutral-900/50 border-neutral-800 h-12"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !inputValue.trim()}
                className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-neutral-600 mt-3">
              💡 Dica: {activeTool.inputType === 'email' && 'Verificamos apenas se o email aparece em vazamentos públicos. Não armazenamos a consulta.'}
              {activeTool.inputType === 'ip' && 'Análise de portas abertas, serviços e vulnerabilidades conhecidas.'}
              {activeTool.inputType === 'file' && 'Metadados EXIF são extraídos localmente. A imagem não é enviada a servidores externos.'}
            </p>
          </GlassCard>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Resultado</h3>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                  Limpar
                </Button>
              </div>
              
              {result.type === 'hibp' && <HIBPCard result={result.data} />}
              {result.type === 'shodan' && <ShodanCard result={result.data} />}
            </div>
          )}

          {/* Info Cards */}
          {!result && (
            <div className="grid grid-cols-2 gap-4">
              <GlassCard>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Privacidade
                </h4>
                <p className="text-sm text-neutral-400">
                  Todas as consultas OSINT são processadas com mascaramento de dados pessoais. 
                  Logs são anonimizados automaticamente.
                </p>
              </GlassCard>
              
              <GlassCard>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Fontes
                </h4>
                <p className="text-sm text-neutral-400">
                  Dados agregados de Have I Been Pwned, Shodan, CNPJ, BNMP, CEAP e outras 
                  fontes públicas brasileiras.
                </p>
              </GlassCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
