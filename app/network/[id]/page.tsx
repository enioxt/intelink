/**
 * Network Visualization Page — EGOS Inteligência
 * 
 * [EGOS-MERGE] 🔵 ADAPTED: Página nova para visualização de grafos Neo4j
 * TARGET: /home/enio/egos-lab/apps/egos-inteligencia/apps/web/app/network/[id]/page.tsx
 * OWNER: cascade-agent
 * TIMESTAMP: 2026-04-01
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { neo4jClient, GraphResult } from '@/lib/neo4j/client';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

function getEntityHref(node: GraphNode): string | null {
  if (node.properties.cnpj) return `/entity/${node.properties.cnpj}`;
  if (node.properties.cpf) return `/entity/${node.properties.cpf}`;
  return null;
}

export default function NetworkPage() {
  const params = useParams();
  const nodeId = params.id as string;

  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(2);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await neo4jClient.expandGraph(nodeId, depth);

      // Transform Neo4j result to vis graph format
      const nodes: GraphNode[] = result.nodes.map(n => ({
        id: n.id,
        label: n.properties.name || n.properties.company_name || n.properties.cnpj || n.id,
        type: n.labels[0] || 'Unknown',
        properties: n.properties,
      }));

      const edges: GraphEdge[] = result.relationships.map(r => ({
        id: r.id,
        source: r.startNodeId,
        target: r.endNodeId,
        type: r.type,
        properties: r.properties,
      }));

      setGraphData({ nodes, edges });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [nodeId, depth]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Company': return '#3b82f6'; // blue
      case 'Person': return '#10b981'; // green
      case 'PEPRecord': return '#f59e0b'; // amber
      case 'Sanction': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-gray-600">Carregando grafo...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Erro ao carregar grafo</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadGraph}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Nenhum dado encontrado para este nó.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rede de Relacionamentos</h1>
          <p className="text-gray-600 mt-1">
            Nó: {nodeId} | Profundidade: {depth} |
            {graphData.nodes.length} nós, {graphData.edges.length} conexões
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Profundidade:</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>

          <button
            onClick={loadGraph}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Recarregar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Visualization */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow-md p-4 min-h-[500px]">
          <svg
            width="100%"
            height="500"
            viewBox="0 0 800 500"
            className="border rounded"
          >
            {/* Simple force-directed layout simulation */}
            {graphData.edges.map((edge, i) => {
              const source = graphData.nodes.find(n => n.id === edge.source);
              const target = graphData.nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              // Simple positioning (would use D3 force layout in production)
              const sx = 100 + (i * 50) % 700;
              const sy = 100 + (i * 30) % 300;
              const tx = 200 + (i * 70) % 600;
              const ty = 200 + (i * 40) % 250;

              return (
                <g key={edge.id}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={tx}
                    y2={ty}
                    stroke="#9ca3af"
                    strokeWidth={2}
                  />
                  <text
                    x={(sx + tx) / 2}
                    y={(sy + ty) / 2}
                    fontSize={10}
                    fill="#6b7280"
                    textAnchor="middle"
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}

            {graphData.nodes.map((node, i) => {
              // Simple positioning
              const x = 150 + (i * 80) % 600;
              const y = 150 + (i * 60) % 300;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedNode(node)}
                >
                  <circle
                    r={selectedNode?.id === node.id ? 25 : 20}
                    fill={getNodeColor(node.type)}
                    stroke={selectedNode?.id === node.id ? '#1f2937' : 'white'}
                    strokeWidth={3}
                  />
                  <text
                    dy={35}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#374151"
                    className="font-medium"
                  >
                    {node.label.slice(0, 15)}
                    {node.label.length > 15 ? '...' : ''}
                  </text>
                  <text
                    dy={48}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6b7280"
                  >
                    {node.type}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="text-sm text-gray-500 mt-4 text-center">
            ⚠️ Visualização simplificada. Em produção usar D3.js ou Cytoscape.js para layout force-directed.
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-3">Legenda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500"></span>
                <span>Empresa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-green-500"></span>
                <span>Pessoa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500"></span>
                <span>PEP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500"></span>
                <span>Sanção</span>
              </div>
            </div>
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold mb-3">Detalhes do Nó</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-2 font-mono">{selectedNode.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <span className="ml-2">{selectedNode.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Nome:</span>
                  <span className="ml-2">{selectedNode.label}</span>
                </div>

                {Object.entries(selectedNode.properties).slice(0, 5).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>
                    <span className="ml-2">{String(value).slice(0, 30)}</span>
                  </div>
                ))}

                <div className="pt-2 mt-2 border-t">
                  {getEntityHref(selectedNode) ? (
                    <a
                      href={getEntityHref(selectedNode) || '#'}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver página completa →
                    </a>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      Página de detalhe ainda não disponível para este tipo de nó
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Estatísticas</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total de nós:</span>
                <span>{graphData.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Conexões:</span>
                <span>{graphData.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Profundidade:</span>
                <span>{depth}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
