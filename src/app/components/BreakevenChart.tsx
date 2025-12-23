'use client';

import { useMemo, memo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Line
} from 'recharts';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { ChartDataPoint } from '@/types';
import { cn } from '@/lib/utils';

interface BreakevenChartProps {
  migrationCost: number;
  dailyYieldDelta: number;
  timeframeDays?: number;
  breakevenChartData?: ChartDataPoint[];
  breakevenDays?: number;
}

interface DataPoint {
  day: number;
  profit: number;
  profitRiskAdjusted?: number;
}

const MAX_DATA_POINTS = 100;
const DEFAULT_TIMEFRAME = 30;

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value as number;
    const isPositive = profit >= 0;
    const riskProfit = payload[1]?.value as number;

    return (
      <div className="bg-surface/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-divider shadow-soft-lg z-50">
        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Day {label}</p>
        <p className="text-lg font-bold text-primary tracking-tight mb-1">
          {isPositive ? '+' : ''}${profit.toFixed(2)}
        </p>
        {riskProfit !== undefined && (
          <p className="text-xs font-mono font-bold text-secondary/70">
            Risk-Adj: ${riskProfit.toFixed(2)}
          </p>
        )}
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

function BreakevenChart({
  migrationCost,
  dailyYieldDelta,
  timeframeDays,
  breakevenChartData,
  breakevenDays: providedBreakevenDays,
}: BreakevenChartProps) {
  const [activeILScenario, setActiveILScenario] = useState<number>(0); // 0 = None, 1 = Moderate

  const { data, breakevenDay, riskBreakevenDay, calculatedTimeframe, hasBreakeven } = useMemo(() => {
    // Basic calculation params
    let baseBreakeven = providedBreakevenDays;
    let hasBE = providedBreakevenDays !== undefined && providedBreakevenDays !== Infinity;

    // Use simulated data generator if no chart data provided
    // (Simplifying logic to strict generator for consistent IL overlay)

    // IL Drag Simulation: approx 10% annual yield reduction equivalent for "Moderate" volatility
    const ilDragDaily = activeILScenario === 1 ? (Math.abs(dailyYieldDelta) * 0.15) : 0;
    const effectiveDailyYield = dailyYieldDelta - ilDragDaily;

    if (!hasBE && dailyYieldDelta > 0) {
      baseBreakeven = migrationCost / dailyYieldDelta;
      hasBE = true;
    }

    const riskBreakeven = (effectiveDailyYield > 0 && migrationCost > 0)
      ? migrationCost / effectiveDailyYield
      : null;

    const tf = timeframeDays ?? (
      hasBE && baseBreakeven
        ? Math.max(DEFAULT_TIMEFRAME, Math.ceil((riskBreakeven || baseBreakeven) * 1.5))
        : DEFAULT_TIMEFRAME
    );

    const numPoints = Math.min(tf + 1, MAX_DATA_POINTS);
    const step = tf / (numPoints - 1);

    const points: DataPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      const day = Math.round(i * step);
      const standardProfit = (day * dailyYieldDelta) - migrationCost;
      const riskProfit = (day * effectiveDailyYield) - migrationCost;

      points.push({
        day,
        profit: standardProfit,
        profitRiskAdjusted: activeILScenario ? riskProfit : undefined
      });
    }

    return {
      data: points,
      breakevenDay: baseBreakeven,
      riskBreakevenDay: riskBreakeven,
      calculatedTimeframe: tf,
      hasBreakeven: hasBE
    };
  }, [migrationCost, dailyYieldDelta, timeframeDays, providedBreakevenDays, activeILScenario]);

  const yMin = Math.min(...data.map(d => d.profit));
  const yMax = Math.max(...data.map(d => d.profit));
  const yPadding = Math.max(Math.abs(yMax - yMin) * 0.1, 10);

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary tracking-tight uppercase">Breakeven Horizon</h3>

          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setActiveILScenario(0)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors",
                activeILScenario === 0 ? "bg-sumi-black text-white border-sumi-black" : "bg-transparent text-secondary border-divider hover:border-sumi-black"
              )}
            >
              Standard
            </button>
            <button
              onClick={() => setActiveILScenario(1)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors flex items-center gap-1",
                activeILScenario === 1 ? "bg-intl-orange text-white border-intl-orange" : "bg-transparent text-secondary border-divider hover:border-intl-orange"
              )}
            >
              IL Risk <AlertTriangle className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Projected Recovery</div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold tracking-tighter text-matchbox-green">
              {breakevenDay ? Math.ceil(breakevenDay) : '∞'} Days
            </span>
            {activeILScenario === 1 && (
              <span className="text-xs font-bold text-intl-orange tracking-wide">
                Risk Adj: {riskBreakevenDay ? Math.ceil(riskBreakevenDay) : '∞'} Days
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
            <XAxis
              dataKey="day"
              stroke="var(--secondary)"
              fontSize={10}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              tickMargin={12}
            />
            <YAxis
              stroke="var(--secondary)"
              fontSize={10}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              domain={[yMin - yPadding, yMax + yPadding]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* Zero Line (Breakeven Profit) */}
            <ReferenceLine y={0} stroke="var(--matchbox-green)" strokeWidth={2} strokeDasharray="3 3" />

            {/* Breakeven Time Line */}
            {hasBreakeven && breakevenDay && (
              <ReferenceLine
                x={breakevenDay}
                stroke="var(--matchbox-green)"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: 'BREAKEVEN', position: 'top', fill: 'var(--matchbox-green)', fontSize: 10, fontWeight: 'bold' }}
              />
            )}

            <Area
              type="monotone"
              dataKey="profit"
              stroke="#0071E3"
              strokeWidth={3}
              fill="url(#profitGradient)"
              animationDuration={1000}
            />

            {activeILScenario === 1 && (
              <Line
                type="monotone"
                dataKey="profitRiskAdjusted"
                stroke="#FF4D00"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
                animationDuration={1000}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-4 border-t border-divider flex items-center justify-between text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">
        <div className="flex items-center gap-4">
          <span>Cost: <span className="text-primary tracking-tight font-mono">${migrationCost.toFixed(2)}</span></span>
          <span>Growth: <span className="text-success tracking-tight font-mono">+${dailyYieldDelta.toFixed(2)}/day</span></span>
        </div>
      </div>
    </div>
  );
}

export default memo(BreakevenChart);
