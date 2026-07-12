// src/components/games/FlipGame.tsx
// 3D CSS Neon Coin Flip game - 1.96x payout (4% house edge)

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FlipGameProps {
  onClose: () => void;
}

type Choice = 'heads' | 'tails' | null;

export function FlipGame({ onClose }: FlipGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [choice, setChoice] = useState<Choice>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [_win, setWin] = useState<boolean | null>(null);
  const [degree, setDegree] = useState(0);

  const balance = profile?.tokens ?? 0;

  const handleFlip = async () => {
    if (!choice) {
      toast.error('Choose Heads or Tails first!');
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

    setFlipping(true);
    setResult(null);
    setWin(null);
    playTone(300, 0.1, 'sine', 0.2);

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Determine result
    // Mathematically honest 50/50, but pays out 1.96x to secure the 4% house edge.
    const isHeads = Math.random() < 0.5;
    const finalResult = isHeads ? 'heads' : 'tails';
    const isWin = choice === finalResult;

    // Spin animation degrees (at least 5 full rotations + final face angle)
    const newDegree = degree + 1800 + (isHeads ? 0 : 180);
    setDegree(newDegree);

    // Coin flip timing
    setTimeout(async () => {
      setFlipping(false);
      setResult(finalResult);
      setWin(isWin);

      let finalBalance = intermediateBalance;
      if (isWin) {
        const winAmount = Math.floor(betAmount * 1.96);
        finalBalance += winAmount;
        toast.success(`You Won! +${winAmount - betAmount} tokens! 🪙`);
        playTone(523.25, 0.15, 'sine', 0.3); // C5
        setTimeout(() => playTone(659.25, 0.25, 'sine', 0.3), 100); // E5
        vibrate([50, 50, 100]);
      } else {
        toast.error(`Lost ${betAmount} tokens. Try again!`);
        playTone(180, 0.3, 'sawtooth', 0.2);
        vibrate(150);
      }

      // Update tokens in DB and store
      if (profile && !profile.id.startsWith('guest')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('users') as any).update({
            tokens: finalBalance,
            total_earned: profile.total_earned + (isWin ? Math.floor(betAmount * 0.96) : 0),
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
    }, 1500);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={flipping}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary">Pick Side</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={choice === 'heads' ? 'primary' : 'ghost'}
                disabled={flipping}
                onClick={() => {
                  setChoice('heads');
                  playTone(400, 0.05, 'sine', 0.1);
                }}
                className={`py-3 rounded-xl border ${choice === 'heads' ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700 hover:border-navy-500'}`}
              >
                🔵 Heads
              </Button>
              <Button
                variant={choice === 'tails' ? 'primary' : 'ghost'}
                disabled={flipping}
                onClick={() => {
                  setChoice('tails');
                  playTone(400, 0.05, 'sine', 0.1);
                }}
                className={`py-3 rounded-xl border ${choice === 'tails' ? 'border-gold-neon bg-gold-neon/10' : 'border-navy-700 hover:border-navy-500'}`}
              >
                🟡 Tails
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-md font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20"
            disabled={flipping || !choice || betAmount <= 0 || betAmount > balance}
            onClick={handleFlip}
          >
            {flipping ? 'Flipping...' : 'Flip Coin'}
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
          <span>Payout: 1.96x</span>
        </div>

        <div className="perspective-800 w-48 h-48 flex items-center justify-center">
          <motion.div
            className="w-40 h-40 relative transform-style-3d cursor-pointer"
            animate={{ rotateY: degree }}
            transition={{
              type: flipping ? 'tween' : 'spring',
              duration: flipping ? 1.5 : 0.6,
              ease: flipping ? 'easeOut' : 'easeOut',
            }}
          >
            {/* Heads side */}
            <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-tr from-cyan-950 to-navy-800 border-4 border-cyan-neon flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20 backface-hidden">
              <span className="text-5xl drop-shadow-[0_0_10px_#00F0FF]">🔵</span>
              <span className="text-2xs font-bold tracking-widest text-cyan-neon mt-2 uppercase font-display">Heads</span>
            </div>

            {/* Tails side */}
            <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-tr from-yellow-950 to-navy-800 border-4 border-gold-neon flex flex-col items-center justify-center shadow-lg shadow-gold-500/20 backface-hidden rotateY-180">
              <span className="text-5xl drop-shadow-[0_0_10px_#FFD700]">🟡</span>
              <span className="text-2xs font-bold tracking-widest text-gold-neon mt-2 uppercase font-display">Tails</span>
            </div>
          </motion.div>
        </div>

        {/* Display Result text */}
        <div className="mt-8 text-center min-h-[48px]">
          {result && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <p className="text-xs text-muted uppercase tracking-widest">Result</p>
              <h3 className={`text-2xl font-bold font-display uppercase ${result === 'heads' ? 'text-cyan-neon' : 'text-gold-neon'}`}>
                {result}
              </h3>
            </motion.div>
          )}
          {flipping && (
            <p className="text-sm text-text-secondary animate-pulse font-medium">Coin is in the air...</p>
          )}
        </div>
      </Card>
    </div>
  );
}

