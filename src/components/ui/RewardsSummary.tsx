// src/components/ui/RewardsSummary.tsx
import { motion } from "framer-motion";
import { Coins, TrendingUp } from "lucide-react";

interface RewardsSummaryProps {
  tokens: number;
  usdValue: number;
  onCashoutClick: () => void;
}

export function RewardsSummary({ tokens, usdValue, onCashoutClick }: RewardsSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-br from-[#1b263b] to-[#121927] rounded-[24px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
      
      <div className="flex justify-between items-center relative z-10">
        <div>
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total Rewards</p>
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-yellow-400" />
            <span className="text-2xl font-black text-white font-mono">{tokens.toLocaleString()}</span>
          </div>
          <p className="text-cyan-400 text-sm font-medium mt-1">≈ ${usdValue.toFixed(2)} USD</p>
        </div>
        
        <button
          onClick={onCashoutClick}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-2 px-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2 transition-all active:scale-95"
        >
          <TrendingUp size={16} />
          Cash Out
        </button>
      </div>
    </motion.div>
  );
}
