'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Pool, UserSettings, RouteCalculation, Chain } from '@/types';
import { apiService } from '@/lib/services/apiService';
import RouteCard from './RouteCard';
import Heatmap from './Heatmap';
import Advisor from './Advisor';
import BreakevenChart from './BreakevenChart';
import InfrastructureModal from './InfrastructureModal';
import TextReveal from './ui/TextReveal';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Star, Zap, Waves, Globe, ArrowRightLeft, Landmark } from 'lucide-react';

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
      case 'Canonical': return <Landmark className="w-4 h-4" />;
      case 'LayerZero': return <Globe className="w-4 h-4" />;
      case 'Liquidity': return <Waves className="w-4 h-4" />;
      case 'Intent': return <Zap className="w-4 h-4" />;
      default: return <ArrowRightLeft className="w-4 h-4" />;
    }
  };

  const renderRiskBar = (riskLevel: number) => {
    const totalBars = 5;
    return (
      <div className="flex font-mono text-[10px]">
        {'|'.repeat(riskLevel)}
        <span className="opacity-20">{'|'.repeat(totalBars - riskLevel)}</span>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-bit-bg text-bit-fg font-mono relative">
      <InfrastructureModal selectedRoute={selectedRoute} onClose={() => setSelectedRoute(null)} />

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b-2 border-bit-fg pb-4 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-pixel uppercase mb-2">
            <TextReveal text="Protocol Analysis" speed={50} />
          </h2>
          <p className="text-xs font-bold uppercase opacity-80">
            SCANNING {Object.keys(Chain).length} NETWORKS FOR ARBITRAGE VECTORS.
          </p>
        </div>
        <button
          onClick={calculateStrategies}
          disabled={loading}
          className="btn-1bit flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'SCANNING...' : 'FETCH_DATA'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-bit-fg animate-scanline relative overflow-hidden">
          <div className="w-16 h-16 loading-1bit mb-4 border-2 border-bit-fg"></div>
          <p className="font-pixel text-xs uppercase animate-pulse">
            <TextReveal text="QUERYING_CHAIN_DATA..." speed={30} delay={200} />
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-bit-fg pattern-checker p-6 text-center bg-bit-bg">
          <div className="w-16 h-16 bg-bit-bg border-2 border-bit-fg flex items-center justify-center mb-4 shadow-hard">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="font-pixel text-lg mb-2 uppercase bg-bit-bg px-2">Connection Error</h3>
          <p className="text-sm max-w-md mb-8 bg-bit-bg px-2 border-2 border-bit-fg">{error}</p>
          <button
            onClick={calculateStrategies}
            className="btn-1bit"
          >
            RETRY_CONNECTION
          </button>
        </div>
      ) : bestRoute ? (
        <div className="space-y-8 animate-entry">
          <div className="animate-entry" style={{ animationDelay: '0.1s' }}>
            <RouteCard route={bestRoute} currentChain={settings.currentChain} />
          </div>

          <div className="animate-entry" style={{ animationDelay: '0.2s' }}>
            <BreakevenChart
              migrationCost={bestRoute.totalCost}
              dailyYieldDelta={bestRoute.dailyYieldUsd || (bestRoute.targetPool.apy / 100) * settings.capital / 365}
              breakevenChartData={bestRoute.breakevenChartData}
              breakevenDays={bestRoute.breakevenDays}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="animate-entry" style={{ animationDelay: '0.3s' }}>
              <Heatmap route={bestRoute} capital={settings.capital} />
            </div>
            <div className="animate-entry" style={{ animationDelay: '0.4s' }}>
              <Advisor route={bestRoute} settings={settings} />
            </div>
          </div>

          <div className="mt-12 animate-entry" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-4 border-l-4 border-bit-fg pl-4">
              <h3 className="text-xl font-pixel uppercase">Alternative Vectors</h3>
            </div>

            <div className="bg-bit-bg border-2 border-bit-fg overflow-x-auto shadow-hard custom-scrollbar">
              <table className="w-full text-left text-xs uppercase min-w-[800px]">
                <thead className="bg-bit-fg text-bit-bg font-bold border-b-2 border-bit-fg">
                  <tr>
                    <th className="px-4 py-3">Protocol</th>
                    <th className="px-4 py-3">Chain</th>
                    <th className="px-4 py-3">Bridge</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3 text-right">APY</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-right">Risk</th>
                    <th className="px-4 py-3 text-right">Net(30d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-bit-fg font-mono font-bold">
                  {currentPageData.map((r, i) => {
                    const isHighRisk = r.riskLevel > settings.riskTolerance;
                    const isBest = r === bestRoute;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedRoute(r)}
                        className={`cursor-pointer hover:bg-bit-fg hover:text-bit-bg group transition-colors ${isBest ? 'pattern-stipple-light' : ''}`}
                        style={{ animationDelay: `${0.1 * i}s` }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {r.targetPool.project}
                              {isBest && <Star className="w-3 h-3 fill-current" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{r.targetPool.chain}</td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                                {getBridgeIcon(r.bridgeMetadata?.type)}
                                {r.bridgeName}
                            </div>
                        </td>
                        <td className="px-4 py-3">{r.estimatedTime}</td>
                        <td className="px-4 py-3 text-right">{r.targetPool.apy.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right">${r.totalCost.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                             {isHighRisk && <ShieldAlert className="w-3 h-3 text-bit-accent animate-pulse" />}
                             {renderRiskBar(r.riskLevel)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          ${r.netProfit30d.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-2 border-t-2 border-bit-fg bg-bit-bg">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 font-bold uppercase disabled:opacity-50 hover:bg-bit-fg hover:text-bit-bg"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span className="font-bold">
                    PAGE {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 font-bold uppercase disabled:opacity-50 hover:bg-bit-fg hover:text-bit-bg"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-bit-fg">
          <div className="w-16 h-16 border-2 border-bit-fg flex items-center justify-center mx-auto mb-4 shadow-hard">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <p className="font-pixel mb-2">NO ROUTES FOUND</p>
          <p className="text-xs uppercase">
            {excludedCount > 0 ? `${excludedCount} ROUTES EXCLUDED BY RISK FILTER.` : 'ADJUST PARAMETERS.'}
          </p>
        </div>
      )}
    </div>
  );
}
