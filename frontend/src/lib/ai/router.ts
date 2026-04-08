/**
 * AI Router — EGOS Inteligência Frontend
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * AI integration with Neo4j context for intelligent responses
 */

import { useAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_INTELINK_API || 'http://localhost:8000/api/v1';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
  result?: any;
}

export interface AIContext {
  entityId?: string;
  investigationId?: string;
  graphData?: {
    nodes: any[];
    relationships: any[];
  };
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  context?: AIContext;
}

export interface AIRequest {
  messages: Message[];
  context?: AIContext;
  tools?: Tool[];
  model?: string;
}

export interface AIResponse {
  message: string;
  toolCalls?: ToolCall[];
  context?: AIContext;
  sources?: string[];
}

// Default tools available to AI
export const DEFAULT_TOOLS: Tool[] = [
  {
    name: 'search_entity',
    description: 'Search for entities by name, CNPJ, or CPF',
    parameters: {
      query: 'string',
      limit: 'number (optional)',
    },
  },
  {
    name: 'get_entity_details',
    description: 'Get detailed information about an entity',
    parameters: {
      entityId: 'string',
    },
  },
  {
    name: 'expand_network',
    description: 'Get connected entities (ego network)',
    parameters: {
      entityId: 'string',
      depth: 'number (1-4, default 2)',
    },
  },
  {
    name: 'find_path',
    description: 'Find relationship path between two entities',
    parameters: {
      startId: 'string',
      endId: 'string',
    },
  },
  {
    name: 'get_entity_timeline',
    description: 'Get timeline events for an entity',
    parameters: {
      entityId: 'string',
    },
  },
];

// Send chat request to AI with Neo4j context
export async function sendChatRequest(
  request: AIRequest,
  token?: string
): Promise<AIResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'AI request failed');
  }

  return response.json();
}

// Stream chat response (for real-time UI updates)
export async function* streamChatRequest(
  request: AIRequest,
  token?: string
): AsyncGenerator<string, AIResponse, unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Streaming request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return { message: '', toolCalls: [] };
          }
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { message: '', toolCalls: [] };
}

// Generate investigation summary
export async function generateInvestigationSummary(
  investigationId: string,
  token?: string
): Promise<string> {
  const response = await sendChatRequest(
    {
      messages: [
        {
          role: 'system',
          content: 'Generate a comprehensive summary of this investigation. Include key entities, relationships, patterns detected, and recommendations.',
        },
        {
          role: 'user',
          content: `Summarize investigation ${investigationId}`,
        },
      ],
      context: { investigationId },
    },
    token
  );

  return response.message;
}

// Analyze entity for risk patterns
export async function analyzeEntityRisk(
  entityId: string,
  token?: string
): Promise<{
  riskScore: number;
  factors: string[];
  recommendations: string[];
}> {
  const response = await sendChatRequest(
    {
      messages: [
        {
          role: 'system',
          content: 'Analyze this entity for risk patterns. Consider: political exposure, contract concentration, unusual patterns, sanctions, debts. Return risk score (0-100) and key factors.',
        },
        {
          role: 'user',
          content: `Analyze entity ${entityId}`,
        },
      ],
      context: { entityId },
    },
    token
  );

  // Parse structured response
  // Expected format: "Risk Score: XX\nFactors: ...\nRecommendations: ..."
  const lines = response.message.split('\n');
  let riskScore = 50;
  const factors: string[] = [];
  const recommendations: string[] = [];

  for (const line of lines) {
    if (line.includes('Risk Score:')) {
      const match = line.match(/(\d+)/);
      if (match) riskScore = parseInt(match[1], 10);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      if (line.toLowerCase().includes('recommend')) {
        recommendations.push(line.slice(2));
      } else {
        factors.push(line.slice(2));
      }
    }
  }

  return { riskScore, factors, recommendations };
}

export default {
  sendChatRequest,
  streamChatRequest,
  generateInvestigationSummary,
  analyzeEntityRisk,
  DEFAULT_TOOLS,
};
