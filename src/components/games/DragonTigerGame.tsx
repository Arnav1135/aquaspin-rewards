// src/components/games/DragonTigerGame.tsx
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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

function PlayingPlaque({ card, revealed, side, isWinner }: { card: CardData | null; revealed: boolean; side: 'dragon' | 'tiger'; isWinner: boolean }) {
  const isRed = card?.suit === '♥' || card?.suit === '♦';
  const themeClass = side === 'dragon' 
    ? 'from-amber-900 to-red-950 border-orange-500 text-orange-400' 
    : 'from-slate-900 to-cyan-950 border-cyan-500 text-cyan-300';
  
  return (
    <div className="relative" style={{ width: 104, height: 142, perspective: '600px' }}>
      <motion.div className="w-full h-full" style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        animate={{ rotateY: revealed ? 0 : 180 }} transition={{ duration: 0.65, ease: 'easeOut' }}>
        
        {/* Front plaque (Jade/Gold) */}
        <div 
          className={`absolute inset-0 rounded-2xl border-2 bg-gradient-to-b flex flex-col p-3 justify-between ${themeClass} ${
            isWinner ? 'shadow-[0_0_35px_rgba(250,204,21,0.8)] border-yellow-400 animate-pulse' : 'shadow-inner'
          }`}
          style={{ backfaceVisibility: 'hidden', borderStyle: 'solid' }}
        >
          {card && (
            <>
              <div className={`text-2xs font-extrabold font-mono tracking-tighter ${isRed ? 'text-red-400' : 'text-slate-300'}`}>
                {card.label}
              </div>
              <div className={`text-5xl self-center font-black filter drop-shadow-[0_0_8px_rgba(255,255,255,0.25)] ${isRed ? 'text-red-500' : 'text-slate-200'}`}>
                {card.suit}
              </div>
              <div className="text-2xs font-bold font-mono tracking-tighter text-right select-none opacity-50">
                {card.label}
              </div>
            </>
          )}
        </div>

        {/* Back plaque (Elemental Stone casing) */}
        <div 
          className={`absolute inset-0 rounded-2xl border-2 flex items-center justify-center overflow-hidden bg-slate-950 ${
            side === 'dragon' ? 'border-orange-800/60' : 'border-cyan-800/60'
          }`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Engraving */}
          <div className={`w-16 h-22 border rounded-xl opacity-30 flex items-center justify-center ${
            side === 'dragon' ? 'border-orange-500 text-orange-500' : 'border-cyan-500 text-cyan-500'
          }`}>
            <span className="text-xl font-bold">{side === 'dragon' ? '🐉' : '🐯'}</span>
          </div>
          <span className="absolute text-[8px] tracking-widest text-slate-400 font-medium bottom-2 uppercase font-mono">sealed</span>
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
  const profileRef = useRef(profile);
  const balanceRef = useRef(balance);

  // Validate bet selection and amount
  const validateBet = useCallback((): { valid: boolean; error?: string } => {
    if (!betSelection) return { valid: false, error: 'Select Dragon, Tiger, or Tie to place bet' };
    if (betAmount <= 0) return { valid: false, error: 'Bet amount must be greater than 0' };
    if (betAmount > balance) return { valid: false, error: 'Insufficient tokens for this bet' };
    return { valid: true };
  }, [betSelection, betAmount, balance]);

  // Update user balance in database with error handling
  const updateUserBalance = useCallback(
    async (newBalance: number, freeTrialsUsed?: boolean) => {
      const pr = profileRef.current;
      if (!pr || pr.id.startsWith('guest')) return true;
      const dbUpdates: any = { tokens: newBalance };
      if (freeTrialsUsed) {
        const currentTrials = pr.free_trials ?? 3;
        dbUpdates.free_trials = Math.max(0, currentTrials - 1);
      }
      const { error } = await (supabase.from('users') as any).update(dbUpdates).eq('id', pr.id);
      return !error;
    },
    []
  );

  // Update game result in database with error recovery
  const updateGameResult = useCallback(
    async (finalBalance: number, earned: number, won: boolean) => {
      const pr = profileRef.current;
      if (!pr || pr.id.startsWith('guest')) return true;
      try {
        await (supabase.from('users') as any).update({
          tokens: finalBalance,
          total_earned: pr.total_earned + (won ? Math.max(0, earned - betAmount) : 0),
          xp: pr.xp + Math.floor(betAmount * 0.1),
        }).eq('id', pr.id);

        await (supabase.from('game_stats') as any).upsert({
          user_id: pr.id,
          games_played: 1,
          games_won: won ? 1 : 0,
        });
        return true;
      } catch (err) {
        return true;
      }
    },
    [betAmount]
  );

  const handleDeal = useCallback(async () => {
    try {
      const validation = validateBet();
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid bet');
        return;
      }

      const pr = profileRef.current;
      if (!pr) return;

      const isOwner = pr?.email === 'vermaarnav113@gmail.com';
      const freeTrials = pr?.free_trials ?? 3;
      const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
      const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

      if (outOfTrials) {
        toast.error('Out of free trials! Deposit to play.');
        return;
      }

      const actualBet = isFreeTrial ? 0 : betAmount;
      const newBalance = balanceRef.current - actualBet;

      if (!pr.id.startsWith('guest')) {
        const updateSuccess = await updateUserBalance(newBalance, isFreeTrial);
        if (!updateSuccess) return;
      }

      balanceRef.current = newBalance;
      updateProfile({
        tokens: newBalance,
        ...(isFreeTrial ? { free_trials: Math.max(0, freeTrials - 1) } : {}),
      });

      if (isFreeTrial) {
        toast.success(`Free Trial Used! (${Math.max(0, freeTrials - 1)} left)`, {
          icon: '🎁',
          duration: 2000,
        });
      }

      // Start dealing sequence
      setDealing(true);
      setDragonCard(null);
      setTigerCard(null);
      setDragonRevealed(false);
      setTigerRevealed(false);
      setOutcome(null);
      setPayoutResult(null);

      // Pedestal activation growl
      const baseTone = betSelection === 'dragon' ? 180 : betSelection === 'tiger' ? 240 : 200;
      playTone(baseTone, 0.25, 'triangle', 0.3);
      vibrate(50);

      const dCard = getRandomCard();
      const tCard = getRandomCard();

      // Card draw sequence (Heavy drops)
      setTimeout(() => {
        setDragonCard(dCard);
        playTone(350, 0.1, 'sawtooth', 0.15); // heavy impact
        vibrate(30);
      }, 600);

      setTimeout(() => {
        setDragonRevealed(true);
        // Crack flame casing sound
        playTone(450, 0.08, 'sine', 0.12);
      }, 1200);

      setTimeout(() => {
        setTigerCard(tCard);
        playTone(350, 0.1, 'sawtooth', 0.15);
        vibrate(30);
      }, 1800);

      setTimeout(() => {
        setTigerRevealed(true);
        // Wind swirl dissolve sound
        playTone(450, 0.08, 'sine', 0.12);
      }, 2400);

      // Resolve Outcome
      setTimeout(async () => {
        try {
          let winner: 'dragon' | 'tiger' | 'tie';
          if (dCard.value > tCard.value) winner = 'dragon';
          else if (tCard.value > dCard.value) winner = 'tiger';
          else winner = 'tie';

          setOutcome(winner);
          setHistory(prev => [...prev.slice(-14), winner === 'dragon' ? 'D' : winner === 'tiger' ? 'T' : 'Tie']);

          let earned = 0;
          let isWin = false;

          if (betSelection === winner) {
            isWin = true;
            earned = winner === 'tie' ? Math.floor(betAmount * 11) : Math.floor(betAmount * 2);
          } else if (winner === 'tie' && (betSelection === 'dragon' || betSelection === 'tiger')) {
            earned = Math.floor(betAmount * 0.5);
          }

          setPayoutResult(earned);
          setDealing(false);
          const finalBalance = balanceRef.current + earned;

          // Win effects
          if (isWin) {
            toast.success(`🎉 ${winner.toUpperCase()} wins! +${earned - betAmount} tokens!`);
            
            // Dragon flame roaring vs Tiger gale wind sounds
            const winTone = winner === 'dragon' ? 523.25 : 659.25;
            playTone(winTone, 0.2, 'sine', 0.35);
            vibrate([60, 40, 120]);
          } else if (winner === 'tie') {
            toast.custom(() => (
              <div className="bg-emerald-950/90 border border-emerald-500/50 p-3 rounded-xl text-xs text-emerald-400 font-bold backdrop-blur-md">
                🤝 Yin-Yang Tie balanced! 50% returned ({earned} tokens)
              </div>
            ));
            playTone(440, 0.3, 'sine', 0.3);
            vibrate(100);
          } else {
            toast.error(`Lost ${betAmount} tokens.`);
            playTone(160, 0.28, 'sawtooth', 0.2);
            vibrate(120);
          }

          // Update database
          balanceRef.current = finalBalance;
          await updateGameResult(finalBalance, earned, isWin);
          updateProfile({ tokens: finalBalance });
        } catch (error) {
          setDealing(false);
        }
      }, 3000);
    } catch (error) {
      setDealing(false);
    }
  }, [validateBet, updateUserBalance, updateGameResult, betAmount, betSelection]);

  return (
    <ErrorBoundary name="DragonTigerGame">
      <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #1c0a08 0%, #0a100a 50%, #080a1c 100%)' }}>
        
        {/* Screen Edge Allegiance Red/Blue glow vignette */}
        {betSelection === 'dragon' && !dealing && (
          <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_60px_rgba(239,68,68,0.25)] transition-all duration-300" />
        )}
        {betSelection === 'tiger' && !dealing && (
          <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_60px_rgba(6,182,212,0.25)] transition-all duration-300" />
        )}

        <style>{`
          .dragon-ember-bg {
            background-image: radial-gradient(circle at 20% 20%, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
          }
          .tiger-wind-bg {
            background-image: radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 70%);
          }
          .temple-felt {
            background: linear-gradient(135deg, #1c0a0a 0%, #0a120a 50%, #0a0a1c 100%);
            border: 1px solid rgba(212, 175, 55, 0.15);
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
          }
        `}</style>

        {/* Left bet controls */}
        <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-200 to-cyan-300 tracking-wider">
                SACRED DUEL
              </h2>
              <Sparkles size={16} className="text-yellow-400 animate-pulse" />
            </div>

            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={dealing} />

            {/* Pedestal style bet selection selection buttons */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Select Alliance</span>
              <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={betSelection === 'dragon' ? 'primary' : 'ghost'}
                    disabled={dealing}
                    onClick={() => { setBetSelection('dragon'); playTone(400, 0.05, 'sine', 0.1); }}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${
                      betSelection === 'dragon' 
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.35)]' 
                        : 'border-slate-850 text-slate-400'
                    }`}
                  >
                    🐉 Dragon (2x)
                  </Button>
                  <Button 
                    variant={betSelection === 'tiger' ? 'primary' : 'ghost'}
                    disabled={dealing}
                    onClick={() => { setBetSelection('tiger'); playTone(400, 0.05, 'sine', 0.1); }}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${
                      betSelection === 'tiger' 
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)]' 
                        : 'border-slate-850 text-slate-400'
                    }`}
                  >
                    🐯 Tiger (2x)
                  </Button>
                </div>
                <Button 
                  variant={betSelection === 'tie' ? 'primary' : 'ghost'}
                  disabled={dealing}
                  onClick={() => { setBetSelection('tie'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                    betSelection === 'tie' 
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                      : 'border-slate-850 text-slate-400'
                  }`}
                >
                  🤝 Yin-Yang Tie (11x)
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="neon" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-yellow-500/40 shadow-lg shadow-yellow-500/20" disabled={dealing || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleDeal}>
              {dealing ? 'CASTING ELEMENTS...' : 'INVOKE DUEL'}
            </Button>
            <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-slate-400" onClick={onClose}>
              Close Sanctuary
            </Button>
          </div>
        </Card>

        {/* Floating ancient altar view */}
        <Card className="flex-1 flex flex-col gap-4 relative min-h-[440px] temple-felt rounded-2xl p-5 overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-wider z-10">
            <HelpCircle size={10} className="text-yellow-500" />
            <span>ALTAR DECAY: 3.73%</span>
          </div>

          {/* Win history scroll */}
          <div className="w-full space-y-1">
            <div className="flex justify-center gap-1.5 overflow-x-auto py-1">
              {history.slice(-18).map((h, i) => (
                <motion.span 
                  key={i} 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }}
                  className={`w-4 h-4 rounded-full border text-[8px] font-black font-mono flex items-center justify-center ${
                    h === 'D' 
                      ? 'bg-orange-950/60 border-orange-500/50 text-orange-400' 
                      : h === 'T' 
                        ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' 
                        : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  }`}
                >
                  {h[0]}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Elemental Table felt */}
          <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-6 p-4 relative overflow-hidden border border-slate-700/40" style={{ background: 'linear-gradient(135deg, #1c0a0a 0%, #0d1a0d 50%, #0a0a1c 100%)' }}>
            {/* Background elements */}
            <div className="absolute inset-y-0 left-0 w-1/2 dragon-ember-bg pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-1/2 tiger-wind-bg pointer-events-none" />

            <div className="flex items-center gap-8 md:gap-14 z-10">
              {/* Dragon pedestal */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest font-mono">Pedestal: Dragon</span>
                <div className="relative p-2.5 rounded-2xl bg-orange-950/15 border border-orange-500/20">
                  {outcome === 'dragon' && (
                    <motion.div className="absolute inset-0 rounded-2xl -m-1"
                      animate={{ boxShadow: ['0 0 0 rgba(249,115,22,0)', '0 0 35px rgba(249,115,22,0.6)', '0 0 0 rgba(249,115,22,0)'] }}
                      transition={{ repeat: Infinity, duration: 1.0 }} />
                  )}
                  <AnimatePresence mode="wait">
                    {dragonCard ? (
                      <motion.div key="dragon" initial={{ y: -140, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                        <PlayingPlaque card={dragonCard} revealed={dragonRevealed} side="dragon" isWinner={outcome === 'dragon'} />
                      </motion.div>
                    ) : (
                      <div className="w-[104px] h-[142px] rounded-2xl border border-dashed border-orange-500/30 bg-orange-500/5 flex flex-col items-center justify-center text-orange-500/30 text-3xs font-mono tracking-widest">
                        <span>🐉</span>
                        <span className="mt-1">DRAGON</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Central Yin-Yang Tie balance clash logo */}
              <motion.div 
                animate={dealing ? { scale: [1, 1.15, 1], rotate: [0, 180, 360] } : { scale: 1, rotate: 0 }} 
                transition={{ repeat: dealing ? Infinity : 0, duration: 1.2, ease: 'linear' }}
                className="text-2xl font-black text-slate-400 font-medium/50 font-mono select-none"
              >
                {outcome ? (outcome === 'tie' ? '☯️' : outcome === 'dragon' ? '🔥' : '🌀') : 'VS'}
              </motion.div>

              {/* Tiger pedestal */}
              <div className="flex flex-col items-center gap-3">
                <span className="text-xs font-black text-cyan-300 uppercase tracking-widest font-mono">Pedestal: Tiger</span>
                <div className="relative p-2.5 rounded-2xl bg-cyan-950/15 border border-cyan-500/20">
                  {outcome === 'tiger' && (
                    <motion.div className="absolute inset-0 rounded-2xl -m-1"
                      animate={{ boxShadow: ['0 0 0 rgba(6,182,212,0)', '0 0 35px rgba(6,182,212,0.6)', '0 0 0 rgba(6,182,212,0)'] }}
                      transition={{ repeat: Infinity, duration: 1.0 }} />
                  )}
                  <AnimatePresence mode="wait">
                    {tigerCard ? (
                      <motion.div key="tiger" initial={{ y: -140, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                        <PlayingPlaque card={tigerCard} revealed={tigerRevealed} side="tiger" isWinner={outcome === 'tiger'} />
                      </motion.div>
                    ) : (
                      <div className="w-[104px] h-[142px] rounded-2xl border border-dashed border-cyan-500/30 bg-cyan-500/5 flex flex-col items-center justify-center text-cyan-500/30 text-3xs font-mono tracking-widest">
                        <span>🐯</span>
                        <span className="mt-1">TIGER</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Outcome Presentation banner */}
            <div className="min-h-[48px] text-center flex items-center justify-center">
              <AnimatePresence mode="wait">
                {outcome && (
                  <motion.div initial={{ scale: 0.85, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}>
                    <h3 className={`text-xl font-black font-display uppercase tracking-widest ${outcome === 'dragon' ? 'text-orange-400' : outcome === 'tiger' ? 'text-cyan-300' : 'text-emerald-400'}`}>
                      {outcome === 'tie' ? 'YIN-YANG TIE!' : `${outcome} aligned`}
                    </h3>
                    {payoutResult !== null && payoutResult > 0 && (
                      <p className="text-xs text-yellow-300 font-bold font-mono tracking-wide mt-0.5">
                        +{payoutResult} tokens secured
                      </p>
                    )}
                  </motion.div>
                )}
                {dealing && !dragonCard && <p className="text-xs text-slate-400 animate-pulse uppercase tracking-widest font-mono">Summoning Dragon element...</p>}
                {dealing && dragonCard && !tigerCard && <p className="text-xs text-slate-400 animate-pulse uppercase tracking-widest font-mono">Summoning Tiger element...</p>}
              </AnimatePresence>
            </div>
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
