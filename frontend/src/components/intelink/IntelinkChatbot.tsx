'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Send, Loader2, Search, AlertCircle, ChevronRight, Lightbulb, Mic, MicOff, Upload } from 'lucide-react';
import { usePoliceHints } from '@/hooks/usePoliceHints';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CommandSuggestion {
  command: string;
  description: string;
  data?: any[];
}

export default function IntelinkChatbot(props?: { systemPromptUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [chatSize, setChatSize] = useState<'compact' | 'half' | 'full'>('compact');
  const socraticMode = true;
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [showClarifyingQuestions, setShowClarifyingQuestions] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o Assistente Intelink, especializado em inteligência criminal. Como posso ajudar?\n\n**Comandos:**\n- `/buscar [termo]` - Buscar na base\n- `/investigação [id]` - Resumir investigação\n- `/padrões` - Listar padrões detectados',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [toolProgress, setToolProgress] = useState<string>('');
  const { suggestions: policeSuggestions, checkInput, clear } = usePoliceHints();
  const [showExport, setShowExport] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { supported: sttSupported, listening, transcript, start, stop, reset } = useSpeechToText();
  const [lastEnhancedMessage, setLastEnhancedMessage] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [contextStats, setContextStats] = useState<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    (async () => {
      try {
        const url = props?.systemPromptUrl ?? '/api/intelink/chat/context/system-prompt';
        const p = await fetch(url);
        if (p.ok) {
          const j = await p.json();
          if (j?.system_prompt) setSystemPrompt(j.system_prompt);
        }
      } catch { }
      try {
        const c = await fetch('/api/intelink/chat/context');
        if (c.ok) {
          const j = await c.json();
          if (j?.statistics) setContextStats(j.statistics);
        }
      } catch { }
    })();
  }, [props?.systemPromptUrl]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('intelink_chat_history') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
        }
      }
    } catch { }
  }, []);

  // Allow external triggers to open/close the chat (e.g., CTA buttons)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('intelink:open-chat', open as any);
    window.addEventListener('intelink:close-chat', close as any);
    return () => {
      window.removeEventListener('intelink:open-chat', open as any);
      window.removeEventListener('intelink:close-chat', close as any);
    };
  }, []);

  useEffect(() => {
    try {
      const toSave = messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('intelink_chat_history', JSON.stringify(toSave.slice(-200)));
      }
    } catch { }
  }, [messages]);

  const fetchInvestigations = useCallback(async () => {
    try {
      const res = await fetch('/api/intelink/investigations?limit=10');
      if (res.ok) {
        const data = await res.json();
        const invSuggestions = data.investigations.map((inv: any) => ({
          command: `/investigação ${inv.id}`,
          description: inv.title || 'Sem título',
          data: inv,
        }));
        setSuggestions(invSuggestions.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch investigations:', error);
    }
  }, []);

  // Handle command autocomplete
  useEffect(() => {
    if (input.startsWith('/')) {
      const command = input.toLowerCase();
      if (command === '/') {
        setSuggestions([
          { command: '/buscar', description: 'Buscar documentos e evidências' },
          { command: '/investigação', description: 'Ver investigações disponíveis' },
          { command: '/padrões', description: 'Listar padrões comportamentais' },
        ]);
        setShowCommands(true);
      } else if (command.startsWith('/investigação') || command.startsWith('/investigacao')) {
        fetchInvestigations();
        setShowCommands(true);
      } else if (command.startsWith('/buscar ')) {
        setSuggestions([
          { command: '/buscar homicídio', description: 'Termo mais buscado' },
          { command: '/buscar narcóticos', description: 'Termo frequente' },
          { command: '/buscar fraude', description: 'Termo recente' },
        ]);
        setShowCommands(true);
      } else {
        setShowCommands(false);
      }
    } else {
      setShowCommands(false);
    }
  }, [input, fetchInvestigations]);

  function replaceLastWordWith(term: string) {
    const parts = input.trimEnd().split(/\s+/);
    if (parts.length === 0) { setInput(term); return; }
    parts[parts.length - 1] = term;
    setInput(parts.join(' '));
    clear();
  }

  useEffect(() => {
    // When STT transcript updates, append to input (only when actively listening)
    if (transcript && listening) {
      setInput(transcript);
    }
  }, [transcript, listening]);

  const handleAudioUpload = async (file: File) => {
    setAudioUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/intelink/audio/transcribe', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Assume data.text or data.transcript
      const text = data.text || data.transcript || '';
      if (text) setInput(prev => (prev ? `${prev} ${text}` : text));
      else throw new Error('Transcrição vazia');
    } catch (err) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Erro ao transcrever áudio. Tente outro arquivo (WAV/MP3).',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setAudioUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const submitSuggestion = async () => {
    if (!suggestionTitle.trim() || !suggestionDescription.trim() || suggestionSubmitting) return;
    setSuggestionSubmitting(true);
    try {
      const res = await fetch('/api/intelink/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: suggestionTitle.trim(),
          description: suggestionDescription.trim(),
          category: 'chatbot',
          context: {
            url: typeof window !== 'undefined' ? window.location.href : '',
            ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            component: 'IntelinkChatbot'
          }
        }),
      });
      if (res.ok) {
        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '✅ **Sugestão enviada com sucesso!**\n\nObrigado pela contribuição. Sua sugestão será analisada pela equipe.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
        setSuggestionTitle('');
        setSuggestionDescription('');
        setShowSuggestionModal(false);
      } else {
        throw new Error('Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Suggestion submission error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Erro ao enviar sugestão. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  function exportAs(format: 'md' | 'json' | 'txt' | 'html') {
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    let content = '';
    let mime = 'text/plain';
    let filename = `intelink-chat-${now}.${format}`;
    if (format === 'json') {
      content = JSON.stringify(messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })), null, 2);
      mime = 'application/json';
    } else if (format === 'md') {
      content = messages.map(m => `**${m.role}**: ${m.content}`).join('\n\n');
      mime = 'text/markdown';
    } else if (format === 'html') {
      content = `<html><body>${messages.map(m => `<p><strong>${m.role}</strong>: ${m.content.replace(/\n/g, '<br/>')}</p>`).join('')}</body></html>`;
      mime = 'text/html';
    } else {
      content = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      mime = 'text/plain';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setShowExport(false);
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setShowCommands(false);
    setLoading(true);

    try {
      // Socratic Mode: enhance message first
      let enhancedMessage = userInput;
      try {
        const enhanceRes = await fetch('/api/intelink/chat/enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userInput }),
        });
        if (enhanceRes.ok) {
          const enhanceData = await enhanceRes.json();
          if (enhanceData.questions && enhanceData.questions.length > 0) {
            setClarifyingQuestions(enhanceData.questions);
            setShowClarifyingQuestions(true);
            if (enhanceData.improved_prompt) {
              setLastEnhancedMessage(enhanceData.improved_prompt);
            }
            // Show questions to user first
            const questionsMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `🤔 **Perguntas de Esclarecimento:**\n\n${enhanceData.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n\n*Responda estas perguntas ou digite 'prosseguir' para continuar.*`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, questionsMessage]);
            setLoading(false);
            return; // Wait for user clarification
          }
          if (enhanceData.improved_prompt) {
            enhancedMessage = enhanceData.improved_prompt;
            setLastEnhancedMessage(enhanceData.improved_prompt);
          }
        }
      } catch (error) {
        console.error('Socratic enhancement error:', error);
        // Continue with original message
      }

      // Clear clarifying questions if user chose to proceed
      if (userInput.toLowerCase() === 'prosseguir' && clarifyingQuestions.length > 0) {
        setClarifyingQuestions([]);
        setShowClarifyingQuestions(false);
        if (lastEnhancedMessage) {
          enhancedMessage = lastEnhancedMessage;
        }
      }

      // Check for special commands
      if (userInput.startsWith('/buscar ')) {
        const query = userInput.substring(8).trim();
        // TODO: Implement search endpoint
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🔍 Buscando por "${query}"...\n\n*Funcionalidade de busca será implementada em breve. Use a página de Busca por enquanto.*`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      if (userInput.startsWith('/padrões') || userInput.startsWith('/padroes')) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `📊 **Padrões Detectados:**\n\n**Psicológicos (13):**\n- Narcisismo, Maquiavelismo, Psicopatia\n- Viés de Confirmação, Negação, Projeção\n- Dissonância Cognitiva\n\n**Criminais (5):**\n- Lavagem de Dinheiro, Fraude Corporativa\n- Corrupção Sistêmica, Evasão Fiscal\n- Manipulação de Mercado`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      if (userInput.startsWith('/investigação ') || userInput.startsWith('/investigacao ')) {
        const invId = userInput.split(' ')[1];

        try {
          const res = await fetch(`/api/intelink/investigations/${invId}`);
          if (res.ok) {
            const inv = await res.json();
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `📁 **${inv.title}**\n\n**Número:** ${inv.case_number || 'N/A'}\n**Status:** ${inv.status}\n**Prioridade:** ${inv.priority}\n**Documentos:** ${inv.document_count || 0}\n\n${inv.description || 'Sem descrição disponível.'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else {
            throw new Error('Investigation not found');
          }
        } catch (error) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `❌ Investigação não encontrada. Use \`/investigação\` sem ID para ver todas disponíveis.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
        setLoading(false);
        return;
      }

      // STREAMING-001: SSE streaming via /api/v1/chat/stream
      // Replaces dead /api/intelink/chat/rag endpoint (never existed in backend)
      abortRef.current = new AbortController();
      const streamMsgId = (Date.now() + 1).toString();

      // Insert placeholder message immediately — user sees activity right away
      setMessages((prev) => [
        ...prev,
        { id: streamMsgId, role: 'assistant', content: '🔍 Analisando...', timestamp: new Date() },
      ]);

      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: enhancedMessage }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let sseBuffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const payload = JSON.parse(line.slice(6));

              if (currentEvent === 'thinking') {
                const model = payload.model ? ` (${payload.model})` : '';
                setMessages((prev) => prev.map((m) =>
                  m.id === streamMsgId ? { ...m, content: `🔍 ${payload.status}${model}` } : m
                ));
              } else if (currentEvent === 'tool_call') {
                const toolLabel = payload.tool.replace(/_/g, ' ');
                setToolProgress(`⚡ ${toolLabel}`);
                setMessages((prev) => prev.map((m) =>
                  m.id === streamMsgId
                    ? { ...m, content: m.content + `\n⚡ Consultando: **${toolLabel}**...` }
                    : m
                ));
              } else if (currentEvent === 'tool_result') {
                const count = payload.count > 0 ? ` (${payload.count} resultados)` : '';
                setToolProgress(`✅ ${payload.tool.replace(/_/g, ' ')}${count}`);
              } else if (currentEvent === 'complete') {
                setToolProgress('');
                setMessages((prev) => prev.map((m) =>
                  m.id === streamMsgId ? { ...m, content: payload.reply } : m
                ));
                // Show cost if non-zero
                if (payload.cost_usd > 0) {
                  console.debug(`[Intelink] Query cost: $${payload.cost_usd} | rounds: ${payload.rounds}`);
                }
              } else if (currentEvent === 'error') {
                setToolProgress('');
                setMessages((prev) => prev.map((m) =>
                  m.id === streamMsgId ? { ...m, content: `❌ ${payload.message}` } : m
                ));
              }
              currentEvent = '';
            } catch {
              // Malformed SSE data — skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Erro ao processar mensagem. ${error instanceof Error ? error.message : 'Tente novamente.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Minimized floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-[60] group"
        aria-label="Open chat"
        data-testid="intelink-chat-trigger"
      >
        <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          1
        </span>
      </button>
    );
  }

  // Chat window (minimized or maximized)
  return (
    <div
      className={`fixed ${chatSize === 'full' || isMaximized
          ? 'inset-4 md:inset-8'
          : chatSize === 'half'
            ? 'bottom-0 right-0 w-1/2 h-[80vh] md:h-full'
            : 'bottom-6 right-6 w-96 h-[600px]'
        } bg-white dark:bg-slate-800 rounded-lg shadow-2xl flex flex-col z-[60] transition-all duration-300`}
      data-testid="intelink-chat-modal"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">Assistente Intelink</h3>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => setChatSize('compact')} className={`text-xs px-2 py-1 rounded ${chatSize === 'compact' ? 'bg-white/30' : 'hover:bg-white/20'}`}>C</button>
            <button onClick={() => setChatSize('half')} className={`text-xs px-2 py-1 rounded ${chatSize === 'half' ? 'bg-white/30' : 'hover:bg-white/20'}`}>½</button>
          </div>
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)} className="hover:bg-white/20 px-2 py-1 rounded text-xs">Exportar</button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white text-slate-900 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded shadow-lg text-sm">
                <button className="block px-3 py-2 w-full text-left hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => exportAs('md')}>Markdown</button>
                <button className="block px-3 py-2 w-full text-left hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => exportAs('json')}>JSON</button>
                <button className="block px-3 py-2 w-full text-left hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => exportAs('txt')}>TXT</button>
                <button className="block px-3 py-2 w-full text-left hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => exportAs('html')}>HTML</button>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="intelink-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
        {loading && !toolProgress && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Conectando...</span>
            </div>
          </div>
        )}
        {toolProgress && (
          <div className="flex justify-start">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              <span className="text-xs text-blue-700 dark:text-blue-300">{toolProgress}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        {/* Command suggestions */}
        {showCommands && suggestions.length > 0 && (
          <div className="mb-2 max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(sug.command);
                  setShowCommands(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm"
              >
                <ChevronRight className="h-3 w-3 text-blue-500" />
                <div className="flex-1">
                  <div className="font-mono text-blue-600 dark:text-blue-400">{sug.command}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{sug.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); checkInput(e.target.value); }}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem ou /comando..."
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
            data-testid="intelink-chat-input"
          />
          {sttSupported ? (
            <button
              onClick={() => (listening ? stop() : (reset(), start()))}
              className={`px-2 py-2 rounded-lg transition-colors flex items-center gap-2 ${listening ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white'}`}
              title={listening ? 'Parar gravação' : 'Gravar áudio'}
              disabled={loading}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleAudioUpload(f);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-2 rounded-lg transition-colors flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white"
                title="Enviar arquivo de áudio para transcrição"
                disabled={audioUploading || loading}
              >
                {audioUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </button>
            </>
          )}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
            data-testid="intelink-chat-send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {policeSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {policeSuggestions.map((sug, i) => (
              <button key={i} onClick={() => replaceLastWordWith(sug.term || sug.suggestion)} className="text-xs px-2 py-1 rounded border border-yellow-400 text-yellow-700 dark:text-yellow-300 dark:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                {sug.term || sug.suggestion}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          💡 Dica: Digite <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/</code> para ver comandos disponíveis
        </p>
      </div>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Enviar Sugestão
              </h3>
              <button
                onClick={() => setShowSuggestionModal(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={suggestionTitle}
                  onChange={(e) => setSuggestionTitle(e.target.value)}
                  placeholder="Ex: Adicionar busca por CPF"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={suggestionSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={suggestionDescription}
                  onChange={(e) => setSuggestionDescription(e.target.value)}
                  placeholder="Descreva sua sugestão em detalhes..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  disabled={suggestionSubmitting}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSuggestionModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  disabled={suggestionSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={submitSuggestion}
                  disabled={!suggestionTitle.trim() || !suggestionDescription.trim() || suggestionSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {suggestionSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named export for compatibility
export { IntelinkChatbot };
