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
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-divider sticky top-0 z-30 transition-all duration-200">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Context / Breadcrumbs */}
        <div className="flex items-center gap-3">
           <h1 className="text-sm font-medium text-secondary">
             Dashboard / <span className="text-primary font-semibold">Overview</span>
           </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Quick Action: Populate Capital */}
          {mounted && canPopulate && (
            <button
              onClick={onPopulateCapital}
              className="group flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface text-primary rounded-full text-xs font-semibold transition-all shadow-sm hover:shadow-md border border-transparent hover:border-divider"
            >
              <ArrowDownToLine className="w-3 h-3 text-accent group-hover:scale-110 transition-transform" />
              <span>Use Wallet Balance</span>
              <span className="text-secondary group-hover:text-primary transition-colors">
                (${walletBalance.toLocaleString()})
              </span>
            </button>
          )}

          {/* Wallet Connect */}
          <div className="scale-90 origin-right">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </div>
    </header>
  );
}
