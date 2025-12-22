import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';

export interface PortfolioAsset {
    id: string;
    symbol: string;
    name: string;
    balance: number;
    valueUsd: number;
    type: 'native' | 'erc20' | 'lp';
    apy?: number; // Current generic APY for this asset (usually low for idle assets)
}

export function usePortfolio() {
    const { address, isConnected } = useAccount();
    const { data: nativeBalance } = useBalance({ address });

    const [assets, setAssets] = useState<PortfolioAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isConnected || !address) {
            setAssets([]);
            return;
        }

        setIsLoading(true);

        // Simulate API delay
        const timer = setTimeout(() => {
            const newAssets: PortfolioAsset[] = [];

            // 1. Real Native Balance
            if (nativeBalance) {
                const ethPrice = 2250; // Mock ETH Price
                const balance = parseFloat(nativeBalance.formatted);
                if (balance > 0) {
                    newAssets.push({
                        id: 'native-eth',
                        symbol: nativeBalance.symbol,
                        name: 'Native Token',
                        balance: balance,
                        valueUsd: balance * ethPrice,
                        type: 'native',
                        apy: 0
                    });
                }
            }

            // 2. Mocked "Stagnant" LP Positions (Simulation)
            // In a real app, this traverses the wallet's history or hits Covalent
            newAssets.push({
                id: 'aave-v2-usdc',
                symbol: 'aUSDC',
                name: 'Aave V2 Lending',
                balance: 4250.50,
                valueUsd: 4250.50,
                type: 'erc20',
                apy: 1.2 // Low APY, good candidate for migration
            });

            newAssets.push({
                id: 'curve-3pool',
                symbol: '3Crv',
                name: 'Curve 3Pool',
                balance: 10500.00,
                valueUsd: 11025.00,
                type: 'lp',
                apy: 2.5 // Moderate APY
            });

            setAssets(newAssets);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, [isConnected, address, nativeBalance]);

    return { assets, isLoading };
}
