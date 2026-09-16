import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Info, ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  value: Value;
}

type BetType = 'player' | 'banker' | 'tie' | null;

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as Value[];

const getCardValue = (val: Value): number => {
  if (['10', 'J', 'Q', 'K'].includes(val)) return 0;
  if (val === 'A') return 1;
  return parseInt(val);
};

const calculateScore = (cards: Card[]): number => {
  const total = cards.reduce((sum, card) => sum + getCardValue(card.value), 0);
  return total % 10;
};

const getRandomCard = (): Card => ({
  suit: SUITS[Math.floor(Math.random() * SUITS.length)],
  value: VALUES[Math.floor(Math.random() * VALUES.length)]
});

export default function BaccaratGame() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [betAmount, setBetAmount] = useState(10);
  const [betType, setBetType] = useState<BetType>(null);
  
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  
  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'result'>('betting');
  const [result, setResult] = useState<'player' | 'banker' | 'tie' | null>(null);
  const [payout, setPayout] = useState(0);

  const handleDeal = async () => {
    if (!profile) return;
    if (!betType) {
      toast.error('Please select a bet type');
      return;
    }
    if (profile.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      const success = await secureUpdateTokens(profile.id, -betAmount);
      if (!success) throw new Error('Transaction failed');

      setGameState('dealing');
      
      const p1 = getRandomCard();
      const b1 = getRandomCard();
      const p2 = getRandomCard();
      const b2 = getRandomCard();

      setPlayerCards([p1]);
      setTimeout(() => setBankerCards([b1]), 500);
      setTimeout(() => setPlayerCards([p1, p2]), 1000);
      setTimeout(() => {
        setBankerCards([b1, b2]);
        resolveGame([p1, p2], [b1, b2]);
      }, 1500);
    } catch (e) {
      toast.error('Failed to place bet');
      setGameState('betting');
    }
  };

  const resolveGame = (pCards: Card[], bCards: Card[]) => {
    let pScore = calculateScore(pCards);
    const bScore = calculateScore(bCards);

    if (pScore >= 8 || bScore >= 8) {
      finishGame(pCards, bCards);
      return;
    }

    let pThirdCard: Card | null = null;
    const newPCards = [...pCards];
    const newBCards = [...bCards];

    if (pScore <= 5) {
      pThirdCard = getRandomCard();
      newPCards.push(pThirdCard);
      pScore = calculateScore(newPCards);
      setTimeout(() => setPlayerCards([...newPCards]), 1000);
    }

    let bankerDraws = false;
    if (!pThirdCard) {
      if (bScore <= 5) bankerDraws = true;
    } else {
      const p3Val = getCardValue(pThirdCard.value);
      if (bScore <= 2) bankerDraws = true;
      else if (bScore === 3 && p3Val !== 8) bankerDraws = true;
      else if (bScore === 4 && p3Val >= 2 && p3Val <= 7) bankerDraws = true;
      else if (bScore === 5 && p3Val >= 4 && p3Val <= 7) bankerDraws = true;
      else if (bScore === 6 && (p3Val === 6 || p3Val === 7)) bankerDraws = true;
    }

    if (bankerDraws) {
      const delay = pThirdCard ? 2000 : 1000;
      setTimeout(() => {
        const bThirdCard = getRandomCard();
        newBCards.push(bThirdCard);
        setBankerCards([...newBCards]);
        finishGame(newPCards, newBCards);
      }, delay);
    } else {
      const delay = pThirdCard ? 2000 : 1000;
      setTimeout(() => finishGame(newPCards, newBCards), delay);
    }
  };

  const finishGame = async (pCards: Card[], bCards: Card[]) => {
    const pScore = calculateScore(pCards);
    const bScore = calculateScore(bCards);
    
    let winner: 'player' | 'banker' | 'tie';
    if (pScore > bScore) winner = 'player';
    else if (bScore > pScore) winner = 'banker';
    else winner = 'tie';

    setResult(winner);
    
    let winAmount = 0;
    if (winner === betType) {
      if (winner === 'tie') winAmount = betAmount * 9;
      else if (winner === 'banker') winAmount = betAmount * 1.95;
      else winAmount = betAmount * 2;
    } else if (winner === 'tie' && betType !== 'tie') {
      winAmount = betAmount;
    }

    if (profile) {
      await secureRecordGameResult({
        userId: profile.id,
        betAmount,
        earnedAmount: winAmount,
      });
    }
    
    setPayout(winAmount);
    setGameState('result');
  };

  const resetGame = () => {
    setPlayerCards([]);
    setBankerCards([]);
    setGameState('betting');
    setResult(null);
    setPayout(0);
  };

  const renderCard = (card: Card, index: number) => {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const suitSymbol = { hearts: '?', diamonds: '?', clubs: '?', spades: '?' }[card.suit];
    
    return (
      <motion.div
        key={'card-' + index}
        initial={{ opacity: 0, x: 100, y: -100, rotateY: 180 }}
        animate={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}
        className={'w-24 h-36 bg-white rounded-xl border border-gray-200 shadow-xl flex flex-col justify-between p-2 absolute ' + (isRed ? 'text-red-500' : 'text-gray-900')}
        style={{ left: (index * 30) + 'px', zIndex: index }}
      >
        <div className="text-xl font-bold">{card.value}</div>
        <div className="text-5xl self-center">{suitSymbol}</div>
        <div className="text-xl font-bold self-end rotate-180">{card.value}</div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <button 
          onClick={() => navigate('/games')}
          className="flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Games
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-4">Baccarat</h1>
        </div>

        <div className="bg-navy-800/50 border border-navy-700 rounded-3xl p-8 mb-8 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-8 mb-16">
            <div className="relative h-40">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Player {gameState === 'result' && <span className="bg-navy-700 px-3 py-1 rounded-full text-brand-400">{calculateScore(playerCards)}</span>}
              </h3>
              <div className="relative flex justify-center h-full">
                <AnimatePresence>
                  {playerCards.map((card, i) => renderCard(card, i))}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="relative h-40">
              <h3 className="text-xl font-bold text-white mb-4 text-center">
                Banker {gameState === 'result' && <span className="bg-navy-700 px-3 py-1 rounded-full text-brand-400">{calculateScore(bankerCards)}</span>}
              </h3>
              <div className="relative flex justify-center h-full">
                <AnimatePresence>
                  {bankerCards.map((card, i) => renderCard(card, i))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {gameState === 'result' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mb-8 bg-navy-900/80 py-6 rounded-2xl border border-brand-500/30"
              >
                <div className="text-3xl font-black text-white mb-2 uppercase tracking-widest">
                  {result === 'tie' ? 'Tie' : result + ' Wins'}
                </div>
                {payout > 0 ? (
                  <div className="text-emerald-400 text-xl font-bold">
                    +{Math.floor(payout).toLocaleString()} Tokens
                  </div>
                ) : (
                  <div className="text-text-secondary text-lg">Better luck next time!</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <button
                disabled={gameState !== 'betting'}
                onClick={() => setBetType('player')}
                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'player' ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-brand-500/50')}
              >
                <div className="font-bold mb-1">Player</div>
                <div className="text-sm opacity-80">1:1</div>
              </button>
              <button
                disabled={gameState !== 'betting'}
                onClick={() => setBetType('tie')}
                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'tie' ? 'border-emerald-500 bg-emerald-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-emerald-500/50')}
              >
                <div className="font-bold mb-1">Tie</div>
                <div className="text-sm opacity-80">8:1</div>
              </button>
              <button
                disabled={gameState !== 'betting'}
                onClick={() => setBetType('banker')}
                className={'p-4 rounded-xl border-2 transition-all ' + (betType === 'banker' ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-navy-600 bg-navy-700/50 text-text-secondary hover:border-purple-500/50')}
              >
                <div className="font-bold mb-1">Banker</div>
                <div className="text-sm opacity-80">0.95:1</div>
              </button>
            </div>

            <div className="bg-navy-900/50 rounded-xl p-4 flex justify-between items-center border border-navy-700">
              <span className="text-text-secondary">Bet Amount</span>
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    disabled={gameState !== 'betting'}
                    onClick={() => setBetAmount(amount)}
                    className={'px-4 py-2 rounded-lg font-bold transition-colors ' + (betAmount === amount ? 'bg-brand-500 text-white' : 'bg-navy-700 text-text-secondary hover:bg-navy-600')}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {gameState === 'betting' ? (
              <Button onClick={handleDeal} className="w-full h-14 text-xl">
                Place Bet & Deal
              </Button>
            ) : gameState === 'result' ? (
              <Button onClick={resetGame} className="w-full h-14 text-xl bg-navy-700 hover:bg-navy-600">
                Play Again
              </Button>
            ) : (
              <Button disabled className="w-full h-14 text-xl">
                Dealing...
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
