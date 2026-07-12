// src/components/games/RouletteGame.tsx
// Stake-style simplified color Roulette (2.7% house edge)

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface RouletteGameProps {
  onClose: () => void;
}

type BetType = 'red' | 'black' | 'green' | null;

type WheelTile = {
  num: number;
  color: 'red' | 'black' | 'green';
};

// 15 slots: 0 is green, 1-7 is red, 8-14 is black
const WHEEL_TILES: WheelTile[] = [
  { num: 0, color: 'green' },
  { num: 1, color: 'red' },
  { num: 8, color: 'black' },
  { num: 2, color: 'red' },
  { num: 9, color: 'black' },
  { num: 3, color: 'red' },
  { num: 10, color: 'black' },
  { num: 4, color: 'red' },
  { num: 11, color: 'black' },
  { num: 5, color: 'red' },
  { num: 12, color: 'black' },
  { num: 6, color: 'red' },
  { num: 13, color: 'black' },
  { num: 7, color: 'red' },
  { num: 14, color: 'black' },
];

export function RouletteGame({ onClose }: RouletteGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<WheelTile | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [offset, setOffset] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const balance = profile?.tokens ?? 0;

  // Create duplicate strip of tiles for continuous loop scroll effect
  const tileStrip = Array.from({ length: 15 }, () => WHEEL_TILES).flat();

  const handleSpin = async () => {
    if (!betSelection) {
      toast.error('Pick Red, Black or Green first!');
      return;
    }
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }
    if (betAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }

    setSpinning(true);
    setOutcome(null);
    setWin(null);
    playTone(220, 0.1, 'sine', 0.2);

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Select random winning index in the final repetition
    const winningIndex = Math.floor(Math.random() * 15);
    const winningTile = WHEEL_TILES[winningIndex];

    // Align offset to target the winningTile. Each tile is 80px wide.
    // We add multiple full spins (15 * 80 * repetitions)
    const tileWidth = 80;
    const totalTiles = 15;
    const baseCycles = 4; // Number of full spins
    const spinToPixel = -((baseCycles * totalTiles + winningIndex) * tileWidth) + (containerRef.current?.offsetWidth ?? 320) / 2 - tileWidth / 2;

    // Jitter/random offset inside the tile to feel natural
    const jitter = (Math.random() - 0.5) * (tileWidth * 0.7);
    const finalOffset = spinToPixel + jitter;

    // Reset strip back near start offset if we spun previously to avoid endless compounding offsets
    setOffset(0);
    setTimeout(() => {
      setOffset(finalOffset);
      playRollChimes();
    }, 50);

    setTimeout(async () => {
      setSpinning(false);
      setOutcome(winningTile);

      const isWin = betSelection === winningTile.color;
      setWin(isWin);

      let earned = 0;
      if (isWin) {
        if (winningTile.color === 'green') {
          earned = Math.floor(betAmount * 14); // Green pays 14x
        } else {
          earned = Math.floor(betAmount * 2); // Red/Black pays 2x
        }
        toast.success(`You Won! +${earned - betAmount} tokens! 🏆`);
        playTone(523.25, 0.15, 'sine', 0.3); // C5
        vibrate([50, 50, 100]);
      } else {
        toast.error(`Rolled ${winningTile.color} ${winningTile.num}. Lost bet!`);
        playTone(180, 0.3, 'sawtooth', 0.2);
        vibrate(100);
      }

      const finalBalance = intermediateBalance + earned;
      if (profile && !profile.id.startsWith('guest')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('users') as any).update({
            tokens: finalBalance,
            total_earned: profile.total_earned + (isWin ? (earned - betAmount) : 0),
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
    }, 4000);
  };

  const playRollChimes = () => {
    let count = 0;
    const interval = setInterval(() => {
      if (count > 25) {
        clearInterval(interval);
        return;
      }
      playTone(600 - count * 10, 0.02, 'sine', 0.05);
      count++;
    }, 150);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={spinning}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Select Payout</span>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={betSelection === 'red' ? 'primary' : 'ghost'}
                  disabled={spinning}
                  onClick={() => {
                    setBetSelection('red');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-3 rounded-xl border font-bold text-sm ${betSelection === 'red' ? 'border-red-500 bg-red-950/20 text-red-400 font-display' : 'border-navy-700'}`}
                >
                  🔴 Red (2x)
                </Button>
                <Button
                  variant={betSelection === 'black' ? 'primary' : 'ghost'}
                  disabled={spinning}
                  onClick={() => {
                    setBetSelection('black');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-3 rounded-xl border font-bold text-sm ${betSelection === 'black' ? 'border-navy-400 bg-navy-800/20 text-text-primary font-display' : 'border-navy-700'}`}
                >
                  ⚫ Black (2x)
                </Button>
              </div>
              <Button
                variant={betSelection === 'green' ? 'primary' : 'ghost'}
                disabled={spinning}
                onClick={() => {
                  setBetSelection('green');
                  playTone(400, 0.05, 'sine', 0.1);
                }}
                className={`w-full py-3 rounded-xl border font-bold text-sm ${betSelection === 'green' ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-display' : 'border-navy-700'}`}
              >
                🟢 Green (14x)
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
            disabled={spinning || !betSelection || betAmount <= 0 || betAmount > balance}
            onClick={handleSpin}
          >
            {spinning ? 'Spinning...' : 'Spin'}
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
          <span>House Edge: 2.70%</span>
        </div>

        {/* Horizontal sliding wheel strip */}
        <div className="w-full max-w-md relative flex flex-col items-center">
          {/* Top arrow pointer */}
          <div className="absolute -top-3 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-cyan-neon z-20 drop-shadow-[0_0_8px_#00F0FF]"></div>

          <div
            ref={containerRef}
            className="w-full h-24 bg-navy-950 border-y-2 border-navy-800 flex items-center overflow-hidden relative rounded-xl"
          >
            <motion.div
              className="flex absolute left-0"
              animate={{ x: offset }}
              transition={{
                duration: spinning ? 4 : 0,
                ease: [0.12, 0.8, 0.15, 1], // Cubic easing for smooth decelerate
              }}
              style={{ width: `${tileStrip.length * 80}px` }}
            >
              {tileStrip.map((tile, i) => (
                <div
                  key={i}
                  className={`w-[80px] h-20 border-r border-navy-900/50 flex flex-col items-center justify-center select-none shrink-0 font-display font-extrabold text-sm
                    ${
                      tile.color === 'red'
                        ? 'bg-gradient-to-b from-red-600 to-red-800 text-white'
                        : tile.color === 'black'
                        ? 'bg-gradient-to-b from-navy-800 to-navy-950 text-text-secondary border-navy-900'
                        : 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border-emerald-900'
                    }`}
                >
                  <span className="text-xl mb-0.5">{tile.color === 'red' ? '🔴' : tile.color === 'black' ? '⚫' : '🟢'}</span>
                  <span>{tile.num}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom pointer */}
          <div className="absolute -bottom-3 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-cyan-neon z-20 drop-shadow-[0_0_8px_#00F0FF]"></div>
        </div>

        {/* Display results */}
        <div className="mt-8 text-center min-h-[48px] flex flex-col justify-center">
          {outcome && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <h3 className={`text-xl font-bold font-display uppercase tracking-widest ${
                outcome.color === 'red' ? 'text-red-500' :
                outcome.color === 'black' ? 'text-text-primary' :
                'text-emerald-400'
              }`}>
                Rolled: {outcome.color} {outcome.num}
              </h3>
              {win !== null && (
                <p className={`text-xs font-semibold uppercase tracking-wider ${win ? 'text-success' : 'text-danger'}`}>
                  {win ? 'Win!' : 'Lost bet'}
                </p>
              )}
            </motion.div>
          )}
          {spinning && (
            <p className="text-xs text-muted uppercase tracking-wider animate-pulse">Wheel spinning...</p>
          )}
        </div>
      </Card>
    </div>
  );
}

