'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { CHAIN_ID_MAP } from '@/lib/wagmi.config';
import { apiService } from '@/lib/services/apiService';

interface WalletBalanceResult {
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  chainName: string | undefined;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  nativeSymbol: string;
  nativeBalanceUsd: number;
  isLoading: boolean;
  error: Error | null;
}

export function useWalletBalance(): WalletBalanceResult {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [livePrice, setLivePrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(false);

  const { data: balanceData, isLoading: balanceLoading, error } = useBalance({
    address,
  });

  const chainName = chainId ? CHAIN_ID_MAP[chainId] : undefined;

  // Fetch live price when chain changes
  useEffect(() => {
    if (!chainName || !isConnected) {
      setLivePrice(0);
      return;
    }

    let isMounted = true;
    setPriceLoading(true);

    apiService.getNativeTokenPrice(chainName)
      .then((price) => {
        if (isMounted) {
          setLivePrice(price);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch live price:', err);
        if (isMounted) {
          setLivePrice(0);
        }
      })
      .finally(() => {
        if (isMounted) {
          setPriceLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chainName, isConnected]);

  const nativeBalance = balanceData?.value
    ? formatEther(balanceData.value)
    : '0';

  const nativeBalanceFormatted = balanceData?.value
    ? parseFloat(formatEther(balanceData.value)).toFixed(4)
    : '0.0000';

  const nativeSymbol = balanceData?.symbol || 'ETH';

  const nativeBalanceUsd = parseFloat(nativeBalance) * livePrice;

  return {
    isConnected,
    address,
    chainId,
    chainName,
    nativeBalance,
    nativeBalanceFormatted,
    nativeSymbol,
    nativeBalanceUsd,
    isLoading: balanceLoading || priceLoading,
    error: error as Error | null,
  };
}
