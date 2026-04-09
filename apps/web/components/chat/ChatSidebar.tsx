'use client';

import {
  MessageSquare, BarChart3, Shield, Globe, FileText,
  Settings, Plus, ChevronLeft, ChevronRight, History,
  GitCompare, Network, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
}

const NAV_ITEMS = [
  { icon: MessageSquare, label: 'Chat', href: '/chat', active: true },
  { icon: Shield, label: 'OSINT', href: '/osint', active: false },
  { icon: GitCompare, label: 'Análise', href: '/analysis', active: false },
  { icon: Network, label: 'Grafo', href: '/graph', active: false },
  { icon: Globe, label: 'Transparência', href: '/transparency', active: false },
  { icon: FileText, label: 'PCMG', href: '/pcmg', active: false },
  { icon: BarChart3, label: 'Dashboard', href: '/dashboard', active: false },
  { icon: Lock, label: 'Segurança', href: '/security', active: false },
];

export function ChatSidebar({ isOpen, onToggle, conversations }: ChatSidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col border-r border-neutral-800 bg-[#050508] transition-all duration-200",
        isOpen ? "w-64" : "w-14"
      )}
    >
      {/* Header */}
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-3">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            <span className="font-semibold text-sm">EGOS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-neutral-500 hover:text-neutral-300"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size={isOpen ? 'default' : 'icon'}
        >
          <Plus className="w-4 h-4" />
          {isOpen && <span className="ml-2">Nova Conversa</span>}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                item.active
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Recent Conversations */}
        {isOpen && conversations.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-3">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <History className="w-3 h-3" />
                <span>Recentes</span>
              </div>
            </div>

            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition-colors text-left"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-neutral-500" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{conv.title}</p>
                  <p className="text-xs text-neutral-600">{conv.timestamp}</p>
                </div>
                {conv.messageCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {conv.messageCount}
                  </Badge>
                )}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-800 p-2">
        <Button
          variant="ghost"
          size={isOpen ? 'default' : 'icon'}
          className="w-full justify-start text-neutral-500 hover:text-neutral-300"
        >
          <Settings className="w-4 h-4" />
          {isOpen && <span className="ml-2">Configurações</span>}
        </Button>

        {isOpen && (
          <div className="mt-3 px-3 text-xs text-neutral-600">
            <p>EGOS Inteligência v2.0</p>
            <p className="mt-1">🏠 Local • 🔒 Privado</p>
          </div>
        )}
      </div>
    </div>
  );
}
