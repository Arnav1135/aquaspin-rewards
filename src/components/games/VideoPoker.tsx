import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import { ProvablyFairModal } from '@/components/ui/ProvablyFairModal';
import { audio } from '@/lib/audioEngine';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';

interface VideoPokerProps {
  onClose: () => void;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  value: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: { rank: Rank; value: number }[] = [
  { rank: '2', value: 2 }, { rank: '3', value: 3 }, { rank: '4', value: 4 },
  { rank: '5', value: 5 }, { rank: '6', value: 6 }, { rank: '7', value: 7 },
  { rank: '8', value: 8 }, { rank: '9', value: 9 }, { rank: '10', value: 10 },
  { rank: 'J', value: 11 }, { rank: 'Q', value: 12 }, { rank: 'K', value: 13 },
  { rank: 'A', value: 14 }
];

const PAYTABLE = {
  'Royal Flush': 800,
  'Straight Flush': 50,
  'Four of a Kind': 25,
  'Full House': 9,
  'Flush': 6,
  'Straight': 4,
  'Three of a Kind': 3,
  'Two Pair': 2,
  'Jacks or Better': 1,
  'None': 0
};

const createFreshDeck = (): PlayingCard[] => {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({ suit, rank, value });
    }
  }
  return deck;
};

// Cryptographic Fisher-Yates shuffle using Provably Fair float derivations
const shuffleDeckCryptographically = async (
  deck: PlayingCard[],
  serverSeed: string,
  clientSeed: string,
  startNonce: number
): Promise<{ shuffled: PlayingCard[]; nextNonce: number }> => {
  const result = [...deck];
  let curNonce = startNonce;

  for (let i = result.length - 1; i > 0; i--) {
    const floatVal = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, curNonce++);
    const randIndex = Math.floor(floatVal * (i + 1));
    const temp = result[i];
    result[i] = result[randIndex];
    result[randIndex] = temp;
  }

  return { shuffled: result, nextNonce: curNonce };
};

const evaluateHand = (cards: PlayingCard[]): { name: string; multiplier: number } => {
  if (cards.length < 5) return { name: 'None', multiplier: 0 };
  
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check straight
  let isStraight = false;
  if (values[4] - values[0] === 4 && new Set(values).size === 5) {
    isStraight = true;
  } else if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
    // A-2-3-4-5 straight
    isStraight = true;
  }

  // Count value occurrences
  const counts: { [val: number]: number } = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countValues = Object.values(counts).sort((a, b) => b - a);

  // Royal Flush
  if (isFlush && isStraight && values[0] === 10 && values[4] === 14) {
    return { name: 'Royal Flush', multiplier: PAYTABLE['Royal Flush'] };
  }
  
  // Straight Flush
  if (isFlush && isStraight) {
    return { name: 'Straight Flush', multiplier: PAYTABLE['Straight Flush'] };
  }

  // Four of a Kind
  if (countValues[0] === 4) {
    return { name: 'Four of a Kind', multiplier: PAYTABLE['Four of a Kind'] };
  }

  // Full House
  if (countValues[0] === 3 && countValues[1] === 2) {
    return { name: 'Full House', multiplier: PAYTABLE['Full House'] };
  }

  // Flush
  if (isFlush) {
    return { name: 'Flush', multiplier: PAYTABLE['Flush'] };
  }

  // Straight
  if (isStraight) {
    return { name: 'Straight', multiplier: PAYTABLE['Straight'] };
  }

  // Three of a Kind
  if (countValues[0] === 3) {
    return { name: 'Three of a Kind', multiplier: PAYTABLE['Three of a Kind'] };
  }

  // Two Pair
  if (countValues[0] === 2 && countValues[1] === 2) {
    return { name: 'Two Pair', multiplier: PAYTABLE['Two Pair'] };
  }

  // Jacks or Better
  if (countValues[0] === 2) {
    const pairValue = Object.keys(counts).find(k => counts[parseInt(k)] === 2);
    if (pairValue && parseInt(pairValue) >= 11) {
      return { name: 'Jacks or Better', multiplier: PAYTABLE['Jacks or Better'] };
    }
  }

  return { name: 'None', multiplier: 0 };
};

export const VideoPokerContent: React.FC<VideoPokerProps> = ({ onClose }) => {
  const { profile, updateProfile } = useAuthStore();
  const [bet, setBet] = useState(10);
  const [hand, setHand] = useState<PlayingCard[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'gameover'>('betting');
  const deckRef = useRef<PlayingCard[]>([]);
  const [winAmount, setWinAmount] = useState(0);
  const [handName, setHandName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [provablyFairOpen, setProvablyFairOpen] = useState(false);

  const { activeServerSeed, clientSeed, getAndIncrementNonce, rotateServerSeed } = useProvablyFairStore();

  const deal = useCallback(async () => {
    if (!profile) return;
    if (bet <= 0 || bet > (profile?.tokens || 0)) {
      toast.error('Invalid bet amount');
      return;
    }

    setIsProcessing(true);
    try {
      await secureUpdateTokens(profile?.id || "", -bet);
      updateProfile({ tokens: profile.tokens - bet });
      audio.play('cards', 'shuffle');

      let seed = activeServerSeed;
      if (!seed) {
        await rotateServerSeed();
        seed = useProvablyFairStore.getState().activeServerSeed;
      }

      const freshDeck = createFreshDeck();
      const startNonce = getAndIncrementNonce();
      const { shuffled } = await shuffleDeckCryptographically(freshDeck, seed, clientSeed, startNonce);

      const dealtHand = shuffled.slice(0, 5);
      deckRef.current = shuffled.slice(5);

      setHand(dealtHand);
      setHeld([false, false, false, false, false]);
      setGameState('playing');
      setWinAmount(0);
      setHandName('');
      audio.play('cards', 'deal');
    } catch (e: any) {
      toast.error(e?.message || 'Error starting game');
    }
    setIsProcessing(false);
  }, [profile, bet, activeServerSeed, clientSeed, getAndIncrementNonce, rotateServerSeed]);

  const toggleHold = (index: number) => {
    if (gameState !== 'playing') return;
    audio.play('ui', 'chip');
    const newHeld = [...held];
    newHeld[index] = !newHeld[index];
    setHeld(newHeld);
  };

  const draw = useCallback(async () => {
    if (gameState !== 'playing' || !profile) return;
    
    setIsProcessing(true);
    try {
      const newHand = [...hand];
      
      for (let i = 0; i < 5; i++) {
        if (!held[i]) {
          const nextCard = deckRef.current.shift();
          if (nextCard) newHand[i] = nextCard;
        }
      }
      
      setHand(newHand);
      audio.play('cards', 'deal');
      
      const { name, multiplier } = evaluateHand(newHand);
      const wonTokens = bet * multiplier;
      
      setHandName(name);
      setWinAmount(wonTokens);
      setGameState('gameover');

      if (wonTokens > 0) {
        audio.play('cards', 'win');
        toast.success(`🎉 ${name}! Won ${wonTokens} tokens!`);
        if (profile?.id && !profile.id.startsWith('guest')) {
          const res = await secureRecordGameResult({
            userId: profile.id,
            betAmount: 0,
            earnedAmount: wonTokens,
            xpEarned: Math.floor(bet * 0.15)
          });
          if (res?.data) {
            updateProfile({ tokens: res.data });
          } else {
            const currentLive = useAuthStore.getState().profile?.tokens ?? profile.tokens;
            updateProfile({ tokens: currentLive + wonTokens });
          }
        } else if (profile) {
          const currentLive = useAuthStore.getState().profile?.tokens ?? profile.tokens;
          updateProfile({ tokens: currentLive + wonTokens });
        }
      } else {
        audio.play('ui', 'lose');
      }
    } catch (e: any) {
      toast.error('Failed to resolve hand');
    }
    setIsProcessing(false);
  }, [gameState, profile, hand, held, bet, updateProfile]);

  return (
    <div className="flex flex-col items-center justify-between p-4 max-w-4xl mx-auto min-h-[580px] w-full text-white bg-[#0c1424] rounded-3xl border border-cyan-500/30 shadow-2xl relative select-none">
      {/* Top Header */}
      <div className="flex justify-between items-center w-full pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500">
            VIDEO POKER
          </h2>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            v2.5 AAA
          </span>
          <button
            onClick={() => setProvablyFairOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            title="Provably Fair Verification"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Provably Fair</span>
          </button>
        </div>
        <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white text-xs font-bold">
          Exit
        </Button>
      </div>
      
      {/* Paytable */}
      <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/5 my-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Jacks or Better Paytable</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
          {Object.entries(PAYTABLE).filter(([k]) => k !== 'None').map(([name, mult]) => (
            <div key={name} className={`flex justify-between px-2 py-1 rounded ${handName === name ? 'bg-yellow-500/20 text-yellow-300 font-black border border-yellow-400/30' : 'text-slate-300'}`}>
              <span className="truncate">{name}</span>
              <span className="font-bold text-yellow-400">{mult}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Display */}
      <div className="flex gap-2 sm:gap-3 my-6 justify-center min-h-[140px]">
        {hand.length > 0 ? (
          hand.map((card, idx) => (
            <div 
              key={idx} 
              className={`relative w-16 h-26 sm:w-22 sm:h-32 rounded-xl bg-white flex flex-col items-center justify-between p-2 cursor-pointer transition-all duration-200 ${
                held[idx] ? '-translate-y-3 shadow-xl ring-2 ring-yellow-400 scale-105' : 'hover:-translate-y-1 shadow-md'
              }`}
              onClick={() => toggleHold(idx)}
            >
              <span className={`text-base sm:text-lg font-black ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                {card.rank}
              </span>
              <span className={`text-2xl sm:text-3xl ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </span>
              <span className={`text-base sm:text-lg font-black self-end rotate-180 ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                {card.rank}
              </span>
              {held[idx] && (
                <span className="absolute -bottom-6 text-yellow-400 font-black text-[11px] bg-black/80 border border-yellow-400/40 px-2 py-0.5 rounded-full shadow-lg">
                  HELD
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="flex gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-16 h-26 sm:w-22 sm:h-32 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-white/20 text-xl font-bold">
                🂠
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Result Announcement */}
      {gameState === 'gameover' && (
        <div className="my-2 text-center bg-black/40 border border-white/10 px-6 py-3 rounded-2xl">
          <h3 className={`text-xl font-black ${winAmount > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {winAmount > 0 ? `Won +${winAmount} tokens!` : 'No payout this hand'}
          </h3>
          {handName && handName !== 'None' && <p className="text-yellow-400 font-bold text-sm">{handName}</p>}
        </div>
      )}

      {/* Action Footer */}
      <div className="w-full max-w-sm mt-auto pt-3">
        {gameState === 'betting' || gameState === 'gameover' ? (
          <div className="flex flex-col items-center w-full gap-3">
            <BetControl betAmount={bet} setBetAmount={setBet} minBet={1} maxBet={1000} disabled={isProcessing} />
            <Button 
              onClick={deal} 
              disabled={isProcessing || !profile || bet > (profile?.tokens || 0)} 
              className="w-full py-4 text-lg font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/20"
            >
              Deal Hand
            </Button>
          </div>
        ) : (
          <Button 
            onClick={draw} 
            disabled={isProcessing} 
            className="w-full py-4 text-lg font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
          >
            Draw Cards
          </Button>
        )}
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal isOpen={provablyFairOpen} onClose={() => setProvablyFairOpen(false)} />
    </div>
  );
};

export default function VideoPoker(props: VideoPokerProps) {
  return (
    <ErrorBoundary name="VideoPoker">
      <VideoPokerContent {...props} />
    </ErrorBoundary>
  );
}
