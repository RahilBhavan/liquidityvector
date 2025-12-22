"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

interface RouteStepsProps {
    steps: string[];
}

export function RouteSteps({ steps }: RouteStepsProps) {
    return (
        <div className="space-y-4 p-4 bg-white/50 rounded-lg border border-sumi-black/5">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">
                Execution Path
            </h4>
            <div className="relative pl-4 border-l-2 border-dashed border-sumi-black/10 space-y-6">
                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative"
                    >
                        <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-cobalt-blue border-2 border-white ring-1 ring-sumi-black/10" />
                        <div className="bg-white p-3 rounded border border-sumi-black/10 shadow-sm text-sm font-medium">
                            {step}
                        </div>
                        {i < steps.length - 1 && (
                            <ArrowDown className="absolute -bottom-5 left-4 w-4 h-4 text-sumi-black/20" />
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
