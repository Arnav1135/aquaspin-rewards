// src/components/games/CoinFlipGame.tsx
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

interface CoinFlipGameProps {
  onClose: () => void;
}

type CoinSide = 'heads' | 'tails' | null;

/**
 * Coin Flip Game
 * 
 * Rules:
 * - Player bets on Heads or Tails
 * - 50/50 probability for each outcome
 * - Fair payout multiplier: (1 - houseEdge) / 0.5 ≈ 1.98x at 1% edge
 * - House edge: 1%
 */
function CoinFlip({ side, flipping }: { side: CoinSide; flipping: boolean }) {
  const isHeads = side === 'heads';

  return (
    <motion.div
      className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold cursor-default select-none"
      style={{
        background: isHeads
          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
          : 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
        boxShadow: isHeads
          ? '0 0 30px rgba(251, 191, 36, 0.5)'
          : '0 0 30px rgba(168, 85, 247, 0.5)',
      }}
      animate={
        flipping
          ? { rotateX: [0, 360, 360], rotateZ: [0, 0, 360] }
          : { rotateX: 0, rotateZ: 0 }
      }
      transition={flipping ? { duration: 1.5, ease: 'easeOut' } : { duration: 0.5 }}
    >
      {isHeads ? '👑' : '🪙'}
    </motion.div>
  );
}

export function CoinFlipGame({ onClose }: CoinFlipGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [selectedSide, setSelectedSide] = useState<CoinSide>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide>(null);
  const [payoutResult, setPayoutResult] = useState<number | null>(null);
  const [history, setHistory] = useState<CoinSide[]>(['heads', 'tails', 'heads', 'heads', 'tails']);

  const balance = profile?.tokens ?? 0;
  const profileRef = useRef(profile);
  const balanceRef = useRef(balance);

  // Validate bet selection and amount
  const validateBet = useCallback((): { valid: boolean; error?: string } => {
    if (!selectedSide) return { valid: false, error: 'Select Heads or Tails to play' };
    if (betAmount <= 0) return { valid: false, error: 'Bet amount must be greater than 0' };
    if (betAmount > balance) return { valid: false, error: 'Insufficient tokens for this bet' };
    if (!Number.isFinite(betAmount)) return { valid: false, error: 'Invalid bet amount' };
    return { valid: true };
  }, [selectedSide, betAmount, balance]);

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
            logError(updateError, { context: 'coinflip_result_update' });
          }

          const { error: statsError } = await (supabase.from('game_stats') as any).upsert({
            user_id: pr.id,
            games_played: 1,
            games_won: won ? 1 : 0,
          });

          if (statsError) {
            logError(statsError, { context: 'coinflip_stats_update' });
          }

          return true;
        } catch (err) {
          logError(err, { context: 'coinflip_database_error' });
          // Don't throw - update local state anyway
          return true;
        }
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: true }
    ),
    [betAmount]
  );

  const handleFlip = useCallback(async () => {
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

      // Start flip animation
      setFlipping(true);
      setResult(null);
      setPayoutResult(null);
      playTone(400, 0.1, 'sine', 0.1);
      vibrate([30, 30, 30]);

      // Determine result (50/50)
      const random = Math.random();
      const coinResult: CoinSide = random < 0.5 ? 'heads' : 'tails';

      // Wait for animation to complete
      setTimeout(async () => {
        try {
          setResult(coinResult);
          setFlipping(false);

          // Check if player won
          const won = coinResult === selectedSide;
          const multiplier = 1.98; // 1% house edge: (1 - 0.01) / 0.5 = 1.98x
          const earned = Math.floor(betAmount * multiplier);
          const finalBalance = balanceRef.current + earned;

          setPayoutResult(earned);

          // User feedback
          if (won) {
            toast.success(`🎉 ${coinResult.toUpperCase()}! +${earned - betAmount} tokens!`);
            playTone(523, 0.15, 'sine', 0.3);
            vibrate([50, 50, 100]);
          } else {
            toast.error(`Lost ${betAmount} tokens.`);
            playTone(180, 0.3, 'sawtooth', 0.2);
            vibrate(120);
          }

          // Update history
          setHistory(prev => [...prev.slice(-29), coinResult]);

          // Update database
          balanceRef.current = finalBalance;
          await updateGameResult(finalBalance, earned, won);
          updateProfile({ tokens: finalBalance });
        } catch (error) {
          logError(error, { context: 'coinflip_result_resolution' });
          setFlipping(false);
          handleError(error, {
            showToast: true,
            fallbackMessage: 'Failed to complete game. Your balance has not been updated.',
          });
        }
      }, 1500);
    } catch (error) {
      handleError(error, {
        showToast: true,
        fallbackMessage: 'Failed to flip coin. Please try again.',
      });
    }
  }, [validateBet, updateUserBalance, updateGameResult, betAmount, selectedSide]);

  return (
    <ErrorBoundary name="CoinFlipGame">
      <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' }}>
        <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
          <div className="space-y-4">
            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={flipping} />
            <div className="space-y-2">
              <span className="text-xs text-text-secondary font-medium">Pick a Side</span>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={flipping}
                  onClick={() => {
                    setSelectedSide('heads');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    selectedSide === 'heads'
                      ? 'border-yellow-500 bg-yellow-950/30 text-yellow-400 shadow-[0_0_16px_rgba(234,179,8,0.3)]'
                      : 'border-navy-700 text-text-secondary'
                  }`}
                >
                  👑 Heads
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={flipping}
                  onClick={() => {
                    setSelectedSide('tails');
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    selectedSide === 'tails'
                      ? 'border-purple-500 bg-purple-950/30 text-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
                      : 'border-navy-700 text-text-secondary'
                  }`}
                >
                  🪙 Tails
                </motion.button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Button
              variant="neon"
              size="lg"
              className="w-full font-bold py-4 rounded-xl"
              disabled={flipping || !selectedSide || betAmount <= 0 || betAmount > balance}
              onClick={handleFlip}
            >
              {flipping ? 'Flipping...' : 'Flip Coin'}
            </Button>
            <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
              Close Game
            </Button>
          </div>
        </Card>

        <Card className="flex-1 flex flex-col gap-4 relative min-h-[440px] border border-navy-800/80 rounded-2xl p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted">
            <HelpCircle size={10} />
            <span>1% edge</span>
          </div>

          {/* History board */}
          <div className="grid grid-cols-12 gap-1">
            {history.slice(-30).map((h, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className={`w-5 h-5 rounded-full border text-2xs flex items-center justify-center font-bold ${
                  h === 'heads'
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                    : 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                }`}
              >
                {h === 'heads' ? '👑' : '🪙'}
              </motion.div>
            ))}
          </div>

          {/* Coin display */}
          <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-6 p-4 relative"
            style={{
              background: 'radial-gradient(ellipse at center, #1a2847 0%, #0f1729 100%)',
              backgroundImage: 'radial-gradient(ellipse at center, #1a2847 0%, #0f1729 100%), repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 0, transparent 50%)',
            }}
          >
            <CoinFlip side={result || selectedSide} flipping={flipping} />

            {/* Result display */}
            <div className="min-h-[48px] text-center">
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className={`text-2xl font-bold font-display uppercase tracking-widest ${
                      result === 'heads' ? 'text-yellow-400' : 'text-purple-400'
                    }`}>
                      {result}!
                    </h3>
                    {payoutResult !== null && payoutResult > 0 && (
                      <p className="text-xs text-gold-neon font-semibold">Payout: +{payoutResult} tokens</p>
                    )}
                  </motion.div>
                )}
                {flipping && <p className="text-xs text-white/40 animate-pulse uppercase tracking-wider">Flipping...</p>}
              </AnimatePresence>
            </div>

            {/* Stats */}
            <div className="text-center text-2xs text-text-secondary space-y-1">
              <p>50% Heads | 50% Tails</p>
              <p>Payout: 1.98x on win</p>
            </div>
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
