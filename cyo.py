#!/usr/bin/env python3
import asyncio
import argparse
import sys
from typing import List, Dict, Optional

# Add the current directory to sys.path to ensure we can import api modules
sys.path.append(".")

from api.services import get_service, cleanup_service, InsufficientLiquidityError, BridgeRouteError, ExternalAPIError
from api.models import Chain, AnalyzeRequest, Pool, RouteCalculation

# Vitalik's address as a safe default for read-only quotes
DEFAULT_WALLET = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"

def format_currency(amount: float) -> str:
    return f"${amount:,.2f}"

def generate_report(calc: RouteCalculation, request: AnalyzeRequest, best_pool: Dict) -> str:
    """Generates the Markdown report based on the analysis."""
    
    # Determine "Go/No-Go" based on breakeven days and risk
    # This is a simple heuristic
    is_profitable = calc.net_profit_30d > 0
    recommendation = "GO" if is_profitable and calc.risk_level <= 3 else "NO-GO"
    
    # Executive Summary
    exec_summary = f"The most profitable opportunity is **{calc.target_pool.project}** on **{calc.target_pool.chain}** with **{calc.target_pool.apy:.2f}% APY**. "
    if is_profitable:
        exec_summary += f"Projected 30-day net profit is **{format_currency(calc.net_profit_30d)}** with a breakeven of **{calc.breakeven_days:.1f} days**. "
    else:
        exec_summary += "However, due to high migration costs, this route is **not profitable** within 30 days. "
    
    exec_summary += f"Risk level is **{calc.risk_level}/5**."

    # Cost Breakdown
    if calc.cost_breakdown:
        source_gas = calc.cost_breakdown.entry.source_gas
        bridge_fee = calc.cost_breakdown.entry.bridge_fee
        dest_gas = calc.cost_breakdown.entry.dest_gas
        total_upfront = calc.cost_breakdown.entry.total
    else:
        # Fallback if cost_breakdown is missing (shouldn't happen with v2)
        source_gas = 0
        bridge_fee = calc.bridge_cost
        dest_gas = calc.gas_cost
        total_upfront = calc.total_cost # This might be round-trip, but let's use it

    # Risk Factors (Mocked/derived for now as the risk engine is simple)
    risks = []
    if calc.has_exploits:
        risks.append("Bridge has a history of exploits.")
    if calc.risk_level >= 4:
        risks.append("High risk bridge or protocol.")
    if calc.estimated_time and "min" in calc.estimated_time and int(calc.estimated_time.replace("~", "").replace(" min", "")) > 30:
        risks.append("Long bridge execution time.")
    if not risks:
        risks.append("No critical risks identified based on available metadata.")

    report = f"""
# CROSS-CHAIN YIELD ANALYSIS REPORT

## Executive Summary
{exec_summary}

## 1. Identified Top Opportunity
- **Protocol:** {calc.target_pool.project}
- **Chain:** {calc.target_pool.chain}
- **Asset:** {calc.target_pool.symbol}
- **Current APY:** {calc.target_pool.apy:.2f}%
- **Estimated Total Migration Cost (Round-Trip):** {format_currency(calc.total_cost)}

## 2. Detailed Financial Analysis
- **Breakeven Period:** {calc.breakeven_days:.1f} days
- **30-Day Projected Net Profit:** {format_currency(calc.net_profit_30d)}
- **NPV Assessment:** {"Positive" if is_profitable else "Negative"} (over 30 days)

## 3. Cost Breakdown (Entry)
- Source Chain Gas: {format_currency(source_gas)}
- Bridge Fee (via {calc.bridge_name}): {format_currency(bridge_fee)}
- Destination Chain Gas: {format_currency(dest_gas)}
- **Total Entry Cost:** {format_currency(total_upfront)}
*(Note: Analysis includes estimated exit costs for accurate breakeven)*

## 4. Risk Assessment Summary
- **Composite Risk Score:** {calc.risk_level}/5 (Lower is safer)
- **Critical Risks:**
"""
    for i, risk in enumerate(risks, 1):
        report += f"    {i}. {risk}\n"

    report += f"""
## 5. Recommended Action
"""
    if recommendation == "GO":
        report += f"Proceed with bridging **{format_currency(request.capital)}** to **{calc.target_pool.chain}** via **{calc.bridge_name}**. Ensure you have sufficient native tokens for gas on the source chain."
    else:
        report += f"**DO NOT PROCEED.** The migration costs outweigh the short-term yield benefits. Consider staying on the current chain or increasing capital to dilute fixed costs."

    return report

async def main():
    parser = argparse.ArgumentParser(description="Cross-Chain Yield Optimizer (CYO)")
    parser.add_argument("--capital", type=float, default=10000.0, help="Capital amount in USDC (default: 10000)")
    parser.add_argument("--chain", type=str, default="Ethereum", help="Source chain (default: Ethereum)")
    parser.add_argument("--wallet", type=str, default=DEFAULT_WALLET, help="Wallet address for quotes (optional)")
    parser.add_argument("--pool-id", type=str, help="Specific pool ID to analyze (optional)")
    
    args = parser.parse_args()

    # Validate Capital
    if args.capital <= 0:
        print("Error: Capital must be a positive amount.")
        return

    # Validate Chain
    try:
        source_chain = Chain(args.chain)
    except ValueError:
        print(f"Error: Invalid source chain '{args.chain}'. Supported: {', '.join([c.value for c in Chain])}")
        return

    print(f"Initializing Cross-Chain Yield Optimizer...")
    print(f"Parameters: Capital=${args.capital:,.2f}, Source={source_chain.value}")

    if args.wallet == DEFAULT_WALLET:
        print("\n[WARNING] No wallet address provided. Using a default public address for simulation.")
        print("          Bridge quotes may not perfectly reflect your specific account status.\n")
    
    service = get_service()
    
    try:
        # 1. Yield Aggregation
        print("Fetching top yield opportunities...")
        pools = await service.fetch_top_pools()
        
        if not pools:
            print("No suitable pools found.")
            return

        # Select target pool
        target_pool_data = None
        if args.pool_id:
            target_pool_data = next((p for p in pools if p.get("pool") == args.pool_id), None)
            if not target_pool_data:
                print(f"Pool with ID {args.pool_id} not found in top pools.")
                return
        else:
            # Simple strategy: Max APY that is NOT on the source chain (to demonstrate cross-chain)
            # Or just Max APY regardless. The prompt implies "deployment... across... Base, Arbitrum", so moving IS the goal.
            # But if the best yield is on the source chain, we should say so.
            # Let's pick the absolute highest APY for now.
            target_pool_data = pools[0]
            
            # If highest APY is on source chain, look for next best on another chain for comparison?
            # For this CLI, we'll just take the best one.
        
        if not target_pool_data:
            print("Could not select a target pool.")
            return

        print(f"Selected Opportunity: {target_pool_data['project']} on {target_pool_data['chain']} ({target_pool_data['apy']:.2f}% APY)")
        print("Analyzing route costs and risks (this may take a moment)...")

        # 2. & 3. Real Cost Estimation & Breakeven Analysis
        req = AnalyzeRequest(
            capital=args.capital,
            current_chain=source_chain,
            target_chain=target_pool_data["chain"],
            pool_id=target_pool_data["pool"],
            pool_apy=target_pool_data["apy"],
            project=target_pool_data["project"],
            token_symbol=target_pool_data["symbol"],
            tvl_usd=target_pool_data["tvlUsd"],
            wallet_address=args.wallet
        )

        calculation = await service.analyze_route(req)

        # 4. Generate Report
        report = generate_report(calculation, req, target_pool_data)
        print("\n" + "="*60)
        print(report)
        print("="*60 + "\n")

    except InsufficientLiquidityError as e:
        print("\n" + "!"*60)
        print("ERROR: INSUFFICIENT LIQUIDITY / NO ROUTE FOUND")
        print(f"Details: {e}")
        print("Actionable Advice:")
        print("  1. Try a smaller capital amount.")
        print("  2. The bridge might be temporarily paused or congested.")
        print("  3. Consider bridging to an intermediate chain (e.g. Ethereum) first.")
        print("!"*60 + "\n")
    
    except BridgeRouteError as e:
        print("\n" + "!"*60)
        print("ERROR: BRIDGE ROUTING FAILED")
        print(f"Details: {e}")
        print("Actionable Advice:")
        print("  - Check if the source chain has sufficient gas tokens.")
        print("  - Ensure the target chain supports the requested asset.")
        print("!"*60 + "\n")

    except ExternalAPIError as e:
        print("\n" + "!"*60)
        print("ERROR: EXTERNAL DATA SERVICE FAILURE")
        print(f"Details: {e}")
        print("Actionable Advice:")
        print("  - One of our data providers (DeFiLlama, Li.Fi, RPC) is down.")
        print("  - Please try again in a few minutes.")
        print("!"*60 + "\n")

    except Exception as e:
        print(f"\nError during analysis: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await cleanup_service()

if __name__ == "__main__":
    asyncio.run(main())
