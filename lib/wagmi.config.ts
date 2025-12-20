'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  avalanche,
  bsc,
} from 'wagmi/chains';

// 7 chains: original 3 + 4 additional
export const config = getDefaultConfig({
  appName: 'LiquidityVector',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    mainnet,      // Ethereum
    arbitrum,     // Arbitrum
    base,         // Base
    optimism,     // Optimism
    polygon,      // Polygon
    avalanche,    // Avalanche
    bsc,          // BNB Chain
  ],
  ssr: true,
});

// Chain ID to app Chain name mapping
export const CHAIN_ID_MAP: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  10: 'Optimism',
  137: 'Polygon',
  43114: 'Avalanche',
  56: 'BNB Chain',
};

// Reverse mapping: app Chain name to Chain ID
export const CHAIN_NAME_TO_ID: Record<string, number> = {
  'Ethereum': 1,
  'Arbitrum': 42161,
  'Base': 8453,
  'Optimism': 10,
  'Polygon': 137,
  'Avalanche': 43114,
  'BNB Chain': 56,
};
