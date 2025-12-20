'use client';

import { useEffect, useState } from 'react';
import { Pool, UserSettings, RouteCalculation, Chain } from '@/types';
import { apiService } from '@/lib/services/apiService';
import RouteCard from './RouteCard';
import Heatmap from './Heatmap';
import Advisor from './Advisor';
import BreakevenChart from './BreakevenChart';
import { RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Star, X, Info, Layers, History, Lock, Zap, Waves, Globe, ArrowRightLeft, ExternalLink, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  settings: UserSettings;
  setFetching: (val: boolean) => void;
  walletAddress?: `0x${string}`;
}

export default function Dashboard({ settings, setFetching, walletAddress }: DashboardProps) {
  const [routes, setRoutes] = useState<RouteCalculation[]>([]);
  const [bestRoute, setBestRoute] = useState<RouteCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedCount, setExcludedCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRoute, setSelectedRoute] = useState<RouteCalculation | null>(null);
  const ITEMS_PER_PAGE = 5;

  const calculateStrategies = async () => {
    setLoading(true);
    setFetching(true);
    setError(null);
    setExcludedCount(0);

    // Require wallet connection for bridge quotes
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
      const calculatedRoutes: RouteCalculation[] = [];
      let highRiskCount = 0;

      const analysisPromises = potentialTargets.map(async (pool) => {
        try {
          return await apiService.analyze(settings.capital, settings.currentChain, pool, walletAddress);
        } catch (err) {
          console.warn(`Failed to analyze route for ${pool.project} on ${pool.chain}`, err);
          return null;
        }
      });

      const results = await Promise.all(analysisPromises);

      for (const route of results) {
        if (!route) continue;

        calculatedRoutes.push(route);
        if (route.riskLevel > settings.riskTolerance) {
          highRiskCount++;
        }
      }

      if (calculatedRoutes.length === 0) {
        throw new Error("Could not calculate valid routes from backend data.");
      }

      calculatedRoutes.sort((a, b) => b.netProfit30d - a.netProfit30d);
      setRoutes(calculatedRoutes);

      const bestCompliant = calculatedRoutes.find(r => r.riskLevel <= settings.riskTolerance);
      setBestRoute(bestCompliant || null);

      setExcludedCount(highRiskCount);
      setCurrentPage(1);

    } catch (e) {
      console.error("Calculation failed", e);
      setError("Unable to retrieve protocol data. Please ensure the backend API (port 8000) is running.");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    calculateStrategies();
  }, [settings.currentChain, settings.capital, settings.riskTolerance, walletAddress]);

  const allAlternatives = bestRoute ? routes : [];
  const totalPages = Math.ceil(allAlternatives.length / ITEMS_PER_PAGE);
  const currentPageData = allAlternatives.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const getBridgeIcon = (type: string | undefined) => {
    switch (type) {
      case 'Canonical': return <span title="Canonical Infrastructure"><Landmark className="w-4 h-4" /></span>;
      case 'LayerZero': return <span title="LayerZero Protocol"><Globe className="w-4 h-4" /></span>;
      case 'Liquidity': return <span title="Liquidity Network"><Waves className="w-4 h-4" /></span>;
      case 'Intent': return <span title="Intent Solver"><Zap className="w-4 h-4" /></span>;
      default: return <span title="Bridge"><ArrowRightLeft className="w-4 h-4" /></span>;
    }
  };

  const getBridgeRiskColor = (riskLevel: number) => {
    if (riskLevel <= 2) return 'bg-green-100 text-green-800 border-green-200';
    if (riskLevel === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 md:p-12 h-full overflow-y-auto bg-[#F9F9F5]">
      <AnimatePresence>
        {selectedRoute && selectedRoute.bridgeMetadata && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#371E7B]/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-2 border-[#371E7B] w-full max-w-lg shadow-[12px_12px_0px_0px_#371E7B] relative flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-[#371E7B] text-white p-4 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-['Space_Grotesk'] font-bold text-xl uppercase flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#CCFF00]" />
                  Infrastructure Analysis
                </h3>
                <button onClick={() => setSelectedRoute(null)} className="hover:text-[#CCFF00] transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between border-b-2 border-[#371E7B]/10 pb-4">
                  <div>
                    <h4 className="text-3xl font-bold text-[#371E7B] font-['Space_Grotesk']">
                      {selectedRoute.bridgeMetadata.name}
                    </h4>
                    <span className="text-sm font-mono text-[#371E7B]/70 uppercase tracking-widest font-bold">
                      Primary Bridging Infrastructure
                    </span>
                  </div>
                  {selectedRoute.hasExploits && (
                    <div className="bg-red-50 border border-red-600 text-red-600 px-3 py-1 text-xs font-bold uppercase flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Security Flagged
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F9F9F5] border border-[#371E7B] p-4">
                    <div className="flex items-center gap-2 text-[#371E7B]/60 text-xs font-bold uppercase mb-1">
                      <Layers className="w-4 h-4" /> Architecture
                    </div>
                    <div className="text-xl font-bold text-[#371E7B] font-mono flex items-center gap-2">
                      {getBridgeIcon(selectedRoute.bridgeMetadata.type)}
                      {selectedRoute.bridgeMetadata.type}
                    </div>
                  </div>
                  <div className="bg-[#F9F9F5] border border-[#371E7B] p-4">
                    <div className="flex items-center gap-2 text-[#371E7B]/60 text-xs font-bold uppercase mb-1">
                      <Lock className="w-4 h-4" /> TVL (Liquidity)
                    </div>
                    <div className="text-xl font-bold text-[#371E7B] font-mono">
                      ${selectedRoute.bridgeMetadata.tvl}M+
                    </div>
                  </div>
                  <div className="bg-[#F9F9F5] border border-[#371E7B] p-4">
                    <div className="flex items-center gap-2 text-[#371E7B]/60 text-xs font-bold uppercase mb-1">
                      <History className="w-4 h-4" /> Protocol Age
                    </div>
                    <div className="text-xl font-bold text-[#371E7B] font-mono">
                      {selectedRoute.bridgeMetadata.ageYears} Years
                    </div>
                  </div>
                  <div className="bg-[#F9F9F5] border border-[#371E7B] p-4">
                    <div className="flex items-center gap-2 text-[#371E7B]/60 text-xs font-bold uppercase mb-1">
                      <ShieldCheck className="w-4 h-4" /> Vector Score
                    </div>
                    <div className="text-xl font-bold text-[#371E7B] font-mono">
                      {selectedRoute.riskLevel <= 2 ? 'High Security' : selectedRoute.riskLevel <= 4 ? 'Standard' : 'Elevated Risk'}
                    </div>
                  </div>
                </div>

                {selectedRoute.hasExploits && selectedRoute.bridgeMetadata.exploitData && (
                  <div className="bg-red-50 border-2 border-red-200 p-6">
                    <h5 className="flex items-center gap-2 text-red-700 font-bold uppercase tracking-wide font-['Space_Grotesk'] mb-4">
                      <AlertTriangle className="w-5 h-5" /> Critical Security History
                    </h5>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-red-500 mb-1">Year of Incident</span>
                        <span className="font-mono font-bold text-red-900 text-lg">{selectedRoute.bridgeMetadata.exploitData.year}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-red-500 mb-1">Assets Compromised</span>
                        <span className="font-mono font-bold text-red-900 text-lg">{selectedRoute.bridgeMetadata.exploitData.amount}</span>
                      </div>
                    </div>
                    <p className="text-sm text-red-800 font-mono mb-6 leading-relaxed border-t border-red-200 pt-2">
                      {selectedRoute.bridgeMetadata.exploitData.description}
                    </p>
                    <a
                      href={selectedRoute.bridgeMetadata.exploitData.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 font-bold uppercase text-xs tracking-wider border border-red-300 transition-colors"
                    >
                      View On-Chain Report <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="text-xs font-mono text-[#371E7B]/70 leading-relaxed border-t-2 border-[#371E7B]/10 pt-4">
                  Disclaimer: Metadata is simulated for demonstration. Always verify official audits and bug bounty status before bridging substantial capital.
                </div>
              </div>

              <div className="p-4 bg-[#F9F9F5] border-t-2 border-[#371E7B] flex justify-end">
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="bg-[#371E7B] text-white font-bold font-mono px-6 py-2 uppercase hover:bg-[#4C2A9E] transition-colors shadow-[4px_4px_0px_0px_#CCFF00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#CCFF00]"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end justify-between mb-10 border-b-2 border-[#371E7B] pb-4">
        <div>
          <h2 className="text-4xl font-bold text-[#371E7B] mb-2 font-['Space_Grotesk'] uppercase">Protocol Analysis</h2>
          <p className="text-[#371E7B] font-mono text-sm opacity-80">SCANNING {Object.keys(Chain).length} NETWORKS FOR ARBITRAGE VECTORS.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={calculateStrategies}
          disabled={loading}
          className={`flex items-center gap-3 px-6 py-3 border-2 border-[#371E7B] transition-all font-bold uppercase tracking-wider font-mono
            ${loading
              ? 'bg-[#E5E5E0] text-[#371E7B] cursor-wait shadow-[2px_2px_0px_0px_#371E7B] opacity-80'
              : 'bg-white hover:bg-[#CCFF00] text-[#371E7B] shadow-[4px_4px_0px_0px_#371E7B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#CCFF00]'
            }`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Scanning...' : 'Fetch Data'}</span>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#371E7B]"
          >
            <div className="w-16 h-16 border-4 border-[#371E7B] border-t-[#CCFF00] rounded-full animate-spin mb-4"></div>
            <p className="text-[#371E7B] font-mono uppercase tracking-widest">Querying Chain Data...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#371E7B] bg-red-50/50 p-6 text-center"
          >
            <div className="w-16 h-16 bg-[#371E7B] flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#CCFF00]">
              <AlertTriangle className="w-8 h-8 text-[#CCFF00]" />
            </div>
            <h3 className="text-[#371E7B] font-bold text-xl mb-2 font-['Space_Grotesk'] uppercase tracking-widest">Connection Error</h3>
            <p className="text-[#371E7B] font-mono text-sm max-w-md mb-8">{error}</p>
            <button
              onClick={calculateStrategies}
              className="px-8 py-3 bg-[#371E7B] text-white font-bold font-mono uppercase hover:bg-[#4C2A9E] transition-all shadow-[4px_4px_0px_0px_#CCFF00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#CCFF00]"
            >
              Retry Connection
            </button>
          </motion.div>
        ) : bestRoute ? (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={itemVariants}>
              <RouteCard route={bestRoute} currentChain={settings.currentChain} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <BreakevenChart
                migrationCost={bestRoute.totalCost}
                dailyYieldDelta={(bestRoute.targetPool.apy / 100) * settings.capital / 365}
              />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div variants={itemVariants}>
                <Heatmap route={bestRoute} capital={settings.capital} />
              </motion.div>
              <motion.div variants={itemVariants}>
                <Advisor route={bestRoute} settings={settings} />
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="mt-12">
              <div className="flex items-center justify-between mb-6 border-l-4 border-[#CCFF00] pl-4">
                <h3 className="text-2xl font-bold text-[#371E7B] font-['Space_Grotesk'] uppercase">Alternative Vectors</h3>
              </div>

              <div className="bg-white border-2 border-[#371E7B] overflow-x-auto shadow-[8px_8px_0px_0px_#371E7B]/20">
                <table className="w-full text-left text-sm text-[#371E7B]">
                  <thead className="bg-[#371E7B] text-[#F9F9F5] uppercase font-bold tracking-wider font-['Space_Grotesk']">
                    <tr>
                      <th className="px-6 py-4">Protocol</th>
                      <th className="px-6 py-4">Chain</th>
                      <th className="px-6 py-4">Bridge Name</th>
                      <th className="px-6 py-4">Est. Time</th>
                      <th className="px-6 py-4 text-right">APY</th>
                      <th className="px-6 py-4 text-right">Cost</th>
                      <th className="px-6 py-4 text-right">Risk</th>
                      <th className="px-6 py-4 text-right">Net (30d)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-[#371E7B] font-mono">
                    {currentPageData.map((r, i) => {
                      const isHighRisk = r.riskLevel > settings.riskTolerance;
                      const isBest = r === bestRoute;
                      return (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setSelectedRoute(r)}
                          className={`transition-colors border-l-4 cursor-pointer relative group ${isHighRisk
                            ? 'bg-gray-100 opacity-60 grayscale-[50%] border-l-transparent hover:grayscale-0 hover:opacity-100'
                            : isBest
                              ? 'bg-[#CCFF00]/15 border-l-[#CCFF00] hover:bg-[#CCFF00]/30'
                              : 'hover:bg-[#CCFF00]/20 border-l-transparent'
                            }`}
                        >
                          <td className="px-6 py-4 font-bold">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {r.targetPool.project}
                                {isBest && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-[#CCFF00] text-[#371E7B] px-1.5 py-0.5 border border-[#371E7B] uppercase tracking-wider font-bold">
                                    <Star className="w-3 h-3 fill-[#371E7B]" /> Best
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-[#371E7B] font-bold uppercase tracking-wider">
                                Click for Details
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">{r.targetPool.chain}</td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex flex-col gap-1 items-start">
                              <div className={`flex items-center gap-2 border px-2 py-1 rounded-sm w-fit ${getBridgeRiskColor(r.riskLevel)}`}>
                                {getBridgeIcon(r.bridgeMetadata?.type)}
                                <span className="font-bold">{r.bridgeName}</span>
                              </div>
                              {r.hasExploits && (
                                <span className="text-[10px] text-red-600 font-bold uppercase flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Historic Exploit
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs">{r.estimatedTime}</td>
                          <td className="px-6 py-4 text-right font-bold">{r.targetPool.apy.toFixed(2)}%</td>
                          <td className="px-6 py-4 text-right">${r.totalCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {isHighRisk && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 border border-red-600 px-1.5 py-0.5 uppercase tracking-tighter bg-red-50 whitespace-nowrap">
                                  <ShieldAlert className="w-3 h-3" /> Too High
                                </div>
                              )}
                              <div className="flex flex-col items-end w-24">
                                <div className="w-full h-3 bg-[#371E7B]/10 border border-[#371E7B] relative">
                                  <div
                                    className={`h-full transition-all duration-500 ${r.riskLevel <= 2 ? 'bg-green-500' :
                                      r.riskLevel === 3 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                    style={{ width: `${(r.riskLevel / 5) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-[#371E7B] mt-1 uppercase tracking-wider">
                                  {r.riskLevel <= 2 ? 'Low Risk' : r.riskLevel === 3 ? 'Medium Risk' : 'High Risk'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold">
                            ${r.netProfit30d.toFixed(2)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t-2 border-[#371E7B] bg-[#F9F9F5]">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 px-4 py-2 font-bold font-mono text-sm uppercase text-[#371E7B] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#371E7B]/10 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="font-mono text-sm font-bold text-[#371E7B]">
                      PAGE {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 px-4 py-2 font-bold font-mono text-sm uppercase text-[#371E7B] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#371E7B]/10 transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20 bg-white border-2 border-dashed border-[#371E7B]"
          >
            <div className="w-16 h-16 bg-[#371E7B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-[#371E7B]" />
            </div>
            <p className="text-[#371E7B] font-mono font-bold mb-2">NO ROUTES FOUND MATCHING RISK PROFILE.</p>
            <p className="text-[#371E7B] font-mono text-sm opacity-70">
              {excludedCount > 0 ? `${excludedCount} ROUTES FOUND BUT EXCEED RISK TOLERANCE.` : 'TRY ADJUSTING CAPITAL OR CHAIN SETTINGS.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
