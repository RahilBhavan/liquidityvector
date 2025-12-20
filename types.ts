
export enum Chain {
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Base = 'Base'
}

export interface Pool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  pool: string; // Unique ID
}

export interface GasCosts {
  [Chain.Ethereum]: number;
  [Chain.Arbitrum]: number;
  [Chain.Base]: number;
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

export interface RouteCalculation {
  targetPool: Pool;
  bridgeCost: number;
  gasCost: number;
  totalCost: number;
  breakevenHours: number;
  netProfit30d: number;
  riskLevel: number;
  bridgeName: string;
  estimatedTime: string;
  hasExploits: boolean;
  bridgeMetadata?: BridgeMetadata;
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