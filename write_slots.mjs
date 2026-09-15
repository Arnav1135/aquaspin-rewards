import fs from 'fs';
const code = \import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Trophy, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

const SYMBOLS = [
  { id: 'cherry', icon: '??', weight: 30, payout: 2 },
  { id: 'lemon', icon: '??', weight: 25, payout: 3 },
  { id: 'orange', icon: '??', weight: 20, payout: 4 },
  { id: 'watermelon', icon: '??', weight: 15, payout: 5 },
  { id: 'grape', icon: '??', weight: 10, payout: 10 },
  { id: 'diamond', icon: '??', weight: 5, payout: 20 },
  { id: 'seven', icon: '7??', weight: 2, payout: 50 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, sym) => sum + sym.weight, 0);

const getRandomSymbol = () => {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    if (rand < sym.weight) return sym;
    rand -= sym.weight;
  }
  return SYMBOLS[0];
};

export default function SlotsGame() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [betAmount, setBetAmount] = useState(10);
  const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [winAmount, setWinAmount] = useState(0);

  const handleSpin = async () => {
    if (!profile) return;
    if (profile.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setWinAmount(0);

    try {
      const success = await secureUpdateTokens(profile.id, -betAmount);
      if (!success) throw new Error('Transaction failed');

      // Determine result beforehand
      const s1 = getRandomSymbol();
      const s2 = getRandomSymbol();
      const s3 = getRandomSymbol();
      
      // Artificial delay for spinning effect
      setTimeout(async () => {
        setReels([s1, s2, s3]);
        setIsSpinning(false);
        
        let multiplier = 0;
        let isWin = false;

        // Simple win logic: 3 of a kind
        if (s1.id === s2.id && s2.id === s3.id) {
          multiplier = s1.payout;
          isWin = true;
        } 
        // 2 of a kind (leftmost)
        else if (s1.id === s2.id) {
          multiplier = s1.payout * 0.2;
          isWin = true;
        }

        const payout = Math.floor(betAmount * multiplier);
        
        setResult(isWin && payout > 0 ? 'win' : 'lose');
        setWinAmount(payout);

        if (profile) {
          await secureRecordGameResult({
            userId: profile.id,
            betAmount,
            earnedAmount: payout,
          });
        }
      }, 2000);
      
    } catch (e) {
      toast.error('Failed to place bet');
      setIsSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-24 pb-12 px-4 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10 w-full flex-grow flex flex-col">
        <button 
          onClick={() => navigate('/games')}
          className="flex items-center gap-2 text-text-secondary hover:text-white mb-8 transition-colors self-start"
        >
          <ArrowLeft size={20} />
          Back to Games
        </button>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-2">Lucky Slots</h1>
          <p className="text-text-secondary">Match 3 symbols for the Jackpot!</p>
        </div>

        <div className="bg-navy-800/80 border-4 border-navy-700 rounded-3xl p-8 mb-8 backdrop-blur-xl shadow-2xl relative">
          
          <div className="bg-navy-900 rounded-2xl p-4 border-2 border-navy-600 mb-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 z-10 pointer-events-none rounded-xl" />
            
            <div className="flex justify-center gap-4 relative z-0">
              {reels.map((symbol, i) => (
                <div key={i} className="w-24 h-32 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-6xl relative overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {isSpinning ? (
                      <motion.div
                        key={"spinning-" + i}
                        animate={{ y: [0, -100, 0] }}
                        transition={{ repeat: Infinity, duration: 0.2, ease: "linear", delay: i * 0.1 }}
                        className="absolute blur-sm opacity-50"
                      >
                        {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={"static-" + symbol.id + "-" + i}
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        {symbol.icon}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {result && !isSpinning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={'text-center mb-8 py-4 rounded-2xl border-2 ' + (result === 'win' ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-navy-900/80 border-navy-700')}
              >
                <div className={'text-2xl font-black uppercase tracking-widest ' + (result === 'win' ? 'text-yellow-400' : 'text-text-secondary')}>
                  {result === 'win' ? 'Winner!' : 'No Luck'}
                </div>
                {result === 'win' && (
                  <div className="text-emerald-400 text-3xl font-bold mt-2 flex justify-center items-center gap-2">
                    <Sparkles className="text-yellow-400" />
                    +{winAmount.toLocaleString()} Tokens
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-navy-900/50 rounded-xl p-4 flex justify-between items-center border border-navy-700">
              <span className="text-text-secondary flex items-center gap-2"><Coins size={18} /> Bet Amount</span>
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    disabled={isSpinning}
                    onClick={() => setBetAmount(amount)}
                    className={'px-3 py-2 rounded-lg font-bold transition-colors ' + (betAmount === amount ? 'bg-brand-500 text-white' : 'bg-navy-700 text-text-secondary hover:bg-navy-600') + (isSpinning ? ' opacity-50' : '')}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSpin} 
              disabled={isSpinning}
              className={'w-full h-16 text-2xl font-black uppercase tracking-wider ' + (isSpinning ? 'opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-400 hover:to-purple-400 transform hover:scale-[1.02] transition-all')}
            >
              {isSpinning ? 'Spinning...' : 'SPIN'}
            </Button>
          </div>
        </div>

        <div className="mt-auto bg-navy-800/50 p-6 rounded-2xl border border-navy-700">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Trophy size={18} className="text-yellow-400"/> Paytable (3 of a kind)</h3>
          <div className="grid grid-cols-4 gap-4">
            {SYMBOLS.map(sym => (
              <div key={sym.id} className="bg-navy-900/50 rounded-lg p-2 text-center flex flex-col items-center border border-navy-700/50">
                <span className="text-2xl mb-1">{sym.icon}</span>
                <span className="text-brand-400 font-bold text-sm">{sym.payout}x</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
\;
fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/SlotsGame.tsx', code);

// Inject into registry
const gamesJsonPath = 'd:/Web App - Aqua Blue/factory/games/registry/games.json';
let gamesJson = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));

if (!gamesJson.find(g => g.key === 'slots')) {
  gamesJson.unshift({
    key: 'slots',
    title: 'Lucky Slots',
    emoji: '??',
    category: 'Casino',
    reward: 'Up to 50x',
    difficulty: 'Easy',
    color: '#EAB308',
    desc: 'Classic Vegas-style slot machine. Match 3 symbols to win big!'
  });
  fs.writeFileSync(gamesJsonPath, JSON.stringify(gamesJson, null, 2));
}

const miniGamesPath = 'd:/Web App - Aqua Blue/src/pages/MiniGames.tsx';
let miniGames = fs.readFileSync(miniGamesPath, 'utf8');

if (!miniGames.includes('import("@/components/games/SlotsGame")')) {
  const slotsImport = "const SlotsGame = lazy(() => import('@/components/games/SlotsGame').then((m) => ({ default: m.default })));";
  miniGames = miniGames.replace('const ClickerGame = lazy', slotsImport + '\nconst ClickerGame = lazy');
  miniGames = miniGames.replace('case "blackjack":\n      return <BlackjackGame />;', 'case "blackjack":\n      return <BlackjackGame />;\n    case "slots":\n      return <SlotsGame />;');
  fs.writeFileSync(miniGamesPath, miniGames);
}
console.log('Injected Slots');
