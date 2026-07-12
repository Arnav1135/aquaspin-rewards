// src/components/games/DragonTigerGame.tsx
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

interface DragonTigerGameProps { onClose: () => void; }
type BetType = 'dragon' | 'tiger' | 'tie' | null;
type CardData = { suit: string; value: number; label: string; };

const SUITS = ['♠', '♥', '♦', '♣'];
const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getRandomCard(): CardData {
  const s = Math.floor(Math.random() * 4), v = Math.floor(Math.random() * 13);
  return { suit: SUITS[s], value: v + 1, label: LABELS[v] };
}

function PlayingCard({ card, revealed, isWinner }: { card: CardData | null; revealed: boolean; isWinner: boolean }) {
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  return (
    <div className="relative" style={{ width: 96, height: 134, perspective: '600px' }}>
      <motion.div className="w-full h-full" style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        animate={{ rotateY: revealed ? 0 : 180 }} transition={{ duration: 0.55, ease: 'easeOut' }}>
        {/* Front */}
        <div className={`absolute inset-0 rounded-xl border-2 bg-white flex flex-col p-2 justify-between ${isWinner ? 'border-yellow-400 shadow-[0_0_28px_rgba(250,204,21,0.7)]' : 'border-gray-300'}`}
          style={{ backfaceVisibility: 'hidden' }}>
          {card && (
            <>
              <div className={`text-xs font-bold leading-tight ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.label}<br />{card.suit}</div>
              <div className={`text-4xl self-center leading-none ${isRed ? 'text-red-500' : 'text-slate-800'}`}>{card.suit}</div>
              <div className={`text-xs font-bold leading-tight self-end rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.label}<br />{card.suit}</div>
            </>
          )}
        </div>
        {/* Back */}
        <div className="absolute inset-0 rounded-xl border-2 border-blue-800 flex items-center justify-center overflow-hidden"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'repeating-linear-gradient(45deg,#1e3a5f 0,#1e3a5f 4px,#0f2440 4px,#0f2440 8px)' }}>
          <div className="w-14 h-20 border border-blue-600 rounded-lg opacity-50 flex items-center justify-center">
            <span className="text-blue-400 text-xl">♦</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function DragonTigerGame({ onClose }: DragonTigerGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [dealing, setDealing] = useState(false);
  const [dragonCard, setDragonCard] = useState<CardData | null>(null);
  const [tigerCard, setTigerCard] = useState<CardData | null>(null);
  const [dragonRevealed, setDragonRevealed] = useState(false);
  const [tigerRevealed, setTigerRevealed] = useState(false);
  const [outcome, setOutcome] = useState<'dragon' | 'tiger' | 'tie' | null>(null);
  const [history, setHistory] = useState<string[]>(['D', 'T', 'D', 'Tie', 'T', 'D']);
  const [payoutResult, setPayoutResult] = useState<number | null>(null);

  const balance = profile?.tokens ?? 0;

  const handleDeal = async () => {
    if (!betSelection) { toast.error('Choose Dragon, Tiger or Tie!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    if (betAmount > balance) { toast.error('Insufficient tokens!'); return; }

    setDealing(true); setDragonCard(null); setTigerCard(null);
    setDragonRevealed(false); setTigerRevealed(false);
    setOutcome(null); setPayoutResult(null);
    playTone(300, 0.1, 'sine', 0.2);

    const nb = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id); } catch {}
    }
    updateProfile({ tokens: nb });

    const dCard = getRandomCard(), tCard = getRandomCard();

    setTimeout(() => { setDragonCard(dCard); playTone(400, 0.08, 'sine', 0.12); vibrate(20); }, 500);
    setTimeout(() => { setDragonRevealed(true); playTone(450, 0.06, 'sine', 0.1); }, 1000);
    setTimeout(() => { setTigerCard(tCard); playTone(400, 0.08, 'sine', 0.12); vibrate(20); }, 1400);
    setTimeout(() => { setTigerRevealed(true); playTone(450, 0.06, 'sine', 0.1); }, 1900);

    setTimeout(async () => {
      let winner: 'dragon' | 'tiger' | 'tie';
      if (dCard.value > tCard.value) winner = 'dragon';
      else if (tCard.value > dCard.value) winner = 'tiger';
      else winner = 'tie';

      setOutcome(winner);
      setHistory(prev => [...prev.slice(-29), winner === 'dragon' ? 'D' : winner === 'tiger' ? 'T' : 'Tie']);

      let earned = 0, isWin = false;
      if (betSelection === winner) {
        isWin = true;
        earned = winner === 'tie' ? Math.floor(betAmount * 11) : Math.floor(betAmount * 2);
      } else if (winner === 'tie' && (betSelection === 'dragon' || betSelection === 'tiger')) {
        earned = Math.floor(betAmount * 0.5);
      }

      setPayoutResult(earned); setDealing(false);
      const fb = nb + earned;

      if (isWin) { toast.success(`🎉 ${winner.toUpperCase()} wins! +${earned - betAmount} tokens!`); playTone(523, 0.15, 'sine', 0.3); vibrate([50, 50, 100]); }
      else if (winner === 'tie' && betSelection !== 'tie') { toast.custom(() => <div className="bg-orange-950 border border-orange-500/50 p-3 rounded-xl text-xs text-orange-400 font-semibold">🤝 Tie! 50% returned ({earned} tokens)</div>); playTone(300, 0.2, 'sine', 0.2); }
      else { toast.error(`Lost ${betAmount} tokens.`); playTone(180, 0.3, 'sawtooth', 0.2); vibrate(120); }

      if (profile && !profile.id.startsWith('guest')) {
        try {
          await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? earned - betAmount : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
          await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });
        } catch {}
      }
      updateProfile({ tokens: fb });
    }, 2300);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={dealing} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Select Bet</span>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={dealing}
                  onClick={() => { setBetSelection('dragon'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'dragon' ? 'border-red-500 bg-red-950/30 text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.3)]' : 'border-navy-700 text-text-secondary'}`}>
                  🐉 Dragon (2x)
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={dealing}
                  onClick={() => { setBetSelection('tiger'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'tiger' ? 'border-cyan-neon bg-cyan-950/30 text-cyan-neon shadow-[0_0_16px_rgba(0,240,255,0.25)]' : 'border-navy-700 text-text-secondary'}`}>
                  🐯 Tiger (2x)
                </motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={dealing}
                onClick={() => { setBetSelection('tie'); playTone(400, 0.05, 'sine', 0.1); }}
                className={`w-full py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'tie' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-[0_0_16px_rgba(22,163,74,0.4)]' : 'border-navy-700 text-text-secondary'}`}>
                🤝 Tie (11x)
              </motion.button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={dealing || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleDeal}>
            {dealing ? 'Dealing...' : 'Deal Cards'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col gap-4 relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl p-5 overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted"><HelpCircle size={10} /><span>3.73% edge</span></div>

        {/* Bead road */}
        <div className="grid grid-cols-10 gap-1">
          {history.slice(-30).map((h, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
              className={`w-5 h-5 rounded-full border text-3xs flex items-center justify-center font-bold ${h === 'D' ? 'bg-red-500/20 border-red-500/50 text-red-400' : h === 'T' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-neon' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'}`}>
              {h[0]}
            </motion.div>
          ))}
        </div>

        {/* Card table — felt */}
        <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-6 p-4 relative"
          style={{ background: 'radial-gradient(ellipse at center, #14532d 0%, #052e16 100%)', backgroundImage: 'radial-gradient(ellipse at center, #14532d 0%, #052e16 100%), repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 0, transparent 50%)' }}>

          <div className="flex items-center gap-12">
            {/* Dragon */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-bold text-red-400 uppercase tracking-widest font-display">Dragon</span>
              <div className="relative">
                {outcome === 'dragon' && (
                  <motion.div className="absolute inset-0 rounded-xl -m-2"
                    animate={{ boxShadow: ['0 0 0 rgba(239,68,68,0)', '0 0 40px rgba(239,68,68,0.7)', '0 0 0 rgba(239,68,68,0)'] }}
                    transition={{ repeat: 3, duration: 0.7 }} />
                )}
                <AnimatePresence>
                  {dragonCard && (
                    <motion.div key="dragon" initial={{ y: -160, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
                      <PlayingCard card={dragonCard} revealed={dragonRevealed} isWinner={outcome === 'dragon'} />
                    </motion.div>
                  )}
                  {!dragonCard && <div className="w-24 h-[134px] rounded-xl border-2 border-dashed border-red-900/40 bg-red-950/10 flex items-center justify-center text-red-900/50 text-3xs font-mono tracking-widest">DRAGON</div>}
                </AnimatePresence>
              </div>
            </div>

            {/* VS */}
            <motion.div animate={dealing ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={{ repeat: dealing ? Infinity : 0, duration: 0.8 }}
              className="text-2xl font-extrabold text-white/30 font-display">
              {outcome ? (outcome === 'tie' ? '🤝' : outcome === 'dragon' ? '🐉' : '🐯') : 'VS'}
            </motion.div>

            {/* Tiger */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-bold text-cyan-neon uppercase tracking-widest font-display">Tiger</span>
              <div className="relative">
                {outcome === 'tiger' && (
                  <motion.div className="absolute inset-0 rounded-xl -m-2"
                    animate={{ boxShadow: ['0 0 0 rgba(0,240,255,0)', '0 0 40px rgba(0,240,255,0.6)', '0 0 0 rgba(0,240,255,0)'] }}
                    transition={{ repeat: 3, duration: 0.7 }} />
                )}
                <AnimatePresence>
                  {tigerCard && (
                    <motion.div key="tiger" initial={{ y: -160, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
                      <PlayingCard card={tigerCard} revealed={tigerRevealed} isWinner={outcome === 'tiger'} />
                    </motion.div>
                  )}
                  {!tigerCard && <div className="w-24 h-[134px] rounded-xl border-2 border-dashed border-cyan-900/40 bg-cyan-950/10 flex items-center justify-center text-cyan-900/50 text-3xs font-mono tracking-widest">TIGER</div>}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Outcome */}
          <div className="min-h-[48px] text-center">
            <AnimatePresence>
              {outcome && (
                <motion.div initial={{ scale: 0.8, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}>
                  <h3 className={`text-2xl font-bold font-display uppercase tracking-widest ${outcome === 'dragon' ? 'text-red-400' : outcome === 'tiger' ? 'text-cyan-neon' : 'text-emerald-400'}`}>
                    {outcome === 'tie' ? 'Tie Game!' : `${outcome} wins!`}
                  </h3>
                  {payoutResult !== null && payoutResult > 0 && <p className="text-xs text-gold-neon font-semibold">Payout: +{payoutResult} tokens</p>}
                </motion.div>
              )}
              {dealing && !dragonCard && <p className="text-xs text-white/40 animate-pulse uppercase tracking-wider">Shuffling deck...</p>}
              {dealing && dragonCard && !tigerCard && <p className="text-xs text-white/40 animate-pulse uppercase tracking-wider">Dealing tiger...</p>}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}
