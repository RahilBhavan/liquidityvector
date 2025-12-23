'use client';

import { RouteCalculation, Chain } from '@/types';
import { ArrowRight, Clock, DollarSign, TrendingUp, Zap, AlertTriangle, Link as LinkIcon, Shield } from 'lucide-react';

interface RouteCardProps {
  route: RouteCalculation;
  currentChain: Chain;
}

export default function RouteCard({ route, currentChain }: RouteCardProps) {
  return (
    <div className="card-base p-8 relative overflow-hidden bg-surface group">
      {route.hasExploits && (
        <div className="absolute top-0 left-0 w-full bg-critical/10 text-critical text-xs font-semibold py-2 text-center z-20 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Route involves infrastructure with historical security incidents.</span>
        </div>
      )}

      {/* Decorative Background Blur */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-secondary mb-2">
            {/* Styling adjustment for badges */}
            <span className="bg-surface-secondary px-3 py-1 rounded-full border border-black/5">{currentChain}</span>
            <ArrowRight className="w-4 h-4 text-divider" />
            <span className="bg-surface-secondary px-3 py-1 rounded-full text-primary border border-black/5">{route.targetPool.chain}</span>
          </div>

          <h2 className="text-4xl font-bold uppercase tracking-tighter text-primary mb-4 mt-4 leading-none">
            {route.targetPool.project}
          </h2>

          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-bold text-success tracking-tighter leading-none">
              {route.targetPool.apy.toFixed(2)}%
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-secondary uppercase tracking-widest">APY</span>
              <span className="text-[10px] font-mono font-bold text-secondary/60 uppercase tracking-tight">Risk-Adj: {route.riskAdjustedApy.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:min-w-[300px]">
          <div className="bg-surface-secondary/50 rounded-xl p-4 border-2 border-transparent hover:border-black/5 transition-colors">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-secondary mb-1">
              <Clock className="w-3 h-3" /> Breakeven
            </div>
            <span className="text-xl font-bold font-mono text-primary">{route.breakevenHours.toFixed(1)}h</span>
          </div>

          <div className="bg-surface-secondary/50 rounded-xl p-4 border-2 border-transparent hover:border-black/5 transition-colors">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-secondary mb-1">
              <DollarSign className="w-3 h-3" /> Total Cost
            </div>
            <span className="text-xl font-bold font-mono text-primary">${route.totalCost.toFixed(2)}</span>
          </div>

          <div className="bg-surface-secondary/50 rounded-xl p-4 border-2 border-transparent hover:border-black/5 transition-colors">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-secondary mb-1">
              <LinkIcon className="w-3 h-3" /> Route
            </div>
            <span className="text-sm font-bold uppercase tracking-tight text-primary truncate block">{route.bridgeName}</span>
          </div>

          <div className="bg-accent/5 rounded-xl p-4 border-2 border-accent/10">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-accent mb-1">
              <TrendingUp className="w-3 h-3" /> 30d Net
            </div>
            <span className="text-xl font-bold font-mono text-accent">${route.netProfit30d.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
