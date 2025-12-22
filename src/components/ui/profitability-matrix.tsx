"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProfitabilityMatrixProps {
    matrix: Record<string, Record<string, number>>;
}

export function ProfitabilityMatrix({ matrix }: ProfitabilityMatrixProps) {
    const timeHorizons = Object.keys(matrix).sort((a, b) => {
        const getDays = (s: string) => parseInt(s.replace('d', ''));
        return getDays(a) - getDays(b);
    });

    // Assuming capital tiers are the same for all time horizons
    const capitalTiers = Object.keys(matrix[timeHorizons[0]] || {}).sort((a, b) => parseInt(a) - parseInt(b));

    // Calculate max profit for color scaling
    let maxProfit = 0;
    timeHorizons.forEach(t => {
        capitalTiers.forEach(c => {
            const p = matrix[t][c];
            if (p > maxProfit) maxProfit = p;
        });
    });

    return (
        <div className="space-y-4">
            <h4 className="font-mono text-xs font-bold uppercase tracking-widest text-sumi-black/60">
                [ PROFITABILITY_MATRIX ]
            </h4>
            <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                    {/* Header Row */}
                    <div className="flex mb-2">
                        <div className="w-20 shrink-0 text-[10px] font-bold uppercase text-sumi-black/40 pt-2">
                            Capital / Time
                        </div>
                        <div className="flex-1 grid grid-cols-4 gap-2">
                            {timeHorizons.map(t => (
                                <div key={t} className="text-center font-mono text-xs font-bold text-sumi-black/60">
                                    {t.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Matrix Rows */}
                    <div className="space-y-2">
                        {capitalTiers.map(capital => (
                            <div key={capital} className="flex items-center">
                                <div className="w-20 shrink-0 font-mono text-xs font-bold text-sumi-black/60">
                                    ${parseInt(capital).toLocaleString()}
                                </div>
                                <div className="flex-1 grid grid-cols-4 gap-2">
                                    {timeHorizons.map(time => {
                                        const profit = matrix[time][capital];
                                        const intensity = maxProfit > 0 ? (profit / maxProfit) : 0;

                                        return (
                                            <motion.div
                                                key={`${time}-${capital}`}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true }}
                                                title={`Profit: $${profit.toFixed(2)}`}
                                                className={cn(
                                                    "h-10 rounded-[4px] border border-sumi-black flex items-center justify-center font-mono text-[10px] font-bold transition-all hover:scale-105 cursor-crosshair",
                                                    profit < 0 ? "bg-sumi-black text-white" : "bg-matchbox-green text-white"
                                                )}
                                                style={{
                                                    backgroundColor: profit > 0
                                                        ? `rgba(0, 107, 76, ${0.4 + (intensity * 0.6)})`
                                                        : '#1A1A1A'
                                                }}
                                            >
                                                ${profit.toFixed(0)}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
