'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/features/dashboard/components/DashboardView';
import { useAutoCapital } from '@/hooks/useAutoCapital';
import { useAccount, useChainId } from 'wagmi';
import { CHAIN_ID_MAP } from '@/lib/wagmi.config';
import { UserSettings, Chain } from '@/types';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    capital: 10000,
    currentChain: Chain.Ethereum,
    riskTolerance: 3,
  });
  const [isFetching, setIsFetching] = useState(false);

  const { isConnected, address } = useAccount();
  const chainId = useChainId();

  // Auto-capital from wallet balance
  const { populateFromWallet, canPopulate, walletBalanceUsd } = useAutoCapital({
    currentCapital: settings.capital,
    setCapital: (value) => setSettings(prev => ({ ...prev, capital: value })),
    autoPopulate: true,
    minBalance: 100,
  });

  // Ensure component is mounted (client-side only) before using wallet hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync chain from wallet when connected
  useEffect(() => {
    if (mounted && isConnected && chainId) {
      const chainName = CHAIN_ID_MAP[chainId];
      if (chainName && Object.values(Chain).includes(chainName as Chain)) {
        setSettings(prev => ({ ...prev, currentChain: chainName as Chain }));
      }
    }
  }, [mounted, isConnected, chainId]);

  return (
    <div className="flex h-screen w-screen bg-paper-white text-sumi-black font-sans overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar
        settings={settings}
        setSettings={setSettings}
        isFetching={isFetching}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          walletBalance={walletBalanceUsd}
          canPopulate={canPopulate}
          onPopulateCapital={populateFromWallet}
        />

        <main className="flex-1 h-full overflow-hidden relative">
          <DashboardView
            settings={settings}
            setFetching={setIsFetching}
            walletAddress={address}
          />
        </main>
      </div>
    </div>
  );
}
