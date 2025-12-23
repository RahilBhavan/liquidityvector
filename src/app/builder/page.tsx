"use client";

import { useState, useRef, useCallback, ReactNode, useEffect } from 'react';
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
    Node,
    Panel,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { BuilderSidebar } from '@/features/builder/components/BuilderSidebar';
import ActionNode from '@/features/builder/components/ActionNode';
import { StrategySummary } from '@/features/builder/components/StrategySummary';
import { StrategyManagerModal, SavedStrategy } from '@/features/builder/components/StrategyManagerModal';
import { ExecutionModal } from '@/features/builder/components/ExecutionModal';
import { calculateVScore, estimateNodeMetrics } from '@/lib/utils/vScore';
import { ArrowLeft, Play, Save, FolderOpen, Rocket } from 'lucide-react';
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
        position: { x: 100, y: 100 },
        data: { label: 'My Wallet', type: 'wallet', details: 'USDC on Ethereum', network: 'ETH' }
    },
    {
        id: '2',
        type: 'customAction',
        position: { x: 450, y: 100 },
        data: { label: 'Stargate Bridge', type: 'bridge', details: 'Bridge USDC to Base', network: 'Base' }
    },
    {
        id: '3',
        type: 'customAction',
        position: { x: 800, y: 100 },
        data: { label: 'Aerodrome Pool', type: 'pool', details: 'Provide Liquidity', network: 'Base' }
    }
];

const initialEdges: Edge[] = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#1A1A1A', strokeWidth: 2 } },
    { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#1A1A1A', strokeWidth: 2 } },
];

function BuilderArea() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    // Strategy Persistence State
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [currentStrategyName, setCurrentStrategyName] = useState('Untitled Strategy');

    // Execution Mode State
    const [isExecutionOpen, setIsExecutionOpen] = useState(false);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#1A1A1A', strokeWidth: 2 } }, eds)),
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
            let mockData: any = {};
            const label = (node.data.label as string) || '';
            const type = node.data.type as string;

            // 1. Get Base Metrics (Gas, Time, APY) from Estimator
            const metrics = estimateNodeMetrics(type, label);

            // 2. Calculate V-Score for Pools & Bridges
            // Logic to derive realistic inputs for V-Score
            const isHighTvl = label.toLowerCase().includes('aave') || label.toLowerCase().includes('aerodrome') || label.toLowerCase().includes('uniswap');
            const isRisky = label.toLowerCase().includes('degen') || label.toLowerCase().includes('meme');
            const estimatedTvl = isHighTvl ? 150_000_000 : isRisky ? 500_000 : 5_000_000;
            const bridgeAge = type === 'bridge' ? (label.includes('Stargate') ? 4 : 1) : 0;

            if (type === 'pool') {
                const vScore = calculateVScore({
                    tvlUsd: estimatedTvl,
                    auditStatus: isRisky ? 'Warning' : 'Verified'
                });
                mockData = { ...metrics, vScore };
            } else if (type === 'bridge') {
                const vScore = calculateVScore({
                    tvlUsd: estimatedTvl,
                    bridgeMetadata: { ageYears: bridgeAge, hasExploits: false }
                });
                mockData = { ...metrics, vScore };
            } else {
                mockData = metrics;
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

    // Handle Persistence
    const handleSaveStrategy = (name: string) => {
        const flow = reactFlowInstance.toObject();
        const newStrategy: SavedStrategy = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            date: Date.now(),
            nodeCount: nodes.length,
            preview: JSON.stringify(flow)
        };

        const stored = localStorage.getItem('lv_strategies');
        const strategies = stored ? JSON.parse(stored) : [];
        strategies.push(newStrategy);
        localStorage.setItem('lv_strategies', JSON.stringify(strategies));

        setCurrentStrategyName(name);
        // Toast is theoretically here but we lack the component setup, relying on UI feedback
    };

    const handleLoadStrategy = (strategy: SavedStrategy) => {
        const flow = JSON.parse(strategy.preview);

        if (flow) {
            const { x = 0, y = 0, zoom = 1 } = flow.viewport;
            setNodes(flow.nodes || []);
            setEdges(flow.edges || []);
            reactFlowInstance.setViewport({ x, y, zoom });
            setCurrentStrategyName(strategy.name);
        }
    };

    return (
        <div className="flex h-screen w-full bg-paper-white overflow-hidden font-sans text-sumi-black">
            <StrategyManagerModal
                isOpen={isManagerOpen}
                onClose={() => setIsManagerOpen(false)}
                onSave={handleSaveStrategy}
                onLoad={handleLoadStrategy}
                currentNodesCount={nodes.length}
            />

            <ExecutionModal
                isOpen={isExecutionOpen}
                onClose={() => setIsExecutionOpen(false)}
                nodes={nodes}
            />

            <BuilderSidebar />

            <div className="flex-1 flex flex-col h-full bg-[#f0f0f0]">
                {/* Top Bar */}
                <div className="h-16 border-b border-sumi-black/10 flex items-center px-6 bg-white justify-between z-10 shadow-sm relative">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-sumi-black/5 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-sumi-black" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-lg text-sumi-black leading-none">Strategy Buider</h1>
                                <span className="bg-sumi-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Beta</span>
                            </div>
                            <div className="text-[10px] font-mono opacity-60 uppercase tracking-widest mt-0.5">{currentStrategyName}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsManagerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-sumi-black/20 hover:border-sumi-black text-sumi-black text-xs font-bold rounded uppercase transition-all"
                        >
                            <FolderOpen className="w-3 h-3" /> Load / Save
                        </button>
                        <button
                            onClick={simulateStrategy}
                            className="flex items-center gap-2 px-6 py-2 bg-cobalt-blue text-white text-xs font-bold rounded uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <Play className="w-3 h-3" /> Run Simulation
                        </button>
                        <button
                            onClick={() => setIsExecutionOpen(true)}
                            className="flex items-center gap-2 px-6 py-2 bg-intl-orange text-white text-xs font-bold rounded uppercase shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <Rocket className="w-3 h-3" /> Deploy
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                    <StrategySummary nodes={nodes} />

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
                        className="bg-[#f0f0f0]"
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { strokeWidth: 2, stroke: '#1a1a1a' }
                        }}
                    >
                        <Background color="#1a1a1a" gap={24} size={1} className="opacity-5" />
                        <Controls className="!bg-white !border-2 !border-sumi-black !shadow-[4px_4px_0px_rgba(0,0,0,1)] !rounded-lg overflow-hidden [&>button]:!border-b [&>button]:!border-sumi-black/10 [&>button:last-child]:!border-none !text-sumi-black" />
                        <MiniMap
                            className="!border-2 !border-sumi-black !bg-white !rounded-lg !shadow-[4px_4px_0px_rgba(0,0,0,1)] !m-6"
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
