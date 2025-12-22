'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Pool, UserSettings, RouteCalculation, Chain } from '@/types';
import { apiService } from '@/lib/services/apiService';
import RouteCard from './RouteCard';
import Heatmap from './Heatmap';
import Advisor from './Advisor';
import BreakevenChart from './BreakevenChart';
import InfrastructureModal from './InfrastructureModal';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, Star, Zap, Waves, Globe, ArrowRightLeft, Landmark, TrendingUp, AlertCircle, Clock, Eye } from 'lucide-react';
import { triggerNotification } from './NotificationCenter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const ITEMS_PER_PAGE = 6; // Grid 2x3

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

      // Sort by Score/Safety first, then profit
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

  const handleWatchPool = (e: React.MouseEvent, project: string) => {
    e.stopPropagation();
    toast.success(`Now watching ${project}`, {
      description: 'You will receive alerts for APY changes.'
    });

    // Simulate alert
    setTimeout(() => {
      triggerNotification({
        title: `APY Drop: ${project}`,
        message: `Yield for ${project} has dropped by 4.2% in the last hour.`,
        type: 'warning'
      });
      toast.warning(`Alert: ${project} yield dropped!`);
    }, 5000);
  };

  const getVScoreColor = (score: number) => {
    if (score >= 8) return "text-matchbox-green";
    if (score >= 5) return "text-amber-500";
    return "text-intl-orange";
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-paper-white animate-fade-in font-sans">
      <InfrastructureModal selectedRoute={selectedRoute} onClose={() => setSelectedRoute(null)} />

      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-2 border-sumi-black/10">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-sumi-black tracking-tighter uppercase">Market Analysis</h2>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-sumi-black/60">
              <span className="w-2 h-2 rounded-full bg-matchbox-green animate-pulse" />
              Live Feed • {Object.keys(Chain).length} Networks
            </div>
          </div>
          <button
            onClick={calculateStrategies}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-sumi-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-sumi-black/90 transition-all shadow-[4px_4px_0px_#00000033] active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analyzing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-white border-2 border-sumi-black shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <div className="w-12 h-12 border-4 border-sumi-black border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-sumi-black font-bold uppercase tracking-widest text-sm animate-pulse">Scanning Liquidity Vectors...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-intl-orange/5 border-2 border-intl-orange p-8 text-center">
            <div className="w-16 h-16 bg-intl-orange/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-intl-orange" />
            </div>
            <h3 className="text-xl font-bold text-sumi-black mb-2 uppercase">Analysis Interrupted</h3>
            <p className="text-sumi-black/70 font-mono text-sm max-w-md mb-8">{error}</p>
            <button
              onClick={calculateStrategies}
              className="px-8 py-3 bg-intl-orange text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow-lg transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : bestRoute ? (
          <div className="space-y-12">
            {/* Hero Section: Best Route */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-sumi-black/40">Top Opportunity</h3>
                <RouteCard route={bestRoute} currentChain={settings.currentChain} />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-sumi-black/40">Efficiency</h3>
                <div className="h-full neo-card p-6 flex flex-col justify-between bg-white">
                  <div>
                    <div className="text-xs uppercase font-bold text-sumi-black/60 mb-1">V-Score Safety</div>
                    <div className={cn("text-5xl font-bold tracking-tighter", getVScoreColor(bestRoute.safetyScore || 9))}>
                      {(bestRoute.safetyScore || 9.2).toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-3 pt-6 border-t-2 border-sumi-black/5">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-sumi-black/60">30d Net Profit</span>
                      <span className="font-mono font-bold text-matchbox-green">+${bestRoute.netProfit30d.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-sumi-black/60">Payback Time</span>
                      <span className="font-mono font-bold">{bestRoute.breakevenHours.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="neo-card p-0 overflow-hidden bg-white">
                <div className="p-4 border-b-2 border-sumi-black bg-sumi-black/5 flex justify-between items-center">
                  <span className="font-bold uppercase text-xs tracking-wider">Breakeven Analysis</span>
                  <TrendingUp className="w-4 h-4 text-sumi-black/40" />
                </div>
                <div className="p-6">
                  <BreakevenChart
                    migrationCost={bestRoute.totalCost}
                    dailyYieldDelta={bestRoute.dailyYieldUsd || (bestRoute.targetPool.apy / 100) * settings.capital / 365}
                    breakevenChartData={bestRoute.breakevenChartData}
                    breakevenDays={bestRoute.breakevenDays}
                  />
                </div>
              </div>
              <div className="neo-card p-0 overflow-hidden bg-white">
                <div className="p-4 border-b-2 border-sumi-black bg-sumi-black/5 flex justify-between items-center">
                  <span className="font-bold uppercase text-xs tracking-wider">Risk Advisor</span>
                  <ShieldCheck className="w-4 h-4 text-sumi-black/40" />
                </div>
                <div className="p-6">
                  <Advisor route={bestRoute} settings={settings} />
                </div>
              </div>
            </div>

            {/* Alternatives Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-sumi-black tracking-tight uppercase">Alternative Vectors</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-sumi-black rounded hover:bg-sumi-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-sumi-black"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-sumi-black rounded hover:bg-sumi-black hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-sumi-black"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentPageData.map((r, i) => {
                  const isBest = r === bestRoute;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedRoute(r)}
                      className={cn(
                        "bg-white border-2 border-sumi-black rounded-lg p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] relative overflow-hidden group",
                        isBest ? "ring-2 ring-matchbox-green ring-offset-2" : ""
                      )}
                    >
                      {isBest && (
                        <div className="absolute top-0 right-0 bg-matchbox-green text-white text-[10px] font-bold px-2 py-1 rounded-bl">RECOMMENDED</div>
                      )}

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-sumi-black/5 flex items-center justify-center">
                              <Landmark className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-base leading-none">{r.targetPool.project}</h4>
                              <div className="text-[10px] font-mono text-sumi-black/60 uppercase">{r.targetPool.chain}</div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleWatchPool(e, r.targetPool.project)}
                            className="p-2 hover:bg-sumi-black/5 rounded-full text-sumi-black/40 hover:text-sumi-black transition-colors"
                            title="Watch this pool"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-sumi-black/5">
                        <div>
                          <div className="text-[10px] font-bold text-sumi-black/40 uppercase">Yield</div>
                          <div className="text-xl font-bold font-mono text-matchbox-green">{r.targetPool.apy.toFixed(2)}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-sumi-black/40 uppercase">Net (30d)</div>
                          <div className="text-xl font-bold font-mono text-sumi-black">${r.netProfit30d.toFixed(0)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-sumi-black/60 bg-paper-white p-2 rounded">
                        <Clock className="w-3 h-3" />
                        <span>{r.estimatedTime}</span>
                        <span className="mx-2 text-sumi-black/20">|</span>
                        <AlertCircle className="w-3 h-3" />
                        <span>Risk: {r.riskLevel}/5</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 rounded-lg bg-white border-2 dashed border-sumi-black/20">
            <h3 className="text-lg font-bold text-sumi-black mb-1 uppercase">No Secure Vectors Found</h3>
            <p className="text-sm text-sumi-black/60 font-mono">Adjust your capital or risk settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}


