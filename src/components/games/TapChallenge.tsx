// src/components/games/TapChallenge.tsx
// Mobile tap-speed game — tap glowing targets to earn tokens

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

const GAME_DURATION = 15;
const TARGET_LIFETIME = 1200; // ms before target disappears
const SPAWN_INTERVAL = 700;

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
}

interface TapChallengeProps { onClose: () => void; }

export function TapChallenge({ onClose }: TapChallengeProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [combo, setCombo] = useState(0);
  const nextIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const calculateTokens = (hits: number, misses: number) => {
    const accuracy = hits / Math.max(hits + misses, 1);
    return Math.min(80, Math.max(15, Math.floor(hits * 2 * accuracy)));
  };

  const endGame = useCallback(async (finalScore: number, finalMissed: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    setTargets([]);

    const earned = calculateTokens(finalScore, finalMissed);
    setTokensEarned(earned);
    setPhase('result');

    if (profile) {
      try {
        if (!profile.id.startsWith('guest')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('users') as any).update({
            tokens: profile.tokens + earned,
            total_earned: profile.total_earned + earned,
          }).eq('id', profile.id);
        }
        updateProfile({ tokens: profile.tokens + earned });
        toast.success(`Tap master! +${earned} tokens! ✨`);
      } catch { /* fail silently */ }
    }
  }, [profile, updateProfile]);

  const spawnTarget = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const size = 50 + Math.random() * 30;
    const x = size + Math.random() * (area.clientWidth - size * 2);
    const y = size + Math.random() * (area.clientHeight - size * 2);
    const id = nextIdRef.current++;

    setTargets(t => [...t, { id, x, y, size, createdAt: Date.now() }]);

    // Auto-remove after lifetime
    setTimeout(() => {
      setTargets(t => {
        if (t.find(tt => tt.id === id)) {
          setMissed(m => m + 1);
          setCombo(0);
          return t.filter(tt => tt.id !== id);
        }
        return t;
      });
    }, TARGET_LIFETIME);
  }, []);

  const startGame = () => {
    setPhase('playing');
    setScore(0);
    setMissed(0);
    setTimeLeft(GAME_DURATION);
    setCombo(0);
    setTargets([]);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setScore(s => {
            setMissed(m => { endGame(s, m); return m; });
            return s;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
  };

  const handleTap = (id: number) => {
    setTargets(t => t.filter(tt => tt.id !== id));
    setScore(s => s + 1);
    setCombo(c => c + 1);
    playTone(700 + combo * 50, 0.08, 'sine', 0.2);
    vibrate(20);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, []);

  const progress = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {phase === 'ready' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-6">
          <div className="text-7xl animate-float">✨</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Tap Challenge</h2>
            <p className="text-text-secondary">Tap the glowing circles before they disappear!</p>
            <p className="text-text-secondary mt-1">{GAME_DURATION} seconds • Build combos for bonus tokens!</p>
          </div>
          <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
            <Button variant="neon" size="lg" onClick={startGame} id="start-tap-btn" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
              <Zap size={20} /> Start Challenge
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted text-xs">
              Close Game
            </Button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="flex flex-col h-full p-4 gap-3">
          {/* HUD */}
          <div className="flex items-center justify-between glass-card rounded-xl p-3">
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-cyan-neon">{score}</p>
              <p className="text-2xs text-muted">Hits</p>
            </div>
            <div className="text-center">
              <p className={`font-display font-bold text-2xl ${timeLeft <= 5 ? 'text-danger animate-pulse' : 'text-text-primary'}`}>
                {timeLeft}s
              </p>
              <p className="text-2xs text-muted">Left</p>
            </div>
            {combo >= 3 && (
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-gold-neon">x{combo}</p>
                <p className="text-2xs text-warn">COMBO!</p>
              </div>
            )}
          </div>

          <ProgressBar value={progress} height={4} />

          {/* Game area */}
          <div
            ref={areaRef}
            className="flex-1 relative rounded-2xl bg-navy-800 border-2 border-navy-600 overflow-hidden"
            style={{ touchAction: 'none' }}
          >
            <AnimatePresence>
              {targets.map((target) => {
                const ageRatio = (Date.now() - target.createdAt) / TARGET_LIFETIME;
                return (
                  <motion.button
                    key={target.id}
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      left: target.x - target.size / 2,
                      top: target.y - target.size / 2,
                      width: target.size,
                      height: target.size,
                      background: `radial-gradient(circle, rgba(0, 240, 255, ${0.8 - ageRatio * 0.5}) 0%, rgba(0, 120, 138, ${0.4 - ageRatio * 0.3}) 100%)`,
                      boxShadow: `0 0 ${20 - ageRatio * 15}px rgba(0, 240, 255, ${0.7 - ageRatio * 0.5})`,
                      border: '2px solid rgba(0, 240, 255, 0.6)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => handleTap(target.id)}
                    whileTap={{ scale: 1.3 }}
                  >
                    <span className="text-lg pointer-events-none">✨</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {targets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
                Targets incoming...
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-6">
          <Trophy size={56} className="text-gold-neon mx-auto" />
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Challenge Complete!</h2>
            <p className="text-text-secondary mb-1">
              <strong className="text-cyan-neon">{score}</strong> targets hit • {missed} missed
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-neon/15 border border-gold-neon/30 mt-2">
              <span className="font-display font-bold text-2xl text-gold-neon">+{tokensEarned}</span>
              <span className="text-text-secondary">tokens earned!</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">Play Again</Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
