'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Network, Filter, Download, RefreshCw, Eye, Link as LinkIcon } from 'lucide-react';

interface Vinculo {
  reference: string;
  type: string;
  appears_in: Array<{ document: string; type: string }>;
  link_strength: number;
}

interface VinculosData {
  total_cross_references: number;
  vinculos: Vinculo[];
  message?: string;
}

const TYPE_COLORS: Record<string, string> = {
  cpf: '#3b82f6',      // blue
  phone: '#10b981',    // green
  email: '#8b5cf6',    // purple
  url: '#f59e0b',      // amber
  processo: '#ef4444', // red
  rg: '#06b6d4',       // cyan
  default: '#6b7280',  // gray
};

const COLORS_PIE = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function VinculosPage() {
  const [data, setData] = useState<VinculosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchVinculos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://127.0.0.1:8042/api/v1/intelink/vinculos');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const vinculosData = await response.json();
      setData(vinculosData);
      
      // Build graph
      buildGraph(vinculosData, selectedType);
    } catch (err) {
      console.error('Failed to fetch vínculos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchVinculos();
  }, [fetchVinculos]);

  const buildGraph = (vinculosData: VinculosData, filterType: string) => {
    if (!vinculosData || !vinculosData.vinculos) return;

    const filtered = filterType === 'all' 
      ? vinculosData.vinculos 
      : vinculosData.vinculos.filter(v => v.type === filterType);

    // Build nodes (references)
    const newNodes: Node[] = filtered.slice(0, 20).map((vinculo, index) => {
      const angle = (index / Math.min(filtered.length, 20)) * 2 * Math.PI;
      const radius = 300;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: `ref-${index}`,
        type: 'default',
        data: {
          label: (
            <div className="text-center">
              <div className="font-bold text-xs">{vinculo.type.toUpperCase()}</div>
              <div className="text-[10px] max-w-[100px] truncate">{vinculo.reference}</div>
              <div className="text-[9px] text-gray-500">({vinculo.link_strength} docs)</div>
            </div>
          ),
        },
        position: { x, y },
        style: {
          background: TYPE_COLORS[vinculo.type] || TYPE_COLORS.default,
          color: 'white',
          border: `2px solid ${TYPE_COLORS[vinculo.type] || TYPE_COLORS.default}`,
          borderRadius: '8px',
          padding: '10px',
          fontSize: '11px',
          width: 120,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Build edges (connections between docs)
    const newEdges: Edge[] = [];
    filtered.slice(0, 20).forEach((vinculo, index) => {
      // Connect to center
      newEdges.push({
        id: `edge-${index}`,
        source: 'center',
        target: `ref-${index}`,
        animated: vinculo.link_strength > 5,
        style: {
          stroke: TYPE_COLORS[vinculo.type] || TYPE_COLORS.default,
          strokeWidth: Math.min(vinculo.link_strength / 2, 4),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: TYPE_COLORS[vinculo.type] || TYPE_COLORS.default,
        },
      });
    });

    // Center node
    newNodes.push({
      id: 'center',
      type: 'default',
      data: {
        label: (
          <div className="text-center">
            <Network className="w-6 h-6 mx-auto mb-1" />
            <div className="font-bold">{filtered.length} Vínculos</div>
          </div>
        ),
      },
      position: { x: 400, y: 300 },
      style: {
        background: '#1e293b',
        color: 'white',
        border: '3px solid #3b82f6',
        borderRadius: '50%',
        padding: '20px',
        width: 120,
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando vínculos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl p-6">
          <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
            Erro ao Carregar Vínculos
          </h3>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => fetchVinculos()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.vinculos.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum Vínculo Encontrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Execute o processamento batch primeiro para gerar vínculos
          </p>
        </div>
      </div>
    );
  }

  const typeStats = data.vinculos.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(typeStats).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  }));

  const top10 = [...data.vinculos]
    .sort((a, b) => b.link_strength - a.link_strength)
    .slice(0, 10)
    .map(v => ({
      name: v.reference.length > 20 ? v.reference.substring(0, 20) + '...' : v.reference,
      força: v.link_strength,
      tipo: v.type,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Rede de Vínculos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Análise de cross-references entre documentos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchVinculos()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Vínculos
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.total_cross_references}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <LinkIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Referências Únicas
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {data.vinculos.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Filter className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Tipos
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {Object.keys(typeStats).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Vínculo Mais Forte
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.max(...data.vinculos.map(v => v.link_strength))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filtrar por tipo:
        </span>
        <button
          onClick={() => setSelectedType('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            selectedType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
          }`}
        >
          Todos ({data.vinculos.length})
        </button>
        {Object.entries(typeStats).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedType === type
                ? 'text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
            }`}
            style={{
              backgroundColor: selectedType === type ? TYPE_COLORS[type] : undefined,
            }}
          >
            {type.toUpperCase()} ({count})
          </button>
        ))}
      </div>

      {/* Main Content: Graph + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white">
              Grafo de Vínculos (Top 20)
            </h3>
          </div>
          <div style={{ height: '600px' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Top 10 Bar Chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              Top 10 Vínculos Mais Fortes
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '10px' }} />
                <Tooltip />
                <Bar dataKey="força" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              Distribuição por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
