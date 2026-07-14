// src/components/games/ClickerGame.tsx
// Rapid click challenge game — earn tokens based on click speed

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Trophy } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

const GAME_DURATION = 10; // seconds
const MAX_TOKENS = 50;
const MIN_TOKENS = 10;

interface ClickerGameProps {
  onClose: () => void;
}

export function ClickerGame({ onClose }: ClickerGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const calculateTokens = (clickCount: number) => {
    // Token formula: clicks * 0.5, capped at MAX_TOKENS
    return Math.min(Math.max(Math.floor(clickCount * 0.5), MIN_TOKENS), MAX_TOKENS);
  };

  const endGame = useCallback(async (finalClicks: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const earned = calculateTokens(finalClicks);
    setTokensEarned(earned);
    setPhase('result');

    // Award tokens
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({
          tokens: profile.tokens + earned,
          total_earned: profile.total_earned + earned,
          xp: profile.xp + Math.floor(earned / 2),
        }).eq('id', profile.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('game_stats') as any).upsert({
          user_id: profile.id,
          games_played: 1,
          games_won: 1,
          clicker_best: Math.max(finalClicks, 0),
        });

        updateProfile({ tokens: profile.tokens + earned });
      } catch { /* fail silently */ }
    } else if (profile) {
      updateProfile({ tokens: profile.tokens + earned });
    }

    toast.success(`Clicker game complete! +${earned} tokens 🎉`);
  }, [profile, updateProfile]);

  const startGame = () => {
    setPhase('playing');
    setClicks(0);
    setTimeLeft(GAME_DURATION);
    setRipples([]);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setClicks((c) => { endGame(c); return c; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const id = Date.now() + Math.random();
      setRipples(r => [...r.slice(-10), { id, x, y }]);
      setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 600);
    }

    setClicks(c => c + 1);
    playTone(800 + Math.random() * 400, 0.05, 'square', 0.1);
    vibrate(10);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const progress = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;
  const cps = timeLeft < GAME_DURATION ? (clicks / (GAME_DURATION - timeLeft)).toFixed(1) : '0';

  return (
    <div className="flex flex-col items-center p-6 gap-6 min-h-[calc(100vh-64px)]">

      {phase === 'ready' && (
        <motion.div
          className="text-center space-y-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-7xl animate-bounce-gentle">👆</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Clicker Rush!</h2>
            <p className="text-text-secondary">Click as many times as you can in <strong className="text-cyan-neon">10 seconds</strong>!</p>
            <p className="text-text-secondary mt-1">More clicks = more tokens (up to 50)</p>
          </div>
          <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
            <Button variant="primary" size="lg" onClick={startGame} id="start-clicker-btn">
              <Zap size={20} /> Start Game
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted text-xs">
              Close Game
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-md space-y-4 flex flex-col flex-1">
          {/* Stats bar */}
          <div className="flex items-center justify-between glass-card rounded-xl p-3">
            <div className="text-center">
              <p className="font-display font-bold text-3xl text-neon-cyan">{clicks}</p>
              <p className="text-2xs text-muted">Clicks</p>
            </div>
            <div className="text-center">
              <p className={`font-display font-bold text-3xl ${timeLeft <= 3 ? 'text-danger animate-pulse' : 'text-text-primary'}`}>
                {timeLeft}
              </p>
              <p className="text-2xs text-muted">Seconds</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-gold-neon">{cps}</p>
              <p className="text-2xs text-muted">CPS</p>
            </div>
          </div>

          <ProgressBar value={progress} color="cyan" height={6} />

          {/* Click area */}
          <div
            ref={gameAreaRef}
            className="flex-1 min-h-[300px] relative rounded-2xl border-2 border-cyan-neon/40 bg-navy-800 cursor-pointer select-none active:scale-[0.99] transition-transform overflow-hidden flex items-center justify-center"
            onClick={handleClick}
            style={{ boxShadow: `0 0 40px rgba(0, 240, 255, ${0.1 + (clicks / 100) * 0.3})` }}
          >
            {/* Ripple effects */}
            {ripples.map(r => (
              <motion.div
                key={r.id}
                className="absolute w-12 h-12 rounded-full border-2 border-cyan-neon pointer-events-none"
                style={{ left: `${r.x}%`, top: `${r.y}%`, transform: 'translate(-50%, -50%)' }}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            ))}

            <div className="text-center pointer-events-none">
              <p className="text-6xl mb-2">👆</p>
              <p className="text-text-secondary font-semibold">TAP FAST!</p>
              <p className="text-muted text-sm mt-1">Every click counts!</p>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <motion.div
          className="text-center space-y-6 mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trophy size={56} className="text-gold-neon mx-auto" />
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Game Over!</h2>
            <p className="text-5xl font-display font-bold text-neon-cyan mb-1">{clicks}</p>
            <p className="text-text-secondary mb-4">clicks in {GAME_DURATION} seconds</p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-neon/15 border border-gold-neon/30">
              <span className="font-display font-bold text-2xl text-gold-neon">+{tokensEarned}</span>
              <span className="text-text-secondary">tokens earned!</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="neon" onClick={() => { setPhase('ready'); setClicks(0); }}>Play Again</Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
