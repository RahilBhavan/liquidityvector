'use client';

import { useMemo, memo } from 'react';
import { RouteCalculation } from '@/types';

interface HeatmapProps {
  route: RouteCalculation;
  capital: number;
}

const CAPITAL_MULTIPLIERS = [0.5, 1, 1.5, 2, 5];
const TIME_HORIZONS = [7, 14, 30, 90, 180, 365];
const INTENSITY_SCALE = 200;

function Heatmap({ route, capital }: HeatmapProps) {
  const hasBackendMatrix = route.profitabilityMatrix && Object.keys(route.profitabilityMatrix).length > 0;
  
  // Debug: Log matrix structure if available
  if (hasBackendMatrix && process.env.NODE_ENV === 'development') {
    console.log('Profitability Matrix Keys:', Object.keys(route.profitabilityMatrix));
    console.log('Sample Entry:', route.profitabilityMatrix['1'] || route.profitabilityMatrix['1.0']);
  }

  const getProfitability = useMemo(() => {
    if (hasBackendMatrix) {
      return (multiplier: number, days: number): number => {
        const daysKey = String(days);
        
        // Try multiple key formats to handle backend variations
        const possibleKeys = [
          String(multiplier), // "1.5"
          multiplier === Math.floor(multiplier) ? String(Math.floor(multiplier)) : undefined, // "1" for whole numbers
          multiplier === Math.floor(multiplier) ? `${multiplier}.0` : undefined, // "1.0" for whole numbers
        ].filter((key): key is string => key !== undefined);
        
        // Try each possible key format
        for (const multiplierKey of possibleKeys) {
          const profit = route.profitabilityMatrix[multiplierKey]?.[daysKey];
          if (profit !== undefined && profit !== null) {
            return profit;
          }
        }
        
        // If no match found, return 0
        return 0;
      };
    }
    // Fallback calculation when backend matrix is not available
    // Use cost ratio approach (costs scale proportionally with capital)
    const costRatio = route.totalCost > 0 ? route.totalCost / capital : 0;
    return (multiplier: number, days: number): number => {
      const simCapital = capital * multiplier;
      const dailyYield = (simCapital * (route.targetPool.apy / 100)) / 365;
      const grossProfit = dailyYield * days;
      const simTotalCost = simCapital * costRatio;
      const netProfit = grossProfit - simTotalCost;
      return Math.round(netProfit * 100) / 100; // Round to 2 decimal places
    };
  }, [hasBackendMatrix, route.profitabilityMatrix, route.totalCost, route.targetPool.apy, capital]);

  const getCellClass = (profit: number): string => {
    if (profit < 0) return 'bg-background text-secondary border border-dashed border-divider opacity-60';
    if (profit === 0) return 'bg-background text-secondary border border-divider opacity-40';

    const intensity = Math.min(Math.abs(profit) / INTENSITY_SCALE, 1);
    
    if (intensity < 0.25) return 'bg-success/10 text-success border border-success/20';
    if (intensity < 0.5) return 'bg-success/30 text-success font-medium border border-success/30';
    if (intensity < 0.75) return 'bg-success/60 text-white font-medium';
    return 'bg-success text-white font-bold shadow-soft-sm';
  };

  const formatProfit = (profit: number): string => {
    const prefix = profit > 0 ? '+' : '';
    if (Math.abs(profit) > 999) return `${prefix}${(profit / 1000).toFixed(1)}k`;
    return `${prefix}${profit.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-primary tracking-tight">Profitability Projection</h3>
        <p className="text-xs text-secondary font-medium uppercase tracking-wider">Net returns based on allocation and duration</p>
      </div>

      <div className="flex-1 min-h-0">
        <div className="overflow-x-auto custom-scrollbar pb-2">
          <div className="min-w-[600px] space-y-4">
            {/* Horizontal Axis Label */}
            <div className="flex justify-center">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] opacity-50">Allocation Scale</span>
            </div>

            {/* Matrix Header */}
            <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2">
              <div className="flex items-end justify-end pb-2">
                <span className="text-[10px] font-bold text-secondary uppercase opacity-40">Horizon</span>
              </div>
              {CAPITAL_MULTIPLIERS.map(step => (
                <div key={step} className="flex flex-col items-center pb-2 border-b border-divider">
                  <span className={`text-[10px] font-bold mb-1 ${step === 1 ? 'text-accent' : 'text-secondary'}`}>
                    {step === 1 ? 'CURRENT' : `${step}x`}
                  </span>
                  <span className="text-xs font-bold text-primary tracking-tight">
                    ${(capital * step / 1000).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="space-y-2">
              {TIME_HORIZONS.map(days => (
                <div key={days} className="grid grid-cols-[100px_repeat(5,1fr)] gap-2 items-stretch group/row">
                  <div className="flex items-center justify-end pr-4 text-xs font-bold text-secondary group-hover/row:text-primary transition-colors">
                    {days} Days
                  </div>
                  {CAPITAL_MULTIPLIERS.map(step => {
                    const profit = getProfitability(step, days);
                    return (
                      <div
                        key={step}
                        className={`
                          h-12 rounded-xl flex items-center justify-center text-sm transition-all duration-300
                          hover:scale-105 hover:z-10 cursor-default
                          ${getCellClass(profit)}
                          ${step === 1 ? 'ring-2 ring-accent/20 ring-inset' : ''}
                        `}
                        title={`Capital: $${(capital * step).toLocaleString()} | Days: ${days} | Profit: $${profit.toFixed(2)}`}
                      >
                        <span className="font-mono tracking-tighter">{formatProfit(profit)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-divider flex items-center justify-between">
        <span className="text-[10px] font-bold text-secondary uppercase opacity-40 italic">* Net of gas and bridge fees</span>
        <div className="flex items-center gap-4 text-[10px] font-bold text-secondary uppercase tracking-wide">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-dashed border-divider"></div> Loss
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-success/20"></div> Base
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-success/50"></div> Growth
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-success shadow-sm"></div> Peak
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Heatmap);
