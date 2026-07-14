// src/features/coinflip/CoinFlipScene.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { CoinSide } from './types';
import { CoinFlipControls } from './components/CoinFlipControls';
import { getFlipResult, calculatePayout } from './lib/rules';
import { playCoinFlipAnimation } from './engine/coinflip-engine';

interface CoinFlipSceneProps {
  onClose: () => void;
}

export function CoinFlipScene({ onClose }: CoinFlipSceneProps) {
  const { profile } = useAuthStore();
  const balance = profile?.tokens ?? 0;

  // Game Play States
  const [betAmount, setBetAmount] = useState<number>(50);
  const [selection, setSelection] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [wonAmount, setWonAmount] = useState<number>(0);

  // Stats / History States
  const [history, setHistory] = useState<CoinSide[]>([]);
  const [winStreak, setWinStreak] = useState<number>(0);
  const [lossStreak, setLossStreak] = useState<number>(0);

  // Element Refs for GSAP
  const coinRef = useRef<HTMLDivElement>(null);
  const headsSpecularRef = useRef<HTMLDivElement>(null);
  const tailsSpecularRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  // Prefers Reduced Motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

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
      toast.error('Out of free trials! Deposit real cash to play unlimited.');
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

    // Determine result honestly using provably fair spec (f < 0.5 = heads)
    const randomFloat = Math.random();
    const flipOutcome = getFlipResult(randomFloat);
    const hasWon = flipOutcome === selection;

    // Spin Audio Cue Sequence
    [0, 100, 200, 300, 400, 500, 600, 700, 800, 900].forEach((ms, i) => {
      setTimeout(() => {
        if (isFlipping) playTone(280 + i * 35, 0.025, 'sine', 0.04);
      }, ms);
    });

    // Execute GSAP 3D tumbling animation on coin elements
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
            toast.success(`${flipOutcome.toUpperCase()}! +${payout - betAmount} tokens 🎉`);
            
            // Win audio + feedback
            playTone(523, 0.15, 'sine', 0.25);
            setTimeout(() => playTone(659, 0.2, 'sine', 0.2), 120);
            vibrate([50, 50, 100]);
          } else {
            setLossStreak((prev) => prev + 1);
            setWinStreak(0);
            toast.error(`${flipOutcome.toUpperCase()}. Lost ${betAmount} tokens.`);
            
            // Loss audio + feedback
            playTone(180, 0.3, 'sawtooth', 0.15);
            vibrate(150);
          }

          setHistory((prev) => [...prev.slice(-9), flipOutcome]);

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

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Sidebar Bet controls */}
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

      {/* Main 3D Canvas Board Card */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.4)]">
        
        {/* Soft Bokeh Backdrop */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_20%_20%,#00f0ff_0%,transparent_40%),radial-gradient(circle_at_80%_80%,#f59e0b_0%,transparent_50%)]" />
        
        {/* Felt textured noise floor via inline SVG feTurbulence */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full">
            <filter id="feltNoise">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#feltNoise)" />
          </svg>
        </div>

        {/* Edge Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(5,10,25,0.85)_100%)]" />

        {/* House edge info */}
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10 select-none">
          <HelpCircle size={10} />
          <span>2% house edge (1.96x)</span>
        </div>

        {/* 3D viewport for Coin */}
        <div 
          className="relative flex items-center justify-center z-10" 
          style={{ perspective: '1000px', width: 220, height: 220 }}
        >
          {/* Particles Container */}
          <div ref={particlesRef} className="absolute inset-[-100px] pointer-events-none z-20" />

          {/* Coin Element */}
          <div
            ref={coinRef}
            className="w-44 h-44 relative cursor-pointer active:scale-95 transition-transform duration-200"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Heads Side (Front) */}
            <div
              className="absolute inset-0 rounded-full border-[6px] border-amber-600 flex items-center justify-center text-7xl select-none"
              style={{
                backfaceVisibility: 'hidden',
                background: 'radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b, #b45309)',
                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.6), 0 10px 30px rgba(0,0,0,0.6), 0 0 25px rgba(245,158,11,0.25)',
              }}
            >
              {/* Highlight Specular overlay */}
              <div
                ref={headsSpecularRef}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 100%)',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '-200% 0%',
                }}
              />
              👑
            </div>

            {/* Tails Side (Back) */}
            <div
              className="absolute inset-0 rounded-full border-[6px] border-slate-500 flex items-center justify-center text-7xl select-none"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                background: 'radial-gradient(circle at 35% 30%, #f8fafc, #94a3b8, #475569)',
                boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.5), 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(148,163,184,0.2)',
              }}
            >
              {/* Highlight Specular overlay */}
              <div
                ref={tailsSpecularRef}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.4) 100%)',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '-200% 0%',
                }}
              />
              ⭐
            </div>
          </div>
        </div>

        {/* Live HUD Result Display */}
        <div className="mt-10 text-center min-h-[70px] z-10">
          <AnimatePresence mode="wait">
            {result && !isFlipping && (
              <motion.div
                key={result}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              >
                <p
                  className={`text-4xl font-extrabold font-display uppercase tracking-widest ${
                    isWin ? 'text-success drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-danger drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                  }`}
                >
                  {result}
                </p>
                <p className="text-sm text-muted mt-1.5 font-medium">
                  {isWin ? `Won +${wonAmount - betAmount} tokens` : `Lost ${betAmount} tokens`}
                </p>
              </motion.div>
            )}
            {isFlipping && (
              <motion.p
                key="flipping-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
                className="text-sm text-muted tracking-wider uppercase animate-pulse font-medium"
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
