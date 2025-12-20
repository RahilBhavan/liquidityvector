'use client';

import { RouteCalculation, Chain } from '@/types';
import { ArrowRight, Clock, DollarSign, TrendingUp, Zap, AlertTriangle, Link as LinkIcon } from 'lucide-react';

interface RouteCardProps {
  route: RouteCalculation;
  currentChain: Chain;
}

export default function RouteCard({ route, currentChain }: RouteCardProps) {
  return (
    <div className="bg-white border-2 border-[#371E7B] p-8 relative overflow-hidden group shadow-[8px_8px_0px_0px_#371E7B]">
      {route.hasExploits && (
        <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] md:text-xs font-bold uppercase py-1 text-center z-20 flex items-center justify-center gap-2 tracking-widest">
          <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" /> Warning: Route uses bridge with history of security incidents
        </div>
      )}

      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Zap className="w-64 h-64 text-[#371E7B]" />
      </div>

      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 ${route.hasExploits ? 'mt-4' : ''}`}>
        <div>
          <div className="flex items-center gap-3 text-sm font-bold font-mono mb-4 text-[#371E7B]">
            <span className="bg-[#F9F9F5] border border-[#371E7B] px-2 py-1 uppercase">{currentChain}</span>
            <ArrowRight className="w-4 h-4" />
            <span className="bg-[#CCFF00] border border-[#371E7B] text-[#371E7B] px-2 py-1 uppercase">{route.targetPool.chain}</span>
          </div>
          <h2 className="text-5xl font-bold text-[#371E7B] mb-2 font-['Space_Grotesk'] leading-tight">
            {route.targetPool.project}
          </h2>
          <div className="flex items-baseline gap-4 mt-2">
            <span className="text-4xl font-bold text-[#371E7B] bg-[#CCFF00] px-2">{route.targetPool.apy.toFixed(2)}% APY</span>
            <span className="text-sm font-mono text-[#371E7B] opacity-70 uppercase tracking-widest">Target Yield</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[240px]">
          <div className="border-2 border-[#371E7B] bg-[#F9F9F5] p-4">
            <div className="flex items-center justify-between text-sm mb-2 border-b border-[#371E7B] pb-2">
              <span className="text-[#371E7B] font-bold uppercase flex items-center gap-2"><Clock className="w-4 h-4" /> Breakeven</span>
              <span className="font-bold font-mono text-lg">
                {route.breakevenHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#371E7B] font-bold uppercase flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Cost</span>
              <span className="text-[#371E7B] font-mono font-bold text-lg">${route.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-[#371E7B] flex flex-wrap gap-8 md:gap-16">
        <div>
          <span className="text-xs text-[#371E7B] uppercase tracking-widest font-bold block mb-1">Bridge Route</span>
          <span className="text-lg font-mono font-bold text-[#371E7B] flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> {route.bridgeName}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#371E7B] uppercase tracking-widest font-bold block mb-1">Gas Cost</span>
          <span className="text-lg font-mono font-bold text-[#371E7B]">${route.gasCost.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-xs text-[#371E7B] uppercase tracking-widest font-bold block mb-1">Bridge Fee</span>
          <span className="text-lg font-mono font-bold text-[#371E7B]">${route.bridgeCost.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-xs text-[#371E7B] uppercase tracking-widest font-bold block mb-1">Proj. 30d Profit</span>
          <span className="text-lg font-mono font-bold flex items-center gap-2 bg-[#371E7B] text-white px-2">
            <TrendingUp className="w-4 h-4 text-[#CCFF00]" /> ${route.netProfit30d.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
