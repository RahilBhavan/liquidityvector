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
      <div className="bg-surface/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-divider shadow-soft-lg z-50">
        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Day {label}</p>
        <p className="text-lg font-bold text-primary tracking-tight">
          {isPositive ? '+' : ''}${profit.toFixed(2)}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-success' : 'bg-warning'}`} />
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wide">
            {isPositive ? 'Net Profit' : 'Capital Recovery'}
          </span>
        </div>
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
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary tracking-tight">Breakeven Horizon</h3>
          <p className="text-xs text-secondary font-medium uppercase tracking-wider">Estimated time to recover migration costs</p>
        </div>
        
        {hasBreakeven && breakevenDay !== null && breakevenDay > 0 && (
          <div className="flex items-center gap-2 bg-accent text-white px-4 py-1.5 rounded-full shadow-soft-sm">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {Math.ceil(breakevenDay)} Days
            </span>
          </div>
        )}
        
        {neverBreaksEven && (
          <div className="flex items-center gap-2 bg-critical/10 text-critical px-4 py-1.5 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">High Inertia</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[200px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--accent)', strokeWidth: 1 }} />
            
            <ReferenceLine y={0} stroke="var(--divider)" strokeWidth={1.5} />
            
            {hasBreakeven && breakevenDay && (
               <ReferenceLine x={breakevenDay} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4 4" />
            )}

            <Area
              type="monotone"
              dataKey="profit"
              stroke="#0071E3"
              strokeWidth={3}
              fill="url(#profitGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-4 border-t border-divider flex items-center justify-between text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">
        <div className="flex items-center gap-4">
          <span>Cost: <span className="text-primary tracking-tight font-mono">${migrationCost.toFixed(2)}</span></span>
          <span>Growth: <span className="text-success tracking-tight font-mono">+${dailyYieldDelta.toFixed(2)}/day</span></span>
        </div>
        <span>Projection: {calculatedTimeframe}d</span>
      </div>
    </div>
  );
}

export default memo(BreakevenChart);
