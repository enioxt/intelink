import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { intelinkClient } from '@/lib/intelink-client';

export function useJobs(params?: { page?: number; page_size?: number }) {
  const q = useQuery({
    queryKey: ['jobs', params],
    queryFn: () => intelinkClient.listJobs(params),
    refetchInterval: 5000, // Refetch every 5s for job updates
  });

  const jobs = Array.isArray((q.data as any)?.jobs)
    ? (q.data as any).jobs
    : Array.isArray(q.data as any)
      ? (q.data as any)
      : [];

  return {
    jobs,
    loading: q.isLoading,
    error: q.error ? (q.error as any).message || String(q.error) : null,
    refetch: q.refetch,
  };
}

export function useDocuments(params?: { page?: number; page_size?: number; q?: string }) {
  const query = useQuery({
    queryKey: ['documents', params],
    queryFn: () => intelinkClient.listDocuments(params),
    refetchInterval: 10000, // Refetch every 10s
  });

  const getDocument = async (id: string) => {
    return intelinkClient.getDocument(id);
  };

  const deleteDocument = async (id: string) => {
    return intelinkClient.deleteDocument(id);
  };

  return {
    ...query,
    getDocument,
    deleteDocument,
  };
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => intelinkClient.getHealth(),
    refetchInterval: 30000, // Refetch every 30s
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => intelinkClient.getStats(),
    refetchInterval: 15000, // Refetch every 15s
  });
}

// Graph data hook (ego graph when entityId provided; otherwise export subset)
export function useGraph(params?: { entityId?: string; depth?: number; minScore?: number; maxNodes?: number }) {
  const API = process.env.NEXT_PUBLIC_INTELINK_API || 'http://127.0.0.1:8042/api/v1/intelink';
  const { entityId, depth = 2, minScore = 0.3, maxNodes = 200 } = params || {};

  const q = useQuery({
    queryKey: ['graph', { entityId, depth, minScore, maxNodes }],
    queryFn: async () => {
      try {
        if (entityId) {
          const qs = new URLSearchParams({
            entity_id: entityId,
            depth: String(depth),
            min_score: String(minScore),
            max_nodes: String(maxNodes),
          }).toString();
          const res = await fetch(`${API}/graph/ego?${qs}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`graph_ego_${res.status}`);
          const data = await res.json();
          const g = data?.data || {};
          // Normalize to Cytoscape-like elements {nodes: [{data:{...}}], edges:[{data:{...}}]}
          const nodes = Array.isArray(g.nodes)
            ? g.nodes.map((n: any) => ({
              data: {
                id: String(n.id || n?.id || n?.data?.id),
                label: n.text || n.label || n?.data?.label || 'entity',
                type: n.label || n?.data?.type || 'entity',
                confidence: n.confidence,
                distance: n.distance_from_center,
              },
            }))
            : [];
          const edges = Array.isArray(g.edges)
            ? g.edges.map((e: any, idx: number) => ({
              data: {
                id: e.id ? String(e.id) : `e_${idx}`,
                source: String(e.source),
                target: String(e.target),
                score: e.score ?? 0.5,
              },
            }))
            : [];
          return { nodes, edges };
        }

        // Fallback: export cytoscape subset
        const qs = new URLSearchParams({ format: 'cytoscape', max_nodes: String(maxNodes), min_score: String(minScore) }).toString();
        const res = await fetch(`${API}/graph/export?${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`graph_export_${res.status}`);
        const json = await res.json();
        const elements = json?.data?.elements || json?.elements || {};
        const nodes = Array.isArray(elements.nodes) ? elements.nodes : [];
        const edges = Array.isArray(elements.edges) ? elements.edges : [];
        return { nodes, edges };
      } catch (e: any) {
        throw new Error(e?.message || 'graph_fetch_failed');
      }
    },
    refetchInterval: 30000,
  });

  const graph = q.data || null;
  const loading = q.isLoading;
  const error = q.error ? ((q.error as any).message || String(q.error)) : null;

  return { graph, loading, error, refetch: q.refetch };
}

// Stub for useSearch - will be implemented with real search logic
export function useSearch() {
  const [results, setResults] = useState<{ results: any[]; total: number; took_ms?: number; limit?: number; page?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (query: string | { q: string; filters?: any; sort?: string; page?: number; limit?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const q = typeof query === 'string' ? query : query.q;
      const res = await intelinkClient.searchDocuments(q);
      setResults(res.data || []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults(null);
    setError(null);
  };

  return {
    results,
    loading,
    error,
    search,
    clear,
  };
}

// Hook for Investigations
export function useInvestigations(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['investigations', params],
    queryFn: () => intelinkClient.listInvestigations(params),
    refetchInterval: 10000,
  });
}

export function useInvestigation(id: string) {
  return useQuery({
    queryKey: ['investigation', id],
    queryFn: () => intelinkClient.getInvestigation(id),
    enabled: !!id,
  });
}

// Hook for Entities
export function useEntitySearch() {
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await intelinkClient.searchEntities(query);
      setEntities(res.entities || []);
    } finally {
      setLoading(false);
    }
  };

  return { entities, loading, search };
}

// Hook for Chat
export function useChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string, context?: any) => {
    setLoading(true);
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await intelinkClient.sendChatMessage([...messages, userMsg], context);
      const assistantMsg = { role: 'assistant', content: res.message };
      setMessages(prev => [...prev, assistantMsg]);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage, setMessages };
}

// Hook for Patterns
export function usePatterns(entityId?: string) {
  return useQuery({
    queryKey: ['patterns', entityId],
    queryFn: () => intelinkClient.runPatterns(entityId),
    enabled: !!entityId,
  });
}

// Hook for Export
export function useExport() {
  const [loading, setLoading] = useState(false);

  const exportInvestigation = async (id: string, format: 'md' | 'html' | 'pdf') => {
    setLoading(true);
    try {
      return await intelinkClient.exportInvestigation(id, format);
    } finally {
      setLoading(false);
    }
  };

  return { loading, exportInvestigation };
}
