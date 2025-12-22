'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowDownToLine, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationCenter from './NotificationCenter';

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
    <header className="w-full bg-white border-b-2 border-sumi-black/10 sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Branding & Context */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-sumi-black text-white rounded">
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 leading-none mb-0.5">App</span>
            <h1 className="text-lg font-bold text-sumi-black leading-none">
              DASHBOARD
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Quick Action: Populate Capital */}
          {mounted && canPopulate && (
            <button
              onClick={onPopulateCapital}
              className="group flex items-center gap-3 px-4 py-1.5 bg-paper-white border border-sumi-black/20 hover:border-sumi-black rounded-lg transition-all"
            >
              <div className="flex flex-col items-end leading-none">
                <span className="text-[10px] uppercase font-bold text-sumi-black/40">Load Wallet</span>
                <span className="font-mono font-bold text-sm">${walletBalance.toLocaleString()}</span>
              </div>
              <div className="w-6 h-6 bg-sumi-black text-white rounded flex items-center justify-center group-hover:bg-cobalt-blue transition-colors">
                <ArrowDownToLine className="w-3 h-3" />
              </div>
            </button>
          )}

          {/* Notifications */}
          <div className="mr-2">
            <NotificationCenter />
          </div>

          {/* Wallet Connect */}
          <div className="neo-connect-button">
            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </div>
    </header>
  );
}
