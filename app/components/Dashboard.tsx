'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Pool, UserSettings, RouteCalculation, Chain } from '@/types';
import { apiService } from '@/lib/services/apiService';
import RouteCard from './RouteCard';
import Heatmap from './Heatmap';
import Advisor from './Advisor';
import BreakevenChart from './BreakevenChart';
import InfrastructureModal from './InfrastructureModal';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, Star, Zap, Waves, Globe, ArrowRightLeft, Landmark } from 'lucide-react';

interface DashboardProps {
  settings: UserSettings;
  setFetching: (val: boolean) => void;
  walletAddress?: `0x${string}`;
}

export default function Dashboard({ settings, setFetching, walletAddress }: DashboardProps) {
  const [routes, setRoutes] = useState<RouteCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedCount, setExcludedCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<RouteCalculation | null>(null);
  const ITEMS_PER_PAGE = 5;

  const calculateStrategies = useCallback(async () => {
    setLoading(true);
    setFetching(true);
    setError(null);
    setExcludedCount(0);

    if (!walletAddress) {
      setError("Please connect your wallet to view route calculations with accurate bridge quotes.");
      setLoading(false);
      setFetching(false);
      return;
    }

    try {
      const pools = await apiService.fetchTopPools();

      if (!pools || pools.length === 0) {
        throw new Error("No liquidity pools found via API.");
      }

      const potentialTargets = pools.filter(p => p.chain !== settings.currentChain);
      
      const analysisPromises = potentialTargets.map(pool => 
        apiService.analyze(settings.capital, settings.currentChain, pool, walletAddress)
      );

      const results = await Promise.allSettled(analysisPromises);
      
      const calculatedRoutes: RouteCalculation[] = [];
      let highRiskCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const route = result.value;
          calculatedRoutes.push(route);
          if (route.riskLevel > settings.riskTolerance) {
            highRiskCount++;
          }
        }
      });

      if (calculatedRoutes.length === 0) {
        throw new Error("Could not calculate valid routes. Check backend connectivity.");
      }

      calculatedRoutes.sort((a, b) => b.netProfit30d - a.netProfit30d);
      setRoutes(calculatedRoutes);
      setExcludedCount(highRiskCount);
      setCurrentPage(1);

    } catch (e) {
      console.error("Calculation failed", e);
      setError(e instanceof Error ? e.message : "Unable to retrieve protocol data.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [settings.capital, settings.currentChain, settings.riskTolerance, walletAddress, setFetching]);

  useEffect(() => {
    calculateStrategies();
  }, [calculateStrategies]);

  const bestRoute = useMemo(() => 
    routes.find(r => r.riskLevel <= settings.riskTolerance) || null
  , [routes, settings.riskTolerance]);

  const totalPages = useMemo(() => Math.ceil(routes.length / ITEMS_PER_PAGE), [routes.length]);
  
  const currentPageData = useMemo(() => 
    routes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  , [routes, currentPage]);

  const handlePrevPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage(prev => Math.min(totalPages, prev + 1)), [totalPages]);

  const getBridgeIcon = (type: string | undefined) => {
    switch (type) {
      case 'Canonical': return <Landmark className="w-4 h-4 text-secondary" />;
      case 'LayerZero': return <Globe className="w-4 h-4 text-secondary" />;
      case 'Liquidity': return <Waves className="w-4 h-4 text-secondary" />;
      case 'Intent': return <Zap className="w-4 h-4 text-secondary" />;
      default: return <ArrowRightLeft className="w-4 h-4 text-secondary" />;
    }
  };

  const renderStatusBadge = (riskLevel: number) => {
    if (riskLevel <= 2) return <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded-full">SECURE</span>;
    if (riskLevel === 3) return <span className="bg-warning/10 text-warning text-[10px] font-bold px-2 py-0.5 rounded-full">STABLE</span>;
    return <span className="bg-critical/10 text-critical text-[10px] font-bold px-2 py-0.5 rounded-full">ELEVATED</span>;
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-background animate-fade-in">
      <InfrastructureModal selectedRoute={selectedRoute} onClose={() => setSelectedRoute(null)} />

      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-primary tracking-tight">Market Analysis</h2>
            <p className="text-sm text-secondary font-medium">
              Real-time yield optimization across {Object.keys(Chain).length} major liquidity networks.
            </p>
          </div>
          <button
            onClick={calculateStrategies}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90 transition-all shadow-soft-md disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 rounded-3xl bg-surface border border-divider">
            <div className="w-10 h-10 border-4 border-divider border-t-accent rounded-full animate-spin mb-4"></div>
            <p className="text-secondary font-medium text-sm">Gathering protocol data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 rounded-3xl bg-surface border border-divider p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-critical" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Analysis Interrupted</h3>
            <p className="text-secondary text-sm max-w-md mb-8">{error}</p>
            <button
              onClick={calculateStrategies}
              className="px-8 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:opacity-90"
            >
              Retry Connection
            </button>
          </div>
        ) : bestRoute ? (
          <div className="space-y-10 animate-slide-up">
            {/* Primary Opportunity */}
            <RouteCard route={bestRoute} currentChain={settings.currentChain} />

            {/* Visual Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-base p-8">
                <BreakevenChart
                  migrationCost={bestRoute.totalCost}
                  dailyYieldDelta={bestRoute.dailyYieldUsd || (bestRoute.targetPool.apy / 100) * settings.capital / 365}
                  breakevenChartData={bestRoute.breakevenChartData}
                  breakevenDays={bestRoute.breakevenDays}
                />
              </div>
              <div className="card-base p-8">
                <Advisor route={bestRoute} settings={settings} />
              </div>
            </div>

            {/* Profitability Projection */}
            <div className="card-base p-8">
               <Heatmap route={bestRoute} capital={settings.capital} />
            </div>

            {/* Alternatives Table */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-primary tracking-tight">Alternative Vectors</h3>
              
              <div className="bg-surface rounded-2xl shadow-soft-sm border border-divider overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-secondary/50 border-b border-divider">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-secondary">Protocol</th>
                        <th className="px-6 py-4 font-semibold text-secondary">Network</th>
                        <th className="px-6 py-4 font-semibold text-secondary">Bridge Infrastructure</th>
                        <th className="px-6 py-4 font-semibold text-secondary text-right">APY</th>
                        <th className="px-6 py-4 font-semibold text-secondary text-right">Total Cost</th>
                        <th className="px-6 py-4 font-semibold text-secondary text-right">30d Projection</th>
                        <th className="px-6 py-4 font-semibold text-secondary text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {currentPageData.map((r, i) => {
                        const isBest = r === bestRoute;
                        const isHighRisk = r.riskLevel > settings.riskTolerance;
                        return (
                          <tr
                            key={i}
                            onClick={() => setSelectedRoute(r)}
                            className={`cursor-pointer transition-colors hover:bg-surface-secondary/30 ${isBest ? 'bg-accent/5' : ''} ${isHighRisk ? 'opacity-60' : ''}`}
                          >
                            <td className="px-6 py-5 font-semibold text-primary">
                              <div className="flex items-center gap-2">
                                {r.targetPool.project}
                                {isBest && <Star className="w-4 h-4 text-accent fill-current" />}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-secondary font-medium">{r.targetPool.chain}</td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2 text-secondary">
                                    {getBridgeIcon(r.bridgeMetadata?.type)}
                                    <span className="font-medium">{r.bridgeName}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-right font-bold text-success">{r.targetPool.apy.toFixed(2)}%</td>
                            <td className="px-6 py-5 text-right text-secondary font-medium">${r.totalCost.toFixed(2)}</td>
                            <td className="px-6 py-5 text-right font-bold text-primary">
                              ${r.netProfit30d.toFixed(2)}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex justify-center">
                                 {renderStatusBadge(r.riskLevel)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-divider bg-surface-secondary/20">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold text-secondary hover:text-primary transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-[10px] font-bold text-secondary tracking-widest uppercase">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold text-secondary hover:text-primary transition-colors disabled:opacity-30"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 rounded-3xl bg-surface border border-dashed border-divider">
            <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mb-4 shadow-soft-sm">
              <ShieldCheck className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">No Secure Vectors Found</h3>
            <p className="text-sm text-secondary max-w-xs text-center">
              Adjust your capital or risk settings to view more opportunities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

