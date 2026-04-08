'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Network, 
  Download, 
  Maximize2, 
  Minimize2, 
  Filter,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  Target,
  Settings
} from 'lucide-react';

interface Node {
  id: string;
  name: string;
  type: string;
  color?: string;
  val?: number;
  metadata?: Record<string, any>;
}

interface Link {
  source: string;
  target: string;
  value: number;
  type?: string;
  label?: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface EnhancedGraphProps {
  data: GraphData;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
  loading?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  person: '#3B82F6',
  organization: '#10B981',
  location: '#F59E0B',
  event: '#EF4444',
  document: '#8B5CF6',
  other: '#6B7280',
};

export default function EnhancedGraph({ data, onNodeClick, onNodeHover, loading }: EnhancedGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [physics, setPhysics] = useState(true);

  // Layout algorithm (simple force-directed)
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Initialize node positions
  useEffect(() => {
    if (!data.nodes.length) return;

    const positions = new Map<string, { x: number; y: number }>();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) / 3;

    data.nodes.forEach((node, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    setNodePositions(positions);
  }, [data.nodes, dimensions]);

  // Force-directed layout simulation
  useEffect(() => {
    if (!physics || !data.nodes.length) return;

    const interval = setInterval(() => {
      setNodePositions((prev) => {
        const newPositions = new Map(prev);
        const forces = new Map<string, { x: number; y: number }>();

        // Initialize forces
        data.nodes.forEach((node) => {
          forces.set(node.id, { x: 0, y: 0 });
        });

        // Repulsion force (all nodes repel each other)
        const repulsionStrength = 5000;
        for (let i = 0; i < data.nodes.length; i++) {
          for (let j = i + 1; j < data.nodes.length; j++) {
            const node1 = data.nodes[i];
            const node2 = data.nodes[j];
            const pos1 = newPositions.get(node1.id)!;
            const pos2 = newPositions.get(node2.id)!;

            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const force = repulsionStrength / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            const f1 = forces.get(node1.id)!;
            const f2 = forces.get(node2.id)!;
            f1.x -= fx;
            f1.y -= fy;
            f2.x += fx;
            f2.y += fy;
          }
        }

        // Attraction force (linked nodes attract each other)
        const attractionStrength = 0.01;
        data.links.forEach((link) => {
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
          const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
          
          const pos1 = newPositions.get(sourceId);
          const pos2 = newPositions.get(targetId);
          
          if (!pos1 || !pos2) return;

          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = distance * attractionStrength;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          const f1 = forces.get(sourceId);
          const f2 = forces.get(targetId);
          if (f1 && f2) {
            f1.x += fx;
            f1.y += fy;
            f2.x -= fx;
            f2.y -= fy;
          }
        });

        // Apply forces
        const damping = 0.5;
        data.nodes.forEach((node) => {
          const pos = newPositions.get(node.id)!;
          const force = forces.get(node.id)!;
          pos.x += force.x * damping;
          pos.y += force.y * damping;

          // Keep nodes in bounds
          pos.x = Math.max(50, Math.min(dimensions.width - 50, pos.x));
          pos.y = Math.max(50, Math.min(dimensions.height - 50, pos.y));
        });

        return newPositions;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [physics, data, dimensions]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transforms
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw links
    data.links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
      
      const sourcePos = nodePositions.get(sourceId);
      const targetPos = nodePositions.get(targetId);

      if (!sourcePos || !targetPos) return;

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(0.5, link.value * 3);
      ctx.stroke();

      // Edge labels
      if (showEdgeLabels && link.type) {
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(link.type, midX, midY);
      }
    });

    // Draw nodes
    data.nodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isHovered = hoveredNode?.id === node.id;
      const isSelected = selectedNode?.id === node.id;
      const radius = (node.val || 10) * (isHovered ? 1.5 : 1);

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color || NODE_COLORS[node.type] || NODE_COLORS.other;
      ctx.fill();

      // Node border
      if (isSelected || isHovered) {
        ctx.strokeStyle = isSelected ? '#fbbf24' : '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      if (showLabels) {
        ctx.fillStyle = '#1e293b';
        ctx.font = `${isHovered ? 'bold ' : ''}12px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.name, pos.x, pos.y + radius + 15);
      }
    });

    ctx.restore();
  }, [data, nodePositions, zoom, pan, hoveredNode, selectedNode, showLabels, showEdgeLabels]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    let clickedNode: Node | null = null;
    for (const node of data.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= (node.val || 10)) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      setSelectedNode(clickedNode);
      onNodeClick?.(clickedNode);
    } else {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }

    // Check for node hover
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    let newHoveredNode: Node | null = null;
    for (const node of data.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= (node.val || 10)) {
        newHoveredNode = node;
        break;
      }
    }

    if (newHoveredNode?.id !== hoveredNode?.id) {
      setHoveredNode(newHoveredNode);
      onNodeHover?.(newHoveredNode);
    }

    canvas.style.cursor = newHoveredNode ? 'pointer' : isPanning ? 'grabbing' : 'grab';
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // Control functions
  const handleZoomIn = () => setZoom((prev) => Math.min(5, prev * 1.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.1, prev / 1.2));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleCenterOnNode = () => {
    if (!selectedNode) return;
    const pos = nodePositions.get(selectedNode.id);
    if (!pos) return;

    setPan({
      x: dimensions.width / 2 - pos.x * zoom,
      y: dimensions.height / 2 - pos.y * zoom,
    });
  };

  // Export functions
  const handleExport = (format: 'png' | 'json') => {
    if (format === 'png') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `intelink-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `intelink-graph-${Date.now()}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full border border-gray-200 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
          title="Reset View"
        >
          <Move className="w-5 h-5" />
        </button>
        {selectedNode && (
          <button
            onClick={handleCenterOnNode}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
            title="Center on Selected Node"
          >
            <Target className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Settings */}
      <div className="absolute bottom-4 left-4 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded"
            />
            Show node labels
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
              className="rounded"
            />
            Show edge labels
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={physics}
              onChange={(e) => setPhysics(e.target.checked)}
              className="rounded"
            />
            Physics simulation
          </label>
        </div>
      </div>

      {/* Info panel */}
      {(hoveredNode || selectedNode) && (
        <div className="absolute top-4 left-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-xs">
          <h3 className="font-semibold text-lg mb-2">
            {(hoveredNode || selectedNode)!.name}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Type: {(hoveredNode || selectedNode)!.type}
          </p>
          {(hoveredNode || selectedNode)!.metadata && (
            <div className="text-xs text-gray-500">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify((hoveredNode || selectedNode)!.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">Loading graph...</p>
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => handleExport('png')}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export PNG
        </button>
        <button
          onClick={() => handleExport('json')}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm text-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON
        </button>
      </div>

      {/* Stats */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 border border-gray-300 rounded-lg shadow-sm text-xs text-gray-600">
        {data.nodes.length} nodes • {data.links.length} edges • Zoom: {zoom.toFixed(1)}x
      </div>
    </div>
  );
}
