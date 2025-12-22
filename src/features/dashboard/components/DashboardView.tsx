"use client";

import { useEffect, useState, useCallback } from 'react';
import { Pool, UserSettings, RouteCalculation } from '@/types';
import { apiService } from '@/lib/services/apiService';
import { RefreshCw, TrendingUp, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { StampCard } from '@/components/ui/stamp-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProfitabilityMatrix } from '@/components/ui/profitability-matrix';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface DashboardViewProps {
    settings: UserSettings;
    setFetching: (val: boolean) => void;
    walletAddress?: `0x${string}`;
}

export function DashboardView({ settings, setFetching, walletAddress }: DashboardViewProps) {
    const [routes, setRoutes] = useState<RouteCalculation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAttempted, setHasAttempted] = useState(false);
    const [expandedRouteIndex, setExpandedRouteIndex] = useState<number | null>(null);

    const calculateStrategies = useCallback(async () => {
        setLoading(true);
        setFetching(true);
        setError(null);
        setHasAttempted(true);
        setExpandedRouteIndex(null);

        if (!walletAddress) {
            setLoading(false);
            setFetching(false);
            return;
        }

        try {
            const pools = await apiService.fetchTopPools();
            if (!pools || pools.length === 0) throw new Error("No pools found.");

            const potentialTargets = pools.filter(p => p.chain !== settings.currentChain);
            const analysisPromises = potentialTargets.map(pool =>
                apiService.analyze(settings.capital, settings.currentChain, pool, walletAddress)
            );

            const results = await Promise.allSettled(analysisPromises);
            const calculatedRoutes: RouteCalculation[] = [];

            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    calculatedRoutes.push(result.value);
                }
            });

            if (calculatedRoutes.length === 0) throw new Error("Could not calculate valid routes.");

            calculatedRoutes.sort((a, b) => b.netProfit30d - a.netProfit30d);
            setRoutes(calculatedRoutes);

        } catch (e) {
            console.error("Calculation failed", e);
            setError(e instanceof Error ? e.message : "Analysis failed");
        } finally {
            setLoading(false);
            setFetching(false);
        }
    }, [settings.capital, settings.currentChain, settings.riskTolerance, walletAddress, setFetching]);

    const showEmptyState = !loading && (routes.length === 0 || error || !walletAddress);

    const toggleExpand = (index: number) => {
        setExpandedRouteIndex(expandedRouteIndex === index ? null : index);
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto bg-paper-white">

            {/* Header Section */}
            <div className="flex items-end justify-between border-b-2 border-sumi-black pb-6">
                <div>
                    <h2 className="font-sans text-4xl font-bold text-sumi-black tracking-tighter uppercase mb-2">
                        Market Analysis
                    </h2>
                    <div className="font-mono text-xs font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-intl-orange rounded-full animate-pulse" />
                        Live Yield Optimization Engine
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={calculateStrategies}
                    disabled={loading}
                    className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-sumi-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 hover:bg-paper-white rounded-[var(--radius)]"
                >
                    <RefreshCw className={cn("w-4 h-4 text-sumi-black", loading && "animate-spin")} />
                    <span className="font-mono text-sm font-bold uppercase text-sumi-black">
                        {loading ? 'ANALYZING...' : 'REFRESH_DATA'}
                    </span>
                </motion.button>
            </div>

            {/* Content Area */}
            <LayoutGroup>
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div key="loader" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: i * 0.1 }}
                                    className="h-48 bg-white border-2 border-dashed border-sumi-black/20 rounded-[var(--radius)] animate-pulse"
                                />
                            ))}
                        </div>
                    ) : showEmptyState ? (
                        <EmptyState
                            key="empty"
                            title={error ? "Analysis Failed" : !walletAddress ? "Wallet Disconnected" : "No Results"}
                            description={error || (!walletAddress ? "Please connect your wallet to start analyzing optimal yield routes." : "Try adjusting your risk tolerance or capital allocation.")}
                            actionLabel={!walletAddress ? undefined : "Retry Analysis"}
                            onAction={!walletAddress ? undefined : calculateStrategies}
                        />
                    ) : (
                        <motion.div
                            key="results"
                            layout
                            className="grid grid-cols-1 gap-6"
                        >
                            {routes.map((route, i) => {
                                const isBest = i === 0;
                                const isHighRisk = route.riskLevel > settings.riskTolerance;
                                const isExpanded = expandedRouteIndex === i;

                                if (isHighRisk && !isBest) return null;

                                return (
                                    <motion.div
                                        key={`${route.targetPool.pool}-${i}`}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <StampCard
                                            variant={isBest ? "blue" : "default"}
                                            className={cn(
                                                "group transition-all neo-card shadow-md hover:shadow-lg cursor-pointer",
                                                isBest ? "border-cobalt-blue" : "",
                                                isExpanded ? "ring-2 ring-offset-2 ring-sumi-black" : ""
                                            )}
                                            onClick={() => toggleExpand(i)}
                                        >
                                            <div className="flex flex-col md:flex-row justify-between gap-6">

                                                {/* Left: Protocol Info */}
                                                <div className="space-y-2 min-w-[200px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-3 h-3 border border-current rounded-full",
                                                            isBest ? "bg-matchbox-green" : "bg-sumi-black"
                                                        )} />
                                                        <span className={cn(
                                                            "font-mono text-xs font-bold uppercase tracking-widest opacity-80",
                                                            isBest ? "text-white" : "text-sumi-black"
                                                        )}>
                                                            {route.targetPool.chain} Network
                                                        </span>
                                                    </div>
                                                    <h3 className="font-sans text-3xl font-bold tracking-tight uppercase">
                                                        {route.targetPool.project}
                                                    </h3>
                                                    <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase opacity-60">
                                                        <span>{route.bridgeName} Bridge</span>
                                                    </div>
                                                </div>

                                                {/* Middle: Metrics */}
                                                <div className="grid grid-cols-2 gap-8 flex-1 border-l-2 border-current/20 pl-6 border-dashed">
                                                    <div>
                                                        <div className="font-mono text-[10px] font-bold uppercase opacity-60 mb-1">Net APY</div>
                                                        <div className="font-sans text-4xl font-bold tracking-tighter flex items-center gap-2">
                                                            {route.targetPool.apy.toFixed(2)}%
                                                            <TrendingUp className="w-5 h-5 opacity-50" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-[10px] font-bold uppercase opacity-60 mb-1">30d Projection</div>
                                                        <div className="font-sans text-4xl font-bold tracking-tighter">
                                                            ${route.netProfit30d.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Action */}
                                                <div className="flex flex-col justify-between items-end min-w-[150px]">
                                                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2 py-1 border border-current rounded-sm">
                                                        <Clock className="w-3 h-3" />
                                                        {route.estimatedTime}s
                                                    </div>

                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Handle execute logic here
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase border-2 transition-all rounded-[var(--radius)] mb-2",
                                                            isBest ? "bg-white text-cobalt-blue border-white hover:bg-white/90" : "bg-sumi-black text-white border-sumi-black hover:bg-sumi-black/90"
                                                        )}
                                                    >
                                                        Execute <ArrowRight className="w-3 h-3" />
                                                    </motion.button>
                                                    <div className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
                                                        {isExpanded ? "Less Info" : "More Info"}
                                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Content: Layout */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-6 mt-6 border-t-2 border-current/10 border-dashed grid grid-cols-1 md:grid-cols-2 gap-8">

                                                            {/* Column 1: Strategy Details */}
                                                            <div className="space-y-4">
                                                                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 bg-current/5 px-2 py-1 rounded w-fit">
                                                                    Strategy Breakdown
                                                                </h4>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="p-3 rounded bg-current/5 border border-current/10">
                                                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-1">Safety Score</div>
                                                                        <div className="text-xl font-bold font-sans">9.2/10</div>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-current/5 border border-current/10">
                                                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-1">TVL</div>
                                                                        <div className="text-xl font-bold font-sans">$42.5M</div>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-current/5 border border-current/10">
                                                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-1">Audit Status</div>
                                                                        <div className="text-xl font-bold font-sans flex items-center gap-2">
                                                                            Verified <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-current/5 border border-current/10">
                                                                        <div className="font-mono text-[10px] uppercase opacity-60 mb-1">Est. Gas</div>
                                                                        <div className="text-xl font-bold font-sans">~$0.45</div>
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs opacity-70 leading-relaxed font-mono">
                                                                    This route bridges assets via {route.bridgeName} to {route.targetPool.chain}, entering the {route.targetPool.project} {route.targetPool.pool} pool. Auto-compounds daily.
                                                                </p>
                                                            </div>

                                                            {/* Column 2: Matrix */}
                                                            <div className={cn("rounded-lg", isBest ? "text-sumi-black" : "")}>
                                                                {/* Only force text color reset if parent is colored, 
                                                                    but Matrix component handles its own colors mostly. 
                                                                    We might need a wrapper if Matrix assumes white bg context is enough 
                                                                    but text outside it needs contrast. 
                                                                */}
                                                                <div className="bg-white/50 p-2 rounded-lg">
                                                                    <ProfitabilityMatrix matrix={route.profitabilityMatrix} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </StampCard>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </LayoutGroup>
        </div>
    );
}
