"use client";

import { useEffect, useState, useCallback } from 'react';
import { Pool, UserSettings, RouteCalculation } from '@/types';
import { apiService } from '@/lib/services/apiService';
import { RefreshCw, AlertTriangle, ArrowRight, TrendingUp, Clock, Shield } from 'lucide-react';
import { StampCard } from '@/components/ui/stamp-card';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
    settings: UserSettings;
    setFetching: (val: boolean) => void;
    walletAddress?: `0x${string}`;
}

export function DashboardView({ settings, setFetching, walletAddress }: DashboardViewProps) {
    const [routes, setRoutes] = useState<RouteCalculation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const calculateStrategies = useCallback(async () => {
        setLoading(true);
        setFetching(true);
        setError(null);

        // Mock delay for effect
        // await new Promise(resolve => setTimeout(resolve, 1000));

        if (!walletAddress) {
            setError("Please connect your wallet to view route calculations.");
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

    useEffect(() => {
        calculateStrategies();
    }, [calculateStrategies]);

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto bg-paper-white">

            {/* Header Section */}
            <div className="flex items-end justify-between border-b-2 border-sumi-black pb-6">
                <div>
                    <h2 className="font-sans text-4xl font-bold text-sumi-black tracking-tighter uppercase mb-2">
                        Market Analysis
                    </h2>
                    <div className="font-mono text-xs font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 bg-intl-orange rounded-full" />
                        Live Yield Optimization Engine
                    </div>
                </div>

                <button
                    onClick={calculateStrategies}
                    disabled={loading}
                    className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-sumi-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
                >
                    <RefreshCw className={cn("w-4 h-4 text-sumi-black", loading && "animate-spin")} />
                    <span className="font-mono text-sm font-bold uppercase text-sumi-black">
                        {loading ? 'ANALYZING...' : 'REFRESH_DATA'}
                    </span>
                </button>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-48 bg-sumi-black/5 border-2 border-dashed border-sumi-black/20 rounded-lg" />
                    ))}
                </div>
            ) : error ? (
                <StampCard className="bg-intl-orange/10 border-intl-orange">
                    <div className="flex flex-col items-center justify-center py-12 text-center text-intl-orange">
                        <AlertTriangle className="w-12 h-12 mb-4" />
                        <h3 className="font-bold text-xl uppercase tracking-widest mb-2">Analysis Failed</h3>
                        <p className="font-mono text-sm max-w-md">{error}</p>
                    </div>
                </StampCard>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {routes.map((route, i) => {
                        const isBest = i === 0;
                        const isHighRisk = route.riskLevel > settings.riskTolerance;

                        if (isHighRisk && !isBest) return null; // Simple filter for now

                        return (
                            <StampCard
                                key={i}
                                variant={isBest ? "blue" : "default"}
                                className="group transition-transform hover:-translate-y-1"
                            >
                                <div className="flex flex-col md:flex-row justify-between gap-6">

                                    {/* Left: Protocol Info */}
                                    <div className="space-y-2 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-3 h-3 border border-current",
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
                                        <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2 py-1 border border-current">
                                            <Clock className="w-3 h-3" />
                                            {route.estimatedTime}s
                                        </div>

                                        <button className={cn(
                                            "flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase border-2 transition-all",
                                            isBest ? "bg-white text-cobalt-blue border-white hover:bg-white/90" : "bg-sumi-black text-white border-sumi-black hover:bg-sumi-black/90"
                                        )}>
                                            Execute <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </StampCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
