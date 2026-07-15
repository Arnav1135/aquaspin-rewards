// src/features/coinflip/CoinFlipScene.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import { CoinSide } from './types';
import { getFlipResult, calculatePayout } from './lib/rules';
import { playCoinFlipAnimation } from './engine/coinflip-engine';
import { CoinFlipControls } from './components/CoinFlipControls';
import toast from 'react-hot-toast';

interface CoinFlipSceneProps {
  onClose: () => void;
}

export function CoinFlipScene({ onClose }: CoinFlipSceneProps) {
  const { profile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [selection, setSelection] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [wonAmount, setWonAmount] = useState(0);

  // Win streaks
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [history, setHistory] = useState<CoinSide[]>([]);

  // Animation Refs
  const coinRef = useRef<HTMLDivElement>(null);
  const headsSpecularRef = useRef<HTMLDivElement>(null);
  const tailsSpecularRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const balance = profile?.tokens ?? 0;

  // Track prefers reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Determine dynamic material scheme based on win streak
  const getCoinMaterial = () => {
    if (winStreak >= 4) {
      // Diamond
      return {
        rim: 'border-cyan-400',
        bg: 'radial-gradient(circle at 35% 30%, #ecfeff, #22d3ee, #0891b2, #083344)',
        shadow: '0 10px 40px rgba(6,182,212,0.6), 0 0 35px rgba(6,182,212,0.4)',
        textColor: 'text-cyan-200',
        name: 'Diamond'
      };
    }
    if (winStreak === 3) {
      // Platinum
      return {
        rim: 'border-slate-300',
        bg: 'radial-gradient(circle at 35% 30%, #ffffff, #cbd5e1, #64748b, #1e293b)',
        shadow: '0 10px 30px rgba(255,255,255,0.4), 0 0 25px rgba(203,213,225,0.3)',
        textColor: 'text-slate-100',
        name: 'Platinum'
      };
    }
    if (winStreak === 2) {
      // Gold
      return {
        rim: 'border-amber-600',
        bg: 'radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b, #b45309)',
        shadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 25px rgba(245,158,11,0.3)',
        textColor: 'text-amber-100',
        name: 'Gold'
      };
    }
    if (winStreak === 1) {
      // Silver
      return {
        rim: 'border-slate-500',
        bg: 'radial-gradient(circle at 35% 30%, #f8fafc, #94a3b8, #475569)',
        shadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(148,163,184,0.2)',
        textColor: 'text-slate-200',
        name: 'Silver'
      };
    }
    // WinStreak === 0: Copper
    return {
      rim: 'border-orange-700',
      bg: 'radial-gradient(circle at 35% 30%, #ffedd5, #ea580c, #7c2d12)',
      shadow: '0 10px 25px rgba(0,0,0,0.6), 0 0 15px rgba(234,88,12,0.15)',
      textColor: 'text-orange-200',
      name: 'Copper'
    };
  };

  const material = getCoinMaterial();

  const handlePlay = async () => {
    if (!selection) {
      toast.error('Pick Heads or Tails!');
      return;
    }
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }

    const { profile: currentProfile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = currentProfile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProfile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProfile?.has_deposited && freeTrials <= 0;

    if (outOfTrials) {
      toast.error('Out of free trials! Deposit to play.');
      return;
    }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }

    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    setIsFlipping(true);
    setResult(null);
    setIsWin(null);

    // Deduct bet
    const newBalance = balance - actualBetAmount;
    if (currentProfile && !currentProfile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', currentProfile.id);
      } catch (err) {
        console.error('Failed to deduct tokens:', err);
      }
    }
    updateProfile({
      tokens: newBalance,
      ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}),
    });

    // Determine outcome (f < 0.5 = heads)
    const randomFloat = Math.random();
    const flipOutcome = getFlipResult(randomFloat);
    const hasWon = flipOutcome === selection;

    // Fast click spin sequence sounds
    [0, 100, 200, 300, 400, 500, 600, 700].forEach((ms, i) => {
      setTimeout(() => {
        if (rollingRef.current) playTone(280 + i * 40, 0.02, 'sine', 0.05);
      }, ms);
    });

    if (coinRef.current && headsSpecularRef.current && tailsSpecularRef.current && particlesRef.current) {
      const activeSpecular = flipOutcome === 'heads' ? headsSpecularRef.current : tailsSpecularRef.current;
      
      playCoinFlipAnimation({
        coinElement: coinRef.current,
        specularElement: activeSpecular,
        particlesContainer: particlesRef.current,
        result: flipOutcome,
        reducedMotion: prefersReducedMotion,
        onComplete: async () => {
          setIsFlipping(false);
          setResult(flipOutcome);
          setIsWin(hasWon);

          const payout = calculatePayout(betAmount);
          setWonAmount(payout);

          // Update Streaks
          if (hasWon) {
            setWinStreak((prev) => prev + 1);
            setLossStreak(0);
            toast.success(`${flipOutcome.toUpperCase()}! +${payout - betAmount} tokens 🎉`, { icon: '🪙' });
            
            // Victory sound
            playTone(523.25, 0.12, 'sine', 0.25);
            setTimeout(() => playTone(659.25, 0.2, 'sine', 0.25), 100);
            vibrate([50, 50, 120]);
          } else {
            setLossStreak((prev) => prev + 1);
            setWinStreak(0);
            toast.error(`${flipOutcome.toUpperCase()}. Lost bet.`);
            
            playTone(160, 0.28, 'sawtooth', 0.18);
            vibrate(140);
          }

          setHistory((prev) => [...prev.slice(-14), flipOutcome]);

          // Sync database with final payout state
          const finalBalance = newBalance + (hasWon ? payout : 0);
          if (currentProfile && !currentProfile.id.startsWith('guest')) {
            try {
              await (supabase.from('users') as any)
                .update({
                  tokens: finalBalance,
                  total_earned: currentProfile.total_earned + (hasWon ? payout - betAmount : 0),
                  xp: currentProfile.xp + Math.floor(betAmount * 0.1),
                })
                .eq('id', currentProfile.id);
              await (supabase.from('game_stats') as any).upsert({
                user_id: currentProfile.id,
                games_played: 1,
                games_won: hasWon ? 1 : 0,
              });
            } catch (err) {
              console.error('Failed to update stats:', err);
            }
          }
          updateProfile({ tokens: finalBalance });
        },
      });
    }
  };

  const rollingRef = useRef(isFlipping);
  rollingRef.current = isFlipping;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Sidebar controls */}
      <CoinFlipControls
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        selection={selection}
        setSelection={setSelection}
        isFlipping={isFlipping}
        balance={balance}
        winStreak={winStreak}
        lossStreak={lossStreak}
        history={history}
        onPlay={handlePlay}
        onClose={onClose}
      />

      <style>{`
        /* Obsidian circular arena floor styling */
        .obsidian-arena {
          background-color: #020617;
          background-image: 
            radial-gradient(circle at center, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.85) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }

        /* Ambient floating mist details */
        .obsidian-mist {
          position: absolute;
          width: 250px;
          height: 180px;
          background: radial-gradient(circle, rgba(0,240,255,0.04) 0%, transparent 70%);
          filter: blur(40px);
          animation: driftMist 14s infinite ease-in-out;
        }
        @keyframes driftMist {
          0%, 100% { transform: translate(-30px, -20px); }
          50% { transform: translate(40px, 30px); }
        }

        /* Reeded ridges edge detailing */
        .coin-edge-reeded {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 4px dashed rgba(0,0,0,0.22);
          z-index: 10;
          pointer-events: none;
        }

        /* Engraved edge text bet values */
        .coin-edge-engraving {
          position: absolute;
          font-size: 7px;
          font-family: monospace;
          font-weight: 900;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 2px;
          width: 100%;
          text-align: center;
          top: 3px;
          pointer-events: none;
          z-index: 5;
        }
      `}</style>

      {/* Circular obsidian gladiator arena card */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] obsidian-arena rounded-2xl overflow-hidden">
        
        {/* Ambient drift mist */}
        <div className="obsidian-mist top-1/4 left-1/4" />
        <div className="obsidian-mist bottom-1/4 right-1/4" style={{ animationDelay: '4s', background: 'radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)' }} />

        {/* Spotlight overhead center glow */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-0" />

        {/* Security badge info */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-slate-500 font-mono tracking-wider z-10 select-none">
          <ShieldCheck size={11} className="text-cyan-400" />
          <span>MATERIAL: {material.name.toUpperCase()}</span>
        </div>

        {/* 3D view container */}
        <div 
          className="relative flex items-center justify-center z-10" 
          style={{ perspective: '1000px', width: 220, height: 220 }}
        >
          {/* Particles splash buffer */}
          <div ref={particlesRef} className="absolute inset-[-100px] pointer-events-none z-20" />

          {/* Heavy metal Coin */}
          <div
            ref={coinRef}
            className="w-44 h-44 relative cursor-pointer active:scale-95 transition-transform duration-200"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Heads (Sun Face) */}
            <div
              className={`absolute inset-0 rounded-full border-[5px] flex flex-col items-center justify-center select-none ${material.rim}`}
              style={{
                backfaceVisibility: 'hidden',
                background: material.bg,
                boxShadow: material.shadow,
              }}
            >
              {/* Reeded edge ridges overlay */}
              <div className="coin-edge-reeded" />

              {/* Edge Engraved bet amount */}
              <div className="coin-edge-engraving">
                STAKE {betAmount} 🪙
              </div>

              {/* Specular highlights sheen overlay */}
              <div
                ref={headsSpecularRef}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.3) 100%)',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '-200% 0%',
                }}
              />
              
              {/* Sun/Phoenix engraved face */}
              <Sun size={48} className={`${material.textColor} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] animate-pulse`} />
              <span className="text-[7px] font-black font-mono tracking-widest text-white/50 uppercase mt-1">HEADS</span>
            </div>

            {/* Tails (Moon Face) */}
            <div
              className={`absolute inset-0 rounded-full border-[5px] flex flex-col items-center justify-center select-none ${material.rim}`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                background: material.bg,
                boxShadow: material.shadow,
              }}
            >
              <div className="coin-edge-reeded" />
              <div className="coin-edge-engraving">
                STAKE {betAmount} 🪙
              </div>

              <div
                ref={tailsSpecularRef}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.3) 100%)',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '-200% 0%',
                }}
              />
              
              {/* Moon/Dragon engraved face */}
              <Moon size={48} className={`${material.textColor} filter drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] animate-pulse`} />
              <span className="text-[7px] font-black font-mono tracking-widest text-white/50 uppercase mt-1">TAILS</span>
            </div>
          </div>
        </div>

        {/* Live Result overlay banner */}
        <div className="mt-10 text-center min-h-[70px] z-10">
          <AnimatePresence mode="wait">
            {result && !isFlipping && (
              <motion.div
                key={result}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="space-y-0.5"
              >
                <p
                  className={`text-3xl font-black font-display uppercase tracking-widest ${
                    isWin ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  }`}
                >
                  {result}
                </p>
                <p className="text-2xs text-slate-500 font-mono">
                  {isWin ? `won payout: +${wonAmount - betAmount} tokens` : `sweep loss: -${betAmount} tokens`}
                </p>
              </motion.div>
            )}
            {isFlipping && (
              <motion.p
                key="flipping-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-400 tracking-widest uppercase animate-pulse font-bold font-mono"
              >
                Tumbling...
              </motion.p>
            )}
          </AnimatePresence>
        </div>

      </Card>
    </div>
  );
}
