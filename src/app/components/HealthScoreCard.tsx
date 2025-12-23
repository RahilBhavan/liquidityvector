'use client';

import { useMemo } from 'react';
import { OpportunityMetric } from '@/hooks/useOpportunityCost';
import { AlertTriangle, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface HealthScoreCardProps {
    healthScore: number;
    totalMissedYearly: number;
    opportunities: OpportunityMetric[];
    isLoading?: boolean;
}

export function HealthScoreCard({ healthScore, totalMissedYearly, opportunities, isLoading }: HealthScoreCardProps) {
    const status = useMemo(() => {
        if (isLoading) return { color: 'text-secondary', label: 'Scanning...', bg: 'bg-secondary/10' };
        if (healthScore >= 95) return { color: 'text-matchbox-green', label: 'Excellent Efficiency', bg: 'bg-matchbox-green/10' };
        if (healthScore >= 70) return { color: 'text-warning', label: 'Optimization Possible', bg: 'bg-warning/10' };
        return { color: 'text-intl-orange', label: 'High Opportunity Cost', bg: 'bg-intl-orange/10' };
    }, [healthScore, isLoading]);

    if (isLoading) {
        return (
            <div className="neo-card p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (opportunities.length === 0 && healthScore === 100) {
        return (
            <div className="neo-card p-6 flex items-center justify-between group hover:border-matchbox-green/50 transition-colors">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-5 h-5 text-matchbox-green" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-secondary">Portfolio Health</h3>
                    </div>
                    <p className="text-xl font-bold tracking-tight text-primary">All Assets Optimized</p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-bold text-matchbox-green tracking-tighter">100</span>
                    <span className="text-xs font-bold text-success block">SCORE</span>
                </div>
            </div>
        );
    }

    return (
        <div className="neo-card relative overflow-hidden group">
            {/* Status Bar */}
            <div className={cn("absolute top-0 left-0 right-0 h-1",
                healthScore < 70 ? "bg-intl-orange" : "bg-warning"
            )} />

            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {healthScore < 70 ? <AlertTriangle className="w-5 h-5 text-intl-orange" /> : <TrendingUp className="w-5 h-5 text-warning" />}
                            <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">Capital Efficiency</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-bold tracking-tighter text-primary">
                                ${totalMissedYearly.toFixed(2)}
                            </h2>
                            <span className="text-xs font-bold text-secondary uppercase">Missed / Year</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className={cn("text-4xl font-bold tracking-tighter", status.color)}>
                            {healthScore}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full", status.bg, status.color)}>
                            {status.label}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">Top Opportunities</div>
                    {opportunities.slice(0, 2).map((opp) => (
                        <div key={opp.symbol} className="flex items-center justify-between p-3 bg-surface-raised rounded-lg border border-divider hover:border-primary/20 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-sumi-black/5 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">{opp.symbol}</div>
                                    <div className="text-xs text-secondary font-mono">${opp.idleUsd.toFixed(0)} Idle</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-success">+{opp.potentialApy.toFixed(1)}% APY</div>
                                <div className="text-xs text-secondary font-mono">Via {opp.bestPool?.project}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {opportunities.length > 2 && (
                    <div className="mt-4 text-center">
                        <button className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">
                            View {opportunities.length - 2} More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
