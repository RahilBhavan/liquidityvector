'use client';

import { Chain, UserSettings } from '@/types';
import { Wallet, ShieldAlert, Zap, Link as LinkIcon, Activity } from 'lucide-react';
import { useAccount } from 'wagmi';

interface SidebarProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  isFetching: boolean;
}

export default function Sidebar({ settings, setSettings, isFetching }: SidebarProps) {
  const { isConnected } = useAccount();

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full md:w-80 h-full bg-surface border-r border-divider p-6 flex flex-col overflow-y-auto z-20">
      
      {/* Brand / Logo Area */}
      <div className="mb-10 flex items-center gap-2 opacity-90">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center text-white shadow-soft-sm">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-primary">LiquidityVector</span>
      </div>

      {/* Capital Input */}
      <div className="mb-8">
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wallet className="w-3 h-3" /> Allocation Capital
        </label>
        <div className="relative group transition-all duration-300">
          <div className="absolute inset-0 bg-accent/5 rounded-2xl scale-95 group-hover:scale-100 transition-transform opacity-0 group-hover:opacity-100" />
          <div className="relative bg-surface-secondary rounded-2xl p-1 flex items-center border border-transparent group-focus-within:border-accent/20 group-focus-within:bg-surface group-focus-within:shadow-soft-md transition-all">
            <span className="pl-4 text-secondary font-medium text-lg">$</span>
            <input
              type="number"
              value={settings.capital}
              onChange={(e) => handleChange('capital', Number(e.target.value))}
              className="w-full bg-transparent p-3 font-mono text-2xl font-bold text-primary placeholder:text-secondary/30 outline-none"
              placeholder="0"
            />
            {isConnected && (
              <div className="pr-4">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="mb-8 flex-1 min-h-0 flex flex-col">
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <LinkIcon className="w-3 h-3" /> Origin Network
        </label>
        <div className="flex-1 overflow-y-auto pr-2 space-y-1">
            {Object.values(Chain).map((chain) => (
            <button
                key={chain}
                onClick={() => handleChange('currentChain', chain)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between group ${
                    settings.currentChain === chain 
                    ? 'bg-primary text-white shadow-soft-md' 
                    : 'bg-transparent text-secondary hover:bg-surface-secondary hover:text-primary'
                }`}
            >
                {chain}
                {settings.currentChain === chain && (
                  <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                )}
            </button>
            ))}
        </div>
      </div>

      {/* Risk Tolerance Slider */}
      <div className="mb-8">
        <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldAlert className="w-3 h-3" /> Risk Appetite
        </label>
        
        <div className="bg-surface-secondary rounded-2xl p-4">
          <div className="flex justify-between items-end h-12 gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = settings.riskTolerance >= level;
              const isHighRisk = level >= 4;
              return (
                <button
                  key={level}
                  onClick={() => handleChange('riskTolerance', level)}
                  className={`flex-1 rounded-md transition-all duration-300 ${
                    isActive 
                      ? (isHighRisk ? 'bg-critical' : 'bg-accent') 
                      : 'bg-divider'
                  }`}
                  style={{ height: `${40 + (level * 15)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-medium text-secondary uppercase tracking-wide">
             <span>Conservative</span>
             <span>Aggressive</span>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-auto pt-4 border-t border-divider flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isFetching ? 'bg-warning animate-pulse' : 'bg-success'}`} />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">System Status</span>
          <span className="text-xs font-medium text-primary flex items-center gap-1">
            {isFetching ? 'Scanning Protocols...' : 'Operational'}
          </span>
        </div>
        <Activity className="w-4 h-4 text-divider ml-auto" />
      </div>
    </div>
  );
}
