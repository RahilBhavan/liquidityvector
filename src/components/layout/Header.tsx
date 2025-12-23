"use client";

import { useState, useEffect } from 'react';
import { useAutoCapital } from '@/hooks/useAutoCapital';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StampCard } from '@/components/ui/stamp-card';

interface HeaderProps {
    walletBalance: number | null;
    canPopulate: boolean;
    onPopulateCapital: () => void;
}

export function Header({ walletBalance, canPopulate, onPopulateCapital }: HeaderProps) {
    const [sessionId, setSessionId] = useState('------');

    // Generate session ID only on client to avoid hydration mismatch
    useEffect(() => {
        setSessionId(Math.random().toString(36).substring(7).toUpperCase());
    }, []);

    return (
        <header className="w-full border-b-2 border-sumi-black bg-paper-white px-6 py-4 flex items-center justify-between z-10 relative">
            <div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-sumi-black/60 mb-1">
                    [ CURRENT_SESSION_ID: {sessionId} ]
                </h2>
                <div className="font-sans font-bold text-lg text-sumi-black">
                    Cross-Chain Yield Aggregator
                </div>
            </div>

            <div className="flex items-center gap-6">
                {walletBalance !== null && (
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-right">
                            <div className="font-mono text-[10px] font-bold uppercase text-sumi-black/60">Wallet Balance</div>
                            <div className="font-mono font-bold text-sumi-black">
                                ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {canPopulate && (
                            <button
                                onClick={onPopulateCapital}
                                className="flex items-center gap-2 px-3 py-1.5 bg-matchbox-green text-white border-2 border-sumi-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none hover:bg-matchbox-green/90 transition-all"
                            >
                                <Wallet className="w-3 h-3" />
                                <span className="font-mono text-xs font-bold uppercase">Use Max</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="connect-button-wrapper">
                    <ConnectButton
                        showBalance={false}
                        accountStatus={{
                            smallScreen: 'avatar',
                            largeScreen: 'full',
                        }}
                    />
                </div>
            </div>
        </header>
    );
}
