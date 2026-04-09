'use client';

import { 
  Shield, Globe, ImageIcon, Building2, Gavel, FileText, 
  Search, Network, Video, Database, ChevronDown 
} from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'osint' | 'transparency' | 'pcmg' | 'analysis';
}

const TOOLS: Tool[] = [
  // OSINT
  { id: 'hibp', name: 'HIBP', description: 'Verificar vazamentos de email', icon: Shield, category: 'osint' },
  { id: 'shodan', name: 'Shodan', description: 'Análise de infraestrutura', icon: Globe, category: 'osint' },
  { id: 'image', name: 'Image', description: 'Forense de metadados', icon: ImageIcon, category: 'osint' },
  
  // Transparency
  { id: 'cnpj', name: 'CNPJ', description: 'Consulta de empresa', icon: Building2, category: 'transparency' },
  { id: 'bnmp', name: 'BNMP', description: 'Mandados de prisão', icon: Gavel, category: 'transparency' },
  { id: 'emendas', name: 'Emendas', description: 'Emendas parlamentares', icon: FileText, category: 'transparency' },
  { id: 'ceap', name: 'CEAP', description: 'Cota parlamentar', icon: FileText, category: 'transparency' },
  { id: 'licit', name: 'Licitações', description: 'PNCP contratos', icon: FileText, category: 'transparency' },
  
  // Analysis
  { id: 'crossref', name: 'CrossRef', description: 'Correlacionar dados', icon: Network, category: 'analysis' },
  { id: 'search', name: 'Busca', description: 'Busca na base local', icon: Search, category: 'analysis' },
  { id: 'graph', name: 'Grafo', description: 'Visualizar rede', icon: Database, category: 'analysis' },
  
  // PCMG
  { id: 'video', name: 'Vídeo', description: 'Processar vídeo', icon: Video, category: 'pcmg' },
];

const CATEGORY_CONFIG = {
  osint: { label: 'OSINT', color: 'text-red-400', bg: 'bg-red-500/10' },
  transparency: { label: 'Transparência', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  pcmg: { label: 'PCMG', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  analysis: { label: 'Análise', color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

interface ToolPaletteProps {
  selected: string[];
  onSelect: (tools: string[]) => void;
}

export function ToolPalette({ selected, onSelect }: ToolPaletteProps) {
  const [open, setOpen] = useState(false);

  const toggleTool = (toolId: string) => {
    onSelect(
      selected.includes(toolId)
        ? selected.filter(t => t !== toolId)
        : [...selected, toolId]
    );
  };

  const toolsByCategory = TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className={cn(
            "h-auto min-h-[44px] w-auto px-3 shrink-0",
            selected.length > 0 && "border-blue-500/50 bg-blue-500/10"
          )}
        >
          <span className="flex items-center gap-1.5">
            🛠️
            {selected.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {selected.length}
              </Badge>
            )}
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Ferramentas disponíveis</span>
          {selected.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs"
              onClick={() => onSelect([])}
            >
              Limpar
            </Button>
          )}
        </DropdownMenuLabel>
        
        {Object.entries(toolsByCategory).map(([category, tools]) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          return (
            <div key={category}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={cn("text-xs", config.color)}>
                {config.label}
              </DropdownMenuLabel>
              
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selected.includes(tool.id);
                
                return (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "flex items-center gap-3 cursor-pointer",
                      isSelected && "bg-blue-500/10"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 rounded",
                      config.bg
                    )}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.name}</span>
                        {isSelected && (
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 truncate">
                        {tool.description}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-xs text-neutral-500">
          <p>Selecione as ferramentas que a IA deve usar para responder.</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
