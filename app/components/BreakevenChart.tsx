'use client';

import { useMemo, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
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

// Maximum data points for performance
const MAX_DATA_POINTS = 100;
const DEFAULT_TIMEFRAME = 30;

const CustomTooltip = memo(({
  active,
  payload,
  label,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value as number;
    const isPositive = profit >= 0;
    return (
      <div className="bg-bit-white text-bit-black px-4 py-2 border-2 border-bit-black shadow-hard">
        <p className="font-mono text-sm font-bold uppercase">Day {label}</p>
        <p className="font-mono text-lg font-bold">
          {isPositive ? '+' : ''}${profit.toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-wider">
          {isPositive ? 'PROFIT' : 'LOSS'}
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
    // Use backend-provided data if available
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

    // Fallback: calculate locally
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

  // Calculate Y-axis domain
  const yMin = Math.min(...data.map(d => d.profit));
  const yMax = Math.max(...data.map(d => d.profit));
  const yPadding = Math.max(Math.abs(yMax - yMin) * 0.1, 10);

  // Format Y-axis ticks
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Check if chart will never break even
  const neverBreaksEven = dailyYieldDelta <= 0 && migrationCost > 0;

  return (
    <div className="bg-bit-white border-2 border-bit-black p-4 h-80 flex flex-col shadow-hard">
      <div className="flex items-center justify-between mb-4 border-b-2 border-bit-black pb-2">
        <h3 className="text-lg font-bold font-pixel uppercase flex items-center gap-2">
          <span className="w-3 h-3 bg-bit-black"></span>
          Breakeven Timeline
        </h3>
        {hasBreakeven && breakevenDay !== null && breakevenDay > 0 && (
          <div className="flex items-center gap-2 bg-bit-white border-2 border-bit-black px-2 py-1 shadow-sm">
            <TrendingUp className="w-4 h-4" />
            <span className="font-mono text-xs font-bold uppercase">
              Day {Math.ceil(breakevenDay)}
            </span>
          </div>
        )}
        {neverBreaksEven && (
          <div className="flex items-center gap-2 bg-bit-black text-bit-white px-2 py-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono text-xs font-bold uppercase">
              No Breakeven
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#000000"
              strokeOpacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="#000000"
              fontSize={10}
              fontFamily="monospace"
              tickLine={true}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
            />
            <YAxis
              stroke="#000000"
              fontSize={10}
              fontFamily="monospace"
              tickLine={true}
              axisLine={{ stroke: '#000000', strokeWidth: 2 }}
              tickFormatter={formatYAxis}
              domain={[yMin - yPadding, yMax + yPadding]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }} />

            <ReferenceLine
              y={0}
              stroke="#000000"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            <Line
              type="step"
              dataKey="profit"
              stroke="#000000"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: '#000000',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider border-t-2 border-bit-black pt-2">
        <span>
          Cost: <span className="font-bold">${migrationCost.toFixed(2)}</span>
        </span>
        <span>
          Daily: <span className="font-bold">+${dailyYieldDelta.toFixed(2)}</span>
        </span>
        <span>
          Time: <span className="font-bold">{calculatedTimeframe} days</span>
        </span>
      </div>
    </div>
  );
}

export default memo(BreakevenChart);
