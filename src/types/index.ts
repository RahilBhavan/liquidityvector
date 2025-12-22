export enum Chain {
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Base = 'Base',
  Optimism = 'Optimism',
  Polygon = 'Polygon',
  Avalanche = 'Avalanche',
  BNBChain = 'BNB Chain',
}

export interface Pool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  pool: string;
}

export interface GasCosts {
  [Chain.Ethereum]: number;
  [Chain.Arbitrum]: number;
  [Chain.Base]: number;
  [Chain.Optimism]: number;
  [Chain.Polygon]: number;
  [Chain.Avalanche]: number;
  [Chain.BNBChain]: number;
}

export interface ExploitData {
  year: number;
  amount: string;
  description: string;
  reportUrl: string;
}

export interface BridgeMetadata {
  name: string;
  type: string;
  ageYears: number;
  tvl: number;
  hasExploits: boolean;
  baseTime: number;
  exploitData?: ExploitData;
}

export interface ChartDataPoint {
  day: number;
  profit: number;
}

export interface CostBreakdownEntry {
  bridgeFee: number;
  sourceGas: number;
  destGas: number;
  total: number;
}

export interface CostBreakdown {
  entry: CostBreakdownEntry;
  exit: CostBreakdownEntry;
  roundTripTotal: number;
}

export interface RouteCalculation {
  targetPool: Pool;
  bridgeCost: number;
  gasCost: number;
  totalCost: number;  // Now includes round-trip costs
  breakevenHours: number;
  netProfit30d: number;
  riskLevel: number;
  riskScore: number;  // 0-100 scale, higher is safer (from backend risk calculation)
  bridgeName: string;
  estimatedTime: string;
  hasExploits: boolean;
  bridgeMetadata?: BridgeMetadata;

  // NEW: Pre-calculated fields from backend
  dailyYieldUsd: number;
  breakevenDays: number;
  breakevenChartData: ChartDataPoint[];
  profitabilityMatrix: Record<string, Record<string, number>>;
  costBreakdown?: CostBreakdown;

  // NEW: Risk assessment details
  riskWarnings: string[];
  tvlSource: string;

  // Advanced Metrics for UI
  safetyScore: number; // 0-10
  impermanentLossRisk: 'None' | 'Low' | 'Medium' | 'High';
  auditStatus: 'Verified' | 'Unverified' | 'Warning';
}

export interface UserSettings {
  capital: number;
  currentChain: Chain;
  riskTolerance: number;
}

export interface AdvisorResponse {
  analysis: string;
  riskScore: number;
  recommendation: 'STRONG BUY' | 'HOLD' | 'CAUTION';
}
