// src/components/games/LimboGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LimboGameProps { onClose: () => void; }
type WarpRay = { angle: number; dist: number; speed: number; len: number; color: string; };
type QuantumShockwave = { radius: number; opacity: number; color: string; maxRadius: number; };

export function LimboGame({ onClose }: LimboGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [rolling, setRolling] = useState(false);
  const [win, setWin] = useState<boolean | null>(null);
  const [nearMiss, setNearMiss] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0)');
  const [displayNum, setDisplayNum] = useState('1.00');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const warpRaysRef = useRef<WarpRay[]>([]);
  const shockwavesRef = useRef<QuantumShockwave[]>([]);
  const rAFRef = useRef<number | null>(null);
  const rollingRef = useRef(false);
  const reactorAngleRef = useRef(0);
  const balance = profile?.tokens ?? 0;

  useEffect(() => { rollingRef.current = rolling; }, [rolling]);

  // Initialize Quantum Hyperspace Rays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const maxDist = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2);

    warpRaysRef.current = Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * maxDist,
      speed: 2 + Math.random() * 4,
      len: 10 + Math.random() * 25,
      color: Math.random() > 0.3 ? '#00f0ff' : '#38bdf8'
    }));

    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const cW = canvas.width, cH = canvas.height;
      const cX = cW / 2, cY = cH / 2;
      const isFast = rollingRef.current;

      // 1. Cosmic Void Backdrop with Vignette
      const bgGrad = ctx.createRadialGradient(cX, cY, 30, cX, cY, cW * 0.75);
      bgGrad.addColorStop(0, '#061325');
      bgGrad.addColorStop(0.5, '#030a16');
      bgGrad.addColorStop(1, '#01040a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, cW, cH);

      reactorAngleRef.current += isFast ? 0.04 : 0.008;

      // 2. Quantum Hyperspace Warp Rays
      const speedMultiplier = isFast ? 4.5 : 1;
      warpRaysRef.current.forEach(ray => {
        ray.dist += ray.speed * speedMultiplier;
        if (ray.dist > maxDist) {
          ray.dist = 15 + Math.random() * 20;
          ray.angle = Math.random() * Math.PI * 2;
        }

        const p1x = cX + Math.cos(ray.angle) * ray.dist;
        const p1y = cY + Math.sin(ray.angle) * ray.dist;
        const tailDist = Math.max(10, ray.dist - ray.len * (isFast ? 2.5 : 1));
        const p0x = cX + Math.cos(ray.angle) * tailDist;
        const p0y = cY + Math.sin(ray.angle) * tailDist;

        const alpha = Math.min(1, (ray.dist / maxDist) * (isFast ? 0.9 : 0.5));
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.lineWidth = isFast ? 2 : 1;
        ctx.stroke();
      });

      // 3. Concentric Quantum Reactor Rings
      const ringPulse = 1 + 0.05 * Math.sin(Date.now() / 150);
      const ringRadii = [60, 110, 160];

      ringRadii.forEach((r, idx) => {
        const currentR = r * ringPulse * (isFast ? 1.08 : 1);
        ctx.beginPath();
        ctx.arc(cX, cY, currentR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.12 - idx * 0.03})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rotating Segmented Ticks
        const segments = 12 + idx * 6;
        const rotDir = idx % 2 === 0 ? 1 : -1;
        for (let s = 0; s < segments; s++) {
          const sAngle = (s * Math.PI * 2) / segments + reactorAngleRef.current * rotDir;
          const tx1 = cX + Math.cos(sAngle) * (currentR - 4);
          const ty1 = cY + Math.sin(sAngle) * (currentR - 4);
          const tx2 = cX + Math.cos(sAngle) * (currentR + 4);
          const ty2 = cY + Math.sin(sAngle) * (currentR + 4);

          ctx.beginPath();
          ctx.moveTo(tx1, ty1);
          ctx.lineTo(tx2, ty2);
          ctx.strokeStyle = isFast ? 'rgba(0, 240, 255, 0.45)' : 'rgba(0, 240, 255, 0.2)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 4. Electric Plasma Lightning Discharges during Roll
      if (isFast) {
        ctx.save();
        for (let arc = 0; arc < 4; arc++) {
          const baseAng = Math.random() * Math.PI * 2;
          let lx = cX + Math.cos(baseAng) * 45;
          let ly = cY + Math.sin(baseAng) * 45;

          ctx.beginPath();
          ctx.moveTo(lx, ly);
          for (let step = 0; step < 4; step++) {
            const nextAng = baseAng + (Math.random() - 0.5) * 0.8;
            const nextDist = 45 + (step + 1) * 25;
            lx = cX + Math.cos(nextAng) * nextDist + (Math.random() - 0.5) * 12;
            ly = cY + Math.sin(nextAng) * nextDist + (Math.random() - 0.5) * 12;
            ctx.lineTo(lx, ly);
          }
          ctx.strokeStyle = Math.random() > 0.5 ? '#00f0ff' : '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#00f0ff';
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Quantum Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter(sw => sw.opacity > 0);
      shockwavesRef.current.forEach(sw => {
        ctx.beginPath();
        ctx.arc(cX, cY, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color.replace('ALPHA', String(sw.opacity));
        ctx.lineWidth = 3;
        ctx.shadowBlur = 16;
        ctx.shadowColor = sw.color.replace('ALPHA', '1');
        ctx.stroke();
        ctx.shadowBlur = 0;

        sw.radius += 5.5;
        sw.opacity -= 0.03;
      });

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, []);

  const handleRoll = async () => {
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile: currentProf, isOwner, updateProfile: updateProf } = useAuthStore.getState();
    const freeTrials = currentProf?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProf?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProf?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    if (targetMultiplier < 1.01) { toast.error('Target must be at least 1.01x'); return; }
    setRolling(true); setWin(null); setNearMiss(false);
    setShowConfetti(false); setBgColor('rgba(0,0,0,0)');
    playTone(200, 0.1, 'sine', 0.2);
    const nb = balance - actualBetAmount;
    if (currentProf && !currentProf.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', currentProf.id); } catch {}
    }
    updateProf({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    const u = Math.random();
    let roll = Math.round((0.96 / u) * 100) / 100;
    if (roll < 1.0) roll = 1.0;
    if (roll > 1000000) roll = 1000000;
    const isWin = roll >= targetMultiplier;
    const isNearMiss = !isWin && roll >= targetMultiplier * 0.85;

    let count = 0;
    const interval = setInterval(() => {
      const tmp = Math.round((1 + Math.random() * targetMultiplier * 1.5) * 100) / 100;
      setDisplayNum(tmp.toFixed(2));
      playTone(300 + tmp * 3, 0.02, 'sine', 0.04);
      count++;
      if (count > 16) {
        clearInterval(interval);
        setRolling(false);
        setDisplayNum(roll.toFixed(2));
        setWin(isWin);
        setNearMiss(isNearMiss);
        finalizeResult(roll, isWin, isNearMiss, nb);
        if (isWin) {
          setBgColor('rgba(16,185,129,0.12)');
          setShowConfetti(true);
          shockwavesRef.current.push(
            { radius: 30, opacity: 1, color: 'rgba(16, 185, 129, ALPHA)', maxRadius: 220 },
            { radius: 10, opacity: 0.8, color: 'rgba(0, 240, 255, ALPHA)', maxRadius: 180 }
          );
          setTimeout(() => setShowConfetti(false), 1200);
        } else if (isNearMiss) {
          setBgColor('rgba(249,115,22,0.12)');
          shockwavesRef.current.push({ radius: 20, opacity: 1, color: 'rgba(249, 115, 22, ALPHA)', maxRadius: 160 });
        } else {
          setBgColor('rgba(239,68,68,0.10)');
          shockwavesRef.current.push({ radius: 20, opacity: 0.9, color: 'rgba(239, 68, 68, ALPHA)', maxRadius: 140 });
        }
      }
    }, 65);
  };

  const finalizeResult = async (roll: number, isWin: boolean, isNearMiss: boolean, nb: number) => {
    let fb = nb;
    if (isWin) {
      const winAmt = Math.floor(betAmount * targetMultiplier);
      fb += winAmt;
      toast.success(`Target hit! +${winAmt - betAmount} tokens 🚀`);
      playTone(523, 0.15, 'sine', 0.3); setTimeout(() => playTone(659, 0.25, 'sine', 0.3), 100);
      vibrate([50, 50, 150]);
    } else if (isNearMiss) {
      toast.custom(() => (
        <div className="bg-orange-950 border border-orange-500/50 p-3 rounded-xl text-xs text-orange-400 font-semibold flex items-center gap-2">
          <AlertCircle size={12} /> Near Miss! Hit {roll}x (needed {targetMultiplier}x)
        </div>
      ), { duration: 3000 });
      playTone(180, 0.3, 'sawtooth', 0.2); vibrate(100);
    } else {
      toast.error(`Crashed at ${roll}x. Try again!`);
      playTone(160, 0.3, 'sawtooth', 0.2); vibrate(100);
    }
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? Math.floor(betAmount * (targetMultiplier - 1)) : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });
      } catch {}
    }
    updateProfile({ tokens: fb });
  };

  const winChance = Math.min(100, (96 / targetMultiplier));
  const numColor = win === true ? '#10b981' : win === false ? (nearMiss ? '#f97316' : '#ef4444') : '#00F0FF';
  const presets = [1.5, 2, 3, 5, 10, 50];

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={rolling} />
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Target Multiplier</span>
              <span className="text-muted">{winChance.toFixed(2)}% win</span>
            </div>
            <div className="flex rounded-xl bg-navy-900 p-1 border border-navy-700/60">
              <input type="number" step="0.1" min="1.01" max="100000" value={targetMultiplier}
                onChange={e => setTargetMultiplier(Math.max(1.01, Math.min(parseFloat(e.target.value) || 1.01, 100000)))}
                disabled={rolling} className="w-full bg-transparent border-0 outline-none text-sm font-mono text-text-primary px-3 py-1.5" />
              <span className="flex items-center pr-3 text-sm text-muted font-semibold">x</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map(p => (
                <button key={p} onClick={() => setTargetMultiplier(p)} disabled={rolling}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${targetMultiplier === p ? 'border-cyan-neon bg-cyan-neon/10 text-cyan-neon shadow-[0_0_12px_rgba(0,240,255,0.3)]' : 'border-navy-700 text-muted hover:border-navy-500'}`}>
                  {p}x
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>Win Chance</span><span>{winChance.toFixed(2)}%</span>
            </div>
            <div className="h-2 rounded-full bg-navy-800 overflow-hidden">
              <motion.div className="h-full rounded-full bg-cyan-neon shadow-[0_0_8px_#00f0ff]" animate={{ width: `${winChance}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.35)]" disabled={rolling || betAmount <= 0 || betAmount > balance} onClick={handleRoll}>
            {rolling ? '⚡ Quantum Roll...' : 'Bet'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <motion.div className="flex-1 relative rounded-2xl border border-navy-800/80 overflow-hidden min-h-[360px] shadow-[0_8px_32px_rgba(0,0,0,0.7)]"
        animate={{ backgroundColor: bgColor }} transition={{ duration: 0.5 }}>
        <canvas ref={canvasRef} width={600} height={400} className="absolute inset-0 w-full h-full" />
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10">
          <HelpCircle size={10} /><span>4% edge</span>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 p-6">
          <AnimatePresence mode="wait">
            <motion.div key={displayNum}
              initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.05 }}
              className="relative">
              <motion.p className="text-7xl md:text-8xl font-extrabold font-mono tracking-tight drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]"
                style={{ color: numColor }}>
                {displayNum}x
              </motion.p>
            </motion.div>
          </AnimatePresence>

          <div className="min-h-[32px] text-center">
            {win === true && <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-sm font-bold text-success uppercase tracking-widest drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]">🎉 QUANTUM TARGET HIT!</motion.p>}
            {win === false && !nearMiss && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-danger uppercase tracking-widest drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">❌ CORE COLLAPSED</motion.p>}
            {win === false && nearMiss && <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-400 font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)]">⚡ HIGH VOLTAGE NEAR MISS!</motion.span>}
            {rolling && <p className="text-xs text-cyan-400 animate-pulse uppercase tracking-wider font-mono">⚡ Accelerating Quantum Flux...</p>}
          </div>

          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i / 24) * Math.PI * 2;
                const dist = 90 + Math.random() * 90;
                return (
                  <motion.div key={i} className="absolute rounded-full"
                    style={{ width: 8, height: 8, top: '50%', left: '50%', marginTop: -4, marginLeft: -4, background: i % 2 === 0 ? '#10b981' : '#00F0FF', boxShadow: '0 0 10px #00f0ff' }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }} />
                );
              })}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-between text-2xs text-muted mb-1 font-mono">
              <span>Target: <strong className="text-cyan-neon">{targetMultiplier.toFixed(2)}x</strong></span>
              <span>{winChance.toFixed(2)}% chance</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden p-0.5">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_#00f0ff]" style={{ width: `${winChance}%` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
