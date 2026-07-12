// src/components/games/ChickenGame.tsx
// Stake/MyStake-style Chicken game (3.5% house edge)

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChickenGameProps {
  onClose: () => void;
}

type CoverState = {
  id: number;
  isBone: boolean;
  clicked: boolean;
};

// Combination math
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - k + i) / i;
  }
  return Math.round(result);
}

// Chicken multiplier: (25 choose clicks) / ((25 - bones) choose clicks) * 0.965 (3.5% house edge)
function getChickenMultiplier(bones: number, clicks: number): number {
  if (clicks === 0) return 1.0;
  const n = 25;
  const totalComb = choose(n, clicks);
  const winComb = choose(n - bones, clicks);
  if (winComb === 0) return 0;
  const mult = (totalComb / winComb) * 0.965;
  return Math.round(mult * 100) / 100;
}

export function ChickenGame({ onClose }: ChickenGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [boneCount, setBoneCount] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [covers, setCovers] = useState<CoverState[]>([]);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);

  const balance = profile?.tokens ?? 0;

  const currentMultiplier = getChickenMultiplier(boneCount, clicks);
  const nextMultiplier = getChickenMultiplier(boneCount, clicks + 1);

  const startNewGame = async () => {
    if (isPlaying) return;
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }
    if (betAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }
    if (boneCount < 1 || boneCount > 24) {
      toast.error('Bone count must be between 1 and 24');
      return;
    }

    // Deduct bet
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Generate bones
    const boneIndices = new Set<number>();
    while (boneIndices.size < boneCount) {
      boneIndices.add(Math.floor(Math.random() * 25));
    }

    const initialCovers = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isBone: boneIndices.has(i),
      clicked: false,
    }));

    setCovers(initialCovers);
    setIsPlaying(true);
    setClicks(0);
    setGameOver(false);
    setWin(false);
    setEarnedTokens(0);
    playTone(350, 0.1, 'triangle', 0.2);
  };

  const handleCoverClick = async (id: number) => {
    if (!isPlaying || gameOver) return;
    const cover = covers[id];
    if (cover.clicked) return;

    const newCovers = [...covers];
    newCovers[id] = { ...cover, clicked: true };
    setCovers(newCovers);

    if (cover.isBone) {
      // Hit a bone! Game lost.
      setGameOver(true);
      setIsPlaying(false);
      setWin(false);
      playTone(130, 0.45, 'sawtooth', 0.2);
      vibrate(200);

      // Reveal board
      setCovers(newCovers.map(c => ({ ...c, clicked: true })));
      toast.error('Hit a bone! ☠️ Game Over!');

      if (profile && !profile.id.startsWith('guest')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('game_stats') as any).upsert({
            user_id: profile.id,
            games_played: 1,
            games_won: 0,
          });
        } catch {}
      }
    } else {
      // Chicken!
      const nextClicks = clicks + 1;
      setClicks(nextClicks);
      playTone(500 + nextClicks * 60, 0.08, 'sine', 0.2);
      vibrate(25);

      // Check if all chickens are cleared
      const totalChickens = 25 - boneCount;
      if (nextClicks === totalChickens) {
        await handleCashOut(nextClicks);
      }
    }
  };

  const handleCashOut = async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;

    const mult = getChickenMultiplier(boneCount, finalClicks);
    const winAmount = Math.floor(betAmount * mult);
    setEarnedTokens(winAmount);
    setIsPlaying(false);
    setGameOver(true);
    setWin(true);

    // Reveal rest of board
    setCovers(covers.map(c => ({ ...c, clicked: true })));

    toast.success(`Cashed Out! +${winAmount - betAmount} tokens! 🍗`);
    playTone(587.33, 0.15, 'sine', 0.3); // D5
    setTimeout(() => playTone(698.46, 0.25, 'sine', 0.3), 100); // F5
    vibrate([50, 50, 100]);

    const finalBalance = balance + winAmount; // Bet was already deducted
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({
          tokens: finalBalance,
          total_earned: profile.total_earned + (winAmount - betAmount),
          xp: profile.xp + Math.floor(betAmount * 0.1),
        }).eq('id', profile.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('game_stats') as any).upsert({
          user_id: profile.id,
          games_played: 1,
          games_won: 1,
        });
      } catch {}
    }
    updateProfile({ tokens: finalBalance });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control Panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={isPlaying}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary">Number of Bones</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 3, 5, 10].map((num) => (
                <Button
                  key={num}
                  variant={boneCount === num ? 'primary' : 'ghost'}
                  disabled={isPlaying}
                  onClick={() => {
                    setBoneCount(num);
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-2 text-xs rounded-xl ${boneCount === num ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}
                >
                  {num}
                </Button>
              ))}
            </div>
            <div className="flex rounded-xl bg-navy-950 p-1 border border-navy-700/60 mt-2">
              <input
                type="number"
                min="1"
                max="24"
                value={boneCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setBoneCount(Math.max(1, Math.min(val, 24)));
                }}
                disabled={isPlaying}
                className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-text-primary px-3 py-1.5 font-mono"
                placeholder="Custom Bones"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {isPlaying ? (
            <Button
              variant="success"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
              disabled={clicks === 0}
              onClick={() => handleCashOut()}
            >
              Cash Out (${(betAmount * currentMultiplier).toFixed(0)})
            </Button>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg animate-pulse-glow"
              disabled={betAmount <= 0 || betAmount > balance}
              onClick={startNewGame}
            >
              Start Game
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Visual stage */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[420px] bg-navy-900/50 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        {/* Help Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 3.5%</span>
        </div>

        {/* Dome grid */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-[320px] aspect-square">
          {covers.length === 0 ? (
            Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-full aspect-square rounded-xl bg-navy-800/40 border border-navy-700/50 flex items-center justify-center text-navy-600/30 text-2xl font-bold"
              >
                🍽️
              </div>
            ))
          ) : (
            covers.map((c) => (
              <motion.button
                key={c.id}
                disabled={!isPlaying || c.clicked || gameOver}
                onClick={() => handleCoverClick(c.id)}
                whileTap={{ scale: 0.93 }}
                className={`w-full h-full aspect-square rounded-xl border-2 transition-all flex items-center justify-center text-xl font-bold font-display select-none
                  ${
                    !c.clicked
                      ? 'bg-navy-800 border-navy-700 hover:border-navy-500 hover:scale-[1.03]'
                      : c.isBone
                      ? 'bg-red-500/10 border-danger/60 text-danger drop-shadow-[0_0_8px_#EF4444]'
                      : 'bg-emerald-500/10 border-emerald-500/60 text-success drop-shadow-[0_0_8px_#10B981]'
                  }`}
              >
                {c.clicked ? (
                  c.isBone ? (
                    <span>☠️</span>
                  ) : (
                    <span>🍗</span>
                  )
                ) : (
                  <span className="text-xl">🍽️</span>
                )}
              </motion.button>
            ))
          )}
        </div>

        {/* Indicators */}
        <div className="mt-6 flex gap-4 text-center min-h-[48px] items-center">
          {isPlaying && (
            <div className="flex gap-4">
              <div>
                <p className="text-2xs text-muted uppercase tracking-wider">Current Multiplier</p>
                <p className="text-md font-bold text-cyan-neon">{currentMultiplier.toFixed(2)}x</p>
              </div>
              <div className="border-l border-navy-700"></div>
              <div>
                <p className="text-2xs text-muted uppercase tracking-wider">Next Chicken</p>
                <p className="text-md font-bold text-gold-neon">{nextMultiplier.toFixed(2)}x</p>
              </div>
            </div>
          )}

          {gameOver && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {win ? (
                <div className="space-y-1">
                  <p className="text-xs text-success font-semibold uppercase tracking-wider">🍗 Cashout Successful!</p>
                  <p className="text-lg font-bold text-gold-neon font-display">+{earnedTokens} tokens</p>
                </div>
              ) : (
                <p className="text-xs text-danger font-semibold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <AlertCircle size={12} /> Hit a Bone! Bones are bad.
                </p>
              )}
            </motion.div>
          )}

          {!isPlaying && !gameOver && (
            <p className="text-xs text-text-secondary font-medium tracking-wide">
              🐔 Lift the cloches, find chickens, and avoid bones!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

