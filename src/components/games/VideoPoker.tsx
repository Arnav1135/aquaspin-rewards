import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

const createDeck = (): PlayingCard[] => {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({ suit, rank, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const evaluateHand = (cards: PlayingCard[]): { name: string; multiplier: number } => {
  if (cards.length !== 5) return { name: 'None', multiplier: 0 };
  
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1) ||
                     (values.join(',') === '2,3,4,5,14'); // A,2,3,4,5
  
  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const countValues = Object.values(counts).sort((a, b) => b - a);
  
  if (isFlush && isStraight && values.includes(14) && values.includes(13)) return { name: 'Royal Flush', multiplier: PAYTABLE['Royal Flush'] };
  if (isFlush && isStraight) return { name: 'Straight Flush', multiplier: PAYTABLE['Straight Flush'] };
  if (countValues[0] === 4) return { name: 'Four of a Kind', multiplier: PAYTABLE['Four of a Kind'] };
  if (countValues[0] === 3 && countValues[1] === 2) return { name: 'Full House', multiplier: PAYTABLE['Full House'] };
  if (isFlush) return { name: 'Flush', multiplier: PAYTABLE['Flush'] };
  if (isStraight) return { name: 'Straight', multiplier: PAYTABLE['Straight'] };
  if (countValues[0] === 3) return { name: 'Three of a Kind', multiplier: PAYTABLE['Three of a Kind'] };
  if (countValues[0] === 2 && countValues[1] === 2) return { name: 'Two Pair', multiplier: PAYTABLE['Two Pair'] };
  
  // Jacks or Better
  const pairs = Object.entries(counts).filter(([_, count]) => count === 2).map(([val, _]) => Number(val));
  if (pairs.some(p => p >= 11)) return { name: 'Jacks or Better', multiplier: PAYTABLE['Jacks or Better'] };
  
  return { name: 'None', multiplier: PAYTABLE['None'] };
};

const VideoPokerContent: React.FC<VideoPokerProps> = ({ onClose }) => {
  const user = useAuthStore(state => state.user);
  const [bet, setBet] = useState(10);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'gameover'>('betting');
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [hand, setHand] = useState<PlayingCard[]>([]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [winAmount, setWinAmount] = useState(0);
  const [handName, setHandName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const deal = useCallback(async () => {
    if (!user) return;
    if (bet <= 0 || bet > user.tokens) {
      toast.error('Invalid bet amount');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await secureUpdateTokens(user.id, -bet, 'VideoPoker_Bet');
      if (!success) {
        toast.error('Insufficient funds');
        setIsProcessing(false);
        return;
      }
      
      const newDeck = createDeck();
      setHand(newDeck.splice(0, 5));
      setDeck(newDeck);
      setHeld([false, false, false, false, false]);
      setGameState('playing');
      setWinAmount(0);
      setHandName('');
    } catch (e) {
      console.error(e);
      toast.error('Error starting game');
    }
    setIsProcessing(false);
  }, [user, bet]);

  const toggleHold = (index: number) => {
    if (gameState !== 'playing') return;
    const newHeld = [...held];
    newHeld[index] = !newHeld[index];
    setHeld(newHeld);
  };

  const draw = useCallback(async () => {
    if (gameState !== 'playing' || !user) return;
    
    setIsProcessing(true);
    try {
      const newHand = [...hand];
      const newDeck = [...deck];
      
      for (let i = 0; i < 5; i++) {
        if (!held[i]) {
          newHand[i] = newDeck.pop()!;
        }
      }
      
      setHand(newHand);
      setDeck(newDeck);
      
      const result = evaluateHand(newHand);
      setHandName(result.name);
      
      const win = bet * result.multiplier;
      setWinAmount(win);
      
      if (win > 0) {
        await secureUpdateTokens(user.id, win, 'VideoPoker_Win');
      }
      
      await secureRecordGameResult(user.id, 'VideoPoker', win, bet, win > 0 ? 'win' : 'loss');
      
      setGameState('gameover');
    } catch (e) {
      console.error(e);
      toast.error('Error drawing cards');
    }
    setIsProcessing(false);
  }, [gameState, user, hand, deck, held, bet]);

  return (
    <div className="flex flex-col items-center p-4 h-full bg-slate-900 text-white overflow-y-auto">
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Video Poker</h2>
        <Button variant="ghost" onClick={onClose}>Exit</Button>
      </div>
      
      <div className="mb-4">
        <h3 className="text-xl">Payouts</h3>
        <div className="grid grid-cols-2 gap-x-4 text-sm mt-2 opacity-80">
          {Object.entries(PAYTABLE).filter(([k]) => k !== 'None').map(([name, mult]) => (
            <div key={name} className={`flex justify-between ${handName === name ? 'text-yellow-400 font-bold' : ''}`}>
              <span>{name}</span>
              <span>{mult}x</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-8 justify-center min-h-[140px]">
        {hand.length > 0 ? (
          hand.map((card, idx) => (
            <div 
              key={idx} 
              className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white flex flex-col items-center justify-center cursor-pointer transition-transform ${held[idx] ? '-translate-y-4 shadow-lg ring-2 ring-yellow-400' : 'hover:-translate-y-1'}`}
              onClick={() => toggleHold(idx)}
            >
              <span className={`text-xl font-bold ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-500' : 'text-black'}`}>
                {card.rank}
              </span>
              <span className={`text-2xl ${['hearts', 'diamonds'].includes(card.suit) ? 'text-red-500' : 'text-black'}`}>
                {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
              </span>
              {held[idx] && (
                <span className="absolute -bottom-6 text-yellow-400 font-bold text-sm bg-black/50 px-2 rounded">HELD</span>
              )}
            </div>
          ))
        ) : (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-slate-800 border border-slate-700"></div>
            ))}
          </div>
        )}
      </div>

      {gameState === 'gameover' && (
        <div className="mb-6 text-center">
          <h3 className={`text-2xl font-bold ${winAmount > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {winAmount > 0 ? `You won ${winAmount} tokens!` : 'You lost.'}
          </h3>
          {handName !== 'None' && <p className="text-yellow-400">{handName}</p>}
        </div>
      )}

      {gameState === 'betting' || gameState === 'gameover' ? (
        <div className="flex flex-col items-center w-full max-w-sm">
          <BetControl bet={bet} setBet={setBet} minBet={1} maxBet={1000} disabled={isProcessing} />
          <Button onClick={deal} disabled={isProcessing || !user || bet > user.tokens} className="w-full mt-4" size="lg">
            Deal
          </Button>
        </div>
      ) : (
        <Button onClick={draw} disabled={isProcessing} className="w-full max-w-sm mt-4" size="lg" variant="primary">
          Draw
        </Button>
      )}
    </div>
  );
};

export default function VideoPoker(props: VideoPokerProps) {
  return (
    <ErrorBoundary>
      <VideoPokerContent {...props} />
    </ErrorBoundary>
  );
}
