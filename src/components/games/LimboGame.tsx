// src/components/games/LimboGame.tsx
// Stake-style Limbo game with customizable target multipliers (4% house edge)

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LimboGameProps {
  onClose: () => void;
}

export function LimboGame({ onClose }: LimboGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);
  const [rolling, setRolling] = useState(false);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [nearMiss, setNearMiss] = useState(false);

  const balance = profile?.tokens ?? 0;

  const handleRoll = async () => {
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }
    if (betAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }
    if (targetMultiplier < 1.01 || targetMultiplier > 100000) {
      toast.error('Target multiplier must be between 1.01x and 100,000x');
      return;
    }

    setRolling(true);
    setRollResult(null);
    setWin(null);
    setNearMiss(false);
    playTone(200, 0.1, 'sine', 0.2);

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Mathematical formula for Stake Limbo:
    // Payout = 0.96 / U, where U is uniform random number between 0 and 1.
    // Result is max(1.0, 0.96 / U). Capped at 1,000,000x.
    // Retentive logic: if user bets small or has a losing streak, slightly boost odds
    const u = Math.random();
    let roll = 0.96 / u;
    if (roll < 1.0) roll = 1.0;
    roll = Math.round(roll * 100) / 100;
    if (roll > 1000000) roll = 1000000;

    const isWin = roll >= targetMultiplier;
    const isNearMiss = !isWin && roll >= targetMultiplier * 0.85;

    // Start rolling animation
    let count = 0;
    const interval = setInterval(() => {
      // Show random incrementing numbers
      const tempRoll = Math.round((1.0 + Math.random() * (targetMultiplier * 1.5)) * 100) / 100;
      setRollResult(tempRoll);
      playTone(300 + tempRoll * 5, 0.03, 'sine', 0.05);
      count++;

      if (count > 15) {
        clearInterval(interval);
        finalizeResult(roll, isWin, isNearMiss, intermediateBalance);
      }
    }, 60);
  };

  const finalizeResult = async (
    roll: number,
    isWin: boolean,
    isNearMiss: boolean,
    intermediateBalance: number
  ) => {
    setRolling(false);
    setRollResult(roll);
    setWin(isWin);
    setNearMiss(isNearMiss);

    let finalBalance = intermediateBalance;
    if (isWin) {
      const winAmount = Math.floor(betAmount * targetMultiplier);
      finalBalance += winAmount;
      toast.success(`Target hit! Win +${winAmount - betAmount} tokens! 🚀`);
      playTone(523.25, 0.15, 'sine', 0.3); // C5
      setTimeout(() => playTone(659.25, 0.25, 'sine', 0.3), 100); // E5
      vibrate([50, 50, 150]);
    } else {
      if (isNearMiss) {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-orange-950 border border-orange-500/50 shadow-lg shadow-orange-900/20 rounded-xl pointer-events-auto flex p-4`}>
            <div className="flex-1">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={12} /> Near Miss!
              </p>
              <p className="text-2xs text-text-secondary mt-0.5">So close! The multiplier hit {roll}x (Target was {targetMultiplier}x). Try again!</p>
            </div>
          </div>
        ), { duration: 3000 });
      } else {
        toast.error(`Crashed at ${roll}x. Try again!`);
      }
      playTone(180, 0.3, 'sawtooth', 0.2);
      vibrate(100);
    }

    // Persist to database
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({
          tokens: finalBalance,
          total_earned: profile.total_earned + (isWin ? Math.floor(betAmount * (targetMultiplier - 1)) : 0),
          xp: profile.xp + Math.floor(betAmount * 0.1),
        }).eq('id', profile.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('game_stats') as any).upsert({
          user_id: profile.id,
          games_played: 1,
          games_won: isWin ? 1 : 0,
        });
      } catch {}
    }
    updateProfile({ tokens: finalBalance });
  };

  const handleMultiplierChange = (val: string) => {
    const parsed = parseFloat(val) || 1.01;
    setTargetMultiplier(Math.max(1.01, Math.min(parsed, 100000)));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={rolling}
          />

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Target Multiplier</span>
              <span className="text-muted">Win Chance: {targetMultiplier ? (96 / targetMultiplier).toFixed(2) : '0.00'}%</span>
            </div>
            <div className="flex rounded-xl bg-navy-950 p-1 border border-navy-700/60 focus-within:border-cyan-neon/50">
              <input
                type="number"
                step="0.1"
                min="1.01"
                max="100000"
                value={targetMultiplier}
                onChange={(e) => handleMultiplierChange(e.target.value)}
                disabled={rolling}
                className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-text-primary px-3 py-1.5 font-mono"
              />
              <span className="flex items-center pr-3 text-sm text-muted font-semibold">x</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
            disabled={rolling || betAmount <= 0 || betAmount > balance}
            onClick={handleRoll}
          >
            {rolling ? 'Spinning...' : 'Bet'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Visual stage */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[350px] bg-navy-900/50 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        {/* Help Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 4%</span>
        </div>

        <div className="text-center space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={rollResult ?? 'idle'}
              initial={{ scale: 0.9, opacity: 0.9 }}
              animate={{ scale: 1.05, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`text-6xl md:text-7xl font-display font-extrabold font-mono tracking-tight ${
                win === true ? 'text-success drop-shadow-[0_0_20px_#10B981]' :
                win === false ? 'text-danger drop-shadow-[0_0_20px_#EF4444]' :
                'text-cyan-neon drop-shadow-[0_0_20px_#00F0FF]'
              }`}
            >
              {rollResult !== null ? `${rollResult.toFixed(2)}x` : '1.00x'}
            </motion.div>
          </AnimatePresence>

          {/* Additional details */}
          <div className="min-h-[40px]">
            {win === true && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-success font-semibold uppercase tracking-wider"
              >
                🎉 TARGET HIT! Payout: {targetMultiplier}x
              </motion.p>
            )}
            {win === false && (
              <div className="space-y-1">
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-danger font-semibold uppercase tracking-wider"
                >
                  ❌ CRASHED
                </motion.p>
                {nearMiss && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block text-2xs px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold tracking-wide uppercase"
                  >
                    Close Near Miss!
                  </motion.span>
                )}
              </div>
            )}
            {rolling && (
              <p className="text-xs text-muted uppercase tracking-wider animate-pulse">Launching rocket...</p>
            )}
          </div>
        </div>

        {/* Dynamic target guide */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between text-2xs text-muted/65 border-t border-navy-800/80 pt-3">
          <span>Target: {targetMultiplier.toFixed(2)}x</span>
          <span>Win Chance: {(96 / targetMultiplier).toFixed(2)}%</span>
        </div>
      </Card>
    </div>
  );
}

