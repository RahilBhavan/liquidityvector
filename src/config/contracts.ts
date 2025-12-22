export const CONTRACT_ADDRESSES = {
    LiquidityVault: {
        1: process.env.NEXT_PUBLIC_VAULT_ADDRESS_MAINNET as `0x${string}`,
        42161: process.env.NEXT_PUBLIC_VAULT_ADDRESS_ARBITRUM as `0x${string}`,
        8453: process.env.NEXT_PUBLIC_VAULT_ADDRESS_BASE as `0x${string}`,
        10: process.env.NEXT_PUBLIC_VAULT_ADDRESS_OPTIMISM as `0x${string}`,
        137: process.env.NEXT_PUBLIC_VAULT_ADDRESS_POLYGON as `0x${string}`,
        43114: process.env.NEXT_PUBLIC_VAULT_ADDRESS_AVALANCHE as `0x${string}`,
        56: process.env.NEXT_PUBLIC_VAULT_ADDRESS_BSC as `0x${string}`,
    },
} as const;

export function getVaultAddress(chainId: number): `0x${string}` | undefined {
    return CONTRACT_ADDRESSES.LiquidityVault[chainId as keyof typeof CONTRACT_ADDRESSES.LiquidityVault];
}
