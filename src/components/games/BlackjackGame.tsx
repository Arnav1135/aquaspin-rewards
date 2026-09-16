// src/components/games/BlackjackGame.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useSafeTimeout } from '@/hooks/useSafeTimeout';
import { supabase } from '@/lib/supabase';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import {
  createAppError,
  handleError,
  logError,
  withErrorHandling,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';
import toast from 'react-hot-toast';

interface BlackjackGameProps {
  onClose: () => void;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

function getCardValue(rank: Rank): number {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function calculateHandValue(hand: PlayingCard[]): number {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.hidden) continue;
    const v = getCardValue(card.rank);
    if (v === 11) aces++;
    value += v;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function getRandomCard(): PlayingCard {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  return {
    suit: suits[Math.floor(Math.random() * suits.length)],
    rank: ranks[Math.floor(Math.random() * ranks.length)],
  };
}

const PlayingCardUI = ({ card }: { card: PlayingCard }) => {
  if (card.hidden) {
    return (
      <div className="w-16 h-24 rounded-lg bg-indigo-900 border-2 border-indigo-500 shadow-md flex items-center justify-center">
        <div className="w-12 h-20 border border-indigo-700 rounded opacity-50 back-pattern"></div>
      </div>
    );
  }
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit];
  
  return (
    <motion.div 
      initial={{ scale: 0, x: -50 }}
      animate={{ scale: 1, x: 0 }}
      className={`w-16 h-24 rounded-lg bg-white shadow-md flex flex-col justify-between p-1.5 ${isRed ? 'text-red-600' : 'text-slate-900'}`}
    >
      <div className="text-sm font-bold leading-none">{card.rank}</div>
      <div className="text-2xl text-center flex-1 flex items-center justify-center">{suitSymbol}</div>
      <div className="text-sm font-bold leading-none rotate-180">{card.rank}</div>
    </motion.div>
  );
};

export function BlackjackGame({ onClose }: BlackjackGameProps) {
  const { setSafeTimeout } = useSafeTimeout();
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dealerTurn' | 'gameOver'>('idle');
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [payoutResult, setPayoutResult] = useState<number | null>(null);
  
  const balance = profile?.tokens ?? 0;
  const profileRef = useRef(profile);
  const balanceRef = useRef(balance);

  const updateUserBalance = useCallback(
    withErrorHandling(
      async (newBalance: number, freeTrialsUsed?: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;
        let updateError = null;
          if (freeTrialsUsed) {
            const currentTrials = pr.free_trials ?? 3;
            const { error } = await (supabase.from('users') as any)
              .update({ free_trials: Math.max(0, currentTrials - 1) })
              .eq('id', pr.id);
            updateError = error;
          }
          const tokensChange = newBalance - balanceRef.current;
          if (!updateError && tokensChange !== 0) {
            const { error } = await secureUpdateTokens(pr.id, tokensChange);
            updateError = error;
          }
          if (updateError) throw updateError;
          return true;
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: false }
    ),
    []
  );

  const updateGameResult = useCallback(
    withErrorHandling(
      async (finalBalance: number, earned: number, won: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;
        try {
          await secureRecordGameResult({
            userId: pr.id,
            betAmount: betAmount,
            earnedAmount: earned,
            xpEarned: Math.floor(betAmount * 0.1)
          });
          return true;
        } catch (err) {
          return true;
        }
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: true }
    ),
    [betAmount]
  );

  const handleDeal = async () => {
    if (betAmount <= 0 || betAmount > balanceRef.current) {
      toast.error('Invalid bet amount.');
      return;
    }

    const pr = profileRef.current;
    if (!pr) return;
    
    const isOwner = pr?.email === 'vermaarnav113@gmail.com';
    const freeTrials = pr?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

    if (outOfTrials) {
      toast.error('Out of free trials! Deposit real cash to play unlimited.');
      return;
    }

    const actualBet = isFreeTrial ? 0 : betAmount;
    const newBalance = balanceRef.current - actualBet;

    if (!pr.id.startsWith('guest')) {
      const success = await updateUserBalance(newBalance, isFreeTrial);
      if (!success) {
        toast.error('Failed to deduct bet.');
        return;
      }
    }

    balanceRef.current = newBalance;
    updateProfile({ tokens: newBalance, ...(isFreeTrial ? { free_trials: Math.max(0, freeTrials - 1) } : {}) });

    setGameState('playing');
    setResultMessage('');
    setPayoutResult(null);

    audio.play('cards', 'shuffle');
    
    setPlayerHand([getRandomCard(), getRandomCard()]);
    setDealerHand([getRandomCard(), { ...getRandomCard(), hidden: true }]);
  };

  const handleHit = () => {
    const newHand = [...playerHand, getRandomCard()];
    setPlayerHand(newHand);
    audio.play('cards', 'deal');
    
    if (calculateHandValue(newHand) > 21) {
      handleGameOver(newHand, dealerHand, 'Bust! You lose.');
    }
  };

  const handleDoubleDown = async () => {
    if (betAmount * 2 > balanceRef.current + betAmount) {
      toast.error('Insufficient balance to double down.');
      return;
    }
    
    // Deduct the extra bet amount
    const pr = profileRef.current;
    if (pr && !pr.id.startsWith('guest')) {
      const success = await updateUserBalance(balanceRef.current - betAmount, false);
      if (!success) {
        toast.error('Failed to deduct extra bet.');
        return;
      }
    }
    
    balanceRef.current -= betAmount;
    setBetAmount(betAmount * 2);
    updateProfile({ tokens: balanceRef.current });
    
    const newHand = [...playerHand, getRandomCard()];
    setPlayerHand(newHand);
    audio.play('cards', 'deal');
    
    if (calculateHandValue(newHand) > 21) {
      handleGameOver(newHand, dealerHand, 'Bust! You lose.');
    } else {
      handleStand(newHand);
    }
  };

  const handleStand = (customPlayerHand?: PlayingCard[]) => {
    const finalPlayerHand = customPlayerHand || playerHand;
    setGameState('dealerTurn');
    let currentDealerHand = [...dealerHand];
    currentDealerHand[1].hidden = false;
    
    const playDealer = () => {
      const dealerVal = calculateHandValue(currentDealerHand);
      if (dealerVal < 17) {
        currentDealerHand = [...currentDealerHand, getRandomCard()];
        setDealerHand(currentDealerHand);
        audio.play('cards', 'deal');
        setSafeTimeout(playDealer, 1000);
      } else {
        setDealerHand(currentDealerHand);
        resolveGame(finalPlayerHand, currentDealerHand);
      }
    };
    
    setSafeTimeout(playDealer, 1000);
  };

  const resolveGame = (pHand: PlayingCard[], dHand: PlayingCard[]) => {
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand);
    
    if (dVal > 21) handleGameOver(pHand, dHand, 'Dealer busts! You win.');
    else if (pVal > dVal) handleGameOver(pHand, dHand, 'You win!');
    else if (pVal < dVal) handleGameOver(pHand, dHand, 'Dealer wins.');
    else handleGameOver(pHand, dHand, 'Push (Tie).');
  };

  const handleGameOver = async (pHand: PlayingCard[], dHand: PlayingCard[], message: string) => {
    setGameState('gameOver');
    setResultMessage(message);
    
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand);
    
    let won = false;
    let earned = 0;
    
    if (pVal <= 21 && (dVal > 21 || pVal > dVal)) {
      won = true;
      earned = betAmount * 2;
      if (pVal === 21 && pHand.length === 2) {
        earned = Math.floor(betAmount * 2.5); // Blackjack pays 3:2
        setResultMessage('Blackjack! You win 3:2.');
      }
    } else if (pVal <= 21 && pVal === dVal) {
      earned = betAmount; // push
    }
    
    const finalBalance = balanceRef.current + earned;
    setPayoutResult(earned);
    
    if (won) toast.success(`You won ${earned} tokens!`);
    else if (earned > 0) toast.success(`Push! ${earned} tokens returned.`);
    else toast.error(`You lost ${betAmount} tokens.`);
    
    balanceRef.current = finalBalance;
    await updateGameResult(finalBalance, earned, won);
    updateProfile({ tokens: finalBalance });
  };

  const pVal = calculateHandValue(playerHand);
  const dVal = calculateHandValue(dealerHand);

  return (
    <ErrorBoundary name="BlackjackGame">
      <div className="flex flex-col-reverse lg:flex-row gap-6 p-4 max-w-5xl mx-auto w-full min-h-[calc(100dvh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #0e0b2e 0%, #12082a 50%, #0a1040 100%)' }}>
        <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="space-y-4">
            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={gameState !== 'idle' && gameState !== 'gameOver'} />
          </div>
          <div className="space-y-2">
            {(gameState === 'idle' || gameState === 'gameOver') && (
              <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
                onClick={handleDeal} disabled={betAmount <= 0 || betAmount > balance}>
                Deal
              </Button>
            )}
            {gameState === 'playing' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={handleHit}>Hit</Button>
                  <Button variant="neon" className="flex-1" onClick={() => handleStand()}>Stand</Button>
                </div>
                {playerHand.length === 2 && (
                  <Button variant="ghost" className="w-full" onClick={handleDoubleDown} disabled={betAmount * 2 > balance}>
                    Double Down
                  </Button>
                )}
              </div>
            )}
            <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
              Close Game
            </Button>
          </div>
        </Card>

        <Card className="flex-1 min-w-0 w-full flex flex-col items-center gap-8 relative min-h-[440px] bg-[#0a472c] backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Dealer Area */}
          <div className="flex flex-col items-center gap-4 w-full h-1/2">
            <h3 className="text-white font-bold tracking-widest uppercase">Dealer {gameState === 'gameOver' && `- ${dVal}`}</h3>
            <div className="flex gap-2 justify-center">
              <AnimatePresence>
                {dealerHand.map((card, i) => <PlayingCardUI key={i} card={card} />)}
              </AnimatePresence>
            </div>
          </div>

          {/* Center message */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 text-center w-full">
            <AnimatePresence>
              {resultMessage && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-black/50 p-4 rounded-xl backdrop-blur-sm border border-white/10 mx-auto w-fit">
                  <h2 className="text-2xl font-bold text-yellow-400">{resultMessage}</h2>
                  {payoutResult !== null && payoutResult > 0 && <p className="text-green-400 font-bold mt-2">+{payoutResult}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Player Area */}
          <div className="flex flex-col items-center gap-4 w-full h-1/2 justify-end">
            <div className="flex gap-2 justify-center">
              <AnimatePresence>
                {playerHand.map((card, i) => <PlayingCardUI key={i} card={card} />)}
              </AnimatePresence>
            </div>
            <h3 className="text-white font-bold tracking-widest uppercase">Player - {pVal}</h3>
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
