import { Address } from 'viem';

export interface TokenConfig {
    symbol: string;
    name: string;
    decimals: number;
    address: Address;
    chainId: number;
    logo?: string;
}

// Common Token Addresses
export const SUPPORTED_TOKENS: TokenConfig[] = [
    // --- ETHEREUM MAINNET (1) ---
    {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        chainId: 1,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        chainId: 1,
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chainId: 1,
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },

    // --- BASE (8453) ---
    {
        symbol: 'USDC',
        name: 'USD Coin (Base)',
        decimals: 6,
        chainId: 8453,
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        chainId: 8453,
        address: '0x4200000000000000000000000000000000000006',
    },
    {
        symbol: 'cbETH',
        name: 'Coinbase Wrapped Staked ETH',
        decimals: 18,
        chainId: 8453,
        address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    }
];
