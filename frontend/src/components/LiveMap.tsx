import React from 'react';

const NODES = [
    { id: "N1", x: 20, y: 20, label: "Income Tax" },
    { id: "N2", x: 50, y: 20, label: "Vijay Cross" },
    { id: "N3", x: 50, y: 50, label: "University" },
    { id: "N4", x: 80, y: 50, label: "Panjrapol" },
    { id: "N5", x: 80, y: 80, label: "Nehrunagar" },
];

const EDGES = [
    ["N1", "N2"], ["N2", "N3"], ["N3", "N4"], ["N4", "N5"], ["N1", "N3"]
];

const LiveMap: React.FC = () => {
    return (
        <div className="w-full h-full relative bg-gray-900 overflow-hidden rounded-lg">
             <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Edges */}
                {EDGES.map(([u, v], i) => {
                    const n1 = NODES.find(n => n.id === u)!;
                    const n2 = NODES.find(n => n.id === v)!;
                    return (
                        <line 
                            key={i}
                            x1={n1.x} y1={n1.y}
                            x2={n2.x} y2={n2.y}
                            stroke="#374151"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Nodes */}
                {NODES.map((node) => (
                    <g key={node.id}>
                        <circle 
                            cx={node.x} cy={node.y} 
                            r="3" 
                            fill="#1F2937" 
                            stroke="#4B5563"
                            strokeWidth="0.5"
                        />
                         {/* Signal Status Indicator (Mock) */}
                        <circle 
                            cx={node.x} cy={node.y} 
                            r="1.5" 
                            fill={Math.random() > 0.5 ? "#22c55e" : "#ef4444"} 
                            className="animate-pulse"
                        />
                        <text 
                            x={node.x} y={node.y + 6} 
                            textAnchor="middle" 
                            fill="#9CA3AF" 
                            fontSize="3"
                            fontFamily="monospace"
                        >
                            {node.label}
                        </text>
                    </g>
                ))}
             </svg>
             
             {/* Overlay Info */}
             <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-[10px] text-green-400 font-mono border border-green-900">
                LIVE TRAFFIC FEED
             </div>
        </div>
    );
};

export default LiveMap;
