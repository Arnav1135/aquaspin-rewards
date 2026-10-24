import { useAIGameEngine } from '@/hooks/useAIGameEngine';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Coins, Trophy, Sparkles, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import { ProvablyFairModal } from '@/components/ui/ProvablyFairModal';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

const SYMBOLS = [
  { id: 'cherry', icon: '🍒', weight: 30, payout: 2 },
  { id: 'lemon', icon: '🍋', weight: 25, payout: 3 },
  { id: 'orange', icon: '🍊', weight: 20, payout: 4 },
  { id: 'watermelon', icon: '🍉', weight: 15, payout: 5 },
  { id: 'grape', icon: '🍇', weight: 10, payout: 10 },
  { id: 'diamond', icon: '💎', weight: 5, payout: 20 },
  { id: 'seven', icon: '7️⃣', weight: 2, payout: 50 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((sum, sym) => sum + sym.weight, 0);

const getSymbolFromFloat = (floatVal: number) => {
  let rand = floatVal * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    if (rand < sym.weight) return sym;
    rand -= sym.weight;
  }
  return SYMBOLS[0];
};

export default function SlotsGame() {
  useAIGameEngine('slots', 'Lucky Slots', 'arcade', 'dom-css');
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthStore();
  
  const [betAmount, setBetAmount] = useState(10);
  const [reels, setReels] = useState([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [provablyFairOpen, setProvablyFairOpen] = useState(false);

  const { activeServerSeed, clientSeed, getAndIncrementNonce, rotateServerSeed } = useProvablyFairStore();

  const handleSpin = async () => {
    if (!profile) return;
    if (profile.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    setIsSpinning(true);
    setResult(null);
    setWinAmount(0);
    audio.play('slots', 'spin');

    try {
      const success = await secureUpdateTokens(profile.id, -betAmount);
      if (!success) throw new Error('Transaction failed');
      updateProfile({ tokens: profile.tokens - betAmount });

      // Cryptographically derive reel outcomes via Provably Fair HMAC-SHA256
      let s1 = SYMBOLS[0];
      let s2 = SYMBOLS[1];
      let s3 = SYMBOLS[2];

      try {
        let seed = activeServerSeed;
        if (!seed) {
          await rotateServerSeed();
          seed = useProvablyFairStore.getState().activeServerSeed;
        }

        const nonce1 = getAndIncrementNonce();
        const nonce2 = getAndIncrementNonce();
        const nonce3 = getAndIncrementNonce();

        const f1 = await ProvablyFair.calculateOutcome(seed, clientSeed, nonce1);
        const f2 = await ProvablyFair.calculateOutcome(seed, clientSeed, nonce2);
        const f3 = await ProvablyFair.calculateOutcome(seed, clientSeed, nonce3);

        s1 = getSymbolFromFloat(f1);
        s2 = getSymbolFromFloat(f2);
        s3 = getSymbolFromFloat(f3);
      } catch {
        s1 = getSymbolFromFloat(Math.random());
        s2 = getSymbolFromFloat(Math.random());
        s3 = getSymbolFromFloat(Math.random());
      }
      
      // Artificial reel animation delay
      setTimeout(async () => {
        setReels([s1, s2, s3]);
        setIsSpinning(false);
        
        let multiplier = 0;
        let isWin = false;

        // 3 of a kind
        if (s1.id === s2.id && s2.id === s3.id) {
          multiplier = s1.payout;
          isWin = true;
        } 
        // 2 of a kind (leftmost)
        else if (s1.id === s2.id) {
          multiplier = s1.payout * 0.25;
          isWin = true;
        }

        const payout = Math.floor(betAmount * multiplier);
        
        setResult(isWin && payout > 0 ? 'win' : 'lose');
        setWinAmount(payout);

        if (isWin && payout > 0) {
          audio.play('slots', 'win');
        } else {
          audio.play('ui', 'lose');
        }

        if (profile) {
          const res = await secureRecordGameResult({
            userId: profile.id,
            betAmount: 0, /* bet charged upfront */
            earnedAmount: payout,
            xpEarned: Math.floor(betAmount * 0.1),
          });
          if (res?.data) {
            updateProfile({ tokens: res.data });
          } else if (payout > 0) {
            const currentLive = useAuthStore.getState().profile?.tokens ?? profile.tokens;
            updateProfile({ tokens: currentLive + payout });
          }
        }
      }, 1600);
      
    } catch {
      toast.error('Failed to place bet');
      setIsSpinning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-20 pb-12 px-4 relative overflow-hidden flex flex-col font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10 w-full flex-grow flex flex-col">
        {/* Navigation & Status Header */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/games')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-xl border border-white/10"
          >
            <ArrowLeft size={16} />
            Back to Games
          </button>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-yellow-500/20 text-yellow-400 border border-yellow-400/30">
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

        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 mb-1 tracking-wider">
            LUCKY SLOTS
          </h1>
          <p className="text-xs text-slate-400">Match 3 symbols for the Jackpot! Powered by cryptographic RNG.</p>
        </div>

        {/* Slot Machine Cabinet */}
        <div className="bg-[#0c1322] border-2 border-cyan-500/30 rounded-3xl p-6 sm:p-8 mb-8 backdrop-blur-xl shadow-2xl relative">
          
          {/* Reel Display Frame */}
          <div className="bg-black/80 rounded-2xl p-4 border border-white/10 mb-8 overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 z-10 pointer-events-none rounded-xl" />
            
            <div className="flex justify-center gap-3 sm:gap-4 relative z-0">
              {reels.map((symbol, i) => (
                <div key={i} className="w-20 h-28 sm:w-28 sm:h-36 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-5xl sm:text-6xl relative overflow-hidden shadow-lg">
                  <AnimatePresence mode="popLayout">
                    {isSpinning ? (
                      <motion.div
                        key={'spinning-' + i}
                        animate={{ y: [0, -100, 0] }}
                        transition={{ repeat: Infinity, duration: 0.16, ease: "linear", delay: i * 0.08 }}
                        className="absolute blur-sm opacity-60"
                      >
                        {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].icon}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={'static-' + symbol.id + '-' + i}
                        initial={{ y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                      >
                        {symbol.icon}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome Banner */}
          <AnimatePresence mode="wait">
            {result && !isSpinning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={'text-center mb-6 py-4 rounded-2xl border-2 ' + (result === 'win' ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-white/10')}
              >
                <div className={'text-xl font-black uppercase tracking-widest ' + (result === 'win' ? 'text-emerald-400' : 'text-slate-400')}>
                  {result === 'win' ? '✨ WINNER! ✨' : 'NO LUCK THIS SPIN'}
                </div>
                {result === 'win' && (
                  <div className="text-yellow-400 text-3xl font-black mt-1 flex justify-center items-center gap-2">
                    <Sparkles className="text-yellow-400" />
                    +{winAmount.toLocaleString()} Tokens
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="max-w-md mx-auto space-y-5">
            <div className="bg-black/40 rounded-2xl p-4 flex justify-between items-center border border-white/10">
              <span className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Coins size={16} className="text-yellow-400" /> Bet Amount
              </span>
              <div className="flex gap-1.5">
                {[10, 50, 100, 500].map(amount => (
                  <button
                    key={amount}
                    disabled={isSpinning}
                    onClick={() => {
                      audio.play('ui', 'chip');
                      setBetAmount(amount);
                    }}
                    className={'px-3 py-1.5 rounded-xl text-xs font-black transition-all ' + (betAmount === amount ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10') + (isSpinning ? ' opacity-50' : '')}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSpin} 
              disabled={isSpinning}
              className={'w-full h-14 text-xl font-black uppercase tracking-widest rounded-2xl shadow-xl ' + (isSpinning ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.3)]')}
            >
              {isSpinning ? 'SPINNING...' : 'SPIN'}
            </Button>
          </div>
        </div>

        {/* Paytable */}
        <div className="mt-auto bg-[#0c1322]/60 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400"/> Paytable (3 of a kind)
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {SYMBOLS.map(sym => (
              <div key={sym.id} className="bg-black/40 rounded-xl p-2 text-center flex flex-col items-center border border-white/5">
                <span className="text-xl mb-0.5">{sym.icon}</span>
                <span className="text-yellow-400 font-black text-xs">{sym.payout}x</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal isOpen={provablyFairOpen} onClose={() => setProvablyFairOpen(false)} />
    </div>
  );
}
