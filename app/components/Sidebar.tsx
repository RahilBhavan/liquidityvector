'use client';

import { Chain, UserSettings } from '@/types';
import { Wallet, ShieldAlert, Coins, Link as LinkIcon } from 'lucide-react';
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
    <div className="w-full h-full bg-bit-white p-4 flex flex-col overflow-y-auto font-mono text-sm">
      
      {/* Section: CAPITAL */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <label className="font-bold uppercase flex items-center gap-2">
                <span className="bg-bit-black text-bit-white px-1">{'>'}</span> CAPITAL
            </label>
            {isConnected && (
              <span className="text-[10px] border border-bit-black px-1 uppercase">Synced</span>
            )}
        </div>
        <div className="relative">
          <input
            type="number"
            value={settings.capital}
            onChange={(e) => handleChange('capital', Number(e.target.value))}
            className="w-full bg-bit-white border-2 border-bit-black p-2 pl-6 font-bold focus:outline-none focus:bg-bit-black focus:text-bit-white shadow-hard"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none font-bold">$</span>
        </div>
      </div>

      {/* Section: CHAINS */}
      <div className="mb-8">
        <label className="font-bold uppercase mb-2 block">
            <span className="bg-bit-black text-bit-white px-1 mr-2">{'>'}</span> CHAINS
        </label>
        <div className="border-2 border-bit-black p-1 bg-bit-white shadow-hard">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {Object.values(Chain).map((chain) => (
                <button
                    key={chain}
                    onClick={() => handleChange('currentChain', chain)}
                    className={`w-full text-left px-2 py-1 mb-1 font-bold uppercase flex items-center gap-2 hover:bg-bit-black hover:text-bit-white ${
                        settings.currentChain === chain ? 'bg-bit-black text-bit-white' : ''
                    }`}
                >
                    <span>{settings.currentChain === chain ? '[x]' : '[ ]'}</span>
                    {chain}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* Section: RISK */}
      <div className="mb-8">
        <label className="font-bold uppercase mb-2 block">
            <span className="bg-bit-black text-bit-white px-1 mr-2">{'>'}</span> RISK_TOLERANCE
        </label>
        <div className="border-2 border-bit-black p-4 shadow-hard pattern-stipple-light">
          <div className="flex items-end justify-between gap-1 h-16 mb-2">
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = settings.riskTolerance >= level;
              return (
                <button
                  key={level}
                  onClick={() => handleChange('riskTolerance', level)}
                  className={`flex-1 border-2 border-bit-black transition-none ${
                    isActive ? 'bg-bit-black pattern-checker' : 'bg-bit-white'
                  }`}
                  style={{ height: `${20 + (level * 16)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase">
             <span>SAFE</span>
             <span>DEGEN</span>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-auto border-t-2 border-bit-black pt-4">
        <div className="bg-bit-black text-bit-white p-2 text-xs font-bold mb-2 shadow-hard-sm">
            [SYS_STATUS: {isFetching ? 'SCANNING...' : 'OK'}]
        </div>
        <div className="text-xs space-y-1">
            <div className="flex justify-between">
                <span>NODE:</span>
                <span>2050-ALPHA</span>
            </div>
            <div className="flex justify-between">
                <span>UPTIME:</span>
                <span>99.9%</span>
            </div>
        </div>
      </div>
    </div>
  );
}
