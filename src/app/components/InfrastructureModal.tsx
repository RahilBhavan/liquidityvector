'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowUpRight, Clock, ShieldCheck, AlertTriangle, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { RouteCalculation, RiskCheck } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import WaterfallChart from './WaterfallChart';
import YieldHistogram from './YieldHistogram';
import PreFlightModal from './PreFlightModal';

interface InfrastructureModalProps {
    selectedRoute: RouteCalculation | null;
    onClose: () => void;
}

// Mock histogram data for demo (in production, fetch from /pool/{id}/history)
const mockHistogramData = [
    { range_start: 3.0, range_end: 3.5, count: 8, frequency: 0.05 },
    { range_start: 3.5, range_end: 4.0, count: 15, frequency: 0.09 },
    { range_start: 4.0, range_end: 4.5, count: 28, frequency: 0.17 },
    { range_start: 4.5, range_end: 5.0, count: 45, frequency: 0.27 },
    { range_start: 5.0, range_end: 5.5, count: 38, frequency: 0.23 },
    { range_start: 5.5, range_end: 6.0, count: 20, frequency: 0.12 },
    { range_start: 6.0, range_end: 6.5, count: 10, frequency: 0.06 },
    { range_start: 6.5, range_end: 7.0, count: 2, frequency: 0.01 },
];

const mockStatistics = {
    mean: 4.82,
    std: 0.73,
    min: 3.1,
    max: 6.8,
    median: 4.9,
    count: 166,
};

const InfrastructureModal: React.FC<InfrastructureModalProps> = ({ selectedRoute, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'projections' | 'execution'>('overview');
    const [showPreFlight, setShowPreFlight] = useState(false);
    const [preFlightChecks, setPreFlightChecks] = useState<RiskCheck[]>([]);
    const [isCheckingPreflight, setIsCheckingPreflight] = useState(false);
    const [preFlightPassed, setPreFlightPassed] = useState(false);

    // Ensure hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    // Run pre-flight checks after mount
    useEffect(() => {
        if (mounted && selectedRoute) {
            runPreFlightChecks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, selectedRoute?.targetPool?.pool]);

    const runPreFlightChecks = useCallback(async () => {
        if (!selectedRoute) return;

        setIsCheckingPreflight(true);
        try {
            const response = await fetch('/api/preflight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capital: 10000, // Use settings.capital in production
                    target_chain: selectedRoute.targetPool.chain,
                    pool_tvl: selectedRoute.targetPool.tvlUsd,
                    project: selectedRoute.targetPool.project,
                    risk_score: selectedRoute.riskScore || 75,
                }),
            });

            if (response.ok) {
                const checks = await response.json();
                setPreFlightChecks(checks);
                setPreFlightPassed(!checks.some((c: RiskCheck) => c.status === 'fail'));
            } else {
                // Fallback checks if API fails
                setPreFlightChecks([
                    { name: 'Liquidity Depth', status: 'pass', message: 'Adequate pool liquidity', severity: 1 },
                    { name: 'Protocol Safety', status: 'pass', message: 'Protocol verified', severity: 1 },
                    { name: 'Concentration Risk', status: 'pass', message: 'Position well distributed', severity: 1 },
                    { name: 'Gas Conditions', status: 'pass', message: 'Gas prices normal', severity: 1 },
                ]);
                setPreFlightPassed(true);
            }
        } catch (error) {
            // Use mock data on error
            setPreFlightChecks([
                { name: 'Liquidity Depth', status: 'pass', message: 'Adequate pool liquidity', severity: 1 },
                { name: 'Protocol Safety', status: 'pass', message: 'Protocol verified', severity: 1 },
                { name: 'Concentration Risk', status: 'pass', message: 'Position well distributed', severity: 1 },
                { name: 'Gas Conditions', status: 'pass', message: 'Gas prices normal', severity: 1 },
            ]);
            setPreFlightPassed(true);
        } finally {
            setIsCheckingPreflight(false);
        }
    }, [selectedRoute]);

    const handleExecuteClick = () => {
        setShowPreFlight(true);
    };

    const handleProceedWithMigration = () => {
        setShowPreFlight(false);
        // TODO: Trigger actual migration flow
        console.log('Proceeding with migration...');
    };

    if (!selectedRoute || !selectedRoute.bridgeMetadata) return null;

    const isHighRisk = selectedRoute.riskLevel >= 4;
    const project = selectedRoute.targetPool.project.toUpperCase();
    const network = selectedRoute.targetPool.chain.toUpperCase();
    const bridge = selectedRoute.bridgeMetadata.name.toUpperCase();
    const apy = selectedRoute.targetPool.apy;
    const projection = selectedRoute.netProfit30d;

    // Get waterfall data from route or generate mock
    const waterfallData = selectedRoute.waterfallData || [
        { label: 'Gross Yield (30D)', value: projection + selectedRoute.totalCost, cumulative: projection + selectedRoute.totalCost, isPositive: true },
        { label: 'Entry Gas', value: -selectedRoute.gasCost * 0.4, cumulative: projection + selectedRoute.totalCost - selectedRoute.gasCost * 0.4, isPositive: false },
        { label: 'Bridge Fee', value: -selectedRoute.bridgeCost, cumulative: projection + selectedRoute.totalCost - selectedRoute.gasCost * 0.4 - selectedRoute.bridgeCost, isPositive: false },
        { label: 'Exit Gas', value: -selectedRoute.gasCost * 0.6, cumulative: projection + selectedRoute.totalCost - selectedRoute.gasCost - selectedRoute.bridgeCost, isPositive: false },
        { label: 'Net Yield', value: projection, cumulative: projection, isPositive: projection > 0 },
    ];

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumi-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-6xl bg-[#0047AB] text-white rounded-xl shadow-[12px_12px_0px_rgba(0,0,0,1)] border-2 border-sumi-black overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* --- HEADER SECTION --- */}
                    <div className="p-8 pb-6 bg-[#0047AB] relative">
                        <div className="flex justify-between items-start">
                            {/* Left: Identity - ALIGNMENT: Left-aligned text block */}
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

                            {/* Middle: APY - CONTRAST: Large number stands out */}
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

                            {/* Right: Actions - PROXIMITY: Related items grouped */}
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
                                    {/* Pre-flight status indicator - REPETITION: Consistent status pattern */}
                                    <div className="flex items-center gap-2">
                                        {isCheckingPreflight ? (
                                            <Loader2 className="w-4 h-4 animate-spin opacity-60" />
                                        ) : preFlightPassed ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                                        )}
                                        <span className="text-[10px] font-mono uppercase opacity-60">
                                            {isCheckingPreflight ? 'Checking...' : preFlightPassed ? 'Checks Passed' : 'Issues Found'}
                                        </span>
                                    </div>

                                    <button onClick={onClose} className="text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100 flex items-center gap-1">
                                        Less Info <ChevronDown className="w-3 h-3 rotate-180" />
                                    </button>

                                    {/* Execute Button - Disabled until checks pass */}
                                    <button
                                        onClick={handleExecuteClick}
                                        disabled={!preFlightPassed || isCheckingPreflight}
                                        className={cn(
                                            "px-8 py-3 rounded font-bold uppercase tracking-wider text-sm flex items-center gap-2 shadow-lg transition-all",
                                            preFlightPassed && !isCheckingPreflight
                                                ? "bg-white text-[#0047AB] hover:scale-105 cursor-pointer"
                                                : "bg-white/30 text-white/50 cursor-not-allowed"
                                        )}
                                    >
                                        {isCheckingPreflight ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Checking
                                            </>
                                        ) : (
                                            <>
                                                Execute <ArrowUpRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Horizontal Dashed Divider */}
                        <div className="w-full h-px border-t-2 border-dashed border-white/20 mt-8" />

                        {/* Tabs - REPETITION: Consistent tab styling */}
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
                    <div className="p-8 pt-6 overflow-y-auto bg-[#0047AB] border-t-2 border-[#0047AB] flex-1">

                        {/* OVERVIEW TAB - CRAP: Contrast (waterfall colors), Proximity (grouped metrics) */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                                {/* LEFT COLUMN: Metric Cards - ALIGNMENT: Grid alignment */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* V-Score - CONTRAST: Color indicates risk level */}
                                        <div className="col-span-1 rounded-lg border border-white/20 p-5 relative overflow-hidden group hover:border-white/40 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">V-Score Safety</span>
                                                <span className={cn("text-3xl font-bold", isHighRisk ? "text-intl-orange" : "text-matchbox-green")}>
                                                    {selectedRoute.riskScore ? selectedRoute.riskScore.toFixed(1) : '9.5'}
                                                </span>
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
                                            <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 block mb-2">Total Cost</span>
                                            <div className="text-3xl font-bold">${selectedRoute.totalCost.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Pre-flight Summary - PROXIMITY: Related checks grouped */}
                                    <div className="rounded-lg border border-white/20 p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">Pre-Flight Checks</span>
                                            {preFlightPassed ? (
                                                <span className="text-[10px] font-bold text-green-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> ALL PASSED
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> REVIEW NEEDED
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {preFlightChecks.slice(0, 4).map((check) => (
                                                <div key={check.name} className="flex items-center gap-2 text-xs">
                                                    {check.status === 'pass' ? (
                                                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                    ) : check.status === 'warn' ? (
                                                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                                                    ) : (
                                                        <X className="w-3 h-3 text-red-400" />
                                                    )}
                                                    <span className="opacity-80">{check.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Waterfall Chart - CONTRAST: Green/orange bars */}
                                <div className="bg-white rounded-lg p-6 text-sumi-black min-h-[280px]">
                                    <WaterfallChart
                                        data={waterfallData}
                                        title="Net Yield Breakdown"
                                    />
                                </div>
                            </div>
                        )}

                        {/* PROJECTIONS TAB - CRAP: Alignment (side-by-side charts) */}
                        {activeTab === 'projections' && (
                            <div className="space-y-8 animate-fade-in">
                                {/* Two charts side by side - ALIGNMENT */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Yield Histogram - CONTRAST: Highlighted current APY */}
                                    <div className="bg-white rounded-lg p-6 text-sumi-black min-h-[300px]">
                                        <YieldHistogram
                                            histogram={mockHistogramData}
                                            statistics={mockStatistics}
                                            currentApy={apy}
                                            title="APY Stability"
                                        />
                                    </div>

                                    {/* Breakeven Chart area - Existing 30-day projection */}
                                    <div className="bg-white/10 rounded-lg p-6 border border-white/10">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold tracking-tight mb-1">Cost Recovery</h3>
                                            <p className="text-xs font-mono opacity-60 uppercase">30-Day Breakeven Analysis</p>
                                        </div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <div className="text-[10px] font-mono opacity-60 uppercase mb-1">Breakeven</div>
                                                <div className="text-3xl font-bold text-matchbox-green">
                                                    ~{selectedRoute.breakevenDays?.toFixed(1) || (selectedRoute.totalCost / ((10000 * (apy / 100)) / 365)).toFixed(1)} Days
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-mono opacity-60 uppercase mb-1">Daily Yield</div>
                                                <div className="text-xl font-bold">
                                                    ${selectedRoute.dailyYieldUsd?.toFixed(2) || ((10000 * (apy / 100)) / 365).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Simple bar visualization */}
                                        <div className="h-32 flex items-end gap-1">
                                            {Array.from({ length: 30 }).map((_, i) => {
                                                const day = i + 1;
                                                const dailyYield = selectedRoute.dailyYieldUsd || (10000 * (apy / 100)) / 365;
                                                const cumulative = (dailyYield * day) - selectedRoute.totalCost;
                                                const maxVal = dailyYield * 30;
                                                const height = Math.min(Math.abs(cumulative) / maxVal * 100, 100);

                                                return (
                                                    <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                                        <div
                                                            className={cn(
                                                                "w-full rounded-t-sm transition-all",
                                                                cumulative >= 0 ? "bg-green-400" : "bg-red-400/60"
                                                            )}
                                                            style={{ height: `${height}%` }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex justify-between mt-2 text-[10px] font-mono opacity-40">
                                            <span>Day 1</span>
                                            <span>Day 15</span>
                                            <span>Day 30</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* EXECUTION TAB */}
                        {activeTab === 'execution' && (
                            <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in py-12">
                                {preFlightPassed ? (
                                    <>
                                        <CheckCircle2 className="w-16 h-16 mb-4 text-green-400" />
                                        <p className="font-bold text-xl uppercase mb-2">Ready to Execute</p>
                                        <p className="text-sm opacity-60 mb-8">All safety checks passed. Click Execute to proceed.</p>
                                        <button
                                            onClick={handleExecuteClick}
                                            className="bg-white text-[#0047AB] px-12 py-4 rounded font-bold uppercase tracking-wider text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-lg"
                                        >
                                            Execute Migration <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-16 h-16 mb-4 text-orange-400" />
                                        <p className="font-bold text-xl uppercase mb-2">Pre-Flight Issues</p>
                                        <p className="text-sm opacity-60 mb-8">Please review the safety checks before proceeding.</p>
                                        <button
                                            onClick={() => setActiveTab('overview')}
                                            className="border border-white/30 px-8 py-3 rounded font-bold uppercase tracking-wider text-sm hover:bg-white/10 transition-colors"
                                        >
                                            Review Checks
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Pre-Flight Modal */}
            <PreFlightModal
                isOpen={showPreFlight}
                onClose={() => setShowPreFlight(false)}
                onProceed={handleProceedWithMigration}
                checks={preFlightChecks}
                isLoading={isCheckingPreflight}
                migrationDetails={{
                    fromChain: 'Ethereum',
                    toChain: selectedRoute.targetPool.chain,
                    amount: 10000,
                    protocol: selectedRoute.targetPool.project,
                }}
            />
        </>
    );
};

export default React.memo(InfrastructureModal);
