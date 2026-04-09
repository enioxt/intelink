'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Network, Search, ZoomIn, ZoomOut, RefreshCw, 
  Filter, Download, Info, X 
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/primitives/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

// Dynamically import Cytoscape to avoid SSR issues
const CytoscapeComponent = dynamic(
  () => import('react-cytoscapejs'),
  { ssr: false }
);

// Mock graph data
const MOCK_ELEMENTS = [
  // Nodes
  { data: { id: 'p1', label: 'João Silva', type: 'person', risk: 'high' } },
  { data: { id: 'p2', label: 'Maria Santos', type: 'person', risk: 'medium' } },
  { data: { id: 'p3', label: 'Pedro Costa', type: 'person', risk: 'low' } },
  { data: { id: 'e1', label: 'Empresa XYZ Ltda', type: 'company', risk: 'high' } },
  { data: { id: 'e2', label: 'Consultoria ABC', type: 'company', risk: 'medium' } },
  { data: { id: 'v1', label: 'ABC-1234', type: 'vehicle', risk: 'medium' } },
  { data: { id: 'r1', label: 'REDS 2024/001234', type: 'reds', risk: 'high' } },
  // Edges
  { data: { id: 'e1', source: 'p1', target: 'e1', label: 'sócio' } },
  { data: { id: 'e2', source: 'p1', target: 'p2', label: 'parente' } },
  { data: { id: 'e3', source: 'p2', target: 'e2', label: 'funcionário' } },
  { data: { id: 'e4', source: 'p1', target: 'v1', label: 'proprietário' } },
  { data: { id: 'e5', source: 'p1', target: 'r1', label: 'envolvido' } },
  { data: { id: 'e6', source: 'p3', target: 'e1', label: 'sócio' } },
];

const NODE_COLORS: Record<string, string> = {
  person: '#13b6ec',
  company: '#22c55e',
  vehicle: '#f59e0b',
  reds: '#ef4444',
};

const RISK_SIZES: Record<string, number> = {
  high: 40,
  medium: 30,
  low: 25,
};

interface SelectedNode {
  id: string;
  label: string;
  type: string;
  risk: string;
  connections: number;
}

export default function GraphPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cy, setCy] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutName, setLayoutName] = useState('cose');

  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(type)',
        'label': 'data(label)',
        'width': 'mapData(risk, low, high, 25, 40)',
        'height': 'mapData(risk, low, high, 25, 40)',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#fff',
        'text-outline-color': '#050508',
        'text-outline-width': 2,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': 'rgba(255,255,255,0.2)',
        'target-arrow-color': 'rgba(255,255,255,0.2)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '10px',
        'color': '#94a3b8',
      },
    },
    {
      selector: ':selected',
      style: {
        'border-width': 3,
        'border-color': '#13b6ec',
        'border-opacity': 1,
      },
    },
  ];

  useEffect(() => {
    if (cy) {
      // Apply colors based on node type
      cy.nodes().forEach((node: any) => {
        const type = node.data('type');
        const color = NODE_COLORS[type] || '#64748b';
        node.style('background-color', color);
      });

      // Run layout
      const layout = cy.layout({
        name: layoutName,
        padding: 10,
        animate: true,
        animationDuration: 500,
      });
      layout.run();

      // Add click handler
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target;
        const connected = node.connectedEdges().length;
        setSelectedNode({
          id: node.id(),
          label: node.data('label'),
          type: node.data('type'),
          risk: node.data('risk'),
          connections: connected,
        });
      });

      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          setSelectedNode(null);
        }
      });
    }
  }, [cy, layoutName]);

  const handleZoomIn = () => cy?.zoom(cy.zoom() + 0.2);
  const handleZoomOut = () => cy?.zoom(cy.zoom() - 0.2);
  const handleFit = () => cy?.fit();
  const handleRefresh = () => {
    if (cy) {
      const layout = cy.layout({
        name: layoutName,
        padding: 10,
        animate: true,
      });
      layout.run();
    }
  };

  return (
    <div className="flex h-screen bg-[#050508] text-neutral-100">
      <ChatSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} conversations={[]} />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-white/[0.06] bg-[#050508]/85 backdrop-blur-xl px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-purple-500" />
              <h1 className="font-semibold">Visualização de Grafo</h1>
              <Badge variant="secondary">77M entidades</Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar entidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-neutral-900/50 border-neutral-800"
              />
              <Button variant="ghost" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex relative">
          {/* Graph Canvas */}
          <div className="flex-1 relative">
            <CytoscapeComponent
              elements={MOCK_ELEMENTS}
              style={{ width: '100%', height: '100%' }}
              stylesheet={cytoscapeStylesheet}
              cy={(ref: any) => setCy(ref)}
              className="bg-[#050508]"
            />

            {/* Graph Controls */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2">
              <GlassCard className="p-2 space-y-2">
                <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleFit}>
                  <Filter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </GlassCard>
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4">
              <GlassCard className="space-y-2">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase">Legenda</h4>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="capitalize text-neutral-400">{type}</span>
                  </div>
                ))}
              </GlassCard>
            </div>
          </div>

          {/* Sidebar - Node Details */}
          {selectedNode && (
            <div className="w-80 border-l border-white/[0.06] bg-[#050508]/95 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Detalhes</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-neutral-500">ID</span>
                  <p className="font-mono text-sm">{selectedNode.id}</p>
                </div>

                <div>
                  <span className="text-xs text-neutral-500">Nome</span>
                  <p className="font-semibold">{selectedNode.label}</p>
                </div>

                <div className="flex gap-2">
                  <Badge 
                    className="capitalize"
                    style={{ 
                      backgroundColor: `${NODE_COLORS[selectedNode.type]}20`,
                      color: NODE_COLORS[selectedNode.type],
                      borderColor: NODE_COLORS[selectedNode.type],
                    }}
                  >
                    {selectedNode.type}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={
                      selectedNode.risk === 'high' ? 'border-red-500 text-red-400' :
                      selectedNode.risk === 'medium' ? 'border-amber-500 text-amber-400' :
                      'border-emerald-500 text-emerald-400'
                    }
                  >
                    Risco: {selectedNode.risk}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.03]">
                  <span className="text-xs text-neutral-500">Conexões</span>
                  <p className="text-2xl font-bold">{selectedNode.connections}</p>
                </div>

                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Info className="w-4 h-4 mr-2" />
                    Ver Relatório
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Dados
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
