'use client';

import { useMemo } from 'react';
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

interface BreakevenChartProps {
  migrationCost: number;
  dailyYieldDelta: number;
  timeframeDays?: number;
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

const CustomTooltip = ({
  active,
  payload,
  label,
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value as number;
    const isPositive = profit >= 0;
    return (
      <div className="bg-[#371E7B] text-white px-4 py-2 border-2 border-white shadow-lg">
        <p className="font-mono text-sm font-bold">Day {label}</p>
        <p className={`font-mono text-lg font-bold ${isPositive ? 'text-[#CCFF00]' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}${profit.toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-wider opacity-70">
          {isPositive ? 'Profit' : 'Loss'}
        </p>
      </div>
    );
  }
  return null;
};

export default function BreakevenChart({
  migrationCost,
  dailyYieldDelta,
  timeframeDays,
}: BreakevenChartProps) {
  const { data, breakevenDay, calculatedTimeframe, hasBreakeven } = useMemo(() => {
    // Calculate breakeven day (only if positive yield delta)
    let breakevenDay: number | null = null;
    let hasBreakeven = false;

    if (dailyYieldDelta > 0 && migrationCost > 0) {
      breakevenDay = migrationCost / dailyYieldDelta;
      hasBreakeven = true;
    } else if (migrationCost <= 0) {
      // Immediate profitability
      breakevenDay = 0;
      hasBreakeven = true;
    }

    // Calculate timeframe
    const calculatedTimeframe = timeframeDays ?? (
      hasBreakeven && breakevenDay !== null
        ? Math.max(30, Math.ceil(breakevenDay * 1.5))
        : 30
    );

    // Generate data points
    const data: DataPoint[] = [];
    const numPoints = Math.min(calculatedTimeframe + 1, 100); // Cap at 100 points
    const step = calculatedTimeframe / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const day = Math.round(i * step);
      const profit = (day * dailyYieldDelta) - migrationCost;
      data.push({ day, profit });
    }

    return { data, breakevenDay, calculatedTimeframe, hasBreakeven };
  }, [migrationCost, dailyYieldDelta, timeframeDays]);

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
    <div className="bg-white border-2 border-[#371E7B] p-6 h-80 flex flex-col shadow-[4px_4px_0px_0px_#371E7B]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#371E7B] font-['Space_Grotesk'] uppercase flex items-center gap-2">
          <span className="w-3 h-3 bg-[#CCFF00] border border-[#371E7B]"></span>
          Breakeven Timeline
        </h3>
        {hasBreakeven && breakevenDay !== null && breakevenDay > 0 && (
          <div className="flex items-center gap-2 bg-[#F9F9F5] border border-[#371E7B] px-3 py-1">
            <TrendingUp className="w-4 h-4 text-[#371E7B]" />
            <span className="font-mono text-sm font-bold text-[#371E7B]">
              Day {Math.ceil(breakevenDay)}
            </span>
          </div>
        )}
        {neverBreaksEven && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-600 px-3 py-1">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-mono text-xs font-bold text-red-600 uppercase">
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
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="#371E7B"
              fontSize={11}
              fontFamily="ui-monospace"
              tickLine={false}
              axisLine={{ stroke: '#371E7B', strokeWidth: 2 }}
              label={{
                value: 'Days',
                position: 'insideBottomRight',
                offset: -5,
                style: {
                  fontSize: 10,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fill: '#371E7B',
                },
              }}
            />
            <YAxis
              stroke="#371E7B"
              fontSize={11}
              fontFamily="ui-monospace"
              tickLine={false}
              axisLine={{ stroke: '#371E7B', strokeWidth: 2 }}
              tickFormatter={formatYAxis}
              domain={[yMin - yPadding, yMax + yPadding]}
              label={{
                value: 'Net Profit ($)',
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 10,
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  fill: '#371E7B',
                },
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Breakeven reference line at y=0 */}
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: 'Breakeven',
                position: 'right',
                style: {
                  fontSize: 10,
                  fontWeight: 'bold',
                  fill: '#ef4444',
                  textTransform: 'uppercase',
                },
              }}
            />

            {/* Profit line */}
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#6366f1"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#6366f1',
                stroke: '#371E7B',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[#371E7B] uppercase tracking-wider border-t border-[#371E7B]/20 pt-2">
        <span>
          Cost: <span className="font-bold">${migrationCost.toFixed(2)}</span>
        </span>
        <span>
          Daily Yield: <span className="font-bold text-green-600">+${dailyYieldDelta.toFixed(2)}</span>
        </span>
        <span>
          Timeframe: <span className="font-bold">{calculatedTimeframe} days</span>
        </span>
      </div>
    </div>
  );
}
