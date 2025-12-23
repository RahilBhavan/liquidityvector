'use client';

import { memo, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { WaterfallDataPoint } from '@/types';

interface WaterfallChartProps {
    data: WaterfallDataPoint[];
    title?: string;
}

interface TransformedDataPoint {
    label: string;
    value: number;
    base: number;
    fill: string;
    originalValue: number;
    isPositive: boolean;
}

const CustomTooltip = memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as TransformedDataPoint;
        const isPositive = data.originalValue >= 0;

        return (
            <div className="bg-surface/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-divider shadow-soft-lg z-50">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
                    {data.label}
                </p>
                <p className={`text-lg font-bold tracking-tight ${isPositive ? 'text-matchbox-green' : 'text-intl-orange'}`}>
                    {isPositive ? '+' : ''}${data.originalValue.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
});

CustomTooltip.displayName = 'CustomTooltip';

function WaterfallChart({ data, title = 'Net Yield Breakdown' }: WaterfallChartProps) {
    // Transform data for waterfall display
    // For waterfall charts, we need to calculate the "base" (invisible bar) and "value" (visible bar)
    const transformedData = useMemo((): TransformedDataPoint[] => {
        if (!data || data.length === 0) return [];

        return data.map((point, index) => {
            // First bar (Gross Yield) starts at 0
            // Last bar (Net Yield) also starts at 0 to show final result
            // Middle bars are "floating" - they start where the previous bar ended

            let base = 0;
            let value = point.value;

            if (index === 0) {
                // First bar: starts at 0, goes up to its value
                base = 0;
                value = point.value;
            } else if (index === data.length - 1) {
                // Last bar (Net Yield): starts at 0 to show final result
                base = 0;
                value = point.cumulative;
            } else {
                // Middle bars: floating bars showing deductions
                // They hang from the previous cumulative value
                const prevCumulative = data[index - 1].cumulative;
                base = Math.min(prevCumulative, point.cumulative);
                value = Math.abs(point.value);
            }

            return {
                label: point.label,
                value,
                base,
                fill: point.isPositive ? 'var(--matchbox-green)' : 'var(--intl-orange)',
                originalValue: point.value,
                isPositive: point.isPositive,
            };
        });
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-secondary">
                <p className="text-sm">No waterfall data available</p>
            </div>
        );
    }

    // Calculate net yield for display
    const netYield = data[data.length - 1]?.cumulative ?? 0;
    const grossYield = data[0]?.value ?? 0;
    const totalCosts = grossYield - netYield;

    const formatYAxis = (value: number) => {
        if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
        return `$${value.toFixed(0)}`;
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-primary tracking-tight uppercase">{title}</h3>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                        30-Day Projection
                    </p>
                </div>

                <div className="text-right">
                    <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">
                        Net Yield
                    </div>
                    <div className="flex items-center gap-1">
                        {netYield >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-matchbox-green" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-intl-orange" />
                        )}
                        <span className={`text-2xl font-bold tracking-tighter ${netYield >= 0 ? 'text-matchbox-green' : 'text-intl-orange'}`}>
                            {netYield >= 0 ? '+' : ''}${netYield.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-secondary/70 tracking-wide">
                        Costs: ${totalCosts.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={transformedData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 40 }}
                    >
                        {/* Invisible base bar for stacking effect */}
                        <Bar dataKey="base" stackId="stack" fill="transparent" />

                        {/* Visible value bar */}
                        <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]}>
                            {transformedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
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
                            angle={-35}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis
                            stroke="var(--secondary)"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxis}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--divider)', opacity: 0.3 }} />
                        <ReferenceLine y={0} stroke="var(--divider)" strokeWidth={1} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-divider flex items-center justify-between text-[10px] font-bold text-secondary uppercase tracking-widest opacity-60">
                <span>Gross: <span className="text-matchbox-green font-mono">${grossYield.toFixed(2)}</span></span>
                <span>→</span>
                <span>Net: <span className={`font-mono ${netYield >= 0 ? 'text-matchbox-green' : 'text-intl-orange'}`}>${netYield.toFixed(2)}</span></span>
            </div>
        </div>
    );
}

export default memo(WaterfallChart);
