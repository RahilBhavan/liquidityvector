"use client";

import { useAccount } from "wagmi";
import {
    History,
    Settings,
    BarChart2,
    Wallet,
    ShieldAlert,
    Zap,
    Link as LinkIcon
} from "lucide-react";
import { Chain, UserSettings } from "@/types";
import { cn } from "@/lib/utils";
import { StampCard } from "@/components/ui/stamp-card";

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
                    <div className="p-2 bg-white border-2 border-sumi-black shadow-[2px_2px_0px_#000]">
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
                        <div className="absolute inset-0 bg-sumi-black translate-x-1 translate-y-1" />
                        <div className="relative bg-white border-2 border-sumi-black p-1 flex items-center transition-transform group-focus-within:-translate-y-0.5 group-focus-within:-translate-x-0.5">
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
                        {Object.values(Chain).map((chain) => {
                            const isActive = settings.currentChain === chain;
                            return (
                                <button
                                    key={chain}
                                    onClick={() => handleChange('currentChain', chain)}
                                    className={cn(
                                        "relative w-full text-left px-4 py-3 border-2 border-sumi-black transition-all duration-200 flex items-center justify-between group",
                                        isActive ? "bg-cobalt-blue text-white shadow-[4px_4px_0px_#000] -translate-y-1" : "bg-white text-sumi-black hover:bg-paper-white"
                                    )}
                                >
                                    <span className={cn("font-bold text-sm tracking-tight", isActive ? "font-mono" : "font-sans")}>
                                        {chain}
                                    </span>
                                    {isActive && <div className="w-2 h-2 bg-white rotate-45" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Risk Slider (Technical Control) */}
                <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-sumi-black/60 uppercase tracking-widest flex items-center gap-2">
                        [ RISK_APPETITE ]
                    </label>
                    <div className="bg-white border-2 border-sumi-black p-4 space-y-4">
                        <div className="flex justify-between items-end h-16 gap-1">
                            {[1, 2, 3, 4, 5].map((level) => {
                                const isActive = settings.riskTolerance >= level;
                                return (
                                    <button
                                        key={level}
                                        onClick={() => handleChange('riskTolerance', level)}
                                        className={cn(
                                            "flex-1 border-2 border-sumi-black transition-all duration-200",
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

            </div>

            {/* Footer Status */}
            <div className="p-4 border-t-2 border-sumi-black bg-kraft-brown/20">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-3 h-3 border-2 border-sumi-black",
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
