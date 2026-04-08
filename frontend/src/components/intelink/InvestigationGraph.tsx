'use client';

/**
 * Intelink Investigation Graph Component
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Interactive network graph visualization using Cytoscape.js
 * Shows entities, relationships, and behavioral patterns
 */

import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
import { AlertCircle, User, Building2, MapPin, DollarSign } from 'lucide-react';

interface GraphNode {
  id: string;
  label: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'MONEY' | 'DATE' | 'MISC';
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  behavioral_tags?: Array<{
    pattern_name: string;
    confidence: number;
    severity: string;
  }>;
  metadata?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight?: number;
}

interface InvestigationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

export default function InvestigationGraph({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
}: InvestigationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      
      elements: {
        nodes: nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            risk_level: node.risk_level || 'low',
            behavioral_tags: node.behavioral_tags || [],
            metadata: node.metadata || {},
          },
        })),
        edges: edges.map((edge, idx) => ({
          data: {
            id: `edge-${idx}`,
            source: edge.source,
            target: edge.target,
            relationship: edge.relationship,
            weight: edge.weight || 1,
          },
        })),
      },

      style: [
        // Default node style
        {
          selector: 'node',
          style: {
            'background-color': '#94a3b8',
            'border-width': 2,
            'border-color': '#64748b',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'color': '#1e293b',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '3px',
            'width': 40,
            'height': 40,
          },
        },

        // Node by type
        {
          selector: 'node[type = "PERSON"]',
          style: {
            'background-color': '#3b82f6',
            'border-color': '#1d4ed8',
          },
        },
        {
          selector: 'node[type = "ORGANIZATION"]',
          style: {
            'background-color': '#8b5cf6',
            'border-color': '#6d28d9',
            'shape': 'rectangle',
          },
        },
        {
          selector: 'node[type = "LOCATION"]',
          style: {
            'background-color': '#10b981',
            'border-color': '#059669',
            'shape': 'diamond',
          },
        },
        {
          selector: 'node[type = "MONEY"]',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#d97706',
            'shape': 'hexagon',
          },
        },

        // Risk levels
        {
          selector: 'node[risk_level = "low"]',
          style: {
            'border-width': 2,
          },
        },
        {
          selector: 'node[risk_level = "medium"]',
          style: {
            'border-width': 3,
            'border-color': '#f59e0b',
          },
        },
        {
          selector: 'node[risk_level = "high"]',
          style: {
            'border-width': 4,
            'border-color': '#ef4444',
          },
        },
        {
          selector: 'node[risk_level = "critical"]',
          style: {
            'border-width': 6,
            'border-color': '#dc2626',
            'background-color': '#fca5a5',
          },
        },

        // Edges
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(relationship)',
            'font-size': '10px',
            'color': '#64748b',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.7,
            'text-background-padding': '2px',
          },
        },

        // Hover states
        {
          selector: 'node:hover',
          style: {
            'border-width': 4,
            'border-color': '#000000',
          },
        },
        {
          selector: 'edge:hover',
          style: {
            'width': 3,
            'line-color': '#000000',
          },
        },

        // Selected state
        {
          selector: 'node:selected',
          style: {
            'border-width': 5,
            'border-color': '#000000',
            'background-color': '#fbbf24',
          },
        },
      ],

      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 4000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        gravity: 1,
        numIter: 1000,
      },

      minZoom: 0.3,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // Event handlers
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = node.data();
      
      const graphNode: GraphNode = {
        id: nodeData.id,
        label: nodeData.label,
        type: nodeData.type,
        risk_level: nodeData.risk_level,
        behavioral_tags: nodeData.behavioral_tags,
        metadata: nodeData.metadata,
      };
      
      setSelectedNode(graphNode);
      setSelectedEdge(null);
      
      if (onNodeClick) {
        onNodeClick(graphNode);
      }
    });

    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const edgeData = edge.data();
      
      const graphEdge: GraphEdge = {
        source: edgeData.source,
        target: edgeData.target,
        relationship: edgeData.relationship,
        weight: edgeData.weight,
      };
      
      setSelectedEdge(graphEdge);
      setSelectedNode(null);
      
      if (onEdgeClick) {
        onEdgeClick(graphEdge);
      }
    });

    // Cleanup
    return () => {
      cy.destroy();
    };
  }, [nodes, edges, onNodeClick, onEdgeClick]);

  const handleFitView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleResetLayout = () => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
      }).run();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return <User className="w-4 h-4" />;
      case 'ORGANIZATION': return <Building2 className="w-4 h-4" />;
      case 'LOCATION': return <MapPin className="w-4 h-4" />;
      case 'MONEY': return <DollarSign className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {nodes.length} nós, {edges.length} conexões
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFitView}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
          >
            Ajustar Visão
          </button>
          <button
            onClick={handleResetLayout}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
          >
            Reorganizar
          </button>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-gray-50 dark:bg-gray-900"
        />
        
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma entidade para visualizar</p>
              <p className="text-sm mt-1">Faça upload de um documento para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel - Node Details */}
      {selectedNode && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                {getTypeIcon(selectedNode.type)}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedNode.label}
                </h3>
              </div>
              <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {selectedNode.type}
              </span>
            </div>

            {selectedNode.risk_level && selectedNode.risk_level !== 'low' && (
              <div className={`p-3 rounded-lg border ${getRiskColor(selectedNode.risk_level)}`}>
                <div className="font-medium text-sm mb-1">Nível de Risco</div>
                <div className="text-lg font-bold uppercase">
                  {selectedNode.risk_level}
                </div>
              </div>
            )}

            {selectedNode.behavioral_tags && selectedNode.behavioral_tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  🧠 Padrões Comportamentais
                </h4>
                <div className="space-y-2">
                  {selectedNode.behavioral_tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tag.pattern_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Confiança: {(tag.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Panel - Edge Details */}
      {selectedEdge && (
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Relacionamento
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Origem</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedEdge.source}</div>
            </div>
            
            <div className="text-center text-gray-400">→</div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Destino</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedEdge.target}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Tipo</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedEdge.relationship}</div>
            </div>
            
            {selectedEdge.weight && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Peso</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{selectedEdge.weight}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
