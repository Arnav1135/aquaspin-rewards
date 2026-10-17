// src/components/games/CrashGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CrashGameProps { onClose: () => void; }
type GameState = 'betting' | 'climbing' | 'crashed';
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color?: string; size?: number; };
type WarpStar = { x: number; y: number; speed: number; len: number; opacity: number; };
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(1.0);
  const particlesRef = useRef<Particle[]>([]);
  const warpStarsRef = useRef<WarpStar[]>([]);
  const crashEffectRef = useRef<{ radius: number; opacity: number; maxRadius: number } | null>(null);
  const cashedOutRef = useRef(false);
  const autoCashOutRef = useRef<number | null>(null);
  const socialIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balance = profile?.tokens ?? 0;

  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => { cashedOutRef.current = cashedOut; }, [cashedOut]);

  // Initialize cosmic warp stars
  useEffect(() => {
    warpStarsRef.current = Array.from({ length: 45 }, () => ({
      x: Math.random() * 500,
      y: Math.random() * 300,
      speed: 1.5 + Math.random() * 3.5,
      len: 4 + Math.random() * 12,
      opacity: 0.15 + Math.random() * 0.4
    }));
  }, []);

  const getMultColor = (m: number) => {
    if (m >= 10) return '#ef4444';
    if (m >= 5) return '#f97316';
    if (m >= 2) return '#eab308';
    return '#00F0FF';
  };

  const drawVectorRocket = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, mult: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const flamePulse = 0.8 + 0.3 * Math.sin(Date.now() / 40);
    const flameLen = (20 + Math.min(25, mult * 2)) * flamePulse;

    // 1. Dual Afterburner Plumes & Shock Diamonds
    const drawFlame = (offY: number) => {
      const fGrad = ctx.createLinearGradient(-10, offY, -10 - flameLen, offY);
      fGrad.addColorStop(0, '#ffffff');
      fGrad.addColorStop(0.2, '#38bdf8');
      fGrad.addColorStop(0.6, '#f97316');
      fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.beginPath();
      ctx.moveTo(-9, offY - 3);
      ctx.lineTo(-9 - flameLen, offY);
      ctx.lineTo(-9, offY + 3);
      ctx.closePath();
      ctx.fillStyle = fGrad;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00F0FF';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner shock diamond
      ctx.beginPath();
      ctx.moveTo(-11, offY - 1.5);
      ctx.lineTo(-11 - flameLen * 0.4, offY);
      ctx.lineTo(-11, offY + 1.5);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    drawFlame(-3.5);
    drawFlame(3.5);

    // 2. Procedural Aerospace Interceptor Hull
    ctx.shadowBlur = 14;
    ctx.shadowColor = mult >= 10 ? 'rgba(239,68,68,0.7)' : 'rgba(0,240,255,0.6)';

    // Delta wings
    const wingGrad = ctx.createLinearGradient(-12, -14, 14, 14);
    wingGrad.addColorStop(0, '#1e293b');
    wingGrad.addColorStop(0.5, '#475569');
    wingGrad.addColorStop(1, '#0f172a');

    ctx.beginPath();
    ctx.moveTo(14, 0);       // Nose cone
    ctx.lineTo(-6, -13);     // Left wingtip
    ctx.lineTo(-10, -5);     // Left trailing edge
    ctx.lineTo(-11, 0);      // Engine block
    ctx.lineTo(-10, 5);      // Right trailing edge
    ctx.lineTo(-6, 13);      // Right wingtip
    ctx.closePath();
    ctx.fillStyle = wingGrad;
    ctx.fill();
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Metallic Upper Fuselage Ridge
    const ridgeGrad = ctx.createLinearGradient(-8, 0, 14, 0);
    ridgeGrad.addColorStop(0, '#64748b');
    ridgeGrad.addColorStop(0.6, '#f8fafc');
    ridgeGrad.addColorStop(1, '#38bdf8');

    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fillStyle = ridgeGrad;
    ctx.fill();

    // Canopy / Cockpit Visor (High-Specular Cyan Gem)
    const visorGrad = ctx.createRadialGradient(2, -1, 1, 3, 0, 6);
    visorGrad.addColorStop(0, '#ffffff');
    visorGrad.addColorStop(0.4, '#38bdf8');
    visorGrad.addColorStop(1, '#0369a1');

    ctx.beginPath();
    ctx.ellipse(3, 0, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = visorGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Wingtip glowing beacons
    ctx.beginPath();
    ctx.arc(-6, -13, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#00f0ff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-6, 13, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.fill();

    ctx.restore();
  };

  const drawGraph = (elapsed: number, val: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 1. Deep Cosmic Cyberpunk Backdrop
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
    bgGrad.addColorStop(0, '#0a1426');
    bgGrad.addColorStop(0.6, '#050c18');
    bgGrad.addColorStop(1, '#02050b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Velocity Warp Stars
    if (!crashed) {
      const starSpeedBoost = Math.min(8, 1 + val * 0.4);
      warpStarsRef.current.forEach(star => {
        star.x -= star.speed * starSpeedBoost;
        if (star.x < 0) {
          star.x = W + Math.random() * 40;
          star.y = Math.random() * H;
        }
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x + star.len * (starSpeedBoost * 0.6), star.y);
        ctx.strokeStyle = `rgba(0, 240, 255, ${star.opacity * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 3. Cyberpunk Horizon Grid with Glowing Axes
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = H - (H / 5) * i;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W, y); ctx.stroke();
      const x = 40 + ((W - 40) / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 30); ctx.stroke();
    }

    // Y Multiplier Reference Labels
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.textAlign = 'right';
    const yLabels = [{ v: 1, label: '1.0x' }, { v: 2, label: '2.0x' }, { v: 5, label: '5.0x' }, { v: 10, label: '10.0x' }];
    const scaleY = H / Math.max(2, val * 1.25);
    yLabels.forEach(({ v, label }) => {
      const py = H - v * scaleY;
      if (py > 10 && py < H - 20) {
        ctx.fillText(label, 36, py + 4);
        ctx.beginPath();
        ctx.moveTo(38, py);
        ctx.lineTo(44, py);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.stroke();
      }
    });

    // 4. Volumetric Ascent Curve Generation
    const scaleX = (W - 55) / Math.max(10, elapsed * 1.5);
    const points: { px: number; py: number }[] = [];
    for (let t = 0; t <= elapsed; t += 0.06) {
      const v = Math.pow(Math.E, 0.075 * t);
      points.push({ px: 40 + t * scaleX, py: H - v * scaleY });
    }
    if (points.length < 2) return;
    const lastPt = points[points.length - 1];

    // Under-Curve Volumetric Luminous Fill
    const grad = ctx.createLinearGradient(0, lastPt.py, 0, H);
    if (crashed) {
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.38)');
      grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.12)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    } else {
      const topColor = val >= 10 ? 'rgba(239, 68, 68, 0.35)' : val >= 5 ? 'rgba(249, 115, 22, 0.32)' : val >= 2 ? 'rgba(234, 179, 8, 0.28)' : 'rgba(0, 240, 255, 0.25)';
      grad.addColorStop(0, topColor);
      grad.addColorStop(0.6, 'rgba(0, 240, 255, 0.08)');
      grad.addColorStop(1, 'rgba(2, 5, 11, 0)');
    }

    ctx.beginPath();
    ctx.moveTo(40, H);
    points.forEach(p => ctx.lineTo(p.px, p.py));
    ctx.lineTo(lastPt.px, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 5. Multi-Layer Neon Core Beam
    const strokeColor = crashed ? '#ef4444' : getMultColor(val);

    // Outer Bloom Glow
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.shadowColor = strokeColor;
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.stroke();

    // Sharp Core Beam
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = strokeColor;
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 6. Kinetic Shockwave Crash Explosion
    if (crashEffectRef.current) {
      const ce = crashEffectRef.current;
      // Primary ring
      ctx.beginPath();
      ctx.arc(lastPt.px, lastPt.py, ce.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${ce.opacity})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#ef4444';
      ctx.stroke();

      // Secondary shock ring
      ctx.beginPath();
      ctx.arc(lastPt.px, lastPt.py, ce.radius * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(251, 191, 36, ${ce.opacity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ce.radius += 6;
      ce.opacity -= 0.035;
      if (ce.opacity <= 0) crashEffectRef.current = null;
    }

    // 7. Exhaust Spark Particle Trail
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    if (!crashed) {
      for (let i = 0; i < 4; i++) {
        particlesRef.current.push({
          x: lastPt.px - 6 + (Math.random() - 0.5) * 4,
          y: lastPt.py + (Math.random() - 0.5) * 4,
          vx: -Math.random() * 4 - 1.5,
          vy: (Math.random() - 0.5) * 2.5,
          life: 1,
          size: 2.5 + Math.random() * 2,
          color: Math.random() > 0.4 ? '#00f0ff' : '#f97316'
        });
      }
    }

    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.06;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * (p.size ?? 3), 0, Math.PI * 2);
      ctx.fillStyle = p.color ? p.color : `rgba(0, 240, 255, ${p.life})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color ?? '#00f0ff';
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 8. Procedural Vector Rocket Craft Alignment
    if (!crashed) {
      const prevPt = points[Math.max(0, points.length - 4)];
      const tangentAngle = Math.atan2(lastPt.py - prevPt.py, lastPt.px - prevPt.px);
      drawVectorRocket(ctx, lastPt.px, lastPt.py, tangentAngle, val);
    }
  };

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const currentMult = Math.round(Math.pow(Math.E, 0.075 * elapsed) * 100) / 100;

    if (currentMult >= crashPointRef.current) {
      setMultiplier(crashPointRef.current);
      setGameState('crashed');
      crashEffectRef.current = { radius: 10, opacity: 1, maxRadius: 120 };

      // Generate burst debris on crash
      const canvas = canvasRef.current;
      if (canvas) {
        const W = canvas.width, H = canvas.height;
        const scaleX = (W - 55) / Math.max(10, elapsed * 1.5);
        const scaleY = H / Math.max(2, crashPointRef.current * 1.25);
        const cx = 40 + elapsed * scaleX;
        const cy = H - crashPointRef.current * scaleY;

        for (let i = 0; i < 28; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 6;
          particlesRef.current.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 1,
            size: 3 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#ef4444' : '#fbbf24'
          });
        }
      }

      drawGraph(elapsed, crashPointRef.current, true);
      playTone(100, 0.5, 'sawtooth', 0.3); vibrate(250);
      if (!cashedOutRef.current) toast.error(`Crashed at ${crashPointRef.current}x!`);
      if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
      return;
    }

    if (!cashedOutRef.current && autoCashOutRef.current && currentMult >= autoCashOutRef.current) {
      handleCashOut(currentMult);
    }

    setMultiplier(currentMult);
    drawGraph(elapsed, currentMult, false);
    rAFRef.current = requestAnimationFrame(tick);
  };

  const handleStartGame = async () => {
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile: userProf, isOwner, updateProfile: updateProf } = useAuthStore.getState();
    const freeTrials = userProf?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !userProf?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !userProf?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    setGameState('climbing'); setMultiplier(1.0); setCashedOut(false);
    cashedOutRef.current = false; setEarnedTokens(0); setSocialFeed([]);
    particlesRef.current = []; crashEffectRef.current = null;
    playTone(261.63, 0.15, 'sine', 0.2);
    const nb = balance - actualBetAmount;
    if (userProf && !userProf.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', userProf.id); } catch {}
    }
    updateProf({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    crashPointRef.current = Math.random() < 0.03 ? 1.0 : Math.max(1.01, Math.round((0.96 / Math.random()) * 100) / 100);
    startTimeRef.current = Date.now();
    rAFRef.current = requestAnimationFrame(tick);
    socialIntervalRef.current = setInterval(() => {
      const u = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
      const amt = (Math.floor(Math.random() * 20) + 1) * 50;
      const m = Math.round((1 + Math.random() * 4) * 100) / 100;
      setSocialFeed(prev => [...prev.slice(-3), { user: u, amount: amt, mult: m }]);
    }, 1800);
  };

  const handleCashOut = async (currentMult?: number) => {
    const m = currentMult ?? multiplier;
    if (gameState !== 'climbing' || cashedOutRef.current) return;
    setCashedOut(true); cashedOutRef.current = true;
    const earned = Math.floor(betAmount * m);
    setEarnedTokens(earned);
    toast.success(`Cashed out at ${m.toFixed(2)}x! +${earned - betAmount} tokens 🚀`);
    playTone(523.25, 0.15, 'sine', 0.3); vibrate([50, 50, 100]);
    const fb = balance + earned;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (earned - betAmount), xp: profile.xp + Math.floor(betAmount * 0.15) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch {}
    }
    updateProfile({ tokens: fb });
  };

  useEffect(() => () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
  }, []);

  const multColor = getMultColor(multiplier);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={gameState === 'climbing'} />
          <div className="space-y-1">
            <span className="text-xs text-text-secondary">Auto Cash Out</span>
            <div className="flex rounded-xl bg-navy-900 p-1 border border-navy-700/60">
              <input type="number" step="0.1" min="1.01" placeholder="e.g. 2.00"
                value={autoCashOut ?? ''}
                onChange={e => setAutoCashOut(e.target.value ? parseFloat(e.target.value) : null)}
                disabled={gameState === 'climbing'}
                className="w-full bg-transparent border-0 outline-none text-sm font-mono text-text-primary px-3 py-1.5" />
              <span className="flex items-center pr-3 text-sm text-muted font-semibold">x</span>
            </div>
          </div>
          {gameState === 'climbing' && (
            <div className="text-center p-3 rounded-xl bg-navy-900/60 border border-navy-800">
              <p className="text-2xs text-muted uppercase tracking-wider mb-1">Potential Win</p>
              <p className="text-xl font-bold font-mono" style={{ color: multColor }}>{(betAmount * multiplier).toFixed(0)} tokens</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {gameState === 'climbing' ? (
            <motion.div animate={cashedOut ? {} : { boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 10px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0.4)'] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Button variant="success" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={cashedOut} onClick={() => handleCashOut()}>
                {cashedOut ? `✓ Cashed Out ${earnedTokens}` : `Cash Out ${(betAmount * multiplier).toFixed(0)}`}
              </Button>
            </motion.div>
          ) : (
            <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={betAmount <= 0 || betAmount > balance} onClick={handleStartGame}>
              {gameState === 'crashed' ? 'Play Again' : 'Bet'}
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col relative min-h-[400px] bg-navy-900/40 border border-navy-800/80 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <AnimatePresence>
            <motion.h2 key={multiplier.toFixed(2)} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="text-5xl font-extrabold font-mono drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]" style={{ color: multColor }}>
              {multiplier.toFixed(2)}x
            </motion.h2>
          </AnimatePresence>
          <div className="flex items-center gap-1 text-2xs text-muted"><HelpCircle size={10} /><span>4% edge</span></div>
        </div>
        {gameState === 'crashed' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center bg-navy-950/80 p-6 rounded-2xl border border-red-500/40 backdrop-blur-md shadow-[0_0_40px_rgba(239,68,68,0.3)]">
              <p className="text-4xl font-extrabold text-danger drop-shadow-lg">💥 CRASHED</p>
              <p className="text-sm font-mono text-danger/90 mt-1">at {crashPointRef.current.toFixed(2)}x</p>
            </div>
          </motion.div>
        )}
        <canvas ref={canvasRef} width={500} height={300} className="w-full h-[300px]" />
        <div className="px-4 pb-3 space-y-1 min-h-[90px]">
          <p className="text-2xs text-muted uppercase tracking-wider">Live Bets</p>
          <AnimatePresence>
            {socialFeed.map((e, i) => (
              <motion.div key={e.user+i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-between text-xs text-text-secondary font-mono">
                <span className="text-cyan-neon font-semibold">{e.user}</span>
                <span>{e.amount} @ <span className="text-gold-neon">{e.mult}x</span></span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
