// src/components/games/MinesGame.tsx
// Stake-style Mines game (3% house edge)

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Shield, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MinesGameProps {
  onClose: () => void;
}

type TileState = {
  id: number;
  isMine: boolean;
  clicked: boolean;
};

// Combination formula: n! / (k!(n-k)!)
function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - k + i) / i;
  }
  return Math.round(result);
}

// Calculate Mines multiplier: (25 choose clicks) / ((25 - mines) choose clicks) * 0.97
function getMinesMultiplier(mines: number, clicks: number): number {
  if (clicks === 0) return 1.0;
  const n = 25;
  const totalComb = combinations(n, clicks);
  const winComb = combinations(n - mines, clicks);
  if (winComb === 0) return 0;
  // Apply a 3% house edge (0.97 multiplier)
  const mult = (totalComb / winComb) * 0.97;
  return Math.round(mult * 100) / 100;
}

export function MinesGame({ onClose }: MinesGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [mineCount, setMineCount] = useState<number>(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);

  const balance = profile?.tokens ?? 0;

  const currentMultiplier = getMinesMultiplier(mineCount, clicks);
  const nextMultiplier = getMinesMultiplier(mineCount, clicks + 1);

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
    if (mineCount < 1 || mineCount > 24) {
      toast.error('Mine count must be between 1 and 24');
      return;
    }

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Generate random mines
    const mineIndices = new Set<number>();
    while (mineIndices.size < mineCount) {
      mineIndices.add(Math.floor(Math.random() * 25));
    }

    const initialTiles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      isMine: mineIndices.has(i),
      clicked: false,
    }));

    setTiles(initialTiles);
    setIsPlaying(true);
    setClicks(0);
    setGameOver(false);
    setHasWon(false);
    setEarnedTokens(0);
    playTone(440, 0.1, 'sine', 0.2);
  };

  const handleTileClick = async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;

    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true };
    setTiles(newTiles);

    if (tile.isMine) {
      // Hit a mine! Game lost.
      setGameOver(true);
      setIsPlaying(false);
      setHasWon(false);
      playTone(150, 0.4, 'sawtooth', 0.25);
      vibrate(200);

      // Reveal all mines as red skulls, and all gems
      setTiles(newTiles.map(t => ({ ...t, clicked: true })));
      toast.error('Hit a mine! You lost your bet.');

      // Update game stats
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
      // Gem hit!
      const nextClicks = clicks + 1;
      setClicks(nextClicks);
      playTone(600 + nextClicks * 50, 0.1, 'sine', 0.2);
      vibrate(30);

      // Check if all gems are cleared
      const totalGems = 25 - mineCount;
      if (nextClicks === totalGems) {
        // Force cashout
        await handleCashOut(nextClicks);
      }
    }
  };

  const handleCashOut = async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;

    const mult = getMinesMultiplier(mineCount, finalClicks);
    const winAmount = Math.floor(betAmount * mult);
    setEarnedTokens(winAmount);
    setIsPlaying(false);
    setGameOver(true);
    setHasWon(true);

    // Reveal rest of board
    setTiles(tiles.map(t => ({ ...t, clicked: true })));

    toast.success(`Cashed Out! +${winAmount - betAmount} tokens! 🎉`);
    playTone(523.25, 0.15, 'sine', 0.3); // C5
    setTimeout(() => playTone(659.25, 0.25, 'sine', 0.3), 100); // E5
    vibrate([50, 50, 100]);

    const finalBalance = balance + winAmount; // Remember, bet was already deducted, so balance is intermediateBalance. Let's add full winAmount.
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
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={isPlaying}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary">Number of Mines</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 3, 5, 10].map((num) => (
                <Button
                  key={num}
                  variant={mineCount === num ? 'primary' : 'ghost'}
                  disabled={isPlaying}
                  onClick={() => {
                    setMineCount(num);
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-2 text-xs rounded-xl ${mineCount === num ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}
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
                value={mineCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setMineCount(Math.max(1, Math.min(val, 24)));
                }}
                disabled={isPlaying}
                className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-text-primary px-3 py-1.5 font-mono"
                placeholder="Custom Mines"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {isPlaying ? (
            <Button
              variant="success"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg border-2 border-emerald-500/20"
              disabled={clicks === 0}
              onClick={() => handleCashOut()}
            >
              Cash Out (${(betAmount * currentMultiplier).toFixed(0)})
            </Button>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
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
        {/* Help/Status info */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 3%</span>
        </div>

        {/* Mines board */}
        <div className="grid grid-cols-5 gap-2 w-full max-w-[320px] aspect-square">
          {tiles.length === 0 ? (
            // Idle placeholder board
            Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-full aspect-square rounded-xl bg-navy-800/40 border border-navy-700/50 flex items-center justify-center text-navy-600/30 text-2xl font-bold"
              >
                ?
              </div>
            ))
          ) : (
            tiles.map((tile) => (
              <motion.button
                key={tile.id}
                disabled={!isPlaying || tile.clicked || gameOver}
                onClick={() => handleTileClick(tile.id)}
                whileTap={{ scale: 0.93 }}
                className={`w-full h-full aspect-square rounded-xl border-2 transition-all flex items-center justify-center text-xl font-bold font-display select-none
                  ${
                    !tile.clicked
                      ? 'bg-navy-800 border-navy-700 hover:border-navy-500 hover:scale-[1.03]'
                      : tile.isMine
                      ? 'bg-red-500/10 border-danger/60 text-danger drop-shadow-[0_0_8px_#EF4444]'
                      : 'bg-cyan-neon/10 border-cyan-neon/60 text-cyan-neon drop-shadow-[0_0_8px_#00F0FF]'
                  }`}
              >
                {tile.clicked ? (
                  tile.isMine ? (
                    <span>💥</span>
                  ) : (
                    <span>💎</span>
                  )
                ) : (
                  <span className="text-navy-600">?</span>
                )}
              </motion.button>
            ))
          )}
        </div>

        {/* Info indicators */}
        <div className="mt-6 flex gap-4 text-center min-h-[48px] items-center">
          {isPlaying && (
            <div className="flex gap-4">
              <div>
                <p className="text-2xs text-muted uppercase tracking-wider">Current Multiplier</p>
                <p className="text-md font-bold text-cyan-neon">{currentMultiplier.toFixed(2)}x</p>
              </div>
              <div className="border-l border-navy-700"></div>
              <div>
                <p className="text-2xs text-muted uppercase tracking-wider">Next Tile</p>
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
              {hasWon ? (
                <div className="space-y-1">
                  <p className="text-xs text-success font-semibold uppercase tracking-wider">🎉 Successful Cashout</p>
                  <p className="text-lg font-bold text-gold-neon font-display">+{earnedTokens} tokens</p>
                </div>
              ) : (
                <p className="text-xs text-danger font-semibold uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <AlertTriangle size={12} /> Boom! Hit Mine
                </p>
              )}
            </motion.div>
          )}

          {!isPlaying && !gameOver && (
            <p className="text-xs text-text-secondary font-medium tracking-wide flex items-center gap-1.5">
              <Shield size={12} className="text-cyan-neon" /> Select your settings and click Start Game
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

