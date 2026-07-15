// src/components/games/CrashGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CrashGameProps { onClose: () => void; }
type GameState = 'betting' | 'countdown' | 'climbing' | 'crashed' | 'success_aborted';
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; };
type SocialEntry = { user: string; amount: number; mult: number; };

const FAKE_USERS = ['Raj','Priya','Max','Luna','Kai','Zoe','Arnav','Mia','Dev','Sara'];

export function CrashGame({ onClose }: CrashGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [autoCashOut, setAutoCashOut] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashedOut, setCashedOut] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [socialFeed, setSocialFeed] = useState<SocialEntry[]>([]);
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);
  
  // Historical crash points track
  const [pastCrashes, setPastCrashes] = useState<number[]>([1.5, 2.4, 4.0, 8.2]);

  // Visual/Animation Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(1.0);
  const particlesRef = useRef<Particle[]>([]);
  const crashEffectRef = useRef<{ radius: number; opacity: number } | null>(null);
  const cashedOutRef = useRef(false);
  const autoCashOutRef = useRef<number | null>(null);
  const socialIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balance = profile?.tokens ?? 0;

  // Custom 4D Sensory States
  const [timeDilationActive, setTimeDilationActive] = useState(false);
  const [tinnitusActive, setTinnitusActive] = useState(false);
  const [countdownTicks, setCountdownTicks] = useState(5);
  const [isAborting, setIsAborting] = useState(false);

  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => { cashedOutRef.current = cashedOut; }, [cashedOut]);

  const getMultColor = (m: number) => {
    if (m >= 10) return '#ef4444';
    if (m >= 5) return '#f97316';
    if (m >= 2) return '#eab308';
    return '#00F0FF';
  };

  const drawGraph = (elapsed: number, val: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Dark Ambient Mission Control Room projection
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, W, H);

    // Dynamic grid lines extending to infinity
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridGap = 30;
    for (let x = 40; x < W; x += gridGap) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 30); ctx.stroke();
    }
    for (let y = 0; y < H - 30; y += gridGap) {
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Graph axes
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.lineTo(40, H - 30);
    ctx.lineTo(W, H - 30);
    ctx.stroke();

    // Past Crashes "Ghost" Markers along the axes or grid
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.font = '8px monospace';
    const scaleY = (H - 60) / Math.max(2, val * 1.25);
    pastCrashes.forEach((pc) => {
      const py = H - 30 - (pc - 1.0) * scaleY;
      if (py > 20 && py < H - 30) {
        ctx.beginPath();
        ctx.arc(42, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(`👻 ${pc.toFixed(2)}x`, 48, py + 3);
      }
    });

    // Altitude readouts on the Y-Axis
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const yLabels = [{ v: 1.0, l: '1.0x' }, { v: 2.0, l: '2.0x' }, { v: 5.0, l: '5.0x' }, { v: 10.0, l: '10.0x' }];
    yLabels.forEach(({ v, l }) => {
      const py = H - 30 - (v - 1.0) * scaleY;
      if (py > 10 && py < H - 20) ctx.fillText(l, 35, py + 3);
    });

    // Flight Curve Calculation
    const scaleX = (W - 80) / Math.max(8, elapsed * 1.5);
    const points: { px: number; py: number }[] = [];
    for (let t = 0; t <= elapsed; t += 0.05) {
      const v = Math.pow(Math.E, 0.08 * t);
      points.push({ px: 40 + t * scaleX, py: H - 30 - (v - 1.0) * scaleY });
    }
    
    if (points.length < 2) return;
    const lastPt = points[points.length - 1];

    // Plasma trail curve fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, crashed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(40, H - 30);
    points.forEach(p => ctx.lineTo(p.px, p.py));
    ctx.lineTo(lastPt.px, H - 30);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Luminous Plasma flight trail
    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#ef4444' : '#00F0FF';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = crashed ? '#ef4444' : '#00F0FF';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Drawing Parallel trajectories of other players in flight
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.px, p.py - 15);
      else ctx.lineTo(p.px, p.py - 15);
    });
    ctx.stroke();

    // Sputtering Engine flame particles
    if (!crashed) {
      const angle = Math.atan2(
        points[Math.max(0, points.length - 3)].py - lastPt.py,
        lastPt.px - points[Math.max(0, points.length - 3)].px
      );
      
      // Add combustion exhaust particles
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push({
          x: lastPt.px - Math.cos(angle) * 10,
          y: lastPt.py + Math.sin(angle) * 10,
          vx: -Math.cos(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
          vy: Math.sin(angle) * (2 + Math.random() * 3) + (Math.random() - 0.5) * 1.5,
          life: 1.0,
          color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
          size: 2 + Math.random() * 3
        });
      }
    }

    // Render Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.06;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = p.life * 6;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Spacecraft Model Rendering
    if (!crashed && gameState === 'climbing') {
      const prevPt = points[Math.max(0, points.length - 2)];
      const angle = Math.atan2(prevPt.py - lastPt.py, lastPt.px - prevPt.px);
      
      ctx.save();
      ctx.translate(lastPt.px, lastPt.py);
      ctx.rotate(-angle);
      
      // Draw a sleek metallic spacecraft shape
      ctx.fillStyle = '#e2e8f0'; // slate hulls
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();

      // Glowing Cockpit window
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-2, -3);
      ctx.lineTo(-2, 3);
      ctx.closePath();
      ctx.fill();

      // Combustion Engine Glow
      ctx.fillStyle = '#ff7700';
      ctx.beginPath();
      ctx.arc(-5, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Exploding Crash Sphere
    if (crashEffectRef.current) {
      const ce = crashEffectRef.current;
      ctx.save();
      const gradExplosion = ctx.createRadialGradient(lastPt.px, lastPt.py, 2, lastPt.px, lastPt.py, ce.radius);
      gradExplosion.addColorStop(0, '#ffffff');
      gradExplosion.addColorStop(0.3, '#f97316');
      gradExplosion.addColorStop(1, 'transparent');
      ctx.fillStyle = gradExplosion;
      ctx.beginPath();
      ctx.arc(lastPt.px, lastPt.py, ce.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ce.radius += 6;
      ce.opacity -= 0.04;
      if (ce.opacity <= 0) crashEffectRef.current = null;
    }
  };

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const currentMult = Math.round(Math.pow(Math.E, 0.08 * elapsed) * 100) / 100;

    // Near-miss check: Check if close to any historical crash points
    let nearMiss = false;
    pastCrashes.forEach(pc => {
      if (Math.abs(currentMult - pc) <= 0.05 && currentMult < pc) {
        nearMiss = true;
      }
    });

    if (nearMiss) {
      setTimeDilationActive(true);
      // Trigger visual slow-mo vignette
    } else {
      setTimeDilationActive(false);
    }

    if (currentMult >= crashPointRef.current) {
      setMultiplier(crashPointRef.current);
      setGameState('crashed');
      crashEffectRef.current = { radius: 15, opacity: 1 };
      
      // Update past crash history
      setPastCrashes(prev => [crashPointRef.current, ...prev.slice(0, 3)]);

      drawGraph(elapsed, crashPointRef.current, true);
      
      // Explosion sequence sound
      playTone(85, 0.5, 'sawtooth', 0.4);
      playTone(45, 0.8, 'sine', 0.5); // sub-bass rumble
      vibrate([150, 50, 250, 50, 300]);
      
      setTinnitusActive(true);
      setTimeout(() => setTinnitusActive(false), 2000);

      if (!cashedOutRef.current) toast.error(`💥 CRASHED at ${crashPointRef.current}x!`);
      if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
      return;
    }

    if (!cashedOutRef.current && autoCashOutRef.current && currentMult >= autoCashOutRef.current) {
      handleCashOut(currentMult);
    }

    setMultiplier(currentMult);
    drawGraph(elapsed, currentMult, false);

    // Vibration tremors correlating to flight speed altitude
    if (currentMult > 1.8) {
      const shakeChance = Math.min(0.8, (currentMult / 20));
      if (Math.random() < shakeChance) {
        vibrate(Math.min(15, currentMult * 1.5));
      }
    }

    rAFRef.current = requestAnimationFrame(tick);
  };

  const handleStartGame = async () => {
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit to play.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    // Countdown state trigger
    setGameState('countdown');
    setCountdownTicks(5);
    setMultiplier(1.0);
    setCashedOut(false);
    cashedOutRef.current = false;
    setEarnedTokens(0);
    setSocialFeed([]);
    particlesRef.current = [];
    crashEffectRef.current = null;
    setSafetyCoverOpen(false);

    // Tick down countdown
    let ticks = 5;
    const countTimer = setInterval(() => {
      ticks--;
      setCountdownTicks(ticks);
      
      // Amber Warning sound
      playTone(320, 0.1, 'sine', 0.2);
      vibrate(12);

      if (ticks <= 0) {
        clearInterval(countTimer);
        
        // Launch spacecraft
        setGameState('climbing');
        playTone(392.00, 0.12, 'sine', 0.25);
        setTimeout(() => playTone(523.25, 0.2, 'sine', 0.3), 100);

        const nb = balance - actualBetAmount;
        if (profile && !profile.id.startsWith('guest')) {
          try { 
            (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id).then();
          } catch (e) {
            console.error('Failed to update user balance:', e);
          }
        }
        updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
        crashPointRef.current = Math.random() < 0.03 ? 1.0 : Math.max(1.01, Math.round((0.96 / Math.random()) * 100) / 100);
        startTimeRef.current = Date.now();
        rAFRef.current = requestAnimationFrame(tick);

        socialIntervalRef.current = setInterval(() => {
          const u = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
          const amt = (Math.floor(Math.random() * 20) + 1) * 50;
          const m = Math.round((1.05 + Math.random() * 3) * 100) / 100;
          setSocialFeed(prev => [...prev.slice(-2), { user: u, amount: amt, mult: m }]);
        }, 1500);
      }
    }, 1000);
  };

  const handleCashOut = async (currentMult?: number) => {
    const m = currentMult ?? multiplier;
    if (gameState !== 'climbing' || cashedOutRef.current) return;
    
    setCashedOut(true);
    cashedOutRef.current = true;
    setIsAborting(true);
    
    // Safety cover slam down sound
    playTone(180, 0.15, 'sawtooth', 0.3);

    const earned = Math.floor(betAmount * m);
    setEarnedTokens(earned);

    // Sonic boom sound barrier break melody
    toast.success(`🚀 Sound barrier broken at ${m.toFixed(2)}x! +${earned - betAmount} tokens!`);
    playTone(523.25, 0.1, 'sine', 0.3);
    setTimeout(() => playTone(1046.50, 0.2, 'sine', 0.4), 80);
    vibrate([60, 30, 100]);

    setTimeout(() => setIsAborting(false), 800);

    const fb = balance + earned;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (earned - betAmount), xp: profile.xp + Math.floor(betAmount * 0.15) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch (e) {
        console.error('Failed to update user after cashout:', e);
      }
    }
    updateProfile({ tokens: fb });
  };

  useEffect(() => () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
  }, []);

  const multColor = getMultColor(multiplier);

  // Vibration Tremor Amplitude for screen shake in styling
  const getScreenTremor = () => {
    if (gameState !== 'climbing') return 'none';
    const intensity = Math.min(5, multiplier * 0.4);
    const rx = (Math.random() - 0.5) * intensity;
    const ry = (Math.random() - 0.5) * intensity;
    return `translate3d(${rx}px, ${ry}px, 0px)`;
  };

  return (
    <div 
      className={`flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch transition-all duration-300 ${
        tinnitusActive ? 'filter saturate-30 contrast-125' : ''
      }`}
      style={{ transform: getScreenTremor() }}
    >
      {/* Time Dilation Slow-mo Vignette */}
      {timeDilationActive && (
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_80px_rgba(0,240,255,0.35)] animate-pulse" />
      )}

      {/* Volumetric sonic abort screen flash */}
      {isAborting && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-white/30 transition-all duration-200" />
      )}

      {/* Styled inline sheet */}
      <style>{`
        .hud-digital-readout {
          animation: hudPulse 1.8s infinite ease-in-out;
        }
        @keyframes hudPulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.8; }
        }
        .abort-switch-cover {
          transform-origin: top;
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .abort-switch-cover.open {
          transform: rotateX(-120deg);
        }
        /* 3D Stack chips display container */
        .chip-stack-3d {
          perspective: 200px;
        }
      `}</style>

      {/* Left bet control center */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/95 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 uppercase tracking-widest">
              MISSION CONTROL
            </h2>
            <ShieldAlert size={16} className="text-red-500 animate-pulse" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={gameState === 'climbing' || gameState === 'countdown'} />

          <div className="space-y-1">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">AUTO CASHOUT (MULT)</span>
            <div className="flex rounded-xl bg-slate-950 p-1.5 border border-slate-800">
              <input type="number" step="0.1" min="1.01" placeholder="Disabled"
                value={autoCashOut ?? ''}
                onChange={e => setAutoCashOut(e.target.value ? parseFloat(e.target.value) : null)}
                disabled={gameState === 'climbing' || gameState === 'countdown'}
                className="w-full bg-transparent border-0 outline-none text-sm font-mono text-cyan-300 px-3 py-1" />
              <span className="flex items-center pr-3 text-xs text-slate-500 font-bold">X</span>
            </div>
          </div>

          {/* Potential payout status bar */}
          {gameState === 'climbing' && (
            <div className="text-center p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-2xs text-slate-500 uppercase tracking-widest mb-0.5">NET WIN VALUE</p>
              <p className="text-2xl font-bold font-mono" style={{ color: multColor }}>
                +{(betAmount * multiplier).toFixed(0)} tokens
              </p>
            </div>
          )}

          {/* 3D Chip Stack visualization */}
          <div className="chip-stack-3d flex justify-center gap-1 py-1">
            {Array.from({ length: Math.min(8, Math.ceil(betAmount / 50)) }).map((_, i) => (
              <div 
                key={i} 
                className="w-10 h-2 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-sm shadow-md border-b-2 border-slate-950"
                style={{ transform: `rotateX(40deg) translateZ(${i * 3}px)` }}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Action Triggering */}
        <div className="space-y-2.5">
          {gameState === 'climbing' ? (
            <div className="space-y-2">
              {/* Abort Switch Safety Cover Lever */}
              <div 
                className="relative bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center cursor-pointer"
                onMouseEnter={() => setSafetyCoverOpen(true)}
                onMouseLeave={() => setSafetyCoverOpen(false)}
                onClick={() => setSafetyCoverOpen(!safetyCoverOpen)}
              >
                <div className={`abort-switch-cover absolute inset-x-0 top-0 h-6 bg-red-600 rounded-t-xl flex items-center justify-center text-[9px] font-bold text-white tracking-widest ${
                  safetyCoverOpen ? 'open' : ''
                }`}>
                  SAFETY SHIELD ACTIVE
                </div>
                <div className="h-6" /> {/* Spacer */}
                <Button 
                  variant="success" 
                  size="lg" 
                  className="w-full font-black py-3 text-xs rounded-xl disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 border border-emerald-400/20" 
                  disabled={cashedOut || !safetyCoverOpen} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCashOut();
                  }}
                >
                  {cashedOut ? `SECURED: ${earnedTokens} tokens` : 'TRIGGER EMERGENCY ABORT'}
                </Button>
              </div>
              <p className="text-[9px] text-slate-500 text-center uppercase tracking-wider font-bold">
                *Hover cover to lift emergency release shield
              </p>
            </div>
          ) : (
            <Button 
              variant="neon" 
              size="lg" 
              className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" 
              disabled={betAmount <= 0 || betAmount > balance || gameState === 'countdown'} 
              onClick={handleStartGame}
            >
              {gameState === 'crashed' ? 'RELAUNCH SPACECRAFT' : 'Bets Locked: Start Launch'}
            </Button>
          )}
          <Button variant="ghost" className="w-full text-2xs text-slate-500 hover:text-slate-400 py-1.5" onClick={onClose}>
            Disconnect Console
          </Button>
        </div>
      </Card>

      {/* Holo projection viewport screen */}
      <Card className="flex-1 flex flex-col relative min-h-[400px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden">
        {/* HUD readout digital overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10 hud-digital-readout pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.h2 
              key={multiplier.toFixed(2)} 
              initial={{ opacity: 0.8, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-black font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]" 
              style={{ color: multColor }}
            >
              {multiplier.toFixed(2)}x
            </motion.h2>
          </AnimatePresence>
          <div className="flex items-center gap-1.5 text-2xs text-slate-500 font-mono">
            <AlertTriangle size={11} className="text-red-500 animate-pulse" />
            <span>CRITICAL TRAJECTORY ACTIVE</span>
          </div>
        </div>

        {/* Visual countdown sequence overlay */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs uppercase tracking-widest text-orange-400 font-bold animate-pulse">WARPING IGNITION SEQUENCE</p>
            <motion.h3 
              key={countdownTicks}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-black text-white font-mono"
            >
              {countdownTicks}
            </motion.h3>
          </div>
        )}

        {/* Red crashed warning overlay */}
        {gameState === 'crashed' && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-red-950/20 backdrop-blur-3xs"
          >
            <div className="text-center">
              <p className="text-4xl font-black text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">💥 CORE RUPTURED</p>
              <p className="text-sm text-red-300 font-mono mt-1">Telemetry terminated at {crashPointRef.current}x</p>
            </div>
          </motion.div>
        )}

        {/* Graph canvas */}
        <canvas ref={canvasRef} width={500} height={300} className="w-full h-[300px]" />

        {/* Live Parallel Mission trajectories list */}
        <div className="px-4 pb-3 space-y-1 min-h-[90px] border-t border-slate-900/60 bg-slate-950/40">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest py-1">Telemetry feed</p>
          <AnimatePresence>
            {socialFeed.map((e, i) => (
              <motion.div key={e.user+i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-between text-2xs text-slate-400 font-mono leading-relaxed">
                <span className="text-cyan-300">🛰️ {e.user}</span>
                <span>Aborted bet @ <span className="text-amber-400 font-bold">{e.mult}x</span></span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
