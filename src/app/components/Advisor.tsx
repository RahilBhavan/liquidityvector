'use client';

import { useState } from 'react';
import { AdvisorResponse, RouteCalculation, UserSettings } from '@/types';
import { analyzeRoute } from '@/lib/services/geminiService';
import { apiService } from '@/lib/services/apiService';
import { Bot, Loader2, BrainCircuit, ShieldCheck, AlertTriangle } from 'lucide-react';

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
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface rounded-2xl border border-divider">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-sm font-medium text-secondary">Analyzing market conditions...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface rounded-2xl border border-divider relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="w-12 h-12 bg-surface-secondary rounded-2xl flex items-center justify-center mb-4 shadow-soft-sm z-10">
          <BrainCircuit className="w-6 h-6 text-primary" />
        </div>
        
        <h3 className="text-lg font-semibold text-primary mb-2 z-10">Strategy Advisor</h3>
        <p className="text-sm text-secondary mb-6 max-w-xs z-10 leading-relaxed">
          Generate a personalized risk assessment and capital deployment strategy using AI.
        </p>
        
        <button
          onClick={handleAnalyze}
          className="relative z-10 flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-all shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5"
        >
          <Bot className="w-4 h-4" /> Start Analysis
        </button>
        
        {error && (
          <p className="text-critical text-xs font-medium mt-4 bg-critical/5 px-3 py-1 rounded-full z-10">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
            <Bot className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-primary">Analysis Report</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            analysis.recommendation === 'STRONG BUY' ? 'bg-success text-white shadow-soft-sm' : 
            analysis.recommendation === 'HOLD' ? 'bg-warning/20 text-warning-dark' : 'bg-surface-secondary text-secondary'
        }`}>
          {analysis.recommendation}
        </span>
      </div>

      <div className="flex-1 bg-surface-secondary/50 rounded-xl p-5 mb-6 border border-divider">
        <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap">
          {analysis.analysis}
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Risk Score</span>
          <span className="text-sm font-bold text-primary font-mono">{analysis.riskScore}/100</span>
        </div>
        
        <div className="h-2 w-full bg-divider rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              analysis.riskScore <= 40 ? 'bg-success' : analysis.riskScore <= 70 ? 'bg-warning' : 'bg-critical'
            }`}
            style={{ width: `${analysis.riskScore}%` }}
          />
        </div>
        
        <div className="mt-2 flex items-center justify-end gap-1.5 text-xs font-medium text-secondary">
          {analysis.riskScore <= 40 ? <ShieldCheck className="w-3 h-3 text-success" /> : <AlertTriangle className="w-3 h-3 text-warning" />}
          <span>
            {analysis.riskScore <= 40 ? 'High Security' : analysis.riskScore <= 70 ? 'Moderate Risk' : 'High Risk'}
          </span>
        </div>
      </div>
    </div>
  );
}
