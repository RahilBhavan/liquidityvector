"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChartDataPoint } from "@/types";
import { cn } from "@/lib/utils";

interface BreakevenChartProps {
    data: ChartDataPoint[];
    breakevenDays: number;
}

export function BreakevenChart({ data, breakevenDays }: BreakevenChartProps) {
    const [hoveredPoint, setHoveredPoint] = useState<{ idx: number; x: number; y: number } | null>(null);

    if (!data || data.length === 0) return <div>No chart data available</div>;

    // Dimensions
    const height = 200;
    const width = 400; // viewbox width
    const padding = 20;

    // Scales
    const maxVal = Math.max(...data.map(d => d.profit));
    const minVal = Math.min(...data.map(d => d.profit));
    const range = maxVal - minVal;

    // Normalize logic
    const getY = (val: number) => height - padding - ((val - minVal) / (range || 1)) * (height - 2 * padding);
    const getX = (idx: number) => padding + (idx / (data.length - 1)) * (width - 2 * padding);

    const points = data.map((d, i) => `${getX(i)},${getY(d.profit)}`).join(" ");
    const zeroLineY = getY(0);

    // Check if zero line is within visible range
    const showZeroLine = minVal <= 0 && maxVal >= 0;

    return (
        <div className="w-full h-full min-h-[250px] p-4 bg-white/50 rounded-lg border border-sumi-black/5">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-4">
                Breakeven Analysis ({breakevenDays} days)
            </h4>

            <div className="relative w-full aspect-[2/1]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Breakeven Line (at y=0) */}
                    {showZeroLine && (
                        <>
                            <line
                                x1={padding}
                                y1={zeroLineY}
                                x2={width - padding}
                                y2={zeroLineY}
                                stroke="#22c55e"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                            />
                            <text
                                x={width - padding + 5}
                                y={zeroLineY + 4}
                                className="text-[8px] font-mono font-bold"
                                fill="#22c55e"
                            >
                                BREAKEVEN
                            </text>
                        </>
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

                    {/* Data Points with Hover */}
                    {data.map((d, i) => (
                        <motion.circle
                            key={i}
                            cx={getX(i)}
                            cy={getY(d.profit)}
                            r={hoveredPoint?.idx === i ? 6 : 3}
                            className={cn(
                                "transition-all duration-150 cursor-pointer",
                                hoveredPoint?.idx === i ? "fill-cobalt-blue stroke-white stroke-2" : "fill-cobalt-blue"
                            )}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.5 + (i * 0.05) }}
                            onMouseEnter={() => setHoveredPoint({ idx: i, x: getX(i), y: getY(d.profit) })}
                            onMouseLeave={() => setHoveredPoint(null)}
                        />
                    ))}

                    {/* Tooltip */}
                    {hoveredPoint !== null && (
                        <g>
                            {/* Tooltip background */}
                            <rect
                                x={hoveredPoint.x - 45}
                                y={hoveredPoint.y - 45}
                                width="90"
                                height="35"
                                rx="4"
                                fill="rgba(0,0,0,0.85)"
                            />
                            {/* Day label */}
                            <text
                                x={hoveredPoint.x}
                                y={hoveredPoint.y - 30}
                                textAnchor="middle"
                                className="text-[8px] font-mono font-bold"
                                fill="#a1a1aa"
                            >
                                Day {data[hoveredPoint.idx].day}
                            </text>
                            {/* Profit value */}
                            <text
                                x={hoveredPoint.x}
                                y={hoveredPoint.y - 17}
                                textAnchor="middle"
                                className="text-[11px] font-mono font-bold"
                                fill={data[hoveredPoint.idx].profit >= 0 ? "#22c55e" : "#ef4444"}
                            >
                                {data[hoveredPoint.idx].profit >= 0 ? "+" : ""}${data[hoveredPoint.idx].profit.toFixed(2)}
                            </text>
                        </g>
                    )}

                    {/* Axis Labels (Simple) */}
                    <text x={padding} y={height} className="text-[8px] font-mono fill-current opacity-40">Day 0</text>
                    <text x={width - padding} y={height} className="text-[8px] font-mono fill-current opacity-40 text-end">Day 30</text>
                </svg>
            </div>

            <div className="mt-2 flex justify-between text-[10px] font-mono opacity-60">
                <span>Initial Cost: ${Math.abs(minVal).toFixed(2)}</span>
                <span>Proj. Profit: ${maxVal.toFixed(2)}</span>
            </div>
        </div>
    );
}
