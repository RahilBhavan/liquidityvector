'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, ArrowDownToLine } from 'lucide-react';

interface HeaderProps {
  walletBalance: number;
  canPopulate: boolean;
  onPopulateCapital: () => void;
}

export default function Header({
  walletBalance,
  canPopulate,
  onPopulateCapital
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="w-full bg-[#F9F9F5] border-b-2 border-[#371E7B] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Status indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-mono text-[#371E7B]/60 uppercase tracking-widest">
            Protocol Status: Online
          </span>
        </div>

        {/* Right: Wallet controls */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Populate Capital Button */}
          {mounted && canPopulate && (
            <button
              onClick={onPopulateCapital}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#371E7B] text-[#371E7B] font-mono font-bold text-sm uppercase tracking-wider hover:bg-[#CCFF00] transition-colors shadow-[4px_4px_0px_0px_#371E7B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#371E7B]"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span className="hidden sm:inline">Use Wallet Balance</span>
              <span className="text-xs opacity-70" suppressHydrationWarning>
                (${mounted ? walletBalance.toLocaleString() : '0'})
              </span>
            </button>
          )}

          {/* RainbowKit Connect Button */}
          {mounted && (
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted: rainbowMounted,
              }) => {
                const ready = rainbowMounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="flex items-center gap-2 px-6 py-3 bg-[#CCFF00] border-2 border-[#371E7B] text-[#371E7B] font-bold font-mono uppercase tracking-wider hover:bg-[#371E7B] hover:text-white transition-all shadow-[4px_4px_0px_0px_#371E7B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#371E7B]"
                          >
                            <Wallet className="w-5 h-5" />
                            Connect Wallet
                          </button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="flex items-center gap-2 px-6 py-3 bg-red-100 border-2 border-red-600 text-red-600 font-bold font-mono uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all"
                          >
                            Wrong Network
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2">
                          {/* Chain Selector */}
                          <button
                            onClick={openChainModal}
                            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#371E7B] text-[#371E7B] font-mono font-bold text-sm uppercase hover:bg-[#F9F9F5] transition-colors"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-4 h-4"
                              />
                            )}
                            {chain.name}
                          </button>

                          {/* Account Button */}
                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-2 px-4 py-3 bg-[#371E7B] border-2 border-[#371E7B] text-white font-mono font-bold text-sm uppercase hover:bg-[#4C2A9E] transition-colors shadow-[4px_4px_0px_0px_#CCFF00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                          >
                            <Wallet className="w-4 h-4 text-[#CCFF00]" />
                            {account.displayName}
                            {account.displayBalance && (
                              <span className="text-[#CCFF00] ml-1">
                                ({account.displayBalance})
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          )}
        </div>
      </div>
    </header>
  );
}
