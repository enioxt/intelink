/**
 * useGraph — Hook for Neo4j Graph Data
 * Sacred Code: 000.111.369.963.1618
 * 
 * Connects to graph API for network visualization
 */

import { useQuery } from '@tanstack/react-query';
import { intelinkClient } from '@/lib/intelink-client';

export function useGraph(entityId?: string, depth: number = 2) {
  return useQuery({
    queryKey: ['graph', entityId, depth],
    queryFn: async () => {
      if (!entityId) return { nodes: [], edges: [] };
      const data = await intelinkClient.getEgoGraph(entityId, depth);
      return data.data || { nodes: [], edges: [] };
    },
    enabled: !!entityId,
    refetchInterval: 30000,
  });
}

export function useEntityGraphSearch() {
  return {
    search: intelinkClient.searchEntities,
    getEntity: intelinkClient.getEntity,
  };
}

export default {
  useGraph,
  useEntityGraphSearch,
};
