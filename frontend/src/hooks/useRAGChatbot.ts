import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { intelinkClient } from '@/lib/intelink-client';

export interface RAGMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Array<{
    document_id: string;
    title: string;
    relevance: number;
  }>;
}

// Alias para compatibilidade
type Message = RAGMessage;

interface RAGChatbotConfig {
  investigationId?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Hook para chatbot RAG (Retrieval-Augmented Generation)
 * Permite conversação contextual com busca em documentos
 */
export function useRAGChatbot(config: RAGChatbotConfig = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();

  const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://127.0.0.1:8042/api/v1/intelink';

  // Load last messages for the current investigation
  useEffect(() => {
    let aborted = false;
    async function load() {
      try {
        if (!config.investigationId) return;
        const res = await fetch(`${API_URL}/chat/history?investigation_id=${encodeURIComponent(config.investigationId)}&limit=50`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!aborted && Array.isArray(data?.messages)) {
          const hist = data.messages.map((m: any) => ({
            id: m.id || `h-${Math.random()}`,
            role: (m.role === 'system' || m.role === 'assistant' || m.role === 'user') ? m.role : 'assistant',
            content: String(m.content ?? ''),
            timestamp: new Date(m.created_at || Date.now()),
          })) as Message[];
          setMessages(hist);
        }
      } catch (e) {
        // ignore history errors
      }
    }
    load();
    return () => { aborted = true; };
  }, [config.investigationId]);

  // Mutation para enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async (userMessage: string) => {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, msg]);

      const res = await fetch(`${API_URL}/chat/rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          investigation_id: config.investigationId,
          max_tokens: config.maxTokens ?? 600,
          temperature: config.temperature ?? 0.2,
        }),
      });

      const data = await res.json().catch(() => ({ ok: false, answer: 'Falha ao decodificar resposta' }));
      const content = typeof data?.answer === 'string' ? data.answer : JSON.stringify(data);
      const assistant: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        sources: Array.isArray(data?.sources) ? data.sources : [],
      };
      return assistant;
    },
    onSuccess: (assistantMessage) => {
      setMessages(prev => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['chatHistory', config.investigationId] });
    },
    onError: (error) => {
      console.error('RAG chat error:', error);
      // Adiciona mensagem de erro
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ Erro ao processar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Mutation para enviar mensagem com contexto de documentos
  const sendMessageWithContext = useMutation({
    mutationFn: async (payload: { text: string; contextDocIds?: string[]; contextNotes?: Record<string, string> }) => {
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: payload.text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);

      const res = await fetch(`${API_URL}/chat/rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payload.text,
          investigation_id: config.investigationId,
          max_tokens: config.maxTokens ?? 600,
          temperature: config.temperature ?? 0.2,
          context_doc_ids: payload.contextDocIds ?? [],
          context_notes: payload.contextNotes ?? {},
        }),
      });

      const data = await res.json().catch(() => ({ ok: false, answer: 'Falha ao decodificar resposta' }));
      const content = typeof data?.answer === 'string' ? data.answer : JSON.stringify(data);
      const assistant: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        sources: Array.isArray(data?.sources) ? data.sources : [],
      };
      return assistant;
    },
    onSuccess: (assistantMessage) => {
      setMessages(prev => [...prev, assistantMessage]);
      queryClient.invalidateQueries({ queryKey: ['chatHistory', config.investigationId] });
    },
    onError: (error) => {
      console.error('RAG chat (ctx) error:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ Erro ao processar mensagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Função para limpar histórico
  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  // Função para adicionar contexto do sistema
  const addSystemContext = useCallback((context: string) => {
    const systemMessage: Message = {
      id: `msg-${Date.now()}-system`,
      role: 'system',
      content: context,
      timestamp: new Date(),
    };
    setMessages(prev => [systemMessage, ...prev]);
  }, []);

  // Enviar com anexo (faz upload e referencia no prompt)
  const sendWithAttachment = useMutation({
    mutationFn: async (params: { file: File; note?: string }) => {
      const upload = await intelinkClient.uploadDocument(params.file, { title: params.file.name });
      const ref = `Anexo enviado: ${params.file.name} (doc_id=${upload?.document_id || 'desconhecido'})`;
      return await sendMessage.mutateAsync(`${ref}\n${params.note ?? ''}`);
    },
  });

  // SSE Streaming (GET /chat/stream?message=...)
  const sendMessageStreaming = useCallback((userMessage: string) => {
    if (!userMessage?.trim()) return;

    // Push user message immediately
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Prepare assistant placeholder
    const assistantId = `msg-${Date.now()}-assistant-stream`;
    const assistantBase: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantBase]);

    // Build SSE URL
    const qs = new URLSearchParams({
      message: userMessage,
      ...(config.investigationId ? { investigation_id: String(config.investigationId) } : {}),
    }).toString();
    const url = `${API_URL}/chat/stream?${qs}`;

    try {
      setIsStreaming(true);
      const es = new EventSource(url);
      let acc = '';

      es.onmessage = (ev) => {
        const chunk = typeof ev.data === 'string' ? ev.data : '';
        if (!chunk) return;
        // Heuristic end markers
        if (chunk === '[DONE]' || chunk === '[END]') {
          es.close();
          setIsStreaming(false);
          return;
        }
        // Accumulate and update last assistant message
        acc += (acc ? '' : '') + chunk;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      };

      es.onerror = () => {
        es.close();
        setIsStreaming(false);
        // Keep whatever was streamed; add a small notice on failure
        if (!acc) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: '⚠️ Falha no streaming.' } : m));
        }
      };
    } catch (e) {
      console.error('SSE init failed', e);
      setIsStreaming(false);
    }
  }, [API_URL, config.investigationId]);

  return {
    messages,
    isLoading: sendMessage.isPending || sendMessageWithContext.isPending,
    isStreaming,
    sendMessage: sendMessage.mutate,
    sendMessageStreaming,
    sendWithAttachment: sendWithAttachment.mutate,
    sendMessageWithContext: sendMessageWithContext.mutate,
    clearHistory,
    addSystemContext,
    pushAssistantMessage: (content: string) => setMessages(prev => [...prev, { id: `msg-${Date.now()}-assistant-local`, role: 'assistant', content, timestamp: new Date() } as any]),
    error: sendMessage.error,
  };
}
