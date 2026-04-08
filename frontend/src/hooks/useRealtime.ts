/**
 * Real-time Updates — EGOS Inteligência
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Server-Sent Events (SSE) for live data updates
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface SSEOptions {
  url: string;
  token?: string;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useSSE<T = any>(options: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL(options.url, window.location.origin);
    if (options.token) {
      url.searchParams.set('token', options.token);
    }

    const es = new EventSource(url.toString());
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
      options.onConnect?.();
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        options.onMessage(data);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    es.onerror = (err) => {
      setIsConnected(false);
      setError(new Error('SSE connection error'));
      options.onError?.(err);
      es.close();

      // Reconnect
      if (options.reconnect !== false) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, options.reconnectInterval || 5000);
      }
    };
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
  };
}

// Hook for job progress updates
export function useJobProgress(jobId: string, token?: string) {
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useSSE({
    url: `/api/v1/jobs/${jobId}/progress`,
    token,
    onMessage: (data) => {
      setProgress(data.progress || 0);
      setStatus(data.status);
      if (data.error) {
        setError(data.error);
      }
    },
    onError: () => {
      setError('Connection lost');
    },
  });

  return {
    progress,
    status,
    error,
    isConnected,
  };
}

// Hook for entity graph updates (real-time collaboration)
export function useEntityGraph(entityId: string, token?: string) {
  const [graphData, setGraphData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { isConnected: sseConnected } = useSSE({
    url: `/api/v1/entity/${entityId}/graph/stream`,
    token,
    onMessage: (data) => {
      setGraphData(data);
    },
    onConnect: () => setIsConnected(true),
    onError: () => setIsConnected(false),
  });

  return {
    graphData,
    isConnected: sseConnected,
  };
}

export default {
  useSSE,
  useJobProgress,
  useEntityGraph,
};
