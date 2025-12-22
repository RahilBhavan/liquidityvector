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
      <div className="h-full bg-bit-white border-2 border-bit-black p-6 flex flex-col items-center justify-center text-center shadow-hard">
        <div className="w-8 h-8 border-2 border-bit-black loading-1bit mb-4"></div>
        <p className="text-sm font-pixel uppercase animate-pulse">Consulting Gemini Node...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full bg-bit-white border-2 border-bit-black p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-hard pattern-stipple-light">
        <div className="bg-bit-white p-4 mb-4 relative z-10 border-2 border-bit-black shadow-hard-sm">
          <BrainCircuit className="w-8 h-8 text-bit-black" />
        </div>
        <h3 className="font-bold text-xl mb-2 relative z-10 font-pixel uppercase bg-bit-white px-2">Strategy Advisor</h3>
        <p className="text-sm mb-8 max-w-xs relative z-10 font-mono bg-bit-white px-2">
          Request AI risk assessment and capital deployment strategy.
        </p>
        <button
          onClick={handleAnalyze}
          className="relative z-10 btn-1bit flex items-center gap-2"
        >
          <Bot className="w-5 h-5" /> INITIALIZE_ANALYSIS
        </button>
        {error && <p className="font-bold text-xs mt-4 relative z-10 bg-bit-white px-2 py-1 border-2 border-bit-black">{error}</p>}
      </div>
    );
  }

  return (
    <div className="h-full bg-bit-white border-2 border-bit-black p-6 flex flex-col shadow-hard">
      <div className="flex items-center justify-between mb-6 border-b-2 border-bit-black pb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6" />
          <h3 className="font-bold uppercase font-pixel">Gemini Report</h3>
        </div>
        <div className={`px-3 py-1 text-sm font-bold border-2 border-bit-black ${
            analysis.recommendation === 'STRONG BUY' ? 'bg-bit-black text-bit-white' : 'bg-bit-white text-bit-black pattern-checker'
        }`}>
          {analysis.recommendation}
        </div>
      </div>

      <div className="border-2 border-dashed border-bit-black p-4 mb-6 bg-bit-white flex-grow font-mono text-sm leading-relaxed">
        <span className="font-bold mr-2">{'>'}</span>
        &quot;{analysis.analysis}&quot;
      </div>

      <div className="mt-auto pt-4 border-t-2 border-bit-black">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-bold tracking-widest">Risk Score</span>
          <span className="text-lg font-bold font-mono">{analysis.riskScore}/100</span>
        </div>
        <div className="w-full h-6 border-2 border-bit-black p-1 flex gap-0.5">
           {Array.from({ length: 20 }).map((_, i) => (
             <div
               key={i}
               className={`flex-1 ${i < (analysis.riskScore / 5) ? 'bg-bit-black' : 'opacity-20 bg-bit-black'}`}
             />
           ))}
        </div>
        <div className="mt-2 text-[10px] uppercase font-bold text-right tracking-widest">
          {analysis.riskScore <= 40 ? 'High Security' : analysis.riskScore <= 70 ? 'Moderate Security' : 'Elevated Risk'}
        </div>
      </div>
    </div>
  );
}
