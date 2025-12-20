'use client';

import { useState } from 'react';
import { AdvisorResponse, RouteCalculation, UserSettings } from '@/types';
import { analyzeRoute } from '@/lib/services/geminiService';
import { apiService } from '@/lib/services/apiService';
import { Bot, Loader2, BrainCircuit } from 'lucide-react';

interface AdvisorProps {
  route: RouteCalculation;
  settings: UserSettings;
}

export default function Advisor({ route, settings }: AdvisorProps) {
  const [analysis, setAnalysis] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch real market average yield for the user's current chain
      const currentYield = await apiService.getCurrentYield(settings.currentChain);
      const result = await analyzeRoute(route, settings, currentYield);
      setAnalysis(result);
    } catch (err) {
      setError("Analysis failed. Please check API Key.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-white border-2 border-[#371E7B] p-6 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 text-[#371E7B] animate-spin mb-3" />
        <p className="text-sm text-[#371E7B] font-mono uppercase tracking-widest animate-pulse">Consulting Gemini Node...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full bg-white border-2 border-[#371E7B] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#371E7B_1px,transparent_1px)] [background-size:16px_16px] opacity-5" />
        <div className="bg-[#371E7B] p-4 mb-4 relative z-10">
          <BrainCircuit className="w-8 h-8 text-[#CCFF00]" />
        </div>
        <h3 className="text-[#371E7B] font-bold text-xl mb-2 relative z-10 font-['Space_Grotesk'] uppercase">Strategy Advisor</h3>
        <p className="text-sm text-[#371E7B] mb-8 max-w-xs relative z-10 font-mono">
          Request AI risk assessment and capital deployment strategy.
        </p>
        <button
          onClick={handleAnalyze}
          className="relative z-10 bg-[#CCFF00] hover:bg-[#b3e600] text-[#371E7B] px-8 py-3 font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-2 border-[#371E7B] shadow-[4px_4px_0px_0px_#371E7B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#371E7B]"
        >
          <Bot className="w-5 h-5" /> Initialize Analysis
        </button>
        {error && <p className="text-red-600 font-bold text-xs mt-4 relative z-10 bg-red-100 px-2 py-1 border border-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="h-full bg-white border-2 border-[#371E7B] p-8 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#371E7B]" />
          <h3 className="text-[#371E7B] font-bold uppercase font-['Space_Grotesk']">Gemini Report</h3>
        </div>
        <div className={`px-3 py-1 text-sm font-bold border-2 ${analysis.recommendation === 'STRONG BUY' ? 'bg-[#CCFF00] border-[#371E7B] text-[#371E7B]' :
          analysis.recommendation === 'HOLD' ? 'bg-yellow-100 border-[#371E7B] text-[#371E7B]' :
            'bg-red-100 border-[#371E7B] text-[#371E7B]'
          }`}>
          {analysis.recommendation}
        </div>
      </div>

      <div className="border-2 border-dashed border-[#371E7B]/60 p-6 mb-6 bg-[#F9F9F5]/50 flex-grow">
        <p className="text-sm md:text-base text-[#371E7B] leading-relaxed font-mono font-medium">
          &quot;{analysis.analysis}&quot;
        </p>
      </div>

      <div className="mt-auto pt-6 border-t-2 border-[#371E7B]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#371E7B] uppercase font-bold tracking-widest">Risk Score</span>
          <span className="text-lg font-bold text-[#371E7B] font-mono">{analysis.riskScore}/100</span>
        </div>
        <div className="w-full h-4 bg-[#F9F9F5] border-2 border-[#371E7B] overflow-hidden p-0.5">
          <div
            className={`h-full ${analysis.riskScore <= 40 ? 'bg-green-500' : analysis.riskScore <= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${analysis.riskScore}%` }}
          />
        </div>
        <div className="mt-2 text-[10px] text-[#371E7B] uppercase font-bold text-right tracking-widest">
          {analysis.riskScore <= 40 ? 'High Security' : analysis.riskScore <= 70 ? 'Moderate Security' : 'Elevated Risk'}
        </div>
      </div>
    </div>
  );
}
