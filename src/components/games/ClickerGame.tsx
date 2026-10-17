// src/components/games/ClickerGame.tsx
// Rapid click challenge game — Cybernetic Plasma Power Core, Overdrive Arc Discharges & Volumetric Heat Distortion

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Trophy, Flame } from 'lucide-react';
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

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

interface LightningArc {
  id: number;
  points: { x: number; y: number }[];
  life: number;
  color: string;
}

export function ClickerGame({ onClose }: ClickerGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [comboHeat, setComboHeat] = useState(0); // 0 to 1 scale for overheating effect

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const arcsRef = useRef<LightningArc[]>([]);
  const rAFRef = useRef<number | null>(null);
  const coreAngleRef = useRef(0);
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heatDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const calculateTokens = (clickCount: number) => {
    return Math.min(Math.max(Math.floor(clickCount * 0.5), MIN_TOKENS), MAX_TOKENS);
  };

  const endGame = useCallback(async (finalClicks: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heatDecayRef.current) clearInterval(heatDecayRef.current);
    const earned = calculateTokens(finalClicks);
    setTokensEarned(earned);
    setPhase('result');

    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({
          tokens: profile.tokens + earned,
          total_earned: profile.total_earned + earned,
          xp: profile.xp + Math.floor(earned / 2),
        }).eq('id', profile.id);

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

    toast.success(`Clicker overdrive complete! +${earned} tokens 🎉`);
  }, [profile, updateProfile]);

  const startGame = () => {
    setPhase('playing');
    setClicks(0);
    clickCountRef.current = 0;
    setComboHeat(0);
    setTimeLeft(GAME_DURATION);
    particlesRef.current = [];
    arcsRef.current = [];

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setClicks((c) => { endGame(c); return c; });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    heatDecayRef.current = setInterval(() => {
      setComboHeat(h => Math.max(0, h - 0.04));
    }, 100);
  };

  // Plasma Reactor Core Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderLoop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      const cX = W / 2, cY = H / 2;

      ctx.clearRect(0, 0, W, H);

      const heat = comboHeat;
      coreAngleRef.current += 0.02 + heat * 0.08;

      // 1. Volumetric Reactor Aura
      const auraColor = heat > 0.7 ? '#ec4899' : heat > 0.4 ? '#f59e0b' : '#00f0ff';
      const auraGrad = ctx.createRadialGradient(cX, cY, 20, cX, cY, 130 + heat * 40);
      auraGrad.addColorStop(0, `${auraColor}44`);
      auraGrad.addColorStop(0.5, `${auraColor}15`);
      auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cX, cY, 140 + heat * 30, 0, Math.PI * 2);
      ctx.fill();

      // 2. Rotating Segmented Reactor Turbine Rings
      const rings = [50, 75, 100];
      rings.forEach((r, idx) => {
        const ringR = r + (heat * 12);
        ctx.beginPath();
        ctx.arc(cX, cY, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `${auraColor}33`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const segments = 8 + idx * 4;
        const dir = idx % 2 === 0 ? 1 : -1;
        for (let s = 0; s < segments; s++) {
          const ang = (s * Math.PI * 2) / segments + coreAngleRef.current * dir;
          const x1 = cX + Math.cos(ang) * (ringR - 5);
          const y1 = cY + Math.sin(ang) * (ringR - 5);
          const x2 = cX + Math.cos(ang) * (ringR + 5);
          const y2 = cY + Math.sin(ang) * (ringR + 5);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `${auraColor}88`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // 3. Central Overdrive Plasma Sphere
      const sphereR = 38 + Math.sin(Date.now() / 80) * 3 + heat * 15;
      const sphereGrad = ctx.createRadialGradient(cX - 8, cY - 8, 2, cX, cY, sphereR);
      if (heat > 0.7) {
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, '#f472b6');
        sphereGrad.addColorStop(0.7, '#ec4899');
        sphereGrad.addColorStop(1, '#831843');
      } else if (heat > 0.4) {
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, '#fde047');
        sphereGrad.addColorStop(0.7, '#f59e0b');
        sphereGrad.addColorStop(1, '#78350f');
      } else {
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, '#7dd3fc');
        sphereGrad.addColorStop(0.7, '#00f0ff');
        sphereGrad.addColorStop(1, '#0369a1');
      }

      ctx.beginPath();
      ctx.arc(cX, cY, sphereR, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.shadowBlur = 20 + heat * 25;
      ctx.shadowColor = auraColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Overdrive Arc Discharges
      arcsRef.current = arcsRef.current.filter(a => a.life > 0);
      arcsRef.current.forEach(arc => {
        ctx.beginPath();
        arc.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = arc.color;
        ctx.stroke();
        ctx.shadowBlur = 0;
        arc.life -= 0.15;
      });

      // 5. Kinetic Particle Sparks
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      rAFRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [comboHeat]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    clickCountRef.current++;
    setClicks(c => c + 1);

    // Increase heat progression
    setComboHeat(h => Math.min(1.0, h + 0.08));

    // Generate lightning arcs from center to click point
    const W = rect.width, H = rect.height;
    const cX = W / 2, cY = H / 2;
    const segments = 5;
    const pts = [{ x: cX, y: cY }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      pts.push({
        x: cX + (clickX - cX) * t + (Math.random() - 0.5) * 24,
        y: cY + (clickY - cY) * t + (Math.random() - 0.5) * 24
      });
    }
    pts.push({ x: clickX, y: clickY });

    const arcColor = comboHeat > 0.7 ? '#f472b6' : comboHeat > 0.4 ? '#fde047' : '#00f0ff';
    arcsRef.current.push({
      id: Date.now() + Math.random(),
      points: pts,
      life: 1,
      color: arcColor
    });

    // Particle burst at impact
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      particlesRef.current.push({
        id: Math.random(),
        x: clickX,
        y: clickY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        size: 2.5 + Math.random() * 3,
        color: arcColor
      });
    }

    const freq = 600 + Math.min(800, clickCountRef.current * 20);
    playTone(freq, 0.04, 'square', 0.12);
    vibrate(comboHeat > 0.6 ? 20 : 10);
    lastClickTimeRef.current = Date.now();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heatDecayRef.current) clearInterval(heatDecayRef.current);
    };
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
          <div className="text-7xl animate-bounce-gentle">⚡</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Cybernetic Core Overdrive!</h2>
            <p className="text-text-secondary">Overcharge the plasma power core in <strong className="text-cyan-neon">10 seconds</strong>!</p>
            <p className="text-text-secondary mt-1">Accelerate click frequency to unlock Superheated Overdrive!</p>
          </div>
          <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
            <Button variant="primary" size="lg" onClick={startGame} id="start-clicker-btn">
              <Zap size={20} /> Charge Reactor
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted text-xs">
              Close Game
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-md space-y-4 flex flex-col flex-1">
          {/* Overdrive Stats HUD */}
          <div className="flex items-center justify-between glass-card rounded-xl p-3 border border-navy-700/80 shadow-lg">
            <div className="text-center">
              <p className="font-display font-bold text-3xl text-cyan-neon">{clicks}</p>
              <p className="text-2xs text-muted font-mono">ENERGY</p>
            </div>
            <div className="text-center">
              <p className={`font-display font-bold text-3xl font-mono ${timeLeft <= 3 ? 'text-danger animate-pulse' : 'text-text-primary'}`}>
                {timeLeft}s
              </p>
              <p className="text-2xs text-muted font-mono">STABILIZER</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Flame size={16} className={comboHeat > 0.6 ? 'text-pink-500 animate-pulse' : comboHeat > 0.3 ? 'text-amber-400' : 'text-cyan-400'} />
                <p className={`font-display font-bold text-2xl font-mono ${comboHeat > 0.6 ? 'text-pink-400' : comboHeat > 0.3 ? 'text-gold-neon' : 'text-cyan-neon'}`}>
                  {cps}
                </p>
              </div>
              <p className="text-2xs text-muted font-mono">CPS FLUX</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-2xs text-muted font-mono">
              <span>Time Stabilization</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} color="cyan" height={6} />
          </div>

          {/* Cybernetic Plasma Core Interactive Area */}
          <div
            ref={gameAreaRef}
            className="flex-1 min-h-[340px] relative rounded-3xl border-2 cursor-pointer select-none overflow-hidden flex items-center justify-center transition-all duration-200"
            onClick={handleClick}
            style={{
              borderColor: comboHeat > 0.7 ? '#ec4899' : comboHeat > 0.4 ? '#f59e0b' : 'rgba(0, 240, 255, 0.4)',
              background: 'radial-gradient(circle at center, #09172e 0%, #030a16 65%, #01040a 100%)',
              boxShadow: comboHeat > 0.7
                ? '0 0 50px rgba(236, 72, 153, 0.45), inset 0 0 30px rgba(236, 72, 153, 0.2)'
                : comboHeat > 0.4
                ? '0 0 45px rgba(245, 158, 11, 0.4), inset 0 0 25px rgba(245, 158, 11, 0.15)'
                : '0 0 35px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 240, 255, 0.1)'
            }}
          >
            {/* Plasma Canvas */}
            <canvas ref={canvasRef} width={400} height={340} className="absolute inset-0 w-full h-full pointer-events-none" />

            <div className="relative z-10 text-center pointer-events-none space-y-1">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-4xl filter drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]"
              >
                ⚡
              </motion.div>
              <p className={`font-display font-extrabold text-lg tracking-wider ${comboHeat > 0.7 ? 'text-pink-400 drop-shadow-[0_0_10px_#ec4899]' : comboHeat > 0.4 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {comboHeat > 0.7 ? 'SUPERHEATED OVERDRIVE!' : comboHeat > 0.4 ? 'TURBO CHARGING!' : 'TAP TO DISCHARGE'}
              </p>
              <p className="text-2xs font-mono text-muted uppercase tracking-widest">
                Rapid clicks unleash high-voltage arcs
              </p>
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
          <Trophy size={56} className="text-gold-neon mx-auto drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Overdrive Discharged!</h2>
            <p className="text-6xl font-display font-extrabold text-cyan-neon mb-1 drop-shadow-[0_0_25px_rgba(0,240,255,0.5)]">{clicks}</p>
            <p className="text-text-secondary font-mono mb-4">kinetic discharges in {GAME_DURATION} seconds</p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-neon/15 border border-gold-neon/30 shadow-lg">
              <span className="font-display font-bold text-2xl text-gold-neon">+{tokensEarned}</span>
              <span className="text-text-secondary font-mono">tokens earned!</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="neon" onClick={() => { setPhase('ready'); setClicks(0); }}>Overcharge Again</Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
