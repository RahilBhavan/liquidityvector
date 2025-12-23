import { Chain, Pool, RouteCalculation, ChartDataPoint, BridgeMetadata, CostBreakdown } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

if (typeof window !== 'undefined') {
  console.log('[LiquidityVector] API Configured:', API_BASE_URL);
  if (API_BASE_URL.includes('localhost') && window.location.hostname !== 'localhost') {
    console.warn('⚠️ Using localhost API in production! Set NEXT_PUBLIC_API_BASE_URL env var.');
  }
}

// Cache configuration
const CACHE_TTL_MS = 30_000; // 30 seconds
const MAX_CACHE_ENTRIES = 100;

interface BackendPoolResponse {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  pool: string;
}

interface BackendBridgeMetadata {
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
}

interface BackendCostBreakdown {
  entry: { bridge_fee: number; source_gas: number; dest_gas: number; total: number };
  exit: { bridge_fee: number; source_gas: number; dest_gas: number; total: number };
  round_trip_total: number;
}

interface BackendRouteResponse {
  target_pool: BackendPoolResponse;
  bridge_cost: number;
  gas_cost: number;
  total_cost: number;
  breakeven_hours: number;
  net_profit_30d: number;
  risk_level: number;
  risk_score: number;  // 0-100 scale, higher is safer
  bridge_name: string;
  estimated_time: string;
  has_exploits: boolean;
  bridge_metadata: BackendBridgeMetadata | null;
  daily_yield_usd: number;
  breakeven_days: number;
  breakeven_chart_data: Array<{ day: number; profit: number }>;
  profitability_matrix: Record<string, Record<string, number>>;
  cost_breakdown?: BackendCostBreakdown;
  risk_warnings: string[];
  tvl_source: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Type-safe cache implementation
class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    // Prevent cache from growing unbounded
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new ApiCache();

/**
 * Transform backend bridge metadata to frontend format
 */
function transformBridgeMetadata(data: BackendBridgeMetadata | null): BridgeMetadata | undefined {
  if (!data) return undefined;

  return {
    name: data.name,
    type: data.type,
    ageYears: data.age_years,
    tvl: data.tvl,
    hasExploits: data.has_exploits,
    baseTime: data.base_time,
    exploitData: data.exploit_data ? {
      year: data.exploit_data.year,
      amount: data.exploit_data.amount,
      description: data.exploit_data.description,
      reportUrl: data.exploit_data.report_url
    } : undefined
  };
}

/**
 * Transform backend cost breakdown to frontend format
 */
function transformCostBreakdown(data: BackendCostBreakdown | undefined): CostBreakdown | undefined {
  if (!data) return undefined;

  return {
    entry: {
      bridgeFee: data.entry.bridge_fee,
      sourceGas: data.entry.source_gas,
      destGas: data.entry.dest_gas,
      total: data.entry.total
    },
    exit: {
      bridgeFee: data.exit.bridge_fee,
      sourceGas: data.exit.source_gas,
      destGas: data.exit.dest_gas,
      total: data.exit.total
    },
    roundTripTotal: data.round_trip_total
  };
}

/**
 * Calculate V-Score (Vector Safety Score)
 * A risk-decisive metric emphasizing TVL depth and security history.
 */
function calculateVScore(pool: BackendPoolResponse, metadata?: BackendBridgeMetadata) {
  let score = 10.0;

  // 1. TVL Factor (Logarithmic Scaling)
  // High TVL (> $100M) is safer. Low TVL (< $1M) is risky.
  const tvl = pool.tvlUsd;
  let tvlFactor = 0;

  if (tvl >= 100_000_000) tvlFactor = 0; // No penalty
  else if (tvl >= 10_000_000) tvlFactor = -0.5; // Slight penalty
  else if (tvl >= 1_000_000) tvlFactor = -2.0; // Moderate penalty
  else tvlFactor = -4.0; // Severe penalty for low liquidity

  score += tvlFactor;

  // 2. Audit Factor
  // Assuming pools from backend might have audit data, or we infer from hacks.
  // For this mock, we assume 'Verified' is standard unless flagged.
  let auditFactor = 0;
  // We don't have direct audit field on pool, so we infer from general risk_level for now
  // If we had it: if (!pool.verified) auditFactor = -2.0;

  // 3. Time/Age Factor (Lindy Effect)
  // Older bridges are safer.
  let timeFactor = 0;
  if (metadata) {
    if (metadata.age_years < 1) timeFactor = -2.0; // New bridge risk
    else if (metadata.age_years >= 4) timeFactor = +0.5; // Battle-tested bonus
  }
  score += timeFactor;

  // 4. Exploit Penalty
  let exploitPenalty = 0;
  if (metadata?.has_exploits) {
    exploitPenalty = -5.0; // Major penalty for history of hacks
    score += exploitPenalty;
  }

  // Clamp score between 0 and 10
  score = Math.min(Math.max(score, 0), 10);

  return {
    total: parseFloat(score.toFixed(1)),
    tvlFactor,
    auditFactor,
    timeFactor,
    exploitPenalty
  };
}

/**
 * Transform backend route response to frontend format
 */
function transformRouteResponse(data: BackendRouteResponse): RouteCalculation {
  const vScore = calculateVScore(data.target_pool, data.bridge_metadata || undefined);

  // --- Advanced Metrics Calculation ---
  // 1. Estimate Annual Impermanent Loss
  let annualIL = 0;
  if (data.target_pool.symbol.includes('USD') && data.target_pool.project.includes('Stable')) annualIL = 0; // Stable
  else if (data.target_pool.symbol.includes('ETH') && data.target_pool.symbol.includes('BTC')) annualIL = 1.5; // Correlated
  else annualIL = 5.7; // Volatile (Standard 2x divergence estimate)

  // 2. Risk-Adjusted APY
  const riskAdjustedApy = Math.max(0, data.target_pool.apy - annualIL);

  // 3. Efficiency Score: (30d Net Profit / Total Upfront Cost) * 100
  // Measures "Return on Cost Speed"
  const efficiencyScore = data.total_cost > 0 ? (data.net_profit_30d / data.total_cost) * 100 : 0;

  return {
    targetPool: data.target_pool,
    bridgeCost: data.bridge_cost,
    gasCost: data.gas_cost,
    totalCost: data.total_cost,
    breakevenHours: data.breakeven_hours,
    netProfit30d: data.net_profit_30d,
    riskLevel: data.risk_level,
    riskScore: data.risk_score,
    bridgeName: data.bridge_name,
    estimatedTime: data.estimated_time,
    hasExploits: data.has_exploits,
    bridgeMetadata: transformBridgeMetadata(data.bridge_metadata),
    dailyYieldUsd: data.daily_yield_usd,
    breakevenDays: data.breakeven_days,
    breakevenChartData: data.breakeven_chart_data,
    profitabilityMatrix: data.profitability_matrix,
    costBreakdown: transformCostBreakdown(data.cost_breakdown),
    riskWarnings: data.risk_warnings,
    tvlSource: data.tvl_source,

    // Mocking Advanced Metrics until backend is fully updated
    safetyScore: vScore.total,
    impermanentLossRisk: (data.target_pool.symbol.includes('USD') && data.target_pool.project.includes('Stable')) ? 'None' :
      (data.target_pool.symbol.includes('ETH') && data.target_pool.symbol.includes('BTC')) ? 'Low' :
        'Medium',
    auditStatus: data.has_exploits ? 'Warning' : 'Verified',

    // New Advanced Metrics
    riskAdjustedApy: parseFloat(riskAdjustedApy.toFixed(2)),
    capitalEfficiencyScore: parseFloat(efficiencyScore.toFixed(0)),

    vScoreBreakdown: vScore,

    steps: [
      `Bridge USDC to ${data.target_pool.chain} via ${data.bridge_name}`,
      `Swap USDC for ${data.target_pool.symbol} on aggregator`,
      `Deposit ${data.target_pool.symbol} into ${data.target_pool.project}`,
      `Stake LP tokens for auto-compounding rewards`
    ]
  };
}

export const apiService = {
  /**
   * Fetch top USDC yield pools from backend
   */
  fetchTopPools: async (): Promise<Pool[]> => {
    const cacheKey = 'top_pools';
    const cached = cache.get<Pool[]>(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/pools`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: Pool[] = await response.json();
    cache.set(cacheKey, data);
    return data;
  },

  /**
   * Analyze a cross-chain route for profitability
   */
  analyze: async (
    capital: number,
    currentChain: Chain,
    targetPool: Pool,
    walletAddress: string
  ): Promise<RouteCalculation> => {
    if (!walletAddress) {
      throw new Error("Wallet address required for route analysis");
    }

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      console.error("API Analysis Error:", response.status, response.statusText, errorData);
      throw new Error(errorData.detail || errorData.error || `Analysis failed: ${response.status} ${response.statusText}`);
    }

    const data: BackendRouteResponse = await response.json();
    return transformRouteResponse(data);
  },

  /**
   * Fetch current market average yield for a chain
   */
  getCurrentYield: async (chain: Chain): Promise<number> => {
    const cacheKey = `yield_${chain}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const response = await fetch(`${API_BASE_URL}/yield/${chain.toLowerCase()}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    cache.set(cacheKey, data.current_yield);
    return data.current_yield;
  },

  /**
   * Fetch live native token price from backend
   */
  getNativeTokenPrice: async (chain: string): Promise<number> => {
    const cacheKey = `price_${chain}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    // Normalize chain name: convert to lowercase and handle special cases
    let normalizedChain = chain.toLowerCase().trim();
    // Handle "BNB Chain" -> "bnb chain" (backend expects this format)
    if (normalizedChain === 'bnb chain') {
      normalizedChain = 'bnb chain';
    }

    // Encode the chain name for URL
    const encodedChain = encodeURIComponent(normalizedChain);
    const response = await fetch(`${API_BASE_URL}/price/${encodedChain}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // If not JSON, use the text or statusText
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    cache.set(cacheKey, data.price_usd);
    return data.price_usd;
  },

  /**
   * Clear all cached data
   */
  clearCache: (): void => {
    cache.clear();
  }
};
