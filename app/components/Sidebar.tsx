'use client';

import { Chain, UserSettings } from '@/types';
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
    <div className="w-full md:w-full h-full bg-bit-bg text-bit-fg p-4 flex flex-col overflow-y-auto font-mono text-sm border-r-0 md:border-r-2 border-b-2 md:border-b-0 border-bit-fg">
      
      {/* Section: CAPITAL */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <label className="font-bold uppercase flex items-center gap-2 text-bit-fg">
                <span className="bg-bit-fg text-bit-bg px-1 select-none">{'>'}</span> CAPITAL
            </label>
            {isConnected && (
              <span className="text-[10px] border border-bit-fg px-1 uppercase text-bit-fg">Synced</span>
            )}
        </div>
        <div className="relative group">
          <input
            type="number"
            value={settings.capital}
            onChange={(e) => handleChange('capital', Number(e.target.value))}
            className="w-full bg-bit-bg border-2 border-bit-fg p-2 pl-6 font-bold focus:outline-none focus:bg-bit-fg focus:text-bit-bg shadow-hard transition-all"
          />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none font-bold text-bit-fg group-focus-within:text-bit-bg">$</span>
        </div>
      </div>

      {/* Section: CHAINS */}
      <div className="mb-8 flex-1 min-h-0 flex flex-col">
        <label className="font-bold uppercase mb-2 block text-bit-fg">
            <span className="bg-bit-fg text-bit-bg px-1 mr-2 select-none">{'>'}</span> CHAINS
        </label>
        <div className="border-2 border-bit-fg p-1 bg-bit-bg shadow-hard flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto custom-scrollbar flex-1">
                {Object.values(Chain).map((chain) => (
                <button
                    key={chain}
                    onClick={() => handleChange('currentChain', chain)}
                    className={`w-full text-left px-2 py-1 mb-1 font-bold uppercase flex items-center gap-2 hover:bg-bit-fg hover:text-bit-bg transition-colors ${
                        settings.currentChain === chain ? 'bg-bit-fg text-bit-bg' : 'text-bit-fg'
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
        <label className="font-bold uppercase mb-2 block text-bit-fg">
            <span className="bg-bit-fg text-bit-bg px-1 mr-2 select-none">{'>'}</span> RISK_TOLERANCE
        </label>
        <div className="border-2 border-bit-fg p-4 shadow-hard pattern-stipple-light bg-bit-bg">
          <div className="flex items-end justify-between gap-1 h-16 mb-2">
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = settings.riskTolerance >= level;
              return (
                <button
                  key={level}
                  onClick={() => handleChange('riskTolerance', level)}
                  className={`flex-1 border-2 border-bit-fg transition-none ${
                    isActive ? 'bg-bit-fg pattern-checker' : 'bg-bit-bg'
                  }`}
                  style={{ height: `${20 + (level * 16)}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase text-bit-fg">
             <span>SAFE</span>
             <span>DEGEN</span>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-auto border-t-2 border-bit-fg pt-4">
        <div className="bg-bit-fg text-bit-bg p-2 text-xs font-bold mb-2 shadow-hard-sm">
            [SYS_STATUS: {isFetching ? <span className="animate-pulse">SCANNING...</span> : 'OK'}]
        </div>
        <div className="text-xs space-y-1 text-bit-fg font-bold">
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
