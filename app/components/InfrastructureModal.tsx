'use client';

import React from 'react';
import { X, Info, Layers, Lock, History, ShieldCheck, AlertTriangle, ExternalLink, Landmark, Globe, Waves, Zap, ArrowRightLeft } from 'lucide-react';
import { RouteCalculation } from '@/types';

interface InfrastructureModalProps {
  selectedRoute: RouteCalculation | null;
  onClose: () => void;
}

const getBridgeIcon = (type: string | undefined) => {
  switch (type) {
    case 'Canonical': return <Landmark className="w-5 h-5 text-accent" />;
    case 'LayerZero': return <Globe className="w-5 h-5 text-accent" />;
    case 'Liquidity': return <Waves className="w-5 h-5 text-accent" />;
    case 'Intent': return <Zap className="w-5 h-5 text-accent" />;
    default: return <ArrowRightLeft className="w-5 h-5 text-accent" />;
  }
};

const InfrastructureModal: React.FC<InfrastructureModalProps> = ({ selectedRoute, onClose }) => {
  if (!selectedRoute || !selectedRoute.bridgeMetadata) return null;

  const isHighRisk = selectedRoute.hasExploits || selectedRoute.riskLevel >= 4;

  return (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
    >
        <div
            className="bg-surface w-full max-w-2xl rounded-[32px] shadow-soft-lg border border-divider relative flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Modal Header */}
            <div className="px-8 py-6 flex justify-between items-center border-b border-divider">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-primary tracking-tight">
                            Infrastructure Analysis
                        </h3>
                        <p className="text-xs font-medium text-secondary uppercase tracking-widest">
                            Technical Specification & Risk Assessment
                        </p>
                    </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full bg-surface-secondary hover:bg-divider transition-colors flex items-center justify-center text-secondary"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {/* Protocol Overview */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10 pb-10 border-b border-divider">
                    <div className="space-y-4">
                        <span className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                            Protocol Identity
                        </span>
                        <h4 className="text-4xl font-bold text-primary tracking-tighter">
                            {selectedRoute.bridgeMetadata.name}
                        </h4>
                        <div className="flex items-center gap-3 text-sm font-semibold text-secondary">
                            {getBridgeIcon(selectedRoute.bridgeMetadata.type)}
                            <span>Architecture: {selectedRoute.bridgeMetadata.type}</span>
                        </div>
                    </div>
                    
                    <div className="bg-surface-secondary rounded-3xl p-6 flex flex-col items-center justify-center min-w-[160px] border border-divider">
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Vector Score</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-bold text-primary tracking-tighter">
                            {selectedRoute.riskScore !== undefined && selectedRoute.riskScore !== null 
                              ? selectedRoute.riskScore.toFixed(0)
                              : (100 - (selectedRoute.riskLevel * 15)).toFixed(0)}
                          </span>
                          <span className="text-sm font-bold text-secondary opacity-50">/100</span>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-surface rounded-2xl p-6 border border-divider shadow-soft-sm space-y-3">
                        <div className="flex items-center gap-2 text-secondary">
                          <Lock className="w-4 h-4 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-wider">Liquidity Depth</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">${selectedRoute.bridgeMetadata.tvl}M+</div>
                        <p className="text-xs text-secondary leading-relaxed font-medium">
                            Aggregate total value locked across all liquidity pools.
                        </p>
                    </div>
                    <div className="bg-surface rounded-2xl p-6 border border-divider shadow-soft-sm space-y-3">
                        <div className="flex items-center gap-2 text-secondary">
                          <History className="w-4 h-4 opacity-50" />
                          <span className="text-xs font-bold uppercase tracking-wider">Operational Age</span>
                        </div>
                        <div className="text-2xl font-bold text-primary">{selectedRoute.bridgeMetadata.ageYears} Years</div>
                        <p className="text-xs text-secondary leading-relaxed font-medium">
                            Total time since mainnet deployment and protocol verification.
                        </p>
                    </div>
                </div>

                {/* Security Assessment */}
                <div className={`rounded-3xl p-8 border ${isHighRisk ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        {isHighRisk ? <AlertTriangle className="w-6 h-6 text-critical" /> : <ShieldCheck className="w-6 h-6 text-success" />}
                        <h5 className={`text-sm font-bold uppercase tracking-widest ${isHighRisk ? 'text-critical' : 'text-success'}`}>
                          Security Assessment
                        </h5>
                    </div>

                    {selectedRoute.hasExploits && selectedRoute.bridgeMetadata.exploitData ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-8 border-b border-divider pb-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Incident Date</span>
                                    <p className="text-lg font-bold text-primary">{selectedRoute.bridgeMetadata.exploitData.year}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Capital Impact</span>
                                    <p className="text-lg font-bold text-critical">{selectedRoute.bridgeMetadata.exploitData.amount}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Analysis</span>
                                <p className="text-sm font-medium text-primary leading-relaxed italic">
                                    "{selectedRoute.bridgeMetadata.exploitData.description}"
                                </p>
                            </div>
                            <a
                                href={selectedRoute.bridgeMetadata.exploitData.reportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-soft-sm hover:opacity-90 transition-all"
                            >
                                Read Investigation Report <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-primary leading-relaxed">
                                No record of critical security incidents or capital compromises. This protocol maintains a high operational security standard.
                            </p>
                            <div className="h-1.5 w-full bg-green-100 rounded-full overflow-hidden">
                                <div className="h-full bg-success w-full opacity-50"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-10 pt-6 border-t border-divider">
                    <p className="text-[10px] font-medium text-secondary leading-relaxed uppercase opacity-60">
                        Information provided is based on historical records and current network metrics. Vector scores are for comparative assessment only and do not constitute financial advice.
                    </p>
                </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 py-6 bg-surface-secondary border-t border-divider flex justify-end">
                <button
                    onClick={onClose}
                    className="px-10 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-soft-sm hover:opacity-90 transition-all"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
  );
};

export default React.memo(InfrastructureModal);
