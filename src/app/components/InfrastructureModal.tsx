'use client';

import React, { useState } from 'react';
import { X, ArrowUpRight, Clock, ShieldCheck, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { RouteCalculation } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface InfrastructureModalProps {
    selectedRoute: RouteCalculation | null;
    onClose: () => void;
}

const InfrastructureModal: React.FC<InfrastructureModalProps> = ({ selectedRoute, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'projections' | 'execution'>('overview');

    if (!selectedRoute || !selectedRoute.bridgeMetadata) return null;

    const isHighRisk = selectedRoute.riskLevel >= 4;
    const project = selectedRoute.targetPool.project.toUpperCase();
    const network = selectedRoute.targetPool.chain.toUpperCase();
    const bridge = selectedRoute.bridgeMetadata.name.toUpperCase();
    const apy = selectedRoute.targetPool.apy;
    const projection = selectedRoute.netProfit30d; // For demo, using 30d profit as projection base

    // Mock Profit Matrix
    const capitalLevels = [
        { label: '$1000', val: 1000 },
        { label: '$10000', val: 10000 },
        { label: '$50000', val: 50000 }
    ];
    const timeframes = [
        { label: '7 Days', days: 7 },
        { label: '30 Days', days: 30 },
        { label: '90 Days', days: 90 }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumi-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-5xl bg-[#0047AB] text-white rounded-xl shadow-[12px_12px_0px_rgba(0,0,0,1)] border-2 border-sumi-black overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* --- HEADER SECTION --- */}
                <div className="p-8 pb-6 bg-[#0047AB] relative">
                    <div className="flex justify-between items-start">

                        {/* Left: Identity */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase opacity-70">
                                    {network} NETWORK
                                </span>
                            </div>
                            <h1 className="text-5xl font-bold tracking-tighter leading-none mb-1">
                                {project}
                            </h1>
                            <div className="text-xs font-mono font-bold tracking-wider opacity-60 uppercase">
                                {selectedRoute.bridgeMetadata.type} + {bridge} BRIDGE
                            </div>
                        </div>

                        {/* Middle: APY (Vertical Divider Left) */}
                        <div className="hidden md:block pl-12 border-l-2 border-dashed border-white/20 h-24">
                            <div className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-60 mb-1">
                                NET APY
                            </div>
                            <div className="flex items-start gap-1">
                                <span className="text-6xl font-bold tracking-tighter leading-none">
                                    {apy.toFixed(2)}%
                                </span>
                                <ArrowUpRight className="w-6 h-6 mt-1 opacity-80" />
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col items-end gap-6">
                            <div className="flex gap-4 items-center">
                                <div className="text-right">
                                    <div className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-60 mb-1">
                                        30D PROJECTION
                                    </div>
                                    <div className="text-4xl font-bold tracking-tight">
                                        ${projection.toFixed(2)}
                                    </div>
                                </div>
                                <div className="border border-white/30 rounded px-2 py-1 flex items-center gap-2 text-[10px] font-mono">
                                    <Clock className="w-3 h-3" /> ~1 MIN
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 flex items-center gap-1">
                                    Less Info <ChevronDown className="w-3 h-3 rotate-180" />
                                </button>
                                <button className="bg-white text-[#0047AB] px-8 py-3 rounded font-bold uppercase tracking-wider text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                                    Execute <ArrowUpRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Horizontal Dashed Divider */}
                    <div className="w-full h-px border-t-2 border-dashed border-white/20 mt-8" />

                    {/* Tabs */}
                    <div className="flex gap-12 mt-6">
                        {['OVERVIEW', 'PROJECTIONS', 'EXECUTION'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase() as any)}
                                className={cn(
                                    "text-xs font-bold tracking-[0.15em] pb-2 border-b-2 transition-all",
                                    activeTab === tab.toLowerCase()
                                        ? "text-white border-white"
                                        : "text-white/40 border-transparent hover:text-white/70"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- CONTENT SECTION --- */}
                <div className="p-8 pt-6 overflow-y-auto bg-[#0047AB] border-t-2 border-[#0047AB] flex-1"> {/* Smooth continuation */}

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            {/* LEFT COLUMN: Metric Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* V-Score */}
                                <div className="col-span-1 rounded-lg border border-white/20 p-5 relative overflow-hidden group hover:border-white/40 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">V-Score Safety</span>
                                        <span className={cn("text-3xl font-bold", isHighRisk ? "text-intl-orange" : "text-matchbox-green")}>
                                            {selectedRoute.riskScore ? selectedRoute.riskScore.toFixed(1) : '9.5'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mt-4">
                                        <div className="flex justify-between text-[10px] font-mono opacity-80">
                                            <span>Base:</span> <span>10.0</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-mono opacity-80 text-red-300">
                                            <span>TVL Depth:</span> <span>-0.5</span>
                                        </div>
                                    </div>
                                </div>

                                {/* TVL */}
                                <div className="col-span-1 rounded-lg border border-white/20 p-5 group hover:border-white/40 transition-colors">
                                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 block mb-2">TVL</span>
                                    <div className="text-3xl font-bold">${selectedRoute.bridgeMetadata.tvl}M</div>
                                </div>

                                {/* Audit */}
                                <div className="col-span-1 rounded-lg border border-white/20 p-5 group hover:border-white/40 transition-colors">
                                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 block mb-2">Audit</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold">Verified</span>
                                        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                    </div>
                                </div>

                                {/* Gas */}
                                <div className="col-span-1 rounded-lg border border-white/20 p-5 group hover:border-white/40 transition-colors">
                                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 block mb-2">Gas Est.</span>
                                    <div className="text-3xl font-bold">${selectedRoute.totalCost.toFixed(2)}</div>
                                </div>

                                {/* Description Box */}
                                <div className="col-span-2 rounded-lg border border-white/20 p-5 font-mono text-xs leading-relaxed opacity-80">
                                    Bridge via <strong className="text-white">{selectedRoute.bridgeMetadata.name}</strong> to <strong className="text-white">{network}</strong>. Enter <strong className="text-white">{project.toLowerCase()}</strong> pool. Auto-compounds daily.
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Profit Matrix */}
                            <div className="bg-white/10 rounded-lg p-6 backdrop-blur-sm border border-white/10">
                                <div className="text-[10px] font-mono font-bold tracking-widest uppercase mb-8 opacity-80">
                                    [ PROFITABILITY_MATRIX ]
                                </div>

                                <div className="relative">
                                    {/* Y-Axis Labels (Time) */}
                                    <div className="absolute top-8 bottom-0 -left-2 w-8 flex flex-col justify-between text-[10px] font-mono opacity-60 py-4">
                                        {timeframes.map(t => <div key={t.label}>{t.label}</div>)}
                                    </div>

                                    {/* X-Axis Labels (Capital) */}
                                    <div className="flex justify-between pl-12 pb-4 text-[10px] font-mono opacity-60">
                                        <span>CAPITAL ALLOCATION</span>
                                        {capitalLevels.slice(1, 2).map(c => <span key={c.label} className="mr-8">{c.label}</span>)}
                                    </div>

                                    {/* The Grid */}
                                    <div className="pl-8 space-y-4">
                                        {timeframes.map((time, i) => (
                                            <div key={time.label} className="flex items-center gap-4">
                                                <span className="w-8 text-xs font-mono opacity-60">${selectedRoute.totalCost.toFixed(0)}</span>

                                                <div className={cn(
                                                    "flex-1 py-3 px-6 rounded text-center font-bold font-mono text-sm border-2 border-sumi-black shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transition-all cursor-pointer",
                                                    i === 1 ? "bg-[#3D6F65] text-white" :
                                                        i === 2 ? "bg-[#005537] text-white" : "bg-[#5A8F85] text-white"
                                                )}>
                                                    ${((10000 * (apy / 100) * (time.days / 365)) - selectedRoute.totalCost).toFixed(0)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 text-center">
                                        <p className="text-[10px] font-mono opacity-40 uppercase">Based on $10,000 Capital Allocation</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROJECTIONS TAB - COST RECOVERY BAR CHART */}
                    {activeTab === 'projections' && (
                        <div className="w-full h-full flex flex-col animate-fade-in">
                            <div className="mb-6 flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-bold tracking-tight mb-1">Cost Recovery Analysis</h3>
                                    <p className="text-xs font-mono opacity-60 uppercase">30-Day Net Profit Projection ($10k Capital)</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono opacity-60 uppercase mb-1">Breakeven</div>
                                    <div className="text-2xl font-bold text-matchbox-green">
                                        ~{(selectedRoute.totalCost / ((10000 * (apy / 100)) / 365)).toFixed(1)} Days
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-8 relative flex items-end gap-2 group">
                                {/* Baseline (Zero) Line */}
                                <div className="absolute left-0 right-0 bottom-[50%] h-px bg-white/30 border-t border-dashed border-white/30"
                                    style={{ bottom: 'calc(50% + 20px)' }} /* Approximate visual zero */
                                >
                                    <span className="absolute right-2 -top-6 text-[10px] font-mono opacity-50">BREAKEVEN POINT</span>
                                </div>

                                <div className="absolute inset-0 flex items-center px-8 gap-2">
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const day = i + 1;
                                        const dailyYield = (10000 * (apy / 100)) / 365;
                                        const totalCost = selectedRoute.totalCost;
                                        const cumulative = (dailyYield * day) - totalCost;

                                        const limit = Math.max(Math.abs(projection), totalCost * 2);
                                        const heightPct = Math.min((Math.abs(cumulative) / limit) * 100, 45); // Max 45% height

                                        return (
                                            <div key={i} className="flex-1 h-full flex flex-col items-center justify-center group/bar relative">
                                                {/* Tooltip */}
                                                <div className="absolute -top-4 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-sumi-black border border-white/20 text-white text-[10px] font-mono py-1 px-2 rounded z-20 pointer-events-none whitespace-nowrap">
                                                    Day {day}: <span className={cumulative >= 0 ? "text-green-400" : "text-red-400"}>${cumulative.toFixed(2)}</span>
                                                </div>

                                                {/* Positive Bar */}
                                                <div className="w-full flex-1 flex flex-col justify-end pb-[1px]">
                                                    {cumulative > 0 && (
                                                        <div
                                                            className="w-full bg-green-400 rounded-t-sm animate-grow-up hover:brightness-110 cursor-help"
                                                            style={{ height: `${heightPct}%` }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Zero Line Marker */}
                                                <div className="w-full h-0.5 bg-white/20" />

                                                {/* Negative Bar */}
                                                <div className="w-full flex-1 flex flex-col justify-start pt-[1px]">
                                                    {cumulative < 0 && (
                                                        <div
                                                            className="w-full bg-red-400/80 rounded-b-sm animate-grow-down hover:brightness-110 cursor-help"
                                                            style={{ height: `${heightPct}%` }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXECUTION TAB Placeholder */}
                    {activeTab === 'execution' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in opacity-60">
                            <Clock className="w-12 h-12 mb-4" />
                            <p className="font-mono text-sm uppercase">Execution Wizard Ready</p>
                            <p className="text-xs mt-2">Click "Execute" in header to start</p>
                        </div>
                    )}
                </div>

            </motion.div>
        </div>
    );
};

export default React.memo(InfrastructureModal);
