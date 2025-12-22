"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Zap, Wrench } from "lucide-react";
import { Chain, UserSettings } from "@/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
    isFetching: boolean;
}

export function Sidebar({ settings, setSettings, isFetching }: SidebarProps) {
    const { isConnected } = useAccount();

    const handleChange = (field: keyof UserSettings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <aside className="w-full md:w-80 h-full bg-paper-white border-r-2 border-sumi-black flex flex-col overflow-y-auto relative z-20">

            {/* Brand */}
            <div className="p-6 border-b-2 border-sumi-black bg-intl-orange text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white border-2 border-sumi-black shadow-none neo-card">
                        <Zap className="w-5 h-5 text-sumi-black fill-current" />
                    </div>
                    <div>
                        <h1 className="font-sans font-bold text-xl tracking-tighter uppercase leading-none">
                            Liquidity
                            <br />
                            Vector
                        </h1>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8 flex-1">

                {/* Capital Input (Ticket Style) */}
                <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        [ CAPITAL_ALLOCATION ]
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-sumi-black translate-x-1 translate-y-1 rounded-[var(--radius)]" />
                        <div className="relative bg-white border-2 border-sumi-black p-1 flex items-center transition-transform group-focus-within:-translate-y-0.5 group-focus-within:-translate-x-0.5 rounded-[var(--radius)]">
                            <span className="pl-3 font-mono text-lg text-sumi-black">$</span>
                            <input
                                type="number"
                                value={settings.capital}
                                onChange={(e) => handleChange('capital', Number(e.target.value))}
                                className="w-full bg-transparent p-2 font-mono text-xl font-bold text-sumi-black outline-none placeholder:text-sumi-black/20"
                                placeholder="0"
                            />
                            {isConnected && (
                                <div className="pr-3">
                                    <div className="w-2 h-2 rounded-full bg-matchbox-green animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Chain Selector (Stamp Grid) */}
                <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        [ ORIGIN_NETWORK ]
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        <AnimatePresence mode="popLayout">
                            {Object.values(Chain).map((chain) => {
                                const isActive = settings.currentChain === chain;
                                return (
                                    <motion.button
                                        key={chain}
                                        layout
                                        onClick={() => handleChange('currentChain', chain)}
                                        whileHover={{ scale: 1.02, x: 2 }}
                                        whileTap={{ scale: 0.98 }}
                                        animate={{
                                            backgroundColor: isActive ? "var(--cobalt-blue)" : "#FFFFFF",
                                            color: isActive ? "#FFFFFF" : "var(--sumi-black)",
                                            borderColor: "var(--sumi-black)",
                                        }}
                                        className={cn(
                                            "relative w-full text-left px-4 py-3 border-2 transition-colors duration-200 flex items-center justify-between group rounded-[var(--radius)]",
                                            isActive ? "shadow-md" : ""
                                        )}
                                    >
                                        <span className={cn("font-bold text-sm tracking-tight", isActive ? "font-mono" : "font-sans")}>
                                            {chain}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-indicator"
                                                className="w-2 h-2 bg-white rotate-45"
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Risk Slider (Technical Control) */}
                <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        [ RISK_APPETITE ]
                    </label>
                    <div className="bg-white border-2 border-sumi-black p-4 space-y-4 rounded-[var(--radius)] shadow-sm">
                        <div className="flex justify-between items-end h-16 gap-1">
                            {[1, 2, 3, 4, 5].map((level) => {
                                const isActive = settings.riskTolerance >= level;
                                return (
                                    <motion.button
                                        key={level}
                                        whileHover={{ scaleY: 1.1 }}
                                        onClick={() => handleChange('riskTolerance', level)}
                                        className={cn(
                                            "flex-1 border-2 border-sumi-black transition-colors duration-200 rounded-t-sm",
                                            isActive ? "bg-intl-orange" : "bg-transparent opacity-20"
                                        )}
                                        style={{ height: `${40 + (level * 12)}%` }}
                                    />
                                );
                            })}
                        </div>
                        <div className="flex justify-between font-mono text-[10px] font-bold uppercase">
                            <span>Conservative</span>
                            <span>Degen</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-6 border-t-2 border-sumi-black/10 border-dashed">
                    <label className="text-xs font-mono font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        [ ADVANCED_TOOLS ]
                    </label>
                    <Link href="/builder" className="flex items-center gap-3 p-3 rounded-lg border-2 border-sumi-black/10 bg-white hover:border-sumi-black hover:shadow-md transition-all group">
                        <div className="p-2 bg-cobalt-blue text-white rounded group-hover:bg-sumi-black transition-colors">
                            <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-sumi-black">Strategy Builder</div>
                            <div className="text-[10px] text-sumi-black/60 font-mono">Create Custom Routes</div>
                        </div>
                    </Link>
                </div>

            </div>

            {/* Footer Status */}
            <div className="p-4 border-t-2 border-sumi-black bg-kraft-brown/20">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-3 h-3 border-2 border-sumi-black rounded-full",
                        isFetching ? "bg-intl-orange animate-pulse" : "bg-matchbox-green"
                    )} />
                    <div className="flex flex-col">
                        <span className="font-mono text-[10px] uppercase font-bold text-sumi-black/60">System Status</span>
                        <span className="font-sans text-xs font-bold text-sumi-black uppercase">
                            {isFetching ? 'SCANNING >>' : 'OPERATIONAL'}
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
