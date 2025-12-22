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
    if (profit <= 0) return 'bg-bit-bg text-bit-fg opacity-50'; // Loss (dimmed)
    const intensity = Math.min(Math.abs(profit) / INTENSITY_SCALE, 1);
    
    if (intensity < 0.3) return 'pattern-stipple-light bg-bit-bg text-bit-fg';
    if (intensity < 0.7) return 'pattern-checker bg-bit-bg text-bit-fg';
    return 'bg-bit-fg text-bit-bg'; // High profit (inverted)
  };

  const formatProfit = (profit: number): string => {
    const prefix = profit > 0 ? '+' : '';
    if (Math.abs(profit) > 999) return `${prefix}${(profit / 1000).toFixed(1)}k`;
    return `${prefix}${profit.toFixed(0)}`;
  };

  return (
    <div className="card-1bit p-6 h-full flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
        <div className="w-16 h-16 pattern-checker rounded-full"></div>
      </div>

      <h3 className="text-lg font-bold font-pixel uppercase mb-6 flex items-center gap-3 border-b-2 border-bit-fg pb-2 w-fit">
        <span className="w-3 h-3 bg-bit-fg animate-pulse"></span>
        Profit_Matrix
      </h3>

      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-[500px]">
          {/* Matrix Header */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="text-[10px] font-bold font-mono uppercase flex items-end justify-center opacity-70">
              Days \ Cap
            </div>
            {CAPITAL_MULTIPLIERS.map(step => (
              <div key={step} className="text-center font-bold font-mono text-xs border-b-2 border-bit-fg pb-1">
                ${(capital * step / 1000).toFixed(1)}k
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          <div className="space-y-2">
            {TIME_HORIZONS.map(days => (
              <div key={days} className="grid grid-cols-6 gap-2 items-center hover:bg-bit-dim/10 transition-colors rounded-sm group/row">
                <div className="font-bold font-mono text-xs text-right pr-2 border-r-2 border-bit-fg h-full flex items-center justify-end">
                  {days}d
                </div>
                {CAPITAL_MULTIPLIERS.map(step => {
                  const profit = getProfitability(step, days);
                  return (
                    <div
                      key={step}
                      className={`
                        h-8 flex items-center justify-center font-mono text-[10px] font-bold border border-bit-fg 
                        transition-transform hover:scale-110 hover:z-10 cursor-crosshair
                        ${getCellClass(profit)}
                      `}
                      title={`Profit: $${profit.toFixed(2)}`}
                    >
                      {formatProfit(profit)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-auto pt-4 flex items-center justify-end gap-4 text-[10px] font-mono uppercase font-bold border-t-2 border-bit-fg">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-bit-fg bg-bit-bg opacity-50"></div> Loss
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-bit-fg pattern-stipple-light"></div> Low
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-bit-fg pattern-checker"></div> Med
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-bit-fg bg-bit-fg"></div> High
        </div>
      </div>
    </div>
  );
}

export default memo(Heatmap);
