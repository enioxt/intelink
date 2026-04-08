'use client';

import { useState, useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useGraph } from '@/hooks/useIntelink';
import type { EntityType } from '@/types/intelink';

export default function GraphPage() {
  const { graph, loading, error, refetch } = useGraph();

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);

  const [filterTypes, setFilterTypes] = useState<EntityType[]>([]);
  const [linkTypes, setLinkTypes] = useState<string[]>([]);
  const [confidenceMin, setConfidenceMin] = useState<number>(0);
  const [layout, setLayout] = useState<'force' | 'circle' | 'grid'>('force');

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [contextGraph, setContextGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [availableLinkTypes, setAvailableLinkTypes] = useState<string[]>([]);

  // Base/filtered graph builders
  const baseGraph = contextGraph || graph || null;
  const filteredGraph = baseGraph
    ? {
      nodes:
        filterTypes.length > 0
          ? (baseGraph.nodes as any[]).filter((n) => filterTypes.includes(n.data.type))
          : baseGraph.nodes,
      edges: (baseGraph.edges as any[]).filter((e) => {
        const t = (e.data?.type || e.type || '').toString();
        const c = e.data?.confidence ?? e.confidence ?? 0;
        const passType = linkTypes.length === 0 || linkTypes.includes(t);
        const passConf = c >= confidenceMin;
        return passType && passConf;
      }),
    }
    : null;

  // Initialize Cytoscape
  useEffect(() => {
    const g = filteredGraph || baseGraph;
    if (!g || !containerRef.current) return;

    const elements = buildElements(g);
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...elements.nodes, ...elements.edges],
      style: getCytoscapeStyle() as any,
      layout: getLayoutConfig(layout) as any,
      wheelSensitivity: 0.2,
      minZoom: 0.2,
      maxZoom: 3,
    });
    cyRef.current = cy;

    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data();
      setSelectedNode({ id: d.id, label: d.label, type: d.type, confidence: d.confidence ?? 0 });
      setSelectedEdge(null);
    });

    cy.on('tap', 'edge', (evt) => {
      const d = evt.target.data();
      setSelectedEdge({ id: d.id, source: d.source, target: d.target, type: d.type, label: d.label, confidence: d.confidence ?? 0 });
      setSelectedNode(null);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [baseGraph, filteredGraph, layout]);

  // Update graph when filters/layout change
  useEffect(() => {
    if (!cyRef.current) return;
    const g = filteredGraph || baseGraph;
    if (!g) return;
    const el = buildElements(g);
    cyRef.current.elements().remove();
    cyRef.current.add([...el.nodes, ...el.edges]);
    cyRef.current.layout(getLayoutConfig(layout) as any).run();
  }, [filterTypes, linkTypes, confidenceMin, layout]);

  // Fetch agent context to enrich graph from backend links/entities
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/intelink/chat/context');
        if (!res.ok) return;
        const j = await res.json();
        if (!j || (!Array.isArray(j.entities) && !Array.isArray(j.links))) return;
        const g = buildGraphFromContext(j);
        setContextGraph(g);
        const types = Array.from(new Set((j.links || []).map((l: any) => l.type))).sort() as string[];
        setAvailableLinkTypes(types);
      } catch { }
    })();
  }, []);

  const entityTypes: EntityType[] = ['person', 'organization', 'location', 'date', 'event', 'concept'];

  const toggleFilter = (type: EntityType) => {
    setFilterTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom(cyRef.current.zoom() * 1.2);
  };
  const handleZoomOut = () => {
    if (!cyRef.current) return;
    cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };
  const handleFitView = () => {
    cyRef.current?.fit(undefined, 40);
  };

  // Export
  const handleExportJSON = () => {
    const g = filteredGraph || baseGraph;
    if (!g) return;
    const dataStr = JSON.stringify(g, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `intelink-graph-${Date.now()}.json`;
    link.click();
  };
  const handleExportCSV = () => {
    const g = filteredGraph || baseGraph;
    if (!g) return;
    const rows = [['id', 'source', 'target', 'type', 'label', 'confidence']];
    (g.edges as any[]).forEach((e) => {
      rows.push([
        JSON.stringify(e.data?.id ?? ''),
        JSON.stringify(e.data?.source ?? ''),
        JSON.stringify(e.data?.target ?? ''),
        JSON.stringify(e.data?.type ?? ''),
        JSON.stringify(e.data?.label ?? ''),
        JSON.stringify((e.data?.confidence ?? 0).toString()),
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelink-edges-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Knowledge Graph</h1>
            <p className="text-gray-600 dark:text-gray-400">Explore entity relationships and connections</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button onClick={handleExportJSON} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
          {/* Stats */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Graph Stats</h3>
            <div className="space-y-2">
              <StatRow label="Nodes" value={(filteredGraph?.nodes || baseGraph?.nodes || []).length} />
              <StatRow label="Edges" value={(filteredGraph?.edges || baseGraph?.edges || []).length} />
            </div>
          </div>

          {/* Layout Selector */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Layout</h3>
            <div className="space-y-2">
              {(['force', 'circle', 'grid'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${layout === l
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Entity Type Filters */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter by Entity Type
            </h3>
            <div className="space-y-2">
              {(['person', 'organization', 'location', 'date', 'event', 'concept'] as EntityType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                  <input type="checkbox" checked={filterTypes.includes(type)} onChange={() => toggleFilter(type)} className="rounded border-gray-300 dark:border-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {(filteredGraph?.nodes || baseGraph?.nodes || []).filter((n: any) => n.data.type === type).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Link Type Filters */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Filter by Link Type</h3>
            <div className="max-h-40 overflow-auto space-y-1 pr-1">
              {(availableLinkTypes || []).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={linkTypes.includes(t)} onChange={() => setLinkTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))} />
                  <span className="truncate">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Min Confidence</h3>
            <input type="range" min={0} max={1} step={0.05} value={confidenceMin} onChange={(e) => setConfidenceMin(parseFloat(e.target.value))} className="w-full" data-testid="graph-confidence-slider" />
            <div className="text-xs text-gray-500 mt-1">{Math.round(confidenceMin * 100)}%</div>
          </div>

          {/* Edge Details */}
          {selectedEdge && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Selected Link</h3>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800 dark:text-blue-200"><span className="font-medium">Type:</span> {selectedEdge.type}</p>
                <p className="text-blue-800 dark:text-blue-200"><span className="font-medium">Label:</span> {selectedEdge.label}</p>
                <p className="text-blue-800 dark:text-blue-200"><span className="font-medium">Confidence:</span> {Math.round((selectedEdge.confidence || 0) * 100)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button onClick={handleZoomIn} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Zoom In">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={handleZoomOut} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Zoom Out">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={handleFitView} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700" title="Fit View">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Graph Container or States */}
          <div className="w-full h-full">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading graph...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load graph</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
                </div>
              </div>
            )}

            {!loading && !error && !baseGraph && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No graph data available</h3>
                  <p className="text-gray-600 dark:text-gray-400">Upload and process documents to see entity relationships</p>
                </div>
              </div>
            )}

            {!loading && !error && (baseGraph || filteredGraph) && <div ref={containerRef} className="w-full h-full" data-testid="graph-container" />}
          </div>

          {/* Watermark */}
          <div className="absolute bottom-4 left-4 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400">000.111.369.963.1618 (∞△⚡◎φ)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className="font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function getCytoscapeStyle() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        label: 'data(label)',
        width: 'mapData(confidence, 0, 1, 20, 60)',
        height: 'mapData(confidence, 0, 1, 20, 60)',
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': '10px',
      },
    },
  ];
}

function getLayoutConfig(layout: string) {
  const configs = {
    force: {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 30,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
    },
    circle: {
      name: 'circle',
      fit: true,
      padding: 30,
      radius: undefined,
      spacingFactor: 1.75,
    },
    grid: {
      name: 'grid',
      fit: true,
      padding: 30,
      rows: undefined,
      cols: undefined,
    },
  } as const;
  return configs[layout as keyof typeof configs] || configs.force;
}

// Convert agent context (entities + links) to GraphData-like structure
function buildGraphFromContext(ctx: any) {
  const nodesById = new Map<string, any>();

  const mapType = (t: string) => {
    const m: Record<string, EntityType> = {
      pessoa: 'person',
      pessoa_fisica: 'person',
      local: 'location',
      organizacao: 'organization',
      organizacao_empresa: 'organization',
      documento: 'concept',
    };
    return (m[t?.toLowerCase()] || 'custom') as EntityType;
  };

  (ctx.entities || []).forEach((e: any) => {
    const id = e.id;
    const label = e.nome || e.name || e.title || id;
    const type = mapType(e.tipo || e.type || 'custom');
    nodesById.set(id, { data: { id, label, type, confidence: 0.7, color: '#6B7280' } });
  });

  const docIndex: Record<string, any> = {};
  (ctx.documents || []).forEach((d: any) => {
    docIndex[d.id] = d;
  });

  const edges: any[] = [];
  (ctx.links || []).forEach((l: any, idx: number) => {
    const type = l.type || 'related_to';
    const conf = l.confidence ?? 0.5;
    const id = l.id || `link-${idx}`;

    const a = l.entity_a || l.doc_a;
    const b = l.entity_b || l.doc_b;
    if (!a || !b) return;

    if (!nodesById.has(a)) {
      const d = docIndex[a];
      nodesById.set(a, { data: { id: a, label: d?.title || a, type: 'concept', confidence: 0.6 } });
    }
    if (!nodesById.has(b)) {
      const d = docIndex[b];
      nodesById.set(b, { data: { id: b, label: d?.title || b, type: 'concept', confidence: 0.6 } });
    }

    edges.push({
      data: {
        id,
        source: a,
        target: b,
        type,
        label: type,
        confidence: conf,
      },
    });
  });

  return { nodes: Array.from(nodesById.values()), edges };
}

// Build Cytoscape elements from a GraphData-like structure
function buildElements(graph: any) {
  const typeToColor: Record<string, string> = {
    person: '#3B82F6',
    organization: '#8B5CF6',
    location: '#10B981',
    date: '#F59E0B',
    event: '#EF4444',
    concept: '#EC4899',
    custom: '#6B7280',
  };

  const nodes = (graph.nodes || []).map((n: any) => ({
    data: {
      id: n.data?.id ?? n.id,
      label: n.data?.label ?? n.label ?? n.id,
      type: n.data?.type ?? n.type ?? 'custom',
      confidence: n.data?.confidence ?? n.confidence ?? 0.5,
      color: typeToColor[(n.data?.type ?? n.type ?? 'custom') as string] || typeToColor.custom,
    },
    position: n.position,
  }));

  const edges = (graph.edges || []).map((e: any, idx: number) => ({
    data: {
      id: e.data?.id ?? e.id ?? `e-${idx}`,
      source: e.data?.source ?? e.source,
      target: e.data?.target ?? e.target,
      label: e.data?.label ?? e.data?.type ?? e.label ?? '',
      type: e.data?.type ?? e.type ?? 'related_to',
      confidence: e.data?.confidence ?? e.confidence ?? 0.5,
    },
  }));

  return { nodes, edges };
}
