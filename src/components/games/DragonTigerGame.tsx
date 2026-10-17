// src/components/games/DragonTigerGame.tsx
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { playTone, vibrate } from '@/lib/utils';
import {
  createAppError,
  handleError,
  logError,
  withErrorHandling,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';
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
    <div className="relative group select-none" style={{ width: 104, height: 148, perspective: '800px' }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateY: revealed ? 0 : 180,
          scale: isWinner ? 1.05 : 1,
          y: isWinner ? -6 : 0,
        }}
        transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Front of Card */}
        <div
          className={`absolute inset-0 rounded-xl border-2 flex flex-col p-2.5 justify-between overflow-hidden transition-all duration-300 ${
            isWinner
              ? 'border-amber-400 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 shadow-[0_0_35px_rgba(251,191,36,0.8),inset_0_0_12px_rgba(251,191,36,0.3)]'
              : 'border-slate-200/90 bg-gradient-to-b from-white to-slate-50 shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Holographic foil shimmer sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-color-dodge"
            animate={{
              backgroundPosition: revealed ? ['200% 0', '-200% 0'] : '0% 0%',
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background: 'linear-gradient(115deg, transparent 20%, rgba(255,215,0,0.5) 35%, rgba(0,240,255,0.6) 50%, rgba(244,63,94,0.5) 65%, transparent 80%)',
              backgroundSize: '250% 100%',
            }}
          />

          {/* Micro linen texture layer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'radial-gradient(#000 0.75px, transparent 0.75px)',
              backgroundSize: '4px 4px',
            }}
          />

          {card && (
            <>
              {/* Top-left Index */}
              <div className={`text-xs font-black tracking-tight leading-tight z-10 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                <span className="font-mono text-sm">{card.label}</span>
                <span className="block text-base leading-none -mt-0.5">{card.suit}</span>
              </div>

              {/* Central Suit Emblem with Specular Depth */}
              <div className="relative self-center z-10 flex items-center justify-center">
                <span
                  className={`text-5xl select-none leading-none drop-shadow-md ${
                    isRed
                      ? 'text-red-500 [text-shadow:0_2px_10px_rgba(239,68,68,0.3)]'
                      : 'text-slate-800 [text-shadow:0_2px_10px_rgba(15,23,42,0.3)]'
                  }`}
                >
                  {card.suit}
                </span>
                {/* Watermark suit symbol in background */}
                <span className="absolute text-7xl opacity-[0.06] select-none text-black pointer-events-none">
                  {card.suit}
                </span>
              </div>

              {/* Bottom-right Inverted Index */}
              <div className={`text-xs font-black tracking-tight leading-tight self-end rotate-180 z-10 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                <span className="font-mono text-sm">{card.label}</span>
                <span className="block text-base leading-none -mt-0.5">{card.suit}</span>
              </div>
            </>
          )}

          {/* Subtle gold inner border */}
          <div className="absolute inset-[3px] rounded-lg border border-amber-500/20 pointer-events-none" />
        </div>

        {/* Back of Card — Luxury Gilded Casino Pattern */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-amber-500/60 flex items-center justify-center overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'radial-gradient(circle at center, #1e3a8a 0%, #0f172a 100%)',
          }}
        >
          {/* Filigree lattice background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0, #fbbf24 1.5px, transparent 0, transparent 8px), repeating-linear-gradient(-45deg, #fbbf24 0, #fbbf24 1.5px, transparent 0, transparent 8px)',
            }}
          />

          {/* Gilded Center Medallion */}
          <div className="relative w-16 h-24 border-2 border-amber-400/80 rounded-lg flex flex-col items-center justify-center bg-navy-950/80 shadow-[inset_0_0_12px_rgba(251,191,36,0.3)]">
            <div className="w-12 h-20 border border-amber-400/40 rounded flex flex-col items-center justify-center">
              <span className="text-amber-400 text-2xl drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]">⚜</span>
              <span className="text-[8px] font-mono font-bold tracking-widest text-amber-300/80 mt-1 uppercase">AQUA</span>
            </div>
          </div>

          {/* Holographic rim glint */}
          <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none" />
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
    if (!betSelection) return { valid: false, error: 'Select Dragon, Tiger, or Tie to play' };
    if (betAmount <= 0) return { valid: false, error: 'Bet amount must be greater than 0' };
    if (betAmount > balance) return { valid: false, error: 'Insufficient tokens for this bet' };
    if (!Number.isFinite(betAmount)) return { valid: false, error: 'Invalid bet amount' };
    return { valid: true };
  }, [betSelection, betAmount, balance]);

  // Update user balance in database with error handling
  const updateUserBalance = useCallback(
    withErrorHandling(
      async (newBalance: number, freeTrialsUsed?: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;

        try {
          const dbUpdates: any = { tokens: newBalance };
          if (freeTrialsUsed) {
            const currentTrials = pr.free_trials ?? 3;
            dbUpdates.free_trials = Math.max(0, currentTrials - 1);
          }

          const { error } = await (supabase.from('users') as any)
            .update(dbUpdates)
            .eq('id', pr.id);

          if (error) {
            throw createAppError(
              `Failed to update user balance: ${error.message}`,
              ErrorCategory.DATABASE,
              ErrorSeverity.ERROR,
              {
                userMessage: 'Failed to deduct tokens. Please try again.',
                context: { originalError: error.message },
              }
            );
          }

          return true;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          throw createAppError(
            `Database update failed: ${error.message}`,
            ErrorCategory.DATABASE,
            ErrorSeverity.ERROR,
            {
              userMessage: 'Failed to process your bet. Your tokens have not been deducted.',
              context: { error: error.message },
            }
          );
        }
      },
      {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.ERROR,
        fallbackReturn: false,
      }
    ),
    []
  );

  // Update game result in database with error recovery
  const updateGameResult = useCallback(
    withErrorHandling(
      async (finalBalance: number, earned: number, won: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;

        try {
          const { error: updateError } = await (supabase.from('users') as any)
            .update({
              tokens: finalBalance,
              total_earned: pr.total_earned + (won ? Math.max(0, earned - betAmount) : 0),
              xp: pr.xp + Math.floor(betAmount * 0.1),
            })
            .eq('id', pr.id);

          if (updateError) {
            logError(updateError, { context: 'dragontiger_result_update' });
          }

          const { error: statsError } = await (supabase.from('game_stats') as any).upsert({
            user_id: pr.id,
            games_played: 1,
            games_won: won ? 1 : 0,
          });

          if (statsError) {
            logError(statsError, { context: 'dragontiger_stats_update' });
          }

          return true;
        } catch (err) {
          logError(err, { context: 'dragontiger_database_error' });
          // Don't throw - update local state anyway
          return true;
        }
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: true }
    ),
    [betAmount]
  );

  const handleDeal = useCallback(async () => {
    try {
      // Validate bet
      const validation = validateBet();
      if (!validation.valid) {
        handleError(
          createAppError(
            validation.error || 'Invalid bet',
            ErrorCategory.VALIDATION,
            ErrorSeverity.WARNING,
            { userMessage: validation.error }
          ),
          { showToast: true }
        );
        return;
      }

      const pr = profileRef.current;
      if (!pr) {
        throw createAppError(
          'User profile not loaded',
          ErrorCategory.AUTH,
          ErrorSeverity.ERROR,
          { userMessage: 'Please refresh and try again.' }
        );
      }

      const isOwner = pr?.email === 'vermaarnav113@gmail.com';
      const freeTrials = pr?.free_trials ?? 3;
      const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
      const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

      if (outOfTrials) {
        handleError(
          createAppError(
            'No free trials remaining',
            ErrorCategory.GAME_LOGIC,
            ErrorSeverity.WARNING,
            { userMessage: 'Out of free trials! Deposit real cash to play unlimited.' }
          ),
          { showToast: true }
        );
        return;
      }

      const actualBet = isFreeTrial ? 0 : betAmount;
      const newBalance = balanceRef.current - actualBet;

      // Update database if not guest
      if (!pr.id.startsWith('guest')) {
        const updateSuccess = await updateUserBalance(newBalance, isFreeTrial);
        if (!updateSuccess) {
          throw createAppError(
            'Failed to update balance',
            ErrorCategory.DATABASE,
            ErrorSeverity.ERROR,
            { userMessage: 'Failed to process your bet. Please try again.' }
          );
        }
      }

      // Update local state
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

      // Start dealing animation
      setDealing(true);
      setDragonCard(null);
      setTigerCard(null);
      setDragonRevealed(false);
      setTigerRevealed(false);
      setOutcome(null);
      setPayoutResult(null);
      playTone(300, 0.1, 'sine', 0.2);

      const dCard = getRandomCard();
      const tCard = getRandomCard();

      setTimeout(() => {
        setDragonCard(dCard);
        playTone(400, 0.08, 'sine', 0.12);
        vibrate(20);
      }, 500);

      setTimeout(() => {
        setDragonRevealed(true);
        playTone(450, 0.06, 'sine', 0.1);
      }, 1000);

      setTimeout(() => {
        setTigerCard(tCard);
        playTone(400, 0.08, 'sine', 0.12);
        vibrate(20);
      }, 1400);

      setTimeout(() => {
        setTigerRevealed(true);
        playTone(450, 0.06, 'sine', 0.1);
      }, 1900);

      // Resolve game outcome
      setTimeout(async () => {
        try {
          let winner: 'dragon' | 'tiger' | 'tie';
          if (dCard.value > tCard.value) winner = 'dragon';
          else if (tCard.value > dCard.value) winner = 'tiger';
          else winner = 'tie';

          setOutcome(winner);
          setHistory(prev => [...prev.slice(-29), winner === 'dragon' ? 'D' : winner === 'tiger' ? 'T' : 'Tie']);

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

          // User feedback
          if (isWin) {
            toast.success(`🎉 ${winner.toUpperCase()} wins! +${earned - betAmount} tokens!`);
            playTone(523, 0.15, 'sine', 0.3);
            vibrate([50, 50, 100]);
          } else if (winner === 'tie' && betSelection !== 'tie') {
            toast.custom(() => (
              <div className="bg-orange-950 border border-orange-500/50 p-3 rounded-xl text-xs text-orange-400 font-semibold">
                🤝 Tie! 50% returned ({earned} tokens)
              </div>
            ));
            playTone(300, 0.2, 'sine', 0.2);
          } else {
            toast.error(`Lost ${betAmount} tokens.`);
            playTone(180, 0.3, 'sawtooth', 0.2);
            vibrate(120);
          }

          // Update database
          balanceRef.current = finalBalance;
          await updateGameResult(finalBalance, earned, isWin);
          updateProfile({ tokens: finalBalance });
        } catch (error) {
          logError(error, { context: 'dragontiger_outcome_resolution' });
          setDealing(false);
          handleError(error, {
            showToast: true,
            fallbackMessage: 'Failed to complete game. Your balance has not been updated.',
          });
        }
      }, 2300);
    } catch (error) {
      handleError(error, {
        showToast: true,
        fallbackMessage: 'Failed to deal cards. Please try again.',
      });
    }
  }, [validateBet, updateUserBalance, updateGameResult, betAmount, betSelection]);

  return (
    <ErrorBoundary name="DragonTigerGame">
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
                  className={`py-3.5 rounded-xl border-2 font-bold text-sm transition-all relative overflow-hidden ${
                    betSelection === 'dragon'
                      ? 'border-red-500 bg-gradient-to-r from-red-950/70 to-red-900/50 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'border-navy-700/80 bg-navy-900/40 hover:border-red-500/50 text-text-secondary'
                  }`}>
                  🐉 Dragon (2x)
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={dealing}
                  onClick={() => { setBetSelection('tiger'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3.5 rounded-xl border-2 font-bold text-sm transition-all relative overflow-hidden ${
                    betSelection === 'tiger'
                      ? 'border-cyan-neon bg-gradient-to-r from-cyan-950/70 to-cyan-900/50 text-cyan-neon shadow-[0_0_20px_rgba(0,240,255,0.35)]'
                      : 'border-navy-700/80 bg-navy-900/40 hover:border-cyan-500/50 text-text-secondary'
                  }`}>
                  🐯 Tiger (2x)
                </motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={dealing}
                onClick={() => { setBetSelection('tie'); playTone(400, 0.05, 'sine', 0.1); }}
                className={`w-full py-3.5 rounded-xl border-2 font-bold text-sm transition-all relative overflow-hidden ${
                  betSelection === 'tie'
                    ? 'border-emerald-500 bg-gradient-to-r from-emerald-950/70 to-emerald-900/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'border-navy-700/80 bg-navy-900/40 hover:border-emerald-500/50 text-text-secondary'
                }`}>
                🤝 Tie (11x)
              </motion.button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.25)]" disabled={dealing || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleDeal}>
            {dealing ? 'Dealing...' : 'Deal Cards'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col gap-4 relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl p-5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-amber-300/60 z-20 font-mono"><HelpCircle size={10} /><span>3.73% edge</span></div>

        {/* Bead road — VIP Casino Acrylic Tracker */}
        <div className="flex items-center gap-2 p-2 bg-navy-950/70 rounded-xl border border-navy-800/70 shadow-inner z-10">
          <span className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-widest shrink-0 ml-1">
            ROAD:
          </span>
          <div className="grid grid-cols-10 gap-1.5 flex-1 min-w-0">
            {history.slice(-30).map((h, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}
                className={`w-6 h-6 rounded-full border text-3xs flex items-center justify-center font-bold shadow-sm ${
                  h === 'D'
                    ? 'bg-red-500/25 border-red-500/70 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : h === 'T'
                    ? 'bg-cyan-500/25 border-cyan-500/70 text-cyan-neon shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                    : 'bg-emerald-500/25 border-emerald-500/70 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                }`}>
                {h[0]}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Card table — Luxury Casino Felt with Dynamic Directional PBR Spotlight */}
        <div
          className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-6 p-6 relative overflow-hidden shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] border-2 border-emerald-950"
          style={{
            backgroundColor: '#021e12',
            backgroundImage: `
              radial-gradient(ellipse at 50% 40%, rgba(16, 185, 129, 0.22) 0%, rgba(4, 38, 20, 0.85) 60%, rgba(1, 15, 8, 0.98) 100%),
              repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 5px),
              repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.08) 0, rgba(0, 0, 0, 0.08) 1px, transparent 1px, transparent 5px)
            `,
          }}
        >
          {/* Ambient Casino Chandelier Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 75%)',
            }}
          />

          {/* Dragon Spotlight */}
          <motion.div
            className="absolute top-0 bottom-0 left-[8%] w-[42%] pointer-events-none rounded-full blur-2xl"
            animate={{
              opacity: outcome === 'dragon' ? 0.5 : outcome === null && dealing ? 0.18 : 0.04,
              scale: outcome === 'dragon' ? [1, 1.08, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.35 },
              scale: { repeat: outcome === 'dragon' ? Infinity : 0, duration: 1.4, ease: 'easeInOut' },
            }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.85) 0%, rgba(239, 68, 68, 0.25) 50%, transparent 75%)',
            }}
          />

          {/* Tiger Spotlight */}
          <motion.div
            className="absolute top-0 bottom-0 right-[8%] w-[42%] pointer-events-none rounded-full blur-2xl"
            animate={{
              opacity: outcome === 'tiger' ? 0.5 : outcome === null && dealing ? 0.18 : 0.04,
              scale: outcome === 'tiger' ? [1, 1.08, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.35 },
              scale: { repeat: outcome === 'tiger' ? Infinity : 0, duration: 1.4, ease: 'easeInOut' },
            }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.85) 0%, rgba(0, 240, 255, 0.25) 50%, transparent 75%)',
            }}
          />

          {/* Tie Spotlight */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-full blur-3xl"
            animate={{
              opacity: outcome === 'tie' ? 0.55 : 0,
              scale: outcome === 'tie' ? [1, 1.1, 1] : 1,
            }}
            transition={{
              opacity: { duration: 0.35 },
              scale: { repeat: outcome === 'tie' ? Infinity : 0, duration: 1.2 },
            }}
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.9) 0%, rgba(245, 158, 11, 0.35) 50%, transparent 75%)',
            }}
          />

          {/* Casino Felt Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
            <span className="text-8xl font-display font-black tracking-widest text-amber-200 uppercase">
              AQUASPIN
            </span>
          </div>

          <div className="flex items-center gap-10 md:gap-14 relative z-10">
            {/* Dragon Box */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                <span className="text-sm font-black text-red-400 uppercase tracking-widest font-display drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  Dragon
                </span>
              </div>
              <div className="relative">
                {outcome === 'dragon' && (
                  <motion.div
                    className="absolute -inset-3 rounded-2xl pointer-events-none"
                    animate={{
                      boxShadow: [
                        '0 0 10px rgba(239,68,68,0.3)',
                        '0 0 45px rgba(239,68,68,0.85), inset 0 0 20px rgba(239,68,68,0.4)',
                        '0 0 10px rgba(239,68,68,0.3)',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
                <AnimatePresence>
                  {dragonCard && (
                    <motion.div key="dragon" initial={{ y: -180, opacity: 0, scale: 0.75, rotate: -4 }} animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
                      <PlayingCard card={dragonCard} revealed={dragonRevealed} isWinner={outcome === 'dragon'} />
                    </motion.div>
                  )}
                  {!dragonCard && (
                    <div className="w-[104px] h-[148px] rounded-xl border-2 border-dashed border-red-800/40 bg-red-950/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-red-400/40 shadow-inner">
                      <span className="text-2xl opacity-60">🐉</span>
                      <span className="text-[10px] font-mono tracking-widest font-bold">DRAGON</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center VS / Outcome Badge */}
            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={dealing ? { scale: [1, 1.18, 1], rotate: [0, 4, -4, 0] } : { scale: 1 }}
                transition={{ repeat: dealing ? Infinity : 0, duration: 0.85 }}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-display font-black text-lg shadow-lg backdrop-blur-md transition-all duration-300 ${
                  outcome === 'dragon'
                    ? 'border-red-500 bg-red-950/70 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
                    : outcome === 'tiger'
                    ? 'border-cyan-neon bg-cyan-950/70 text-cyan-neon shadow-[0_0_25px_rgba(0,240,255,0.6)]'
                    : outcome === 'tie'
                    ? 'border-emerald-400 bg-emerald-950/70 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.7)]'
                    : 'border-amber-400/40 bg-navy-950/60 text-amber-200/60 shadow-[0_4px_15px_rgba(0,0,0,0.5)]'
                }`}
              >
                {outcome ? (outcome === 'tie' ? '🤝' : outcome === 'dragon' ? '🐉' : '🐯') : 'VS'}
              </motion.div>
            </div>

            {/* Tiger Box */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-cyan-neon uppercase tracking-widest font-display drop-shadow-[0_0_10px_rgba(0,240,255,0.6)]">
                  Tiger
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
              </div>
              <div className="relative">
                {outcome === 'tiger' && (
                  <motion.div
                    className="absolute -inset-3 rounded-2xl pointer-events-none"
                    animate={{
                      boxShadow: [
                        '0 0 10px rgba(0,240,255,0.3)',
                        '0 0 45px rgba(0,240,255,0.85), inset 0 0 20px rgba(0,240,255,0.4)',
                        '0 0 10px rgba(0,240,255,0.3)',
                      ],
                    }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
                <AnimatePresence>
                  {tigerCard && (
                    <motion.div key="tiger" initial={{ y: -180, opacity: 0, scale: 0.75, rotate: 4 }} animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }}>
                      <PlayingCard card={tigerCard} revealed={tigerRevealed} isWinner={outcome === 'tiger'} />
                    </motion.div>
                  )}
                  {!tigerCard && (
                    <div className="w-[104px] h-[148px] rounded-xl border-2 border-dashed border-cyan-800/40 bg-cyan-950/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-cyan-400/40 shadow-inner">
                      <span className="text-2xl opacity-60">🐯</span>
                      <span className="text-[10px] font-mono tracking-widest font-bold">TIGER</span>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Outcome Announcement */}
          <div className="min-h-[50px] text-center relative z-10">
            <AnimatePresence>
              {outcome && (
                <motion.div
                  initial={{ scale: 0.75, opacity: 0, y: 12 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  className="bg-navy-950/85 px-6 py-2.5 rounded-2xl border border-amber-500/30 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                >
                  <h3 className={`text-2xl font-black font-display uppercase tracking-widest ${
                    outcome === 'dragon'
                      ? 'text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                      : outcome === 'tiger'
                      ? 'text-cyan-neon drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]'
                      : 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                  }`}>
                    {outcome === 'tie' ? '🤝 Tie Game!' : `${outcome} wins!`}
                  </h3>
                  {payoutResult !== null && payoutResult > 0 && (
                    <motion.p initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                      Payout: +{payoutResult} tokens 💰
                    </motion.p>
                  )}
                </motion.div>
              )}
              {dealing && !dragonCard && (
                <p className="text-xs font-mono text-amber-200/70 animate-pulse uppercase tracking-wider bg-navy-950/60 px-4 py-1.5 rounded-full border border-amber-500/20">
                  Shuffling high-roller deck...
                </p>
              )}
              {dealing && dragonCard && !tigerCard && (
                <p className="text-xs font-mono text-cyan-200/70 animate-pulse uppercase tracking-wider bg-navy-950/60 px-4 py-1.5 rounded-full border border-cyan-500/20">
                  Revealing Tiger card...
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
    </ErrorBoundary>
  );
}
