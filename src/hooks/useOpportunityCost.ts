import { useMemo } from 'react';
import { PortfolioAsset } from './usePortfolio';
import { Pool } from '@/types';
import { apiService } from '@/lib/services/apiService';
import { useQuery } from '@tanstack/react-query';

export interface OpportunityMetric {
    symbol: string;
    idleAmount: number;
    idleUsd: number;
    potentialApy: number;
    potentialYieldYearly: number;
    bestPool?: Pool;
}

export interface PortfolioHealth {
    totalIdleUsd: number;
    totalMissedYearly: number;
    healthScore: number; // 0-100
    opportunities: OpportunityMetric[];
    isLoading: boolean;
}

export function useOpportunityCost(assets: PortfolioAsset[]) {
    // Fetch top pools to compare against
    const { data: topPools, isLoading: isLoadingPools } = useQuery({
        queryKey: ['topPools'],
        queryFn: () => apiService.fetchTopPools(),
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    const health = useMemo((): PortfolioHealth => {
        if (!assets || !topPools) {
            return {
                totalIdleUsd: 0,
                totalMissedYearly: 0,
                healthScore: 100, // Innocent until proven guilty
                opportunities: [],
                isLoading: isLoadingPools
            };
        }

        let totalIdleUsd = 0;
        let totalMissedYearly = 0;
        const opportunities: OpportunityMetric[] = [];

        // Define "Lazy Assets" - tokens that should be earning yield but typically don't in a wallet
        const targetTokens = ['USDC', 'DAI', 'USDT', 'WETH', 'ETH'];

        assets.forEach(asset => {
            const symbol = asset.symbol.toUpperCase();

            // Only care about significant idle amounts (> $10)
            if (targetTokens.includes(symbol) && asset.valueUsd > 10) {
                // Find best matching pool for this asset
                // We assume 'symbol' match is enough for this heuristic
                const matchingPools = topPools.filter(p =>
                    p.symbol.includes(symbol) || p.project.toUpperCase().includes(symbol)
                );

                if (matchingPools.length > 0) {
                    // Sort by APY descending
                    const bestPool = matchingPools.sort((a, b) => b.apy - a.apy)[0];

                    if (bestPool.apy > 0) {
                        const potentialYield = asset.valueUsd * (bestPool.apy / 100);

                        totalIdleUsd += asset.valueUsd;
                        totalMissedYearly += potentialYield;

                        opportunities.push({
                            symbol,
                            idleAmount: asset.balance,
                            idleUsd: asset.valueUsd,
                            potentialApy: bestPool.apy,
                            potentialYieldYearly: potentialYield,
                            bestPool
                        });
                    }
                }
            }
        });

        // Calculate Health Score
        // 100 = No idle capital
        // 0 = All detected capital is idle
        const totalPortfolioValue = assets.reduce((acc, a) => acc + a.valueUsd, 0);

        let healthScore = 100;
        if (totalPortfolioValue > 0) {
            const idleRatio = totalIdleUsd / totalPortfolioValue;
            healthScore = Math.max(0, Math.round(100 * (1 - idleRatio)));
        }

        return {
            totalIdleUsd,
            totalMissedYearly,
            healthScore,
            opportunities,
            isLoading: isLoadingPools
        };

    }, [assets, topPools, isLoadingPools]);

    return health;
}
