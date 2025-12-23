import { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { apiService } from '@/lib/services/apiService';
import { SUPPORTED_TOKENS } from '@/config/tokens';

export interface PortfolioAsset {
    id: string;
    symbol: string;
    name: string;
    balance: number;
    valueUsd: number;
    type: 'native' | 'erc20' | 'lp';
    apy?: number;
}

export function usePortfolio() {
    const { address, isConnected, chainId } = useAccount();
    const { data: nativeBalance } = useBalance({ address });

    const [assets, setAssets] = useState<PortfolioAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter tokens for current chain
    const chainTokens = useMemo(() =>
        SUPPORTED_TOKENS.filter(t => t.chainId === chainId),
        [chainId]);

    // Prepare contract calls
    const { data: tokenBalances, isLoading: isScanning } = useReadContracts({
        contracts: chainTokens.map(token => ({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
        })),
        query: {
            enabled: !!address && chainTokens.length > 0,
        }
    });

    useEffect(() => {
        if (!isConnected || !address) {
            setAssets([]);
            return;
        }

        const processAssets = async () => {
            setIsLoading(true);
            const newAssets: PortfolioAsset[] = [];

            // 1. Native Asset
            if (nativeBalance) {
                try {
                    const balance = parseFloat(nativeBalance.formatted);
                    let ethPrice = 0;
                    try {
                        ethPrice = await apiService.getNativeTokenPrice('ethereum');
                    } catch {
                        ethPrice = 2250;
                    }

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

                    // 2. ERC20 Tokens (Real Scan)
                    if (tokenBalances && chainTokens.length > 0) {
                        tokenBalances.forEach((result, index) => {
                            if (result.status === 'success' && result.result) {
                                const token = chainTokens[index];
                                const rawBalance = result.result as bigint;
                                const formatted = parseFloat(formatUnits(rawBalance, token.decimals));

                                if (formatted > 0) {
                                    // Price heuristic
                                    let price = 0;
                                    if (token.symbol.includes('USD') || token.symbol.includes('DAI')) price = 1.0;
                                    else if (token.symbol.includes('ETH')) price = ethPrice;
                                    else price = 0;

                                    newAssets.push({
                                        id: `token-${token.symbol}`,
                                        symbol: token.symbol,
                                        name: token.name,
                                        balance: formatted,
                                        valueUsd: formatted * price,
                                        type: 'erc20',
                                        apy: 0
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error processing portfolio", e);
                }
            }

            setAssets(newAssets);
            setIsLoading(false);
        };

        processAssets();
    }, [isConnected, address, nativeBalance, tokenBalances, chainTokens]);

    return { assets, isLoading: isLoading || isScanning };
}
