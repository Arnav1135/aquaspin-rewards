// src/components/games/TapChallenge.tsx
// High-Octane Cyberpunk Reticle Tap Challenge — Holographic HUD, Kinetic Shockwaves & Combo Supercharge

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Crosshair, Sparkles, Flame, Award } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

const GAME_DURATION = 15;
const TARGET_LIFETIME = 1300; // ms before target disappears
const SPAWN_INTERVAL = 650;

type TargetTier = 'standard' | 'golden' | 'hyper';

interface CyberTarget {
  id: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
  type: TargetTier;
  multiplier: number;
  tag: string;
}

interface ShatterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  shape: 'shard' | 'spark';
}

interface KineticShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  lineWidth: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  createdAt: number;
}

interface TapChallengeProps {
  onClose: () => void;
}

export function TapChallenge({ onClose }: TapChallengeProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [targets, setTargets] = useState<CyberTarget[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

  const nextIdRef = useRef(0);
  const floatIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle & animation physics state
  const particlesRef = useRef<ShatterParticle[]>([]);
  const shockwavesRef = useRef<KineticShockwave[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Animation frame loop for canvas particles and target countdown ticks
  useEffect(() => {
    let lastTick = Date.now();

    const renderLoop = () => {
      const now = Date.now();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Kinetic Shockwaves
        const activeShockwaves: KineticShockwave[] = [];
        for (const sw of shockwavesRef.current) {
          sw.radius += (sw.maxRadius - sw.radius) * 0.16 + 1.2;
          sw.opacity = Math.max(0, 1 - sw.radius / sw.maxRadius);

          if (sw.opacity > 0.02 && sw.radius < sw.maxRadius) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = sw.opacity;
            ctx.lineWidth = sw.lineWidth * (1 - sw.radius / sw.maxRadius);
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.restore();
            activeShockwaves.push(sw);
          }
        }
        shockwavesRef.current = activeShockwaves;

        // 2. Draw Glass-Shatter Shards & Neon Sparks
        const activeParticles: ShatterParticle[] = [];
        for (const p of particlesRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.94;
          p.vy *= 0.94;
          p.vy += 0.15; // Realistic gravity arc
          p.rotation += p.vRot;
          p.life++;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          if (p.life < p.maxLife && p.alpha > 0.02) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.shape === 'spark' ? 8 : 4;

            if (p.shape === 'shard') {
              // Procedural polygonal shard geometry
              ctx.beginPath();
              ctx.moveTo(-p.size * 0.8, -p.size * 0.4);
              ctx.lineTo(p.size * 0.9, -p.size * 0.2);
              ctx.lineTo(p.size * 0.2, p.size * 0.8);
              ctx.closePath();
              ctx.fill();

              // Specular shard edge highlight
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 0.8;
              ctx.stroke();
            } else {
              // High-velocity streak spark
              ctx.beginPath();
              ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
            activeParticles.push(p);
          }
        }
        particlesRef.current = activeParticles;
      }

      // 60fps clock trigger for SVG countdown arc updates
      if (now - lastTick > 32) {
        setRenderTrigger(now);
        lastTick = now;
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Sync canvas dimensions with parent bounding box
  useEffect(() => {
    const updateCanvasSize = () => {
      if (areaRef.current && canvasRef.current) {
        canvasRef.current.width = areaRef.current.clientWidth;
        canvasRef.current.height = areaRef.current.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [phase]);

  // Clean expired floating popups
  useEffect(() => {
    if (floatingScores.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setFloatingScores(prev => prev.filter(item => now - item.createdAt < 900));
    }, 300);
    return () => clearTimeout(timer);
  }, [floatingScores]);

  const calculateTokens = (hits: number, misses: number, highestCombo: number) => {
    const accuracy = hits / Math.max(hits + misses, 1);
    const comboBonus = Math.floor(highestCombo * 1.8);
    return Math.min(100, Math.max(20, Math.floor(hits * 2.5 * accuracy + comboBonus)));
  };

  const endGame = useCallback(async (finalScore: number, finalMissed: number, finalMaxCombo: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    setTargets([]);

    const earned = calculateTokens(finalScore, finalMissed, finalMaxCombo);
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
        toast.success(`Tap Master! +${earned} tokens awarded! ✨`, {
          icon: '🎯',
          style: { background: '#0a192f', color: '#00f0ff', border: '1px solid #00f0ff' }
        });
      } catch {
        /* fail silently */
      }
    }
  }, [profile, updateProfile]);

  const spawnTarget = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;

    const rand = Math.random();
    let type: TargetTier = 'standard';
    let multiplier = 1;
    let size = 68;
    let tag = `LOCK.${(nextIdRef.current % 9) + 1}`;

    if (rand > 0.85) {
      type = 'hyper';
      multiplier = 3;
      size = 80;
      tag = 'HYPER';
    } else if (rand > 0.65) {
      type = 'golden';
      multiplier = 2;
      size = 74;
      tag = 'GOLD';
    }

    const padding = size + 16;
    const maxX = Math.max(padding * 2, area.clientWidth - padding);
    const maxY = Math.max(padding * 2, area.clientHeight - padding);
    const x = padding + Math.random() * (maxX - padding);
    const y = padding + Math.random() * (maxY - padding);
    const id = nextIdRef.current++;

    setTargets(t => [...t, { id, x, y, size, createdAt: Date.now(), type, multiplier, tag }]);

    // Auto-remove after lifetime
    setTimeout(() => {
      setTargets(t => {
        const found = t.find(tt => tt.id === id);
        if (found) {
          setMissed(m => m + 1);
          setCombo(0);

          // Subdued miss sound
          playTone(180, 0.1, 'sawtooth', 0.12);

          // Red timeout shockwave ripple
          shockwavesRef.current.push({
            x: found.x,
            y: found.y,
            radius: 12,
            maxRadius: found.size * 0.9,
            color: '#ef4444',
            opacity: 0.6,
            lineWidth: 2
          });

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
    setMaxCombo(0);
    setTargets([]);
    particlesRef.current = [];
    shockwavesRef.current = [];
    setFloatingScores([]);

    playTone(520, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(780, 0.15, 'triangle', 0.3), 80);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setScore(s => {
            setMissed(m => {
              setMaxCombo(mc => {
                endGame(s, m, mc);
                return mc;
              });
              return m;
            });
            return s;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(spawnTarget, SPAWN_INTERVAL);
  };

  const handleTap = (target: CyberTarget) => {
    const nextCombo = combo + 1;
    const pointsGained = target.multiplier;

    setTargets(t => t.filter(tt => tt.id !== target.id));
    setScore(s => s + pointsGained);
    setCombo(nextCombo);
    setMaxCombo(prev => Math.max(prev, nextCombo));

    // Dynamic Tone escalation based on combo
    if (target.type === 'hyper') {
      playTone(1020 + nextCombo * 35, 0.12, 'sawtooth', 0.25);
      setTimeout(() => playTone(1540, 0.08, 'triangle', 0.2), 35);
      vibrate([25, 20, 50]);
    } else if (target.type === 'golden') {
      playTone(840 + nextCombo * 30, 0.1, 'triangle', 0.28);
      setTimeout(() => playTone(1260, 0.06, 'sine', 0.22), 30);
      vibrate([20, 25]);
    } else {
      playTone(580 + nextCombo * 25, 0.08, 'sine', 0.22);
      vibrate(20);
    }

    // Milestone fanfare chords
    if (nextCombo === 5 || nextCombo === 10 || nextCombo === 15) {
      [700, 880, 1050].forEach((freq, idx) => {
        setTimeout(() => playTone(freq, 0.07, 'triangle', 0.24), idx * 45);
      });
    }

    // Spawn Floating Hit Popups
    const themeColor =
      target.type === 'hyper'
        ? '#f43f5e'
        : target.type === 'golden'
        ? '#fbbf24'
        : '#00f0ff';

    const hitLabel =
      nextCombo >= 10
        ? `🔥 OVERDRIVE +${pointsGained}`
        : nextCombo >= 5
        ? `⚡ COMBO x${nextCombo} +${pointsGained}`
        : target.type !== 'standard'
        ? `✨ ${target.tag} +${pointsGained}`
        : `+${pointsGained}`;

    setFloatingScores(prev => [
      ...prev,
      {
        id: floatIdRef.current++,
        x: target.x,
        y: target.y - 10,
        text: hitLabel,
        color: themeColor,
        scale: nextCombo >= 5 ? 1.25 : 1,
        createdAt: Date.now()
      }
    ]);

    // Spawn Expanding Kinetic Shockwave
    shockwavesRef.current.push({
      x: target.x,
      y: target.y,
      radius: 14,
      maxRadius: target.size * 1.5,
      color: themeColor,
      opacity: 0.95,
      lineWidth: 3.5
    });

    // Secondary ripple
    shockwavesRef.current.push({
      x: target.x,
      y: target.y,
      radius: 6,
      maxRadius: target.size * 0.9,
      color: '#ffffff',
      opacity: 0.8,
      lineWidth: 2
    });

    // Spawn Glass-Shatter Shards & Neon Sparks
    const shardCount = target.type === 'hyper' ? 28 : target.type === 'golden' ? 22 : 18;
    const colors =
      target.type === 'hyper'
        ? ['#f43f5e', '#e11d48', '#fda4af', '#38bdf8', '#ffffff']
        : target.type === 'golden'
        ? ['#fbbf24', '#f59e0b', '#fef08a', '#ffffff', '#00f0ff']
        : ['#00f0ff', '#38bdf8', '#7dd3fc', '#ffffff', '#67e8f9'];

    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.6;
      const speed = 3.5 + Math.random() * 6.5 + (nextCombo > 5 ? 1.5 : 0);

      particlesRef.current.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        maxLife: 28 + Math.floor(Math.random() * 18),
        life: 0,
        shape: i % 2 === 0 ? 'shard' : 'spark'
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const progress = ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100;

  // Dynamic Combo Supercharge Border Glow
  const comboBorderClass =
    combo >= 10
      ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-pulse'
      : combo >= 6
      ? 'border-fuchsia-400 shadow-[0_0_30px_rgba(232,74,255,0.45)]'
      : combo >= 3
      ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.35)]'
      : 'border-navy-600';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] select-none">
      {/* Ready Phase */}
      {phase === 'ready' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-6">
          <div className="relative">
            <div className="text-7xl animate-float">🎯</div>
            <div className="absolute -inset-4 bg-cyan-neon/20 blur-xl rounded-full -z-10" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-text-primary tracking-wide mb-2 flex items-center justify-center gap-2">
              <Crosshair className="text-cyan-neon animate-spin-slow" size={28} />
              Tap Challenge: Overdrive
            </h2>
            <p className="text-text-secondary max-w-sm mx-auto">
              Engage high-precision holographic reticles before time expires.
            </p>
            <div className="flex justify-center gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1 text-cyan-neon">
                <span className="w-2 h-2 rounded-full bg-cyan-neon" /> Standard 1x
              </span>
              <span className="flex items-center gap-1 text-gold-neon">
                <span className="w-2 h-2 rounded-full bg-gold-neon" /> Gold 2x
              </span>
              <span className="flex items-center gap-1 text-fuchsia-400">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400" /> Hyper 3x
              </span>
            </div>
            <p className="text-text-secondary text-xs mt-3">
              {GAME_DURATION} seconds • Stack combos to unleash supercharge multipliers!
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-[240px] mx-auto">
            <Button variant="primary" size="lg" onClick={startGame} id="start-tap-btn" className="shadow-lg shadow-cyan-neon/20">
              <Zap size={20} /> Start Challenge
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted hover:text-text-primary text-xs">
              Close Game
            </Button>
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {phase === 'playing' && (
        <div className="flex flex-col h-full p-4 gap-3 relative">
          {/* Cyberpunk HUD */}
          <div className="flex items-center justify-between glass-card rounded-xl p-3 border border-white/10 backdrop-blur-md">
            <div className="text-center px-2">
              <p className="font-display font-extrabold text-2xl text-cyan-neon">{score}</p>
              <p className="text-2xs text-muted tracking-wider uppercase">Score</p>
            </div>
            <div className="text-center px-2">
              <p
                className={`font-display font-extrabold text-2xl ${
                  timeLeft <= 5 ? 'text-danger animate-pulse' : 'text-text-primary'
                }`}
              >
                {timeLeft}s
              </p>
              <p className="text-2xs text-muted tracking-wider uppercase">Time Remaining</p>
            </div>
            <div className="text-center px-2 min-w-[70px]">
              {combo >= 2 ? (
                <div className="animate-bounce">
                  <p
                    className={`font-display font-black text-2xl ${
                      combo >= 10 ? 'text-amber-400' : combo >= 6 ? 'text-fuchsia-400' : 'text-cyan-neon'
                    }`}
                  >
                    x{combo}
                  </p>
                  <p className="text-2xs font-bold text-warn flex items-center justify-center gap-1">
                    <Flame size={12} /> {combo >= 10 ? 'HYPER' : 'COMBO'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-display font-bold text-2xl text-muted">0x</p>
                  <p className="text-2xs text-muted tracking-wider uppercase">Combo</p>
                </div>
              )}
            </div>
          </div>

          <ProgressBar value={progress} height={4} />

          {/* Interactive Game Arena */}
          <div
            ref={areaRef}
            className={`flex-1 relative rounded-2xl bg-gradient-to-b from-[#061224] to-[#020712] border-2 transition-all duration-300 overflow-hidden ${comboBorderClass}`}
            style={{ touchAction: 'none' }}
          >
            {/* Tactical Grid Background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.15) 0%, transparent 70%),
                  linear-gradient(to right, rgba(0, 240, 255, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0, 240, 255, 0.08) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px'
              }}
            />

            {/* Kinetic Canvas Shards & Shockwaves Overlay */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />

            {/* Floating Popups */}
            <AnimatePresence>
              {floatingScores.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -36, scale: f.scale }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute pointer-events-none z-30 font-display font-black text-sm tracking-wider drop-shadow-md"
                  style={{
                    left: f.x,
                    top: f.y,
                    color: f.color,
                    transform: 'translate(-50%, -50%)',
                    textShadow: `0 0 10px ${f.color}`
                  }}
                >
                  {f.text}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Holographic Reticle Targets */}
            <AnimatePresence>
              {targets.map(target => {
                const now = renderTrigger || Date.now();
                const ageRatio = Math.min(1, Math.max(0, (now - target.createdAt) / TARGET_LIFETIME));
                const remainingRatio = 1 - ageRatio;

                // Color Themes
                const isHyper = target.type === 'hyper';
                const isGold = target.type === 'golden';

                const themeColor = isHyper ? '#f43f5e' : isGold ? '#fbbf24' : '#00f0ff';
                const urgentColor = remainingRatio < 0.25 ? '#ef4444' : remainingRatio < 0.5 ? '#f59e0b' : themeColor;

                // SVG Circular Countdown arc geometry
                const radius = target.size / 2 - 5;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference * (1 - remainingRatio);

                return (
                  <motion.div
                    key={target.id}
                    className="absolute cursor-pointer select-none z-10"
                    style={{
                      left: target.x - target.size / 2,
                      top: target.y - target.size / 2,
                      width: target.size,
                      height: target.size,
                    }}
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.16, ease: 'backOut' }}
                    onClick={() => handleTap(target)}
                  >
                    {/* SVG Holographic HUD Reticle */}
                    <svg width={target.size} height={target.size} viewBox={`0 0 ${target.size} ${target.size}`} className="overflow-visible">
                      <defs>
                        <radialGradient id={`reticle-glow-${target.id}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={themeColor} stopOpacity={0.45} />
                          <stop offset="70%" stopColor={themeColor} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={themeColor} stopOpacity={0} />
                        </radialGradient>
                        <filter id={`reticle-bloom-${target.id}`} x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="2.5" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Backdrop Radial Specular Glow */}
                      <circle
                        cx={target.size / 2}
                        cy={target.size / 2}
                        r={target.size / 2 - 4}
                        fill={`url(#reticle-glow-${target.id})`}
                        filter={`url(#reticle-bloom-${target.id})`}
                      />

                      {/* Static Outer Track */}
                      <circle
                        cx={target.size / 2}
                        cy={target.size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="2.5"
                      />

                      {/* Depleting Circular Arc Countdown Timer */}
                      <circle
                        cx={target.size / 2}
                        cy={target.size / 2}
                        r={radius}
                        fill="none"
                        stroke={urgentColor}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform={`rotate(-90 ${target.size / 2} ${target.size / 2})`}
                        style={{
                          filter: `drop-shadow(0 0 6px ${urgentColor})`,
                          transition: 'stroke 0.2s ease'
                        }}
                      />

                      {/* Outer Concentric Rotating Ring with Segmentation Marks */}
                      <g
                        className="origin-center"
                        style={{
                          transformOrigin: `${target.size / 2}px ${target.size / 2}px`,
                          animation: 'spin 6s linear infinite'
                        }}
                      >
                        <circle
                          cx={target.size / 2}
                          cy={target.size / 2}
                          r={radius - 4}
                          fill="none"
                          stroke={themeColor}
                          strokeWidth="1.2"
                          strokeDasharray="4 8"
                          strokeOpacity={0.7}
                        />
                      </g>

                      {/* Inner Counter-Rotating Lock Brackets [ ] */}
                      <g
                        className="origin-center"
                        style={{
                          transformOrigin: `${target.size / 2}px ${target.size / 2}px`,
                          animation: 'spin 4s linear infinite reverse'
                        }}
                      >
                        {/* 4 Corner Bracket Prongs */}
                        <path
                          d={`M ${target.size / 2 - 10} ${target.size / 2 - 14} L ${target.size / 2 - 14} ${target.size / 2 - 14} L ${target.size / 2 - 14} ${target.size / 2 - 10}`}
                          fill="none"
                          stroke={themeColor}
                          strokeWidth="1.8"
                        />
                        <path
                          d={`M ${target.size / 2 + 10} ${target.size / 2 - 14} L ${target.size / 2 + 14} ${target.size / 2 - 14} L ${target.size / 2 + 14} ${target.size / 2 - 10}`}
                          fill="none"
                          stroke={themeColor}
                          strokeWidth="1.8"
                        />
                        <path
                          d={`M ${target.size / 2 - 10} ${target.size / 2 + 14} L ${target.size / 2 - 14} ${target.size / 2 + 14} L ${target.size / 2 - 14} ${target.size / 2 + 10}`}
                          fill="none"
                          stroke={themeColor}
                          strokeWidth="1.8"
                        />
                        <path
                          d={`M ${target.size / 2 + 10} ${target.size / 2 + 14} L ${target.size / 2 + 14} ${target.size / 2 + 14} L ${target.size / 2 + 14} ${target.size / 2 + 10}`}
                          fill="none"
                          stroke={themeColor}
                          strokeWidth="1.8"
                        />
                      </g>

                      {/* Precision Crosshairs */}
                      <line
                        x1={target.size / 2 - 8}
                        y1={target.size / 2}
                        x2={target.size / 2 + 8}
                        y2={target.size / 2}
                        stroke={themeColor}
                        strokeWidth="1.2"
                        strokeOpacity={0.8}
                      />
                      <line
                        x1={target.size / 2}
                        y1={target.size / 2 - 8}
                        x2={target.size / 2}
                        y2={target.size / 2 + 8}
                        stroke={themeColor}
                        strokeWidth="1.2"
                        strokeOpacity={0.8}
                      />

                      {/* Center Specular Glint Aperture */}
                      <circle
                        cx={target.size / 2}
                        cy={target.size / 2}
                        r={3.5}
                        fill="#ffffff"
                        style={{ filter: `drop-shadow(0 0 5px ${themeColor})` }}
                      />
                    </svg>

                    {/* Cyber Tag Badge */}
                    <div
                      className="absolute -bottom-2 inset-x-0 flex justify-center text-3xs font-mono font-bold tracking-widest pointer-events-none"
                      style={{ color: themeColor, textShadow: `0 0 5px ${themeColor}` }}
                    >
                      {target.tag}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Target incoming indicator */}
            {targets.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted/60 text-xs font-mono tracking-widest animate-pulse">
                SCANNING SECTOR // INCOMING TARGETS...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result Phase */}
      {phase === 'result' && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-6">
          <div className="relative">
            <Trophy size={64} className="text-gold-neon mx-auto animate-float" />
            <div className="absolute -inset-6 bg-gold-neon/20 blur-2xl rounded-full -z-10" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold text-text-primary mb-2">Challenge Complete!</h2>
            <p className="text-text-secondary text-sm mb-4">
              <strong className="text-cyan-neon font-bold">{score}</strong> points scored • Max Combo:{' '}
              <strong className="text-gold-neon font-bold">x{maxCombo}</strong> • {missed} timed out
            </p>

            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-gold-neon/15 via-gold-neon/25 to-gold-neon/15 border border-gold-neon/40 shadow-xl shadow-gold-neon/10">
              <Award className="text-gold-neon" size={28} />
              <div className="text-left">
                <span className="font-display font-black text-3xl text-gold-neon">+{tokensEarned}</span>
                <span className="text-xs text-text-secondary block font-medium">tokens credited to wallet</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="neon" size="lg" onClick={startGame} className="shadow-lg shadow-cyan-neon/20">
              <Sparkles size={18} /> Play Again
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose} className="text-muted hover:text-text-primary">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
