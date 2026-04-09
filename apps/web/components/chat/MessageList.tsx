'use client';

import { useEffect, useRef } from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HIBPCard } from '@/components/tools/HIBPCard';
import { ShodanCard } from '@/components/tools/ShodanCard';
import { ImageAnalysisCard } from '@/components/tools/ImageAnalysisCard';
import { CNPJCard } from '@/components/tools/CNPJCard';
import type { Message } from '@ai-sdk/react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

// Mock tool results for demonstration
const MOCK_RESULTS = {
  hibp: {
    email: 'usuario@exemplo.com',
    breaches_found: 3,
    breaches: [
      { name: 'Adobe', title: 'Adobe', domain: 'adobe.com', breach_date: '2013-10-04', data_classes: ['Email addresses', 'Password hints', 'Passwords', 'Usernames'], is_verified: true, is_sensitive: false },
      { name: 'LinkedIn', title: 'LinkedIn', domain: 'linkedin.com', breach_date: '2012-05-05', data_classes: ['Email addresses', 'Passwords', 'Usernames'], is_verified: true, is_sensitive: false },
    ],
    exposed_data_types: ['Email addresses', 'Passwords', 'Usernames', 'Password hints'],
    high_risk_data: ['Passwords'],
    risk_level: 'high',
    status: 'compromised',
    recommendation: 'Altere suas senhas imediatamente, especialmente se reutiliza a mesma senha em múltiplos serviços. Ative autenticação de dois fatores (2FA) sempre que possível.'
  },
  shodan: {
    ip: '192.168.1.1',
    ports: [80, 443, 8080, 22],
    hostnames: ['router.local'],
    city: 'São Paulo',
    country: 'Brasil',
    isp: 'Vivo',
    os: 'Linux',
    last_update: '2026-04-08',
    vulnerabilities: { total: 2, critical: 0, high: 1, medium: 1, low: 0, list: [{ cve: 'CVE-2023-1234', severity: 'high', summary: 'Vulnerabilidade em serviço SSH' }] },
    risk_indicators: ['Porta 22 (SSH) aberta para internet', 'Serviço web em porta não-padrão (8080)'],
    risk_level: 'medium',
    query_url: 'https://www.shodan.io/host/192.168.1.1'
  },
  cnpj: {
    cnpj: '12.345.678/0001-90',
    razao_social: 'EMPRESA EXEMPLO LTDA',
    nome_fantasia: 'EXEMPLO',
    situacao: 'ATIVA',
    tipo: 'MATRIZ',
    data_abertura: '15/03/2010',
    cnae_principal: { codigo: '62.01-5-01', descricao: 'Desenvolvimento de programas de computador sob encomenda' },
    endereco: { logradouro: 'Rua das Flores', numero: '123', complemento: 'Sala 45', bairro: 'Centro', municipio: 'Belo Horizonte', uf: 'MG', cep: '30140-000' },
    telefone: '(31) 98765-4321',
    email: 'contato@exemplo.com.br',
    capital_social: 'R$ 100.000,00',
    natureza_juridica: 'Sociedade Empresária Limitada',
    qtd_funcionarios: 25,
    fonte: 'Receita Federal / BrasilAPI'
  },
  image: {
    filename: 'foto_exemplo.jpg',
    file_size: '2.4 MB',
    dimensions: '4032x3024',
    format: 'JPEG',
    has_exif: true,
    has_gps: true,
    gps: { coordinates: '-19.9191, -43.9386', latitude: -19.9191, longitude: -43.9386, google_maps: 'https://maps.google.com/?q=-19.9191,-43.9386', precision: '±5m' },
    device: { make: 'Apple', model: 'iPhone 14 Pro', software: 'iOS 17.1' },
    timestamps: { datetime_original: '2026-04-07 14:30:22', datetime_digitized: '2026-04-07 14:30:22', datetime_modified: null, timezone_offset: '-03:00' },
    camera_settings: { ISO: '100', Aperture: 'f/1.78', ShutterSpeed: '1/1200', FocalLength: '24mm' },
    risk_indicators: ['Imagem contém dados de localização GPS', 'Timestamp pode indicar padrão de movimentação'],
    osint_value: 'high',
    forensic_notes: ['Nenhuma evidência de manipulação detectada', 'EXIF completo e íntegro', 'Coordenadas GPS precisas']
  }
};

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-1 text-neutral-500">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function ToolCallPreview({ toolName }: { toolName: string }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Executando {toolName}...</span>
    </div>
  );
}

function ToolResult({ toolName, result }: { toolName: string; result: any }) {
  switch (toolName.toLowerCase()) {
    case 'hibp':
    case 'hibp_check_email':
      return <HIBPCard result={result} />;
    case 'shodan':
    case 'shodan_host_lookup':
      return <ShodanCard result={result} />;
    case 'image':
    case 'analyze_image':
      return <ImageAnalysisCard result={result} />;
    case 'cnpj':
    case 'consulta_cnpj':
      return <CNPJCard result={result} />;
    default:
      return (
        <div className="p-4 rounded-lg border border-neutral-700 bg-neutral-900/50">
          <pre className="text-xs text-neutral-400 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
}

function MessageContent({ content }: { content: string }) {
  // Check if content has tool results markers
  const hasToolResult = content.includes('__TOOL_RESULT__');
  
  if (hasToolResult) {
    // Parse tool results from content
    // In real implementation, this would come from toolResults prop
    return (
      <div className="space-y-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-neutral-200 whitespace-pre-wrap">{content.replace(/__TOOL_RESULT__.*?__END_TOOL__/gs, '')}</p>
        </div>
        
        {/* Demo: Show mock results for different queries */}
        {content.toLowerCase().includes('email') && content.toLowerCase().includes('vazado') && (
          <ToolResult toolName="hibp" result={MOCK_RESULTS.hibp} />
        )}
        {content.toLowerCase().includes('ip') && content.toLowerCase().includes('shodan') && (
          <ToolResult toolName="shodan" result={MOCK_RESULTS.shodan} />
        )}
        {content.toLowerCase().includes('cnpj') && (
          <ToolResult toolName="cnpj" result={MOCK_RESULTS.cnpj} />
        )}
        {content.toLowerCase().includes('imagem') && (
          <ToolResult toolName="image" result={MOCK_RESULTS.image} />
        )}
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <p className="text-neutral-200 whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-200">
              Bem-vindo ao EGOS Inteligência
            </h2>
            <p className="text-sm text-neutral-500 max-w-md">
              Consulte dados públicos brasileiros e execute análises OSINT via chat. 
              Seus dados permanecem privados com modelos locais.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <button className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-left text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors">
              "Verifique se email@empresa.com foi vazado"
            </button>
            <button className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-left text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors">
              "Analise o CNPJ 12.345.678/0001-90"
            </button>
            <button className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-left text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors">
              "Busque informações do IP 192.168.1.1"
            </button>
            <button className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 text-left text-sm text-neutral-400 hover:bg-neutral-800/50 transition-colors">
              "Extraia metadados desta imagem"
            </button>
          </div>
        </div>
      )}

      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isLast = index === messages.length - 1;

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-4",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                isUser 
                  ? "bg-neutral-800" 
                  : "bg-gradient-to-br from-cyan-500 to-blue-600"
              )}
            >
              {isUser ? (
                <User className="w-4 h-4 text-neutral-400" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Content */}
            <div className={cn(
              "flex-1 max-w-[85%] space-y-2",
              isUser && "text-right"
            )}>
              <div className={cn(
                "inline-block text-left",
                isUser 
                  ? "bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm"
                  : "text-neutral-200"
              )}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <MessageContent content={message.content} />
                )}
              </div>

              {/* Tool call indicator */}
              {!isUser && isLoading && isLast && (
                <ToolCallPreview toolName="Consulta em andamento" />
              )}

              {/* Timestamp (placeholder) */}
              <p className="text-xs text-neutral-600">
                {isUser ? 'Você' : 'EGOS'}
              </p>
            </div>
          </div>
        );
      })}

      {/* Streaming indicator */}
      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center h-8">
            <StreamingIndicator />
          </div>
        </div>
      )}
    </div>
  );
}
