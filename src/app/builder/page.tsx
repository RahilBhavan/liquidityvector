"use client";

import { useState, useRef, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    ReactFlowProvider,
    Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { BuilderSidebar } from '@/features/builder/components/BuilderSidebar';
import ActionNode from '@/features/builder/components/ActionNode';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Define custom node types
const nodeTypes = {
    customAction: ActionNode,
};

// Initial nodes
const initialNodes: Node[] = [
    {
        id: '1',
        type: 'customAction',
        position: { x: 250, y: 100 },
        data: { label: 'My Wallet', type: 'wallet', details: 'USDC on Ethereum', network: 'ETH' }
    },
    {
        id: '2',
        type: 'customAction',
        position: { x: 250, y: 300 },
        data: { label: 'Bridge to Base', type: 'bridge', details: 'Using Stargate Protocol', network: 'Base' }
    },
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#0047AB' } },
];

function BuilderArea() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#0047AB' } }, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/label');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: Math.random().toString(), // Simple ID gen
                type: 'customAction',
                position,
                data: { label, type: type as any, details: 'Configure details...' },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const simulateStrategy = useCallback(() => {
        setNodes((nds) => nds.map((node) => {
            let mockData = {};
            if (node.data.type === 'pool') {
                mockData = { apy: (Math.random() * 10 + 2).toFixed(2), risk: Math.random() > 0.5 ? 'Low' : 'Medium' };
            } else if (node.data.type === 'bridge') {
                mockData = { gas: (Math.random() * 5 + 1).toFixed(2), time: Math.floor(Math.random() * 20 + 5) };
            } else if (node.data.type === 'swap') {
                mockData = { gas: (Math.random() * 2 + 0.5).toFixed(2), risk: 'Low' };
            }
            return {
                ...node,
                data: {
                    ...node.data,
                    simulationData: mockData
                }
            };
        }));
    }, [setNodes]);

    return (
        <div className="flex h-screen w-full bg-paper-white overflow-hidden">
            <BuilderSidebar />

            <div className="flex-1 flex flex-col h-full">
                {/* Top Bar */}
                <div className="h-16 border-b border-sumi-black/10 flex items-center px-6 bg-white justify-between z-10">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-sumi-black/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-sumi-black" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-sumi-black">Strategy Builder</h1>
                            <div className="text-[10px] font-mono opacity-60 uppercase tracking-widest">Untitled Strategy 01</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-matchbox-green/10 text-matchbox-green text-xs font-bold rounded uppercase">
                            Auto-Save On
                        </div>
                        <button
                            onClick={simulateStrategy}
                            className="flex items-center gap-2 px-4 py-2 bg-cobalt-blue text-white text-xs font-bold rounded uppercase shadow-sm active:translate-y-0.5 hover:bg-cobalt-blue/90 transition-all"
                        >
                            <Play className="w-3 h-3" /> Run Simulation
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 h-full" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setReactFlowInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-paper-white"
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            style: { strokeWidth: 2, stroke: '#1a1a1a' }
                        }}
                    >
                        <Background color="#1a1a1a" gap={20} size={1} className="opacity-5" />
                        <Controls className="!bg-white !border-sumi-black !shadow-sm !text-sumi-black" />
                        <MiniMap
                            className="!border-sumi-black/10 !bg-white"
                            maskColor="rgba(240, 240, 240, 0.6)"
                            nodeColor={(n) => {
                                if (n.data.type === 'wallet') return '#1a1a1a';
                                if (n.data.type === 'bridge') return '#ff3300';
                                if (n.data.type === 'swap') return '#0047AB';
                                return '#00A86B';
                            }}
                        />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}

export default function BuilderPage() {
    return (
        <ReactFlowProvider>
            <BuilderArea />
        </ReactFlowProvider>
    );
}
