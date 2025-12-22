'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet, ArrowDownToLine, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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
  const { theme, cycleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="w-full bg-bit-bg flex flex-col relative z-20">
      {/* Top Row: Title and Wallet */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 bg-bit-bg border-b-2 border-bit-fg">
        <div className="flex items-center gap-4 mb-3 md:mb-0">
           <div className="w-4 h-4 bg-bit-fg animate-pulse shadow-hard-sm" />
           <h1 className="text-lg md:text-xl font-pixel tracking-tighter text-bit-fg">
             LIQUIDITY_VECTOR v1.2
           </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 border-2 border-bit-fg text-xs font-bold font-mono hover:bg-bit-fg hover:text-bit-bg transition-colors uppercase"
          >
            <Monitor className="w-3 h-3" />
            THEME: {theme}
          </button>

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

                if (!ready) return null;

                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="btn-1bit flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      CONNECT
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="btn-1bit pattern-checker text-bit-fg hover:invert-1bit"
                    >
                      WRONG_NET
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openChainModal}
                      className="hidden md:flex items-center gap-2 px-2 py-1 border-2 border-bit-fg hover:bg-bit-fg hover:text-bit-bg transition-none text-xs font-bold uppercase"
                    >
                      [{chain.name}]
                    </button>

                    <button
                      onClick={openAccountModal}
                      className="btn-1bit flex items-center gap-2"
                    >
                      {account.displayName}
                    </button>
                  </div>
                );
              }}
            </ConnectButton.Custom>
          )}
        </div>
      </div>

      {/* Bottom Row: Dither Strip & Status/Balance */}
      <div className="h-8 w-full border-b-2 border-bit-fg flex">
        <div className="flex-1 pattern-checker border-r-2 border-bit-fg relative overflow-hidden opacity-50">
             {/* Scrolling text or static decoration */}
        </div>
        <div className="px-4 flex items-center bg-bit-bg min-w-[200px] justify-end font-mono text-xs font-bold text-bit-fg">
           {mounted && canPopulate ? (
             <button onClick={onPopulateCapital} className="flex items-center gap-2 hover:underline decoration-2">
               <span>CAPITAL_AVAIL:</span>
               <span>${walletBalance.toLocaleString()}</span>
               <ArrowDownToLine className="w-3 h-3" />
             </button>
           ) : (
             <span className="animate-pulse">SYS_READY</span>
           )}
        </div>
      </div>
    </header>
  );
}
