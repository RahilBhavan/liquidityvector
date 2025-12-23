'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistogramBin {
    range_start: number;
    range_end: number;
    count: number;
    frequency: number;
}

interface YieldStatistics {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    count: number;
}

interface YieldHistogramProps {
    histogram: HistogramBin[];
    statistics: YieldStatistics;
    currentApy?: number;
    title?: string;
}

type Timeframe = '7d' | '30d' | '90d';

const CustomTooltip = memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as HistogramBin & { isCurrentBin: boolean };

        return (
            <div className="bg-surface/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-divider shadow-soft-lg z-50">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
                    APY Range
                </p>
                <p className="text-lg font-bold text-primary tracking-tight">
                    {data.range_start.toFixed(1)}% – {data.range_end.toFixed(1)}%
                </p>
                <p className="text-sm text-secondary mt-1">
                    <span className="font-bold text-accent">{data.count}</span> occurrences ({(data.frequency * 100).toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
});

CustomTooltip.displayName = 'CustomTooltip';

function YieldHistogram({
    histogram,
    statistics,
    currentApy,
    title = 'APY Distribution',
}: YieldHistogramProps) {
    const [mounted, setMounted] = useState(false);
    const [timeframe, setTimeframe] = useState<Timeframe>('30d');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Transform data and mark current APY bin
    const transformedData = useMemo(() => {
        return histogram.map((bin) => ({
            ...bin,
            label: `${bin.range_start.toFixed(1)}%`,
            isCurrentBin: currentApy !== undefined &&
                currentApy >= bin.range_start &&
                currentApy < bin.range_end,
        }));
    }, [histogram, currentApy]);

    const maxCount = Math.max(...histogram.map((b) => b.count), 1);

    if (!histogram || histogram.length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-secondary p-8">
                <BarChart3 className="w-8 h-8 mb-3 opacity-50" />
                <p className="text-sm font-medium">No historical data available</p>
            </div>
        );
    }

    // Prevent hydration mismatch - wait for client mount
    if (!mounted) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-secondary p-8">
                <p className="text-sm font-medium">Loading chart...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-primary tracking-tight uppercase">{title}</h3>
                    <div className="flex items-center gap-2">
                        {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    'px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors',
                                    timeframe === tf
                                        ? 'bg-sumi-black text-white border-sumi-black'
                                        : 'bg-transparent text-secondary border-divider hover:border-sumi-black'
                                )}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Statistics Summary */}
                <div className="text-right">
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
                        Volatility
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                        <Activity className="w-4 h-4 text-accent" />
                        <span className="text-xl font-bold tracking-tighter text-primary">
                            ±{statistics.std.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1">
                    <span className="text-secondary font-medium">Mean:</span>
                    <span className="font-bold text-primary">{statistics.mean.toFixed(2)}%</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-secondary font-medium">Median:</span>
                    <span className="font-bold text-primary">{statistics.median.toFixed(2)}%</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-secondary font-medium">Range:</span>
                    <span className="font-bold text-primary">
                        {statistics.min.toFixed(1)}% – {statistics.max.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[160px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={transformedData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {transformedData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isCurrentBin ? 'var(--matchbox-green)' : 'var(--accent)'}
                                    opacity={entry.isCurrentBin ? 1 : 0.7}
                                />
                            ))}
                        </Bar>

                        <XAxis
                            dataKey="label"
                            stroke="var(--secondary)"
                            fontSize={9}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            stroke="var(--secondary)"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, maxCount]}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--divider)', opacity: 0.3 }} />

                        {/* Mean reference line */}
                        {statistics.mean > 0 && (
                            <ReferenceLine
                                x={transformedData.find((d) =>
                                    statistics.mean >= d.range_start && statistics.mean < d.range_end
                                )?.label}
                                stroke="var(--intl-orange)"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                            />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-divider flex items-center justify-between text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span>Historical</span>
                    </div>
                    {currentApy !== undefined && (
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-matchbox-green" />
                            <span>Current APY ({currentApy.toFixed(2)}%)</span>
                        </div>
                    )}
                </div>
                <span>{statistics.count} data points</span>
            </div>
        </div>
    );
}

export default memo(YieldHistogram);
