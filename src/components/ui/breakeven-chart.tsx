"use client";

import { motion } from "framer-motion";
import { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";

interface BreakevenChartProps {
    data: ChartDataPoint[];
    breakevenDays: number;
}

export function BreakevenChart({ data, breakevenDays }: BreakevenChartProps) {
    if (!data || data.length === 0) return <div>No chart data available</div>;

    // Dimensions
    const height = 200;
    const width = 400; // viewbox width
    const padding = 20;

    // Scales
    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal;

    // Normalize logic
    const getY = (val: number) => height - padding - ((val - minVal) / (range || 1)) * (height - 2 * padding);
    const getX = (idx: number) => padding + (idx / (data.length - 1)) * (width - 2 * padding);

    const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
    const zeroLineY = getY(0);

    return (
        <div className="w-full h-full min-h-[250px] p-4 bg-white/50 rounded-lg border border-sumi-black/5">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-4">
                Breakeven Analysis ({breakevenDays} days)
            </h4>

            <div className="relative w-full aspect-[2/1]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Zero Line */}
                    {minVal < 0 && maxVal > 0 && (
                        <line
                            x1={padding}
                            y1={zeroLineY}
                            x2={width - padding}
                            y2={zeroLineY}
                            stroke="currentColor"
                            strokeOpacity="0.2"
                            strokeDasharray="4 4"
                        />
                    )}

                    {/* Chart Line */}
                    <motion.polyline
                        points={points}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="text-cobalt-blue dark:text-cobalt-blue"
                    />

                    {/* Gradient Area (Optional, keeping simple lines for now) */}

                    {/* Data Points */}
                    {data.map((d, i) => (
                        <motion.circle
                            key={i}
                            cx={getX(i)}
                            cy={getY(d.value)}
                            r="3"
                            className="fill-cobalt-blue"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.5 + (i * 0.05) }}
                        />
                    ))}

                    {/* Axis Labels (Simple) */}
                    <text x={padding} y={height} className="text-[8px] font-mono fill-current opacity-40">Day 0</text>
                    <text x={width - padding} y={height} className="text-[8px] font-mono fill-current opacity-40 text-end">Day 30</text>
                </svg>

                {/* Tooltip Overlay could go here */}
            </div>

            <div className="mt-2 flex justify-between text-[10px] font-mono opacity-60">
                <span>Initial Cost: ${Math.abs(minVal).toFixed(2)}</span>
                <span>Proj. Profit: ${maxVal.toFixed(2)}</span>
            </div>
        </div>
    );
}
