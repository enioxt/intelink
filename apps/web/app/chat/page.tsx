'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Command, Cpu, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { MessageList } from '@/components/chat/MessageList';
import { ToolPalette } from '@/components/chat/ToolPalette';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [isLocalModel, setIsLocalModel] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    body: {
      tools: selectedTools,
      model: isLocalModel ? 'ollama/llama3.2' : 'openai/gpt-4o',
    },
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [input]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <ChatSidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        conversations={[]}
      />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Command className="w-5 h-5 text-blue-500" />
            <h1 className="font-semibold text-sm">EGOS Inteligência</h1>
            <Badge variant="outline" className="text-xs">
              {isLocalModel ? '🏠 Local' : '☁️ Remoto'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <ModelSelector 
              isLocal={isLocalModel}
              onChange={setIsLocalModel}
            />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList 
            messages={messages}
            isLoading={isLoading}
          />
        </div>

        {/* Input Area */}
        <div className="border-t border-neutral-800 p-4 bg-neutral-950">
          {/* Selected Tools */}
          {selectedTools.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="text-xs text-neutral-500">Tools:</span>
              {selectedTools.map(tool => (
                <Badge key={tool} variant="secondary" className="text-xs">
                  {tool}
                  <button 
                    onClick={() => setSelectedTools(t => t.filter(x => x !== tool))}
                    className="ml-1 hover:text-red-400"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <form onSubmit={onSubmit} className="flex gap-2">
            <ToolPalette 
              selected={selectedTools}
              onSelect={setSelectedTools}
            />
            
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta ou / para comandos..."
                className="min-h-[44px] max-h-[200px] bg-neutral-900 border-neutral-700 resize-none pr-24"
                rows={1}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-neutral-500"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-neutral-500"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-auto px-4 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          
          <p className="text-xs text-neutral-600 mt-2 text-center">
            Use ferramentas como HIBP, Shodan, CNPJ via chat. 
            {isLocalModel ? 'Dados permanecem no ambiente local.' : 'Dados processados remotamente.'}
          </p>
        </div>
      </main>
    </div>
  );
}
