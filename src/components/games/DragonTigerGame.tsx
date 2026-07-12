// src/components/games/DragonTigerGame.tsx
// Casino style Dragon Tiger card game (3.73% house edge)

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DragonTigerGameProps {
  onClose: () => void;
}

type BetType = 'dragon' | 'tiger' | 'tie' | null;

type CardData = {
  suit: string;
  value: number; // 1-13
  label: string;
};

const SUITS = ['♠', '♥', '♦', '♣'];
const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getRandomCard(): CardData {
  const suitIndex = Math.floor(Math.random() * SUITS.length);
  const valueIndex = Math.floor(Math.random() * LABELS.length);
  return {
    suit: SUITS[suitIndex],
    value: valueIndex + 1,
    label: LABELS[valueIndex],
  };
}

export function DragonTigerGame({ onClose }: DragonTigerGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [dealing, setDealing] = useState(false);
  const [dragonCard, setDragonCard] = useState<CardData | null>(null);
  const [tigerCard, setTigerCard] = useState<CardData | null>(null);
  const [outcome, setOutcome] = useState<'dragon' | 'tiger' | 'tie' | null>(null);
  const [history, setHistory] = useState<('D' | 'T' | 'Tie')[]>(['D', 'T', 'D', 'Tie', 'T', 'D']);
  const [payoutResult, setPayoutResult] = useState<number | null>(null);

  const balance = profile?.tokens ?? 0;

  const handleDeal = async () => {
    if (!betSelection) {
      toast.error('Choose Dragon, Tiger or Tie!');
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

    setDealing(true);
    setDragonCard(null);
    setTigerCard(null);
    setOutcome(null);
    setPayoutResult(null);
    playTone(300, 0.1, 'sine', 0.2);

    // Deduct bet
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Generate cards
    const dCard = getRandomCard();
    const tCard = getRandomCard();

    // Deal timing (dragon flips first, then tiger, then outcome)
    setTimeout(() => {
      setDragonCard(dCard);
      playTone(400, 0.08, 'sine', 0.1);
      vibrate(20);
    }, 600);

    setTimeout(() => {
      setTigerCard(tCard);
      playTone(400, 0.08, 'sine', 0.1);
      vibrate(20);
    }, 1200);

    setTimeout(async () => {
      // Determine winner
      let finalWinner: 'dragon' | 'tiger' | 'tie';
      if (dCard.value > tCard.value) {
        finalWinner = 'dragon';
      } else if (tCard.value > dCard.value) {
        finalWinner = 'tiger';
      } else {
        finalWinner = 'tie';
      }

      setOutcome(finalWinner);
      setHistory(prev => [...prev.slice(-15), finalWinner === 'dragon' ? 'D' : finalWinner === 'tiger' ? 'T' : 'Tie']);

      // Calculate payout
      let earned = 0;
      let isWin = false;

      if (betSelection === finalWinner) {
        isWin = true;
        if (finalWinner === 'tie') {
          earned = Math.floor(betAmount * 11); // Tie pays 11x
        } else {
          earned = Math.floor(betAmount * 2); // Dragon/Tiger pays 2x
        }
      } else if (finalWinner === 'tie' && (betSelection === 'dragon' || betSelection === 'tiger')) {
        // In a tie, Dragon/Tiger bets get 50% returned (house edge)
        earned = Math.floor(betAmount * 0.5);
      }

      setPayoutResult(earned);
      setDealing(false);

      const finalBalance = intermediateBalance + earned;

      if (isWin) {
        toast.success(`You Won! +${earned - betAmount} tokens! 🎉`);
        playTone(523.25, 0.15, 'sine', 0.3); // C5
        vibrate([50, 50, 100]);
      } else if (finalWinner === 'tie' && (betSelection === 'dragon' || betSelection === 'tiger')) {
        toast.custom((_t) => (
          <div className="bg-orange-950 border border-orange-500/50 p-3 rounded-xl text-xs text-orange-400 font-semibold">
            🤝 Tie Game! 50% bet returned (${earned} tokens)
          </div>
        ));
        playTone(300, 0.2, 'sine', 0.2);
      } else {
        toast.error(`Lost ${betAmount} tokens.`);
        playTone(180, 0.3, 'sawtooth', 0.2);
        vibrate(120);
      }

      // Sync with Supabase
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
    }, 1800);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={dealing}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Select Bet</span>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={betSelection === 'dragon' ? 'primary' : 'ghost'}
                  disabled={dealing}
                  onClick={() => {
                    setBetSelection('dragon');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-3 rounded-xl border font-bold text-sm ${betSelection === 'dragon' ? 'border-red-500 bg-red-950/20 text-red-400' : 'border-navy-700 hover:border-navy-500 text-text-primary'}`}
                >
                  🐉 Dragon (2x)
                </Button>
                <Button
                  variant={betSelection === 'tiger' ? 'primary' : 'ghost'}
                  disabled={dealing}
                  onClick={() => {
                    setBetSelection('tiger');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-3 rounded-xl border font-bold text-sm ${betSelection === 'tiger' ? 'border-cyan-neon bg-cyan-950/20 text-cyan-neon' : 'border-navy-700 hover:border-navy-500 text-text-primary'}`}
                >
                  🐯 Tiger (2x)
                </Button>
              </div>
              <Button
                variant={betSelection === 'tie' ? 'primary' : 'ghost'}
                disabled={dealing}
                onClick={() => {
                  setBetSelection('tie');
                  playTone(400, 0.05, 'sine', 0.1);
                }}
                className={`w-full py-3 rounded-xl border font-bold text-sm ${betSelection === 'tie' ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400' : 'border-navy-700 hover:border-navy-500 text-text-primary'}`}
              >
                🤝 Tie (11x)
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
            disabled={dealing || !betSelection || betAmount <= 0 || betAmount > balance}
            onClick={handleDeal}
          >
            {dealing ? 'Dealing...' : 'Deal Cards'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Visual stage */}
      <Card className="flex-1 flex flex-col items-center justify-between relative min-h-[420px] bg-navy-900/50 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        {/* Help Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 3.73%</span>
        </div>

        {/* Bead road history */}
        <div className="flex gap-1.5 w-full overflow-x-auto pb-2 justify-center">
          {history.map((h, i) => (
            <span
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-3xs font-extrabold shrink-0 border
                ${h === 'D' ? 'bg-red-500/10 border-red-500/30 text-red-400' : h === 'T' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-neon' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Card Stage */}
        <div className="flex justify-around items-center w-full max-w-md my-4">
          {/* Dragon card slot */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold tracking-wider text-red-500 font-display uppercase">Dragon</span>
            <div className={`w-28 h-40 rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all
              ${outcome === 'dragon' ? 'border-red-500 bg-red-950/20 scale-[1.03]' : 'border-navy-700 bg-navy-800/40'}`}>
              <AnimatePresence mode="wait">
                {dragonCard ? (
                  <motion.div
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className="flex flex-col items-center text-text-primary h-full justify-between p-4 w-full"
                  >
                    <span className="self-start text-xs font-bold font-mono text-red-400">{dragonCard.label}{dragonCard.suit}</span>
                    <span className="text-3xl text-red-400">{dragonCard.suit}</span>
                    <span className="self-end text-xs font-bold font-mono text-red-400">{dragonCard.label}{dragonCard.suit}</span>
                  </motion.div>
                ) : (
                  <span className="text-3xs text-muted tracking-widest font-mono">DRAGON</span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="text-xl font-extrabold text-muted">VS</div>

          {/* Tiger card slot */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold tracking-wider text-cyan-neon font-display uppercase">Tiger</span>
            <div className={`w-28 h-40 rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all
              ${outcome === 'tiger' ? 'border-cyan-neon bg-cyan-950/20 scale-[1.03]' : 'border-navy-700 bg-navy-800/40'}`}>
              <AnimatePresence mode="wait">
                {tigerCard ? (
                  <motion.div
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className="flex flex-col items-center text-text-primary h-full justify-between p-4 w-full"
                  >
                    <span className="self-start text-xs font-bold font-mono text-cyan-neon">{tigerCard.label}{tigerCard.suit}</span>
                    <span className="text-3xl text-cyan-neon">{tigerCard.suit}</span>
                    <span className="self-end text-xs font-bold font-mono text-cyan-neon">{tigerCard.label}{tigerCard.suit}</span>
                  </motion.div>
                ) : (
                  <span className="text-3xs text-muted tracking-widest font-mono">TIGER</span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Display deal outcome */}
        <div className="min-h-[48px] text-center mt-2 flex flex-col justify-center">
          {outcome && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <h3 className={`text-xl font-bold font-display uppercase tracking-widest ${
                outcome === 'dragon' ? 'text-red-500' :
                outcome === 'tiger' ? 'text-cyan-neon' :
                'text-emerald-400'
              }`}>
                {outcome === 'tie' ? 'Tie Game' : `${outcome} wins`}
              </h3>
              {payoutResult !== null && payoutResult > 0 && (
                <p className="text-xs text-gold-neon font-semibold uppercase tracking-wider">
                  Payout: +{payoutResult} tokens
                </p>
              )}
            </motion.div>
          )}
          {dealing && !dragonCard && (
            <p className="text-xs text-muted uppercase tracking-wider animate-pulse">Shuffling deck...</p>
          )}
          {dealing && dragonCard && !tigerCard && (
            <p className="text-xs text-muted uppercase tracking-wider animate-pulse">Flipping tiger...</p>
          )}
        </div>
      </Card>
    </div>
  );
}


