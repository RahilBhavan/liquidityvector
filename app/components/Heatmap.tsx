'use client';

import { useMemo, memo } from 'react';
import { RouteCalculation } from '@/types';

interface HeatmapProps {
  route: RouteCalculation;
  capital: number;
}

// Configuration matching backend profitability matrix
const CAPITAL_MULTIPLIERS = [0.5, 0.75, 1, 1.25, 1.5, 2, 5];
const TIME_HORIZONS = [7, 14, 30, 90, 180, 365];

// Intensity scaling factor for color calculation
const INTENSITY_SCALE = 200;

function Heatmap({ route, capital }: HeatmapProps) {
  const hasBackendMatrix = route.profitabilityMatrix &&
    Object.keys(route.profitabilityMatrix).length > 0;

  const getProfitability = useMemo(() => {
    if (hasBackendMatrix) {
      return (multiplier: number, days: number): number => {
        const multiplierKey = String(multiplier);
        const daysKey = String(days);
        return route.profitabilityMatrix[multiplierKey]?.[daysKey] ?? 0;
      };
    }

    const costRatio = route.totalCost / capital;
    return (multiplier: number, days: number): number => {
      const simCapital = capital * multiplier;
      const grossProfit = (simCapital * (route.targetPool.apy / 100)) * (days / 365);
      const simTotalCost = simCapital * costRatio;
      return grossProfit - simTotalCost;
    };
  }, [hasBackendMatrix, route.profitabilityMatrix, route.totalCost, route.targetPool.apy, capital]);

  const getCellClass = (profit: number): string => {
    if (profit <= 0) return 'bg-bit-white text-bit-black'; // Loss
    const intensity = Math.min(Math.abs(profit) / INTENSITY_SCALE, 1);
    
    if (intensity < 0.3) return 'pattern-stipple-light text-bit-black font-bold';
    if (intensity < 0.7) return 'pattern-checker text-bit-black font-bold';
    return 'bg-bit-black text-bit-white font-bold';
  };

  const formatProfit = (profit: number): string => {
    const prefix = profit > 0 ? '+' : '';
    if (Math.abs(profit) > 999) {
      return `${prefix}${(profit / 1000).toFixed(1)}k`;
    }
    return `${prefix}${profit.toFixed(0)}`;
  };

  return (
    <div className="bg-bit-white border-2 border-bit-black p-4 h-full flex flex-col shadow-hard">
      <h3 className="text-lg font-bold font-pixel uppercase mb-6 flex items-center gap-2">
        <span className="w-3 h-3 bg-bit-black"></span>
        Profitability Matrix
      </h3>
      <div className="overflow-x-auto flex-1 flex flex-col justify-center">
        <div className="min-w-[400px]">
          {/* Header row */}
          <div className="flex mb-2">
            <div className="w-24 text-xs font-mono font-bold flex items-end uppercase">
              Time \ Cap
            </div>
            {CAPITAL_MULTIPLIERS.map(step => (
              <div
                key={step}
                className="flex-1 text-center text-xs font-mono font-bold pb-2 border-b-2 border-bit-black mx-0.5"
              >
                ${(capital * step / 1000).toFixed(1)}k
              </div>
            ))}
          </div>

          {/* Data rows */}
          {TIME_HORIZONS.map(days => (
            <div key={days} className="flex mb-1 h-10">
              <div className="w-24 text-xs font-mono font-bold flex items-center pr-4 border-r-2 border-bit-black">
                {days} DAYS
              </div>
              {CAPITAL_MULTIPLIERS.map(step => {
                const profit = getProfitability(step, days);
                return (
                  <div
                    key={step}
                    className={`flex-1 mx-0.5 border border-bit-black flex items-center justify-center text-[10px] font-mono relative group cursor-default transition-none hover:invert-1bit ${getCellClass(profit)}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-bit-black text-bit-white px-2 py-1 text-xs whitespace-nowrap z-20 border-2 border-bit-white shadow-hard pointer-events-none">
                      ${profit.toFixed(0)}
                    </span>
                    {formatProfit(profit)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Heatmap);
