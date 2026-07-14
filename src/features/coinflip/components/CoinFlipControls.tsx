// src/features/coinflip/components/CoinFlipControls.tsx
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { CoinSide } from '../types';

interface CoinFlipControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  selection: CoinSide | null;
  setSelection: (side: CoinSide) => void;
  isFlipping: boolean;
  balance: number;
  winStreak: number;
  lossStreak: number;
  history: CoinSide[];
  onPlay: () => void;
  onClose: () => void;
}

export function CoinFlipControls({
  betAmount,
  setBetAmount,
  selection,
  setSelection,
  isFlipping,
  balance,
  winStreak,
  lossStreak,
  history,
  onPlay,
  onClose,
}: CoinFlipControlsProps) {
  const currentStreakText = () => {
    if (winStreak >= 3) return `🔥 ${winStreak} Wins`;
    if (lossStreak >= 3) return `❄️ ${lossStreak} Losses`;
    if (winStreak > 0) return `${winStreak}W`;
    if (lossStreak > 0) return `${lossStreak}L`;
    return '';
  };

  return (
    <div className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
      <div className="space-y-4">
        {/* Bet inputs */}
        <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isFlipping} />

        {/* Side Selector */}
        <div className="space-y-2">
          <span className="text-xs text-text-secondary font-medium">Choose Side</span>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={isFlipping}
              onClick={() => setSelection('heads')}
              className={`py-5 rounded-2xl border-2 font-bold transition-all relative overflow-hidden flex flex-col items-center justify-center ${
                selection === 'heads'
                  ? 'border-yellow-500 bg-yellow-950/30 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.35)]'
                  : 'border-navy-700 text-text-secondary hover:border-navy-500 bg-navy-900/40'
              }`}
            >
              <div className="text-3xl mb-1 filter drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">👑</div>
              <div className="text-sm">Heads</div>
              <div className="text-xs text-muted">1.96x</div>
              {/* Glossy sheen overlay on select */}
              {selection === 'heads' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[sheen_1.5s_infinite]" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={isFlipping}
              onClick={() => setSelection('tails')}
              className={`py-5 rounded-2xl border-2 font-bold transition-all relative overflow-hidden flex flex-col items-center justify-center ${
                selection === 'tails'
                  ? 'border-slate-400 bg-slate-950/30 text-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.3)]'
                  : 'border-navy-700 text-text-secondary hover:border-navy-500 bg-navy-900/40'
              }`}
            >
              <div className="text-3xl mb-1 filter drop-shadow-[0_2px_8px_rgba(148,163,184,0.4)]">⭐</div>
              <div className="text-sm">Tails</div>
              <div className="text-xs text-muted">1.96x</div>
              {selection === 'tails' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[sheen_1.5s_infinite]" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Streaks & History */}
        {history.length > 0 && (
          <div className="space-y-1.5 p-3 bg-navy-900/40 rounded-xl border border-navy-800/80">
            <div className="flex justify-between text-xs text-muted">
              <span>Recent History</span>
              <span className="font-semibold text-cyan-neon">{currentStreakText()}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap pt-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full border text-3xs flex items-center justify-center font-bold transition-all duration-300 scale-95 ${
                    h === 'heads'
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.15)]'
                      : 'bg-slate-500/10 border-slate-500/30 text-slate-300 shadow-[0_0_6px_rgba(148,163,184,0.15)]'
                  }`}
                >
                  {h === 'heads' ? 'H' : 'T'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <Button
          variant="neon"
          size="lg"
          className="w-full font-bold py-4 rounded-xl relative overflow-hidden transition-all duration-300 active:scale-98 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
          disabled={isFlipping || !selection || betAmount <= 0 || betAmount > balance}
          onClick={onPlay}
        >
          {isFlipping ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Flipping...
            </span>
          ) : (
            'Flip Coin'
          )}
        </Button>
        <Button variant="ghost" className="w-full text-xs text-muted hover:text-white" onClick={onClose}>
          Close Game
        </Button>
      </div>
    </div>
  );
}
