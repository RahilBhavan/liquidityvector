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
    case 'Canonical': return <span title="Canonical Infrastructure"><Landmark className="w-4 h-4" /></span>;
    case 'LayerZero': return <span title="LayerZero Protocol"><Globe className="w-4 h-4" /></span>;
    case 'Liquidity': return <span title="Liquidity Network"><Waves className="w-4 h-4" /></span>;
    case 'Intent': return <span title="Intent Solver"><Zap className="w-4 h-4" /></span>;
    default: return <span title="Bridge"><ArrowRightLeft className="w-4 h-4" /></span>;
  }
};

const InfrastructureModal: React.FC<InfrastructureModalProps> = ({ selectedRoute, onClose }) => {
  if (!selectedRoute || !selectedRoute.bridgeMetadata) return null;

  return (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bit-black/80 backdrop-blur-none p-4"
        onClick={onClose}
    >
        <div
            className="bg-bit-white border-2 border-bit-black w-full max-w-lg shadow-hard relative flex flex-col max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-bit-black text-bit-white p-4 flex justify-between items-center sticky top-0 z-10 border-b-2 border-bit-white">
            <h3 className="font-pixel font-bold text-lg uppercase flex items-center gap-2">
                <Info className="w-5 h-5" />
                Infrastructure
            </h3>
            <button onClick={onClose} className="hover:text-bit-dim transition-none">
                <X className="w-6 h-6" />
            </button>
            </div>

            <div className="p-6 space-y-6">
            <div className="flex items-start justify-between border-b-2 border-bit-black pb-4">
                <div>
                <h4 className="text-2xl font-bold font-pixel uppercase">
                    {selectedRoute.bridgeMetadata.name}
                </h4>
                <span className="text-xs font-mono uppercase tracking-widest font-bold">
                    Primary Bridging Infrastructure
                </span>
                </div>
                {selectedRoute.hasExploits && (
                <div className="bg-bit-black text-bit-white px-2 py-1 text-xs font-bold uppercase flex items-center gap-2 pattern-diagonal border-2 border-bit-black">
                    <AlertTriangle className="w-4 h-4" /> FLAGGED
                </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-bit-black p-4 shadow-hard-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1">
                    <Layers className="w-4 h-4" /> Architecture
                </div>
                <div className="text-lg font-bold font-mono flex items-center gap-2">
                    {getBridgeIcon(selectedRoute.bridgeMetadata.type)}
                    {selectedRoute.bridgeMetadata.type}
                </div>
                </div>
                <div className="border-2 border-bit-black p-4 shadow-hard-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1">
                    <Lock className="w-4 h-4" /> TVL
                </div>
                <div className="text-lg font-bold font-mono">
                    ${selectedRoute.bridgeMetadata.tvl}M+
                </div>
                </div>
                <div className="border-2 border-bit-black p-4 shadow-hard-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1">
                    <History className="w-4 h-4" /> Age
                </div>
                <div className="text-lg font-bold font-mono">
                    {selectedRoute.bridgeMetadata.ageYears} Years
                </div>
                </div>
                <div className="border-2 border-bit-black p-4 shadow-hard-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase mb-1">
                    <ShieldCheck className="w-4 h-4" /> Score
                </div>
                <div className="text-lg font-bold font-mono">
                    {selectedRoute.riskLevel <= 2 ? 'High Sec' : selectedRoute.riskLevel <= 4 ? 'Standard' : 'Risk'}
                </div>
                </div>
            </div>

            {selectedRoute.hasExploits && selectedRoute.bridgeMetadata.exploitData && (
                <div className="border-2 border-bit-black p-6 bg-bit-white pattern-stipple-light">
                <h5 className="flex items-center gap-2 font-bold uppercase tracking-wide font-pixel mb-4 text-xs">
                    <AlertTriangle className="w-4 h-4" /> Incident Report
                </h5>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                    <span className="block text-[10px] uppercase font-bold mb-1">Year</span>
                    <span className="font-mono font-bold text-lg">{selectedRoute.bridgeMetadata.exploitData.year}</span>
                    </div>
                    <div>
                    <span className="block text-[10px] uppercase font-bold mb-1">Loss</span>
                    <span className="font-mono font-bold text-lg">{selectedRoute.bridgeMetadata.exploitData.amount}</span>
                    </div>
                </div>
                <p className="text-xs font-mono mb-6 leading-relaxed border-t-2 border-bit-black pt-2">
                    {selectedRoute.bridgeMetadata.exploitData.description}
                </p>
                <a
                    href={selectedRoute.bridgeMetadata.exploitData.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-bit-black text-bit-white hover:bg-bit-white hover:text-bit-black px-4 py-2 font-bold uppercase text-xs tracking-wider border-2 border-bit-black transition-none"
                >
                    View Report <ExternalLink className="w-3 h-3" />
                </a>
                </div>
            )}

            <div className="text-[10px] font-mono leading-relaxed border-t-2 border-bit-black pt-4 uppercase">
                Disclaimer: Metadata is simulated. Verify audits before bridging.
            </div>
            </div>

            <div className="p-4 bg-bit-white border-t-2 border-bit-black flex justify-end">
            <button
                onClick={onClose}
                className="btn-1bit"
            >
                CLOSE_DOSSIER
            </button>
            </div>
        </div>
    </div>
  );
};

export default React.memo(InfrastructureModal);
