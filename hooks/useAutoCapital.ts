'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useWalletBalance } from './useWalletBalance';

interface UseAutoCapitalOptions {
  currentCapital: number;
  setCapital: (value: number) => void;
  autoPopulate?: boolean;
  minBalance?: number;
}

interface UseAutoCapitalResult {
  walletBalance: number;
  walletBalanceUsd: number;
  isConnected: boolean;
  chainName: string | undefined;
  nativeSymbol: string;
  populateFromWallet: () => void;
  canPopulate: boolean;
  isLoading: boolean;
}

export function useAutoCapital({
  currentCapital,
  setCapital,
  autoPopulate = false,
  minBalance = 100,
}: UseAutoCapitalOptions): UseAutoCapitalResult {
  const {
    isConnected,
    chainName,
    nativeBalanceUsd,
    nativeSymbol,
    isLoading,
  } = useWalletBalance();

  // Track if we've auto-populated for this session to avoid re-populating
  const hasAutoPopulated = useRef(false);
  // Track previous connection state to detect new connections
  const wasConnected = useRef(false);

  const canPopulate = isConnected && !isLoading && nativeBalanceUsd >= minBalance;

  const populateFromWallet = useCallback(() => {
    if (canPopulate) {
      setCapital(Math.floor(nativeBalanceUsd));
      hasAutoPopulated.current = true;
    }
  }, [canPopulate, nativeBalanceUsd, setCapital]);

  // Auto-populate when wallet first connects with sufficient balance
  useEffect(() => {
    // Detect new connection (was disconnected, now connected)
    const justConnected = isConnected && !wasConnected.current;
    wasConnected.current = isConnected;

    // Reset auto-populate flag when disconnecting
    if (!isConnected) {
      hasAutoPopulated.current = false;
      return;
    }

    // Auto-populate on first connect if enabled and haven't already
    if (autoPopulate && canPopulate && !hasAutoPopulated.current) {
      // Only auto-populate if just connected or balance just loaded
      if (justConnected || nativeBalanceUsd > 0) {
        populateFromWallet();
      }
    }
  }, [autoPopulate, canPopulate, isConnected, nativeBalanceUsd, populateFromWallet]);

  return {
    walletBalance: parseFloat(nativeBalanceUsd.toFixed(2)),
    walletBalanceUsd: nativeBalanceUsd,
    isConnected,
    chainName,
    nativeSymbol,
    populateFromWallet,
    canPopulate,
    isLoading,
  };
}
