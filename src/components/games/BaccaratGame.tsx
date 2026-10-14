import { useAIGameEngine } from '@/hooks/useAIGameEngine';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { audio } from '@/lib/audioEngine';
import { Button } from '@/components/ui/Button';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import { ProvablyFairModal } from '@/components/ui/ProvablyFairModal';
import toast from 'react-hot-toast';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Value = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  value: Value;
}

type BetType = 'player' | 'banker' | 'tie' | null;

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES: Value[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const getCardValue = (val: Value): number => {
  if (['10', 'J', 'Q', 'K'].includes(val)) return 0;
  if (val === 'A') return 1;
  return parseInt(val, 10);
};

const calculateScore = (cards: Card[]): number => {
  const total = cards.reduce((sum, card) => sum + getCardValue(card.value), 0);
  return total % 10;
};

const getCardFromFloat = (floatVal: number): Card => {
  const cardIndex = Math.floor(floatVal * 52);
  const suitIndex = Math.floor(cardIndex / 13) % 4;
  const valueIndex = cardIndex % 13;
  return {
    suit: SUITS[suitIndex],
    value: VALUES[valueIndex],
  };
};

export default function BaccaratGame() {
  useAIGameEngine('baccarat', 'Baccarat', 'arcade', 'dom-css');
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [betAmount, setBetAmount] = useState(10);
  const [betType, setBetType] = useState<BetType>(null);
  
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  
  const [gameState, setGameState] = useState<'betting' | 'dealing' | 'result'>('betting');
  const [result, setResult] = useState<'player' | 'banker' | 'tie' | null>(null);
  const [payout, setPayout] = useState(0);
  const [provablyFairOpen, setProvablyFairOpen] = useState(false);

  const { activeServerSeed, clientSeed, getAndIncrementNonce, rotateServerSeed } = useProvablyFairStore();

  const drawCardCryptographically = async (): Promise<Card> => {
    try {
      let seed = activeServerSeed;
      if (!seed) {
        await rotateServerSeed();
        seed = useProvablyFairStore.getState().activeServerSeed;
      }
      const nonce = getAndIncrementNonce();
      const floatVal = await ProvablyFair.calculateOutcome(seed, clientSeed, nonce);
      return getCardFromFloat(floatVal);
    } catch {
      return {
        suit: SUITS[Math.floor(Math.random() * SUITS.length)],
        value: VALUES[Math.floor(Math.random() * VALUES.length)]
      };
    }
  };

  const handleDeal = async () => {
    if (!profile) return;
    if (!betType) {
      toast.error('Please select a bet type (Player, Banker, or Tie)');
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
      audio.play('cards', 'shuffle');
      
      const p1 = await drawCardCryptographically();
      const b1 = await drawCardCryptographically();
      const p2 = await drawCardCryptographically();
      const b2 = await drawCardCryptographically();

      setPlayerCards([p1]);
      audio.play('cards', 'deal');
      setTimeout(() => setBankerCards([b1]), 400);
      setTimeout(() => setPlayerCards([p1, p2]), 800);
      setTimeout(async () => {
        setBankerCards([b1, b2]);
        await resolveGame([p1, p2], [b1, b2]);
      }, 1200);
    } catch {
      toast.error('Failed to place bet');
      setGameState('betting');
    }
  };

  const resolveGame = async (pCards: Card[], bCards: Card[]) => {
    let pScore = calculateScore(pCards);
    const bScore = calculateScore(bCards);

    // Natural 8 or 9
    if (pScore >= 8 || bScore >= 8) {
      finishGame(pCards, bCards);
      return;
    }

    let pThirdCard: Card | null = null;
    const newPCards = [...pCards];
    const newBCards = [...bCards];

    if (pScore <= 5) {
      pThirdCard = await drawCardCryptographically();
      newPCards.push(pThirdCard);
      pScore = calculateScore(newPCards);
      setTimeout(() => {
        setPlayerCards([...newPCards]);
        audio.play('cards', 'deal');
      }, 800);
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
      const delay = pThirdCard ? 1600 : 800;
      setTimeout(async () => {
        const bThirdCard = await drawCardCryptographically();
        newBCards.push(bThirdCard);
        setBankerCards([...newBCards]);
        audio.play('cards', 'deal');
        finishGame(newPCards, newBCards);
      }, delay);
    } else {
      const delay = pThirdCard ? 1600 : 800;
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
      if (winner === 'tie') winAmount = Math.floor(betAmount * 9);
      else if (winner === 'banker') winAmount = Math.floor(betAmount * 1.95);
      else winAmount = Math.floor(betAmount * 2);
    } else if (winner === 'tie' && betType !== 'tie') {
      winAmount = betAmount; // Push
    }

    if (profile) {
      await secureRecordGameResult({
        userId: profile.id,
        betAmount: 0,
        earnedAmount: winAmount,
        xpEarned: Math.floor(betAmount * 0.1),
      });
    }
    
    setPayout(winAmount);
    setGameState('result');
    if (winAmount > 0) {
      audio.play('ui', 'win');
    } else {
      audio.play('ui', 'lose');
    }
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
    const suitSymbol = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit];
    
    return (
      <motion.div
        key={'card-' + index}
        initial={{ opacity: 0, x: 80, y: -80, rotateY: 180 }}
        animate={{ opacity: 1, x: 0, y: 0, rotateY: 0 }}
        className={'w-20 sm:w-24 h-30 sm:h-36 bg-white rounded-xl border border-gray-200 shadow-xl flex flex-col justify-between p-2 absolute ' + (isRed ? 'text-red-600' : 'text-slate-900')}
        style={{ left: (index * 28) + 'px', zIndex: index }}
      >
        <div className="text-base sm:text-xl font-black">{card.value}</div>
        <div className="text-3xl sm:text-4xl self-center">{suitSymbol}</div>
        <div className="text-base sm:text-xl font-black self-end rotate-180">{card.value}</div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-20 pb-12 px-4 relative overflow-hidden flex flex-col font-sans select-none">
      <div className="max-w-4xl mx-auto relative z-10 w-full flex-grow flex flex-col">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-xl border border-white/10"
          >
            <ArrowLeft size={16} />
            Back to Games
          </button>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300">
              v2.5 AAA
            </span>
            <button
              onClick={() => setProvablyFairOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              title="Provably Fair Verification"
            >
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Provably Fair</span>
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-white tracking-wider mb-1">BACCARAT VIP</h1>
          <p className="text-xs text-slate-400">Classic high-stakes baccarat powered by cryptographic SHA-256 card deals</p>
        </div>

        {/* Felt Table */}
        <div className="bg-[#0c1626] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-xl shadow-2xl relative">
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="relative h-44 bg-black/30 rounded-2xl p-4 border border-white/5">
              <h3 className="text-lg font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
                <span>Player</span>
                {gameState === 'result' && (
                  <span className="bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 rounded-full text-cyan-300 text-xs font-black">
                    {calculateScore(playerCards)}
                  </span>
                )}
              </h3>
              <div className="relative flex justify-center h-32">
                <AnimatePresence>
                  {playerCards.map((card, i) => renderCard(card, i))}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="relative h-44 bg-black/30 rounded-2xl p-4 border border-white/5">
              <h3 className="text-lg font-bold text-white mb-2 text-center flex items-center justify-center gap-2">
                <span>Banker</span>
                {gameState === 'result' && (
                  <span className="bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-purple-300 text-xs font-black">
                    {calculateScore(bankerCards)}
                  </span>
                )}
              </h3>
              <div className="relative flex justify-center h-32">
                <AnimatePresence>
                  {bankerCards.map((card, i) => renderCard(card, i))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Outcome Banner */}
          <AnimatePresence mode="wait">
            {gameState === 'result' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mb-8 bg-black/60 py-4 rounded-2xl border border-cyan-500/30 shadow-lg"
              >
                <div className="text-2xl font-black text-white mb-1 uppercase tracking-widest">
                  {result === 'tie' ? '🤝 It\'s a Tie!' : `${result?.toUpperCase()} Wins!`}
                </div>
                {payout > 0 ? (
                  <div className="text-emerald-400 text-2xl font-black">
                    +{Math.floor(payout).toLocaleString()} Tokens
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">Better luck next round!</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Betting Positions */}
          <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <button
                disabled={gameState !== 'betting'}
                onClick={() => {
                  audio.play('ui', 'chip');
                  setBetType('player');
                }}
                className={'p-4 rounded-2xl border-2 transition-all ' + (betType === 'player' ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-lg shadow-cyan-500/20' : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/40')}
              >
                <div className="font-black text-base mb-1">Player</div>
                <div className="text-xs text-cyan-300 font-bold">1 : 1</div>
              </button>

              <button
                disabled={gameState !== 'betting'}
                onClick={() => {
                  audio.play('ui', 'chip');
                  setBetType('tie');
                }}
                className={'p-4 rounded-2xl border-2 transition-all ' + (betType === 'tie' ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/20' : 'border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/40')}
              >
                <div className="font-black text-base mb-1">Tie</div>
                <div className="text-xs text-emerald-300 font-bold">8 : 1</div>
              </button>

              <button
                disabled={gameState !== 'betting'}
                onClick={() => {
                  audio.play('ui', 'chip');
                  setBetType('banker');
                }}
                className={'p-4 rounded-2xl border-2 transition-all ' + (betType === 'banker' ? 'border-purple-400 bg-purple-500/20 text-white shadow-lg shadow-purple-500/20' : 'border-white/10 bg-white/5 text-slate-300 hover:border-purple-500/40')}
              >
                <div className="font-black text-base mb-1">Banker</div>
                <div className="text-xs text-purple-300 font-bold">0.95 : 1</div>
              </button>
            </div>

            {/* Chip selector */}
            <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/10">
              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">Bet Amount</span>
              <div className="flex gap-1.5">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    disabled={gameState !== 'betting'}
                    onClick={() => {
                      audio.play('ui', 'chip');
                      setBetAmount(amount);
                    }}
                    className={'px-3 py-1.5 rounded-xl text-xs font-black transition-all ' + (betAmount === amount ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10')}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            {gameState === 'betting' ? (
              <Button onClick={handleDeal} className="w-full h-14 text-xl font-black uppercase tracking-widest rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/20">
                Place Bet & Deal
              </Button>
            ) : gameState === 'result' ? (
              <Button onClick={resetGame} className="w-full h-14 text-xl font-black uppercase tracking-widest rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10">
                Play Again
              </Button>
            ) : (
              <Button disabled className="w-full h-14 text-xl font-black uppercase tracking-widest rounded-2xl bg-slate-800 text-slate-500 cursor-not-allowed">
                Dealing Cards...
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal isOpen={provablyFairOpen} onClose={() => setProvablyFairOpen(false)} />
    </div>
  );
}
