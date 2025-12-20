'use client';

import { RouteCalculation } from '@/types';

interface HeatmapProps {
  route: RouteCalculation;
  capital: number;
}

export default function Heatmap({ route, capital }: HeatmapProps) {
  const capitalSteps = [0.5, 0.75, 1, 1.25, 1.5, 2, 5];
  const timeHorizons = [7, 14, 30, 90, 180, 365];

  const getProfitability = (capMultiplier: number, days: number) => {
    const simCapital = capital * capMultiplier;
    const netYield = route.targetPool.apy;
    const grossProfit = (simCapital * (netYield / 100)) * (days / 365);
    // Use actual route costs, scaled proportionally to simulated capital
    const costRatio = route.totalCost / capital;
    const simTotalCost = simCapital * costRatio;
    return grossProfit - simTotalCost;
  };

  return (
    <div className="bg-white border-2 border-[#371E7B] p-6 h-full flex flex-col">
      <h3 className="text-xl font-bold text-[#371E7B] mb-6 font-['Space_Grotesk'] uppercase flex items-center gap-2">
        <span className="w-3 h-3 bg-[#CCFF00] border border-[#371E7B]"></span>
        Profitability Matrix
      </h3>
      <div className="overflow-x-auto flex-1 flex flex-col justify-center">
        <div className="min-w-[400px]">
          <div className="flex mb-2">
            <div className="w-24 text-xs text-[#371E7B] font-mono font-bold flex items-end uppercase">Time \ Cap</div>
            {capitalSteps.map(step => (
              <div key={step} className="flex-1 text-center text-xs text-[#371E7B] font-mono font-bold pb-2 border-b-2 border-[#371E7B] mx-0.5">
                ${(capital * step / 1000).toFixed(1)}k
              </div>
            ))}
          </div>

          {timeHorizons.map(days => (
            <div key={days} className="flex mb-1 h-10">
              <div className="w-24 text-xs text-[#371E7B] font-mono font-bold flex items-center pr-4 border-r-2 border-[#371E7B]">
                {days} DAYS
              </div>
              {capitalSteps.map(step => {
                const profit = getProfitability(step, days);
                const isProfitable = profit > 0;
                const intensity = Math.min(Math.abs(profit) / 200, 1);

                let bgStyle = {};
                if (isProfitable) {
                  bgStyle = { backgroundColor: `rgba(204, 255, 0, ${0.2 + intensity * 0.8})`, color: '#371E7B' };
                } else {
                  bgStyle = { backgroundColor: `rgba(55, 30, 123, ${0.05 + intensity * 0.1})`, color: '#371E7B' };
                }

                return (
                  <div
                    key={step}
                    className="flex-1 mx-0.5 border border-[#371E7B]/10 flex items-center justify-center text-[10px] font-bold font-mono relative group cursor-default transition-all hover:scale-105 hover:z-10 hover:border-[#371E7B] hover:shadow-md"
                    style={bgStyle}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-[#371E7B] text-white px-3 py-1 text-xs whitespace-nowrap z-20 border-2 border-white shadow-lg pointer-events-none font-sans">
                      ${profit.toFixed(0)}
                    </span>
                    {isProfitable ? '+' : ''}{profit > 999 ? (profit / 1000).toFixed(1) + 'k' : profit.toFixed(0)}
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
