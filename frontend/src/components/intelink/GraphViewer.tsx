import React, { useState, useEffect, useRef } from 'react';

type Node = {
  id: string;
  data: {
    label: string;
    type: string;
  };
};

type Edge = {
  id: string;
  source: string;
  target: string;
  data: {
    label?: string;
  };
};

type GraphViewerProps = {
  nodes: Node[];
  edges: Edge[];
  isPreview?: boolean;
  selectedNodeId?: string | null;
  onNodeClick: (nodeId: string | null) => void;
};

type NodePosition = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
};

const colors: { [key: string]: string } = {
  person: '#3b82f6', // blue-500
  organization: '#8b5cf6', // violet-500
  org: '#8b5cf6', // violet-500
  location: '#22c55e', // green-500
  loc: '#22c55e', // green-500
  default: '#64748b', // slate-500
};

const getNodeColor = (type: string) => colors[type] || colors.default;

export const GraphViewer: React.FC<GraphViewerProps> = ({ nodes, edges, isPreview = false, selectedNodeId, onNodeClick }) => {
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    setViewBox(`0 0 ${width} ${height}`);

    const initialPositions: Record<string, NodePosition> = {};
    nodes.forEach(node => {
      initialPositions[node.id] = {
        id: node.id,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
      };
    });
    setPositions(initialPositions);
  }, [nodes]);

  useEffect(() => {
    const simulate = () => {
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;
      const center = { x: width / 2, y: height / 2 };

      setPositions(prev => {
        const newPositions = { ...prev };
        const nodeIds = Object.keys(newPositions);
        if (nodeIds.length === 0) return prev;
        
        const repulsionStrength = isPreview ? -2000 : -1000;
        const linkStrength = 0.6;
        const centerGravity = 0.1;

        // Apply forces
        nodeIds.forEach(id1 => {
          const n1 = newPositions[id1];
          if (dragging === id1) return;

          // Repulsion from other nodes
          nodeIds.forEach(id2 => {
            if (id1 === id2) return;
            const n2 = newPositions[id2];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < 1) distSq = 1;
            const force = repulsionStrength / distSq;
            n1.vx += (dx / Math.sqrt(distSq)) * force;
            n1.vy += (dy / Math.sqrt(distSq)) * force;
          });

          // Gravity towards center
          const dgx = center.x - n1.x;
          const dgy = center.y - n1.y;
          n1.vx += dgx * centerGravity * 0.01;
          n1.vy += dgy * centerGravity * 0.01;
        });
        
        // Apply link forces
        edges.forEach(edge => {
            if (newPositions[edge.source] && newPositions[edge.target]) {
                const source = newPositions[edge.source];
                const target = newPositions[edge.target];
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const force = (dist - (isPreview ? 150 : 100)) * linkStrength * 0.1;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    source.vx += fx;
                    source.vy += fy;
                    target.vx -= fx;
                    target.vy -= fy;
                }
            }
        });

        // Update positions
        nodeIds.forEach(id => {
          const n = newPositions[id];
          if (dragging === id) {
              n.vx = 0;
              n.vy = 0;
              return;
          }
          
          n.vx *= 0.9; // Damping
          n.vy *= 0.9;
          
          n.x += n.vx;
          n.y += n.vy;

          // Boundary checks
          n.x = Math.max(10, Math.min(width - 10, n.x));
          n.y = Math.max(10, Math.min(height - 10, n.y));
        });

        return newPositions;
      });

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    animationFrameRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationFrameRef.current != null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, dragging, isPreview]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent background click
    onNodeClick(id);
    setDragging(id);
  };
  
  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !containerRef.current) return;
    const svg = containerRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    setPositions(prev => ({
        ...prev,
        [dragging]: {
            ...prev[dragging],
            x: x,
            y: y,
        }
    }));
  };

  const handleBackgroundClick = () => {
    onNodeClick(null);
  };

  return (
    <svg 
        ref={containerRef} 
        width="100%" 
        height="100%"
        viewBox={viewBox}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
        className="cursor-grab active:cursor-grabbing bg-slate-800/50"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
        </marker>
      </defs>

      {edges.map(edge => {
        const sourcePos = positions[edge.source];
        const targetPos = positions[edge.target];
        if (!sourcePos || !targetPos) return null;
        return (
          <line
            key={edge.id}
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke="#475569"
            strokeWidth="1"
            markerEnd="url(#arrow)"
          />
        );
      })}

      {nodes.map(node => {
        const pos = positions[node.id];
        if (!pos) return null;
        const nodeSize = isPreview ? 8 : 12;
        const isSelected = selectedNodeId === node.id;

        return (
          <g 
            key={node.id} 
            transform={`translate(${pos.x}, ${pos.y})`}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            className="node-group cursor-pointer"
          >
            {isSelected && (
                 <circle
                    r={nodeSize + 5}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                >
                     <animate 
                        attributeName="stroke-opacity" 
                        values="1;0.5;1" 
                        dur="1.5s" 
                        repeatCount="indefinite"
                     />
                 </circle>
            )}
            <circle
              r={nodeSize}
              fill={getNodeColor(node.data.type)}
              stroke={isSelected ? "#38bdf8" : "#cbd5e1"}
              strokeWidth="2"
            />
            {!isPreview && (
              <text
                textAnchor="middle"
                y={nodeSize + 14}
                fontSize="10"
                fill="#e2e8f0"
                className="select-none pointer-events-none"
              >
                {node.data.label}
              </text>
            )}
            <title>{`${node.data.label} (${node.data.type})`}</title>
          </g>
        );
      })}
    </svg>
  );
};
