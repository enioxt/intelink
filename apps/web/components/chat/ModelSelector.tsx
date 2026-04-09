'use client';

import { useState, useEffect } from 'react';
import { Cpu, Cloud, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  isLocal: boolean;
  onChange: (isLocal: boolean) => void;
}

const LOCAL_MODELS = {
  'llama3.2': { name: 'Llama 3.2', recommended: true },
  'qwen2.5': { name: 'Qwen 2.5', recommended: true },
  'mistral': { name: 'Mistral', recommended: true },
  'phi4': { name: 'Phi-4', recommended: false },
  'gemma2': { name: 'Gemma 2', recommended: false },
};

const REMOTE_MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'alibaba/qwen-plus', name: 'Qwen Plus', provider: 'Alibaba' },
];

export function ModelSelector({ isLocal, onChange }: ModelSelectorProps) {
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setLocalModels(data.models?.map((m: any) => m.name) || []);
        setIsOllamaRunning(true);
      } else {
        setIsOllamaRunning(false);
      }
    } catch {
      setIsOllamaRunning(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors",
        isLocal 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
          : "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
      )}>
        {isLocal ? <Cpu className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {isLocal ? 'Local' : 'Remoto'}: {selectedModel}
        </span>
        <span className="sm:hidden">
          {isLocal ? '🏠' : '☁️'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72">
        {/* Local Models */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-500" />
          Modelos Locais (Ollama)
          {!isOllamaRunning && (
            <Badge variant="destructive" className="text-xs ml-auto">Offline</Badge>
          )}
        </DropdownMenuLabel>
        
        {isOllamaRunning ? (
          localModels.length > 0 ? (
            localModels.map((model) => (
              <DropdownMenuItem
                key={model}
                onClick={() => {
                  setSelectedModel(model);
                  onChange(true);
                }}
                className="flex items-center justify-between"
              >
                <span className="truncate">{model}</span>
                {selectedModel === model && isLocal && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-neutral-500">Nenhum modelo encontrado</span>
            </DropdownMenuItem>
          )
        ) : (
          <div className="px-2 py-2 text-sm text-neutral-500">
            <p>Ollama não está rodando</p>
            <p className="text-xs mt-1">
              Execute: <code className="bg-neutral-800 px-1 rounded">ollama serve</code>
            </p>
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Remote Models */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-blue-500" />
          Modelos Remotos
        </DropdownMenuLabel>
        
        {REMOTE_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => {
              setSelectedModel(model.name);
              onChange(false);
            }}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span>{model.name}</span>
              <span className="text-xs text-neutral-500">{model.provider}</span>
            </div>
            {selectedModel === model.name && !isLocal && (
              <Check className="w-4 h-4 text-blue-500" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2 text-xs text-neutral-500">
          <p className="font-medium text-neutral-400">Privacidade:</p>
          <p>• Modelos locais: dados não saem do ambiente</p>
          <p>• Modelos remotos: dados processados externamente</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
