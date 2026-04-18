/**
 * AI Router Hook — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Real AI integration with Neo4j context and tool calling
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-client';

const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8000/api/v1';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    confidence?: number;
    entities?: string[];
  };
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
}

export interface AIResponse {
  message: string;
  toolCalls?: ToolCall[];
  context?: {
    entities: any[];
    relationships: any[];
  };
}

export interface UseAIChatOptions {
  systemPrompt?: string;
  enableTools?: boolean;
  contextEntityId?: string;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthHeaders } = useAuth();

  const sendMessage = useCallback(async (
    content: string,
    toolOverrides?: string[]
  ): Promise<boolean> => {
    if (!content.trim()) return false;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10), // Last 10 messages for context
          system_prompt: options.systemPrompt,
          enable_tools: options.enableTools ?? true,
          context_entity_id: options.contextEntityId,
          tool_overrides: toolOverrides,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get AI response');
      }

      const data: AIResponse = await response.json();

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        metadata: {
          sources: data.toolCalls?.map(t => t.name),
          confidence: data.context ? 0.85 : undefined,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      return true;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      return false;
    }
  }, [messages, options, getAuthHeaders]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadChatHistory = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`${API_URL}/conversations/${chatId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      setMessages(data.messages || []);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
      return false;
    }
  }, [getAuthHeaders]);

  const saveChat = useCallback(async (title?: string) => {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title: title || `Chat ${new Date().toLocaleString()}`,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat');
      }

      const data = await response.json();
      return data.id as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return null;
    }
  }, [messages, getAuthHeaders]);

  // Tool-specific helpers
  const searchEntities = useCallback(async (query: string) => {
    return sendMessage(`Search for: ${query}`, ['search_entities']);
  }, [sendMessage]);

  const getEntityDetails = useCallback(async (entityId: string) => {
    return sendMessage(`Tell me about entity ${entityId}`, ['get_entity']);
  }, [sendMessage]);

  const expandNetwork = useCallback(async (entityId: string, depth: number = 2) => {
    return sendMessage(
      `Expand network for ${entityId} with depth ${depth}`,
      ['expand_network']
    );
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    loadChatHistory,
    saveChat,
    // Tool helpers
    searchEntities,
    getEntityDetails,
    expandNetwork,
  };
}

// Standalone AI query hook for non-chat usage
export function useAIQuery() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthHeaders } = useAuth();

  const query = useCallback(async <T = any>(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      context?: Record<string, any>;
    } = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          prompt,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.7,
          context: options.context,
        }),
      });

      if (!response.ok) {
        throw new Error('AI query failed');
      }

      const data = await response.json();
      setIsLoading(false);
      return data.result as T;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
      setIsLoading(false);
      return null;
    }
  }, [getAuthHeaders]);

  return { query, isLoading, error };
}

export default useAIChat;
