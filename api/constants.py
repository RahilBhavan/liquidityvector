"""
Constants and static mappings for the Liquidity Vector API.
"""

from .models import Chain, BridgeMetadata, ExploitData

# Chain ID mappings for external APIs
CHAIN_IDS = {
    Chain.Ethereum: 1,
    Chain.Arbitrum: 42161,
    Chain.Base: 8453,
    Chain.Optimism: 10,
    Chain.Polygon: 137,
    Chain.Avalanche: 43114,
    Chain.BNBChain: 56,
}

# CoinGecko token IDs for native tokens
NATIVE_TOKEN_IDS = {
    Chain.Ethereum: "ethereum",
    Chain.Arbitrum: "ethereum",      # Uses ETH
    Chain.Base: "ethereum",          # Uses ETH
    Chain.Optimism: "ethereum",      # Uses ETH
    Chain.Polygon: "matic-network",
    Chain.Avalanche: "avalanche-2",
    Chain.BNBChain: "binancecoin",
}

# USDC contract addresses per chain (for bridge quotes)
USDC_ADDRESSES = {
    Chain.Ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    Chain.Arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    Chain.Base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    Chain.Optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    Chain.Polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    Chain.Avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    Chain.BNBChain: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
}

# Gas limits per chain for typical DeFi interactions (approval + deposit)
BASE_GAS_LIMITS = {
    Chain.Ethereum: 220_000,
    Chain.Arbitrum: 600_000,
    Chain.Base: 350_000,
    Chain.Optimism: 400_000,
    Chain.Polygon: 300_000,
    Chain.Avalanche: 250_000,
    Chain.BNBChain: 200_000,
}

# Bridge protocol metadata with security profiles
BRIDGE_OPTIONS: list[BridgeMetadata] = [
    BridgeMetadata(
        name="Stargate V2",
        type="LayerZero",
        age_years=3.0,
        tvl=320,
        has_exploits=False,
        base_time=2
    ),
    BridgeMetadata(
        name="Across Protocol",
        type="Intent",
        age_years=2.5,
        tvl=450,
        has_exploits=False,
        base_time=1
    ),
    BridgeMetadata(
        name="Hop Protocol",
        type="Liquidity",
        age_years=4.0,
        tvl=65,
        has_exploits=False,
        base_time=8
    ),
    BridgeMetadata(
        name="Synapse",
        type="Liquidity",
        age_years=3.5,
        tvl=120,
        has_exploits=True,
        base_time=4,
        exploit_data=ExploitData(
            year=2021,
            amount="$8M",
            description="Metapool logic error allowed unbalanced AMM trades during high volatility.",
            report_url="https://rekt.news/synapse-rekt/"
        )
    ),
    BridgeMetadata(
        name="Multichain (Legacy)",
        type="Liquidity",
        age_years=5.0,
        tvl=0,
        has_exploits=True,
        base_time=999,
        exploit_data=ExploitData(
            year=2023,
            amount="$126M",
            description="Unauthorized access to MPC keys lead to massive drain of Fantom/Moonriver bridges.",
            report_url="https://rekt.news/multichain-rekt/"
        )
    ),
    BridgeMetadata(
        name="Nomad",
        type="Optimistic",
        age_years=2.0,
        tvl=5,
        has_exploits=True,
        base_time=35,
        exploit_data=ExploitData(
            year=2022,
            amount="$190M",
            description="Improper root validation allowed attackers to spoof messages and drain all funds.",
            report_url="https://rekt.news/nomad-rekt/"
        )
    ),
    BridgeMetadata(
        name="Wormhole",
        type="Guardian",
        age_years=3.5,
        tvl=850,
        has_exploits=True,
        base_time=5,
        exploit_data=ExploitData(
            year=2022,
            amount="$320M",
            description="Signature verification bypass on Solana-Ethereum bridge (replenished by VC).",
            report_url="https://rekt.news/wormhole-rekt/"
        )
    ),
    BridgeMetadata(
        name="Hyphen",
        type="Liquidity",
        age_years=2.5,
        tvl=80,
        has_exploits=False,
        base_time=2
    ),
    BridgeMetadata(
        name="Arbitrum Bridge",
        type="Canonical",
        age_years=3.0,
        tvl=2800,
        has_exploits=False,
        base_time=15
    ),
    BridgeMetadata(
        name="Optimism Gateway",
        type="Canonical",
        age_years=3.0,
        tvl=1200,
        has_exploits=False,
        base_time=15
    ),
    BridgeMetadata(
        name="Base Bridge",
        type="Canonical",
        age_years=1.5,
        tvl=1500,
        has_exploits=False,
        base_time=15
    )
]
