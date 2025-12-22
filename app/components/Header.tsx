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
    <header className="w-full bg-bit-white flex flex-col">
      {/* Top Row: Title and Wallet */}
      <div className="flex items-center justify-between px-4 py-3 bg-bit-white z-10 relative">
        <div className="flex items-center gap-4">
           <div className="w-4 h-4 bg-bit-black animate-pulse" />
           <h1 className="text-xl md:text-2xl font-pixel tracking-tighter">
             LIQUIDITY_VECTOR v1.0
           </h1>
        </div>

        <div className="flex items-center gap-4">
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
                      CONNECT_WALLET
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="btn-1bit pattern-checker text-bit-black hover:invert-1bit"
                    >
                      WRONG_NET
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openChainModal}
                      className="hidden md:flex items-center gap-2 px-2 py-1 border-2 border-bit-black hover:bg-bit-black hover:text-bit-white transition-none text-xs font-bold uppercase"
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
      <div className="h-8 w-full border-t-2 border-bit-black flex">
        <div className="flex-1 pattern-checker border-r-2 border-bit-black relative overflow-hidden">
             {/* Scrolling text or static decoration */}
        </div>
        <div className="px-4 flex items-center bg-bit-white min-w-[200px] justify-end font-mono text-xs font-bold">
           {mounted && canPopulate ? (
             <button onClick={onPopulateCapital} className="flex items-center gap-2 hover:underline decoration-2">
               <span>CAPITAL_AVAIL:</span>
               <span>${walletBalance.toLocaleString()}</span>
               <ArrowDownToLine className="w-3 h-3" />
             </button>
           ) : (
             <span>SYS_READY</span>
           )}
        </div>
      </div>
    </header>
  );
}
