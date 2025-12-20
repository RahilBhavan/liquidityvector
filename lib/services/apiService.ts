import { Chain, Pool, RouteCalculation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface BackendRouteResponse {
  target_pool: Pool;
  bridge_cost: number;
  gas_cost: number;
  total_cost: number;
  breakeven_hours: number;
  net_profit_30d: number;
  risk_level: number;
  bridge_name: string;
  estimated_time: string;
  has_exploits: boolean;
  bridge_metadata: {
    name: string;
    type: string;
    age_years: number;
    tvl: number;
    has_exploits: boolean;
    base_time: number;
    exploit_data?: {
      year: number;
      amount: string;
      description: string;
      report_url: string;
    };
  };
  // New fields from backend
  daily_yield_usd: number;
  breakeven_days: number;
  breakeven_chart_data: Array<{ day: number; profit: number }>;
  profitability_matrix: Record<string, Record<string, number>>;
  cost_breakdown?: {
    entry: { bridge_fee: number; source_gas: number; dest_gas: number; total: number };
    exit: { bridge_fee: number; source_gas: number; dest_gas: number; total: number };
    round_trip_total: number;
  };
  risk_warnings: string[];
  tvl_source: string;
}

export const apiService = {
  fetchTopPools: async (): Promise<Pool[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/pools`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch pools from API:", error);
      throw error;
    }
  },

  analyze: async (
    capital: number,
    currentChain: Chain,
    targetPool: Pool,
    walletAddress: string
  ): Promise<RouteCalculation> => {
    if (!walletAddress) {
      throw new Error("Wallet address required for route analysis");
    }
    try {
      const payload = {
        capital,
        current_chain: currentChain,
        target_chain: targetPool.chain,
        pool_id: targetPool.pool,
        pool_apy: targetPool.apy,
        project: targetPool.project,
        token_symbol: targetPool.symbol,
        tvl_usd: targetPool.tvlUsd,
        wallet_address: walletAddress
      };

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const data: BackendRouteResponse = await response.json();

      return {
        targetPool: data.target_pool,
        bridgeCost: data.bridge_cost,
        gasCost: data.gas_cost,
        totalCost: data.total_cost,
        breakevenHours: data.breakeven_hours,
        netProfit30d: data.net_profit_30d,
        riskLevel: data.risk_level,
        bridgeName: data.bridge_name,
        estimatedTime: data.estimated_time,
        hasExploits: data.has_exploits,
        bridgeMetadata: data.bridge_metadata ? {
          name: data.bridge_metadata.name,
          type: data.bridge_metadata.type,
          ageYears: data.bridge_metadata.age_years,
          tvl: data.bridge_metadata.tvl,
          hasExploits: data.bridge_metadata.has_exploits,
          baseTime: data.bridge_metadata.base_time,
          exploitData: data.bridge_metadata.exploit_data ? {
            year: data.bridge_metadata.exploit_data.year,
            amount: data.bridge_metadata.exploit_data.amount,
            description: data.bridge_metadata.exploit_data.description,
            reportUrl: data.bridge_metadata.exploit_data.report_url
          } : undefined
        } : undefined,
        // Map new fields
        dailyYieldUsd: data.daily_yield_usd,
        breakevenDays: data.breakeven_days,
        breakevenChartData: data.breakeven_chart_data,
        profitabilityMatrix: data.profitability_matrix,
        costBreakdown: data.cost_breakdown ? {
          entry: {
            bridgeFee: data.cost_breakdown.entry.bridge_fee,
            sourceGas: data.cost_breakdown.entry.source_gas,
            destGas: data.cost_breakdown.entry.dest_gas,
            total: data.cost_breakdown.entry.total
          },
          exit: {
            bridgeFee: data.cost_breakdown.exit.bridge_fee,
            sourceGas: data.cost_breakdown.exit.source_gas,
            destGas: data.cost_breakdown.exit.dest_gas,
            total: data.cost_breakdown.exit.total
          },
          roundTripTotal: data.cost_breakdown.round_trip_total
        } : undefined,
        riskWarnings: data.risk_warnings,
        tvlSource: data.tvl_source
      };
    } catch (error) {
      console.error(`Error analyzing route to ${targetPool.chain}:`, error);
      throw error;
    }
  },

  /**
   * Fetch current market average yield for a chain.
   * Used by the Advisor to compare current positions against opportunities.
   */
  getCurrentYield: async (chain: Chain): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/yield/${chain.toLowerCase()}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.current_yield;
    } catch (error) {
      console.error(`Failed to fetch current yield for ${chain}:`, error);
      throw error;
    }
  },

  /**
   * Fetch live native token price from CoinGecko via backend.
   * Used for wallet balance USD conversion.
   */
  getNativeTokenPrice: async (chain: string): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/price/${chain.toLowerCase()}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.price_usd;
    } catch (error) {
      console.error(`Failed to fetch price for ${chain}:`, error);
      throw error;
    }
  }
};
