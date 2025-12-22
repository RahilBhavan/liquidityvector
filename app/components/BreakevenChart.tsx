'use client';

import { useMemo, memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { ChartDataPoint } from '@/types';

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
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

const MAX_DATA_POINTS = 100;
const DEFAULT_TIMEFRAME = 30;

const CustomTooltip = memo(({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value as number;
    const isPositive = profit >= 0;
    return (
      <div className="bg-bit-bg text-bit-fg px-3 py-2 border-2 border-bit-fg shadow-hard z-50">
        <p className="font-mono text-xs font-bold uppercase mb-1 border-b border-bit-fg pb-1">Day {label}</p>
        <p className="font-mono text-sm font-bold">
          {isPositive ? '+' : ''}${profit.toFixed(2)}
        </p>
        <p className={`text-[10px] uppercase tracking-wider mt-1 ${isPositive ? 'text-bit-fg' : 'opacity-70'}`}>
          {isPositive ? 'IN PROFIT' : 'RECOVERING'}
        </p>
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
  const { data, breakevenDay, calculatedTimeframe, hasBreakeven } = useMemo(() => {
    if (breakevenChartData && breakevenChartData.length > 0) {
      const lastPoint = breakevenChartData[breakevenChartData.length - 1];
      const calculatedTimeframe = lastPoint?.day ?? DEFAULT_TIMEFRAME;
      return {
        data: breakevenChartData,
        breakevenDay: providedBreakevenDays ?? null,
        calculatedTimeframe,
        hasBreakeven: providedBreakevenDays !== undefined && providedBreakevenDays !== Infinity
      };
    }

    let breakevenDay: number | null = null;
    let hasBreakeven = false;

    if (dailyYieldDelta > 0 && migrationCost > 0) {
      breakevenDay = migrationCost / dailyYieldDelta;
      hasBreakeven = true;
    } else if (migrationCost <= 0) {
      breakevenDay = 0;
      hasBreakeven = true;
    }

    const calculatedTimeframe = timeframeDays ?? (
      hasBreakeven && breakevenDay !== null
        ? Math.max(DEFAULT_TIMEFRAME, Math.ceil(breakevenDay * 1.5))
        : DEFAULT_TIMEFRAME
    );

    const numPoints = Math.min(calculatedTimeframe + 1, MAX_DATA_POINTS);
    const step = calculatedTimeframe / (numPoints - 1);

    const data: DataPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      const day = Math.round(i * step);
      const profit = (day * dailyYieldDelta) - migrationCost;
      data.push({ day, profit });
    }

    return { data, breakevenDay, calculatedTimeframe, hasBreakeven };
  }, [migrationCost, dailyYieldDelta, timeframeDays, breakevenChartData, providedBreakevenDays]);

  const yMin = Math.min(...data.map(d => d.profit));
  const yMax = Math.max(...data.map(d => d.profit));
  const yPadding = Math.max(Math.abs(yMax - yMin) * 0.1, 10);

  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  const neverBreaksEven = dailyYieldDelta <= 0 && migrationCost > 0;

  return (
    <div className="card-1bit p-6 h-80 flex flex-col relative group">
      <div className="absolute top-4 right-4 opacity-50">
        <Clock className="w-12 h-12 text-bit-fg stroke-1" />
      </div>

      <div className="flex items-center justify-between mb-4 border-b-2 border-bit-fg pb-2 relative z-10">
        <h3 className="text-lg font-bold font-pixel uppercase flex items-center gap-2">
          <span className="w-3 h-3 bg-bit-fg animate-pulse"></span>
          Breakeven_Horizon
        </h3>
        {hasBreakeven && breakevenDay !== null && breakevenDay > 0 && (
          <div className="flex items-center gap-2 bg-bit-fg text-bit-bg px-2 py-1 shadow-hard-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-mono text-xs font-bold uppercase">
              {Math.ceil(breakevenDay)} DAYS
            </span>
          </div>
        )}
        {neverBreaksEven && (
          <div className="flex items-center gap-2 border-2 border-bit-fg bg-bit-bg px-2 py-1 pattern-diagonal">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono text-xs font-bold uppercase">NEVER</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--bit-fg)" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="var(--bit-fg)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bit-fg)" strokeOpacity={0.15} vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="var(--bit-fg)" 
              fontSize={10} 
              fontFamily="monospace" 
              tickLine={false}
              axisLine={{ stroke: 'var(--bit-fg)', strokeWidth: 2 }}
              tickMargin={8}
            />
            <YAxis 
              stroke="var(--bit-fg)" 
              fontSize={10} 
              fontFamily="monospace" 
              tickLine={false}
              axisLine={{ stroke: 'var(--bit-fg)', strokeWidth: 2 }}
              tickFormatter={formatYAxis}
              domain={[yMin - yPadding, yMax + yPadding]}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--bit-fg)', strokeWidth: 1, strokeDasharray: '2 2' }} />
            
            <ReferenceLine y={0} stroke="var(--bit-fg)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
            
            {hasBreakeven && breakevenDay && (
               <ReferenceLine x={breakevenDay} stroke="var(--bit-fg)" strokeWidth={1} strokeDasharray="4 4" label={{ value: 'BE', position: 'insideTopRight', fill: 'var(--bit-fg)', fontSize: 10, fontWeight: 'bold' }} />
            )}

            <Area
              type="step"
              dataKey="profit"
              stroke="var(--bit-fg)"
              strokeWidth={2}
              fill="url(#profitGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider opacity-80 pt-2 border-t border-bit-fg/20">
        <span>INITIAL_COST: <span className="font-bold">${migrationCost.toFixed(2)}</span></span>
        <span>DELTA_YIELD: <span className="font-bold">+${dailyYieldDelta.toFixed(2)}/day</span></span>
      </div>
    </div>
  );
}

export default memo(BreakevenChart);
