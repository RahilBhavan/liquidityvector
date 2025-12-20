'use client';

import { Chain, UserSettings } from '@/types';
import { Wallet, ShieldAlert, Coins, Link as LinkIcon } from 'lucide-react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full md:w-80 bg-[#F9F9F5] p-6 flex flex-col h-full overflow-y-auto"
    >
      {/* Logo */}
      <motion.div 
        variants={itemVariants}
        className="flex items-center gap-3 mb-12 border-b-2 border-[#371E7B] pb-6"
      >
        <div className="w-10 h-10 bg-[#371E7B] flex items-center justify-center shadow-[4px_4px_0px_0px_#CCFF00]">
          <Coins className="text-[#CCFF00] w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#371E7B] uppercase tracking-wide leading-none font-['Space_Grotesk']">
            Liquidity
          </h1>
          <h1 className="text-xl font-bold text-[#371E7B] uppercase tracking-wide leading-none font-['Space_Grotesk']">
            Vector
          </h1>
        </div>
      </motion.div>

      <div className="space-y-10">
        {/* Capital Input */}
        <motion.div 
          variants={itemVariants}
          className="space-y-3"
        >
          <label className="text-sm uppercase tracking-widest text-[#371E7B] font-bold flex items-center gap-2 font-['Space_Grotesk']">
            <Wallet className="w-4 h-4" /> Capital (USDC)
            {isConnected && (
              <span className="text-[10px] bg-[#CCFF00] px-1.5 py-0.5 border border-[#371E7B] ml-auto">
                <LinkIcon className="w-3 h-3 inline mr-1" />
                Synced
              </span>
            )}
          </label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#371E7B] font-bold font-mono">
              $
            </span>
            <input
              type="number"
              value={settings.capital}
              onChange={(e) => handleChange('capital', Number(e.target.value))}
              className="w-full bg-white border-2 border-[#371E7B] py-3 pl-8 pr-4 text-[#371E7B] font-mono font-bold focus:bg-[#CCFF00]/10 focus:outline-none transition-all placeholder-[#371E7B]/30 rounded-none shadow-[4px_4px_0px_0px_#371E7B]"
            />
          </div>
        </motion.div>

        {/* Current Chain - 7 chains */}
        <motion.div 
          variants={itemVariants}
          className="space-y-3"
        >
          <label className="text-sm uppercase tracking-widest text-[#371E7B] font-bold font-['Space_Grotesk']">
            Current Chain
          </label>
          <div className="flex flex-col gap-0 border-2 border-[#371E7B] max-h-48 overflow-y-auto">
            {Object.values(Chain).map((chain) => (
              <motion.button
                key={chain}
                whileHover={{ backgroundColor: settings.currentChain === chain ? '#CCFF00' : '#F0F0E0' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChange('currentChain', chain)}
                className={`px-4 py-3 text-sm font-bold transition-all text-left flex items-center justify-between border-b border-[#371E7B] last:border-b-0
                  ${settings.currentChain === chain
                    ? 'bg-[#CCFF00] text-[#371E7B]'
                    : 'bg-white text-[#371E7B]'}`}
              >
                {chain}
                {settings.currentChain === chain && (
                  <motion.div 
                    layoutId="activeChain"
                    className="w-2 h-2 bg-[#371E7B]" 
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Risk Tolerance */}
        <motion.div 
          variants={itemVariants}
          className="space-y-3 border-2 border-dashed border-[#371E7B] p-4"
        >
          <label className="text-sm uppercase tracking-widest text-[#371E7B] font-bold flex items-center gap-2 font-['Space_Grotesk'] mb-2">
            <ShieldAlert className="w-4 h-4" /> Risk Tolerance
          </label>

          <div className="flex items-end gap-1 h-16 w-full mb-1">
            {[1, 2, 3, 4, 5].map((level) => {
              const isActive = settings.riskTolerance >= level;
              return (
                <motion.button
                  key={level}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChange('riskTolerance', level)}
                  className={`flex-1 border-2 border-[#371E7B] transition-all duration-200 relative group outline-none focus:ring-2 focus:ring-[#CCFF00]
                    ${isActive ? 'bg-[#371E7B]' : 'bg-transparent'}
                  `}
                  style={{ height: `${20 + (level * 16)}%` }}
                  aria-label={`Set risk tolerance to ${level}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-[#371E7B] font-mono uppercase tracking-tight font-bold">
            <span>Conservative</span>
            <span>Degen</span>
          </div>
        </motion.div>
      </div>

      <motion.div 
        variants={itemVariants}
        className="mt-auto pt-8 border-t-2 border-[#371E7B]"
      >
        <p className="text-xs text-[#371E7B] leading-relaxed font-mono opacity-80">
          SYSTEM STATUS: {isFetching ? 'SCANNING...' : 'ONLINE'}<br />
          NODE: 2050-ALPHA<br />
          {isConnected ? 'WALLET: CONNECTED' : 'WALLET: DISCONNECTED'}
        </p>
      </motion.div>
    </motion.div>
  );
}
