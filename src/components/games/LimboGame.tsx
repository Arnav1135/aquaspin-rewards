// src/components/games/LimboGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Sparkles, Navigation, Gauge } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LimboGameProps { onClose: () => void; }
type Star = { x: number; y: number; z: number; size: number; color: string; };

export function LimboGame({ onClose }: LimboGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [rolling, setRolling] = useState(false);
  const [win, setWin] = useState<boolean | null>(null);
  const [nearMiss, setNearMiss] = useState(false);
  const [displayNum, setDisplayNum] = useState('1.00');

  // Parallax tilt tracking
  const [tiltOffset, setTiltOffset] = useState({ x: 0, y: 0 });

  // Custom UI representation
  const [depthIntensity, setDepthIntensity] = useState(1.0); // correlates to current display multiplier
  const [glitchActive, setGlitchActive] = useState(false);
  const [starChart, setStarChart] = useState<Array<{ id: number; mult: number; hit: boolean }>>([
    { id: 1, mult: 1.5, hit: true },
    { id: 2, mult: 4.8, hit: false },
    { id: 3, mult: 12.0, hit: true },
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rAFRef = useRef<number | null>(null);
  const rollingRef = useRef(false);
  const currentMultRef = useRef(1.0);
  const balance = profile?.tokens ?? 0;

  useEffect(() => { rollingRef.current = rolling; }, [rolling]);

  // Setup infinite vertical shaft stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    
    // Spawn stars with 3D depth parameters (Z depth)
    starsRef.current = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * W,
      y: (Math.random() - 0.5) * H,
      z: Math.random() * W,
      size: Math.random() * 2.5 + 0.5,
      color: Math.random() > 0.6 ? '#00f0ff' : Math.random() > 0.4 ? '#f59e0b' : '#ffffff'
    }));

    let tunnelOffset = 0;

    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Speed escalation
      const rollSpeed = rollingRef.current ? 30 : 2;
      tunnelOffset += rollSpeed;

      // Vertical descent depth theme color
      const currentM = currentMultRef.current;
      let bg = 'rgba(8, 20, 45, 0.25)'; // 1x-2x calm nebulae - slightly lighter
      if (currentM >= 50.0) {
        bg = 'rgba(35, 8, 55, 0.25)'; // 50x+ psychedelic geometry
      } else if (currentM >= 5.0) {
        bg = 'rgba(10, 40, 35, 0.25)'; // 5x-10x energy storms
      }

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      // Mouse/Tilt parallax translation
      ctx.translate(W / 2 + tiltOffset.x * 12, H / 2 + tiltOffset.y * 12);

      // Draw concentric rings of light receding into vertical shaft
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const ringZ = ((i * 120 + tunnelOffset) % 720);
        const ringScale = 360 / (ringZ + 1);
        const radius = 240 * ringScale;
        const alpha = Math.min(0.5, (1 - ringZ / 720));
        
        ctx.strokeStyle = currentM >= 50 ? `rgba(168, 85, 247, ${alpha})` : currentM >= 5 ? `rgba(249, 115, 22, ${alpha})` : `rgba(0, 240, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Star Core particle descent
      starsRef.current.forEach(s => {
        s.z -= rollSpeed;
        if (s.z <= 0) {
          s.z = W;
          s.x = (Math.random() - 0.5) * W;
          s.y = (Math.random() - 0.5) * H;
        }

        const k = 180 / s.z;
        const px = s.x * k;
        const py = s.y * k;
        const size = s.size * k;

        if (px > -W/2 && px < W/2 && py > -H/2 && py < H/2) {
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = size * 2;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Target Portal Ring at predicted depth (flickers/distorts)
      if (rollingRef.current) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, 70 + Math.sin(Date.now() * 0.05) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, [tiltOffset]);

  const handleRoll = async () => {
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

    setRolling(true);
    setWin(null);
    setNearMiss(false);
    setGlitchActive(false);

    // Gravity slingshot launch pulse tone
    playTone(150, 0.15, 'sawtooth', 0.25);
    playTone(70, 0.35, 'sine', 0.3); // deep slingshot sub-bass
    vibrate(60);

    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    const u = Math.random();
    let roll = Math.round((0.96 / u) * 100) / 100;
    if (roll < 1.0) roll = 1.0;
    if (roll > 100000) roll = 100000;
    
    const isWin = roll >= targetMultiplier;
    const isNearMiss = !isWin && roll >= targetMultiplier * 0.88;

    let count = 0;
    const steps = 18;
    const interval = setInterval(() => {
      const ratio = count / steps;
      // Exponential ascent descent display num
      const tmp = Math.max(1.0, Math.pow(ratio, 2.5) * roll + Math.random() * 0.5);
      setDisplayNum(tmp.toFixed(2));
      currentMultRef.current = tmp;
      setDepthIntensity(tmp);

      // Sonic layer penetrations click melody
      playTone(280 + tmp * 4, 0.03, 'sine', 0.08);
      
      // Proximity tremoring screen shakes
      if (tmp >= targetMultiplier * 0.8) {
        vibrate(10);
      }

      count++;
      if (count > steps) {
        clearInterval(interval);
        setRolling(false);
        setDisplayNum(roll.toFixed(2));
        currentMultRef.current = roll;
        setDepthIntensity(roll);
        setWin(isWin);
        setNearMiss(isNearMiss);

        // Record star history
        setStarChart(prev => [...prev.slice(-3), { id: Date.now(), mult: roll, hit: isWin }]);

        finalizeResult(roll, isWin, isNearMiss, nb);
      }
    }, 65);
  };

  const finalizeResult = async (roll: number, isWin: boolean, isNearMiss: boolean, nb: number) => {
    let fb = nb;
    if (isWin) {
      const winAmt = Math.floor(betAmount * targetMultiplier);
      fb += winAmt;
      toast.success(`Target Penetrated! +${winAmt - betAmount} tokens!`, { icon: '🌠' });
      
      // Target hit exact frame freeze / white flash sound
      playTone(520, 0.15, 'sine', 0.35);
      setTimeout(() => playTone(1040, 0.3, 'sine', 0.4), 80);
      vibrate([80, 40, 160]);
    } else {
      if (isNearMiss) {
        // Dissonant reality correcting glitch
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 500);

        toast.custom(() => (
          <div className="bg-orange-950/90 border border-orange-500/50 px-3.5 py-2.5 rounded-xl text-xs text-orange-400 font-bold flex items-center gap-2 backdrop-blur-md">
            <AlertCircle size={14} className="text-orange-400 animate-ping" />
            Reality glitched! Stopped at {roll}x (Target: {targetMultiplier}x)
          </div>
        ), { duration: 3000 });
        playTone(190, 0.3, 'sawtooth', 0.25);
        vibrate([100, 50, 100]);
      } else {
        toast.error(`Atmospheric burn at ${roll}x.`);
        playTone(150, 0.28, 'sawtooth', 0.2);
        vibrate(80);
      }
    }

    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? Math.floor(betAmount * (targetMultiplier - 1)) : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });
      } catch (e) {
        console.error('Failed to update user after roll:', e);
      }
    }
    updateProfile({ tokens: fb });
  };

  const winChance = Math.min(100, (96 / targetMultiplier));
  const numColor = win === true ? '#10b981' : win === false ? '#ef4444' : '#00F0FF';
  const presets = [1.2, 1.5, 2.0, 5.0, 10.0, 50.0];

  // Mouse orientation parallax tilt tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTiltOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setTiltOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #0e0b2e 0%, #12082a 50%, #0a1040 100%)' }}>
      {/* Left betting controls */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-400 to-orange-300 tracking-widest uppercase">
              Star Core
            </h2>
            <Sparkles size={16} className="text-purple-400 animate-pulse" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={rolling} />

          {/* Radial-like slider target depth multiplier selector */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>Target Depth</span>
              <span className="text-cyan-300 font-mono">{targetMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex rounded-xl bg-slate-950 p-1.5 border border-slate-800">
              <input type="number" step="0.1" min="1.01" max="100000" value={targetMultiplier}
                onChange={e => setTargetMultiplier(Math.max(1.01, Math.min(parseFloat(e.target.value) || 1.01, 100000)))}
                disabled={rolling} className="w-full bg-transparent border-0 outline-none text-sm font-mono text-cyan-300 px-3 py-1" />
              <span className="flex items-center pr-3 text-xs text-slate-400 font-bold">X</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map(p => (
                <button 
                  key={p} 
                  onClick={() => {
                    setTargetMultiplier(p);
                    playTone(320, 0.05, 'sine', 0.1);
                  }} 
                  disabled={rolling}
                  className={`py-1.5 rounded-lg text-2xs font-mono font-bold border transition-all ${
                    targetMultiplier === p 
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300' 
                      : 'border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          {/* Submarine Sub-Depth Gauge Indicator */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Gauge size={14} className="text-slate-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Depth Gauge</span>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300">
              {depthIntensity.toFixed(2)}m
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-2xs text-slate-400 font-bold uppercase font-mono">
              <span>Warp Prob</span><span>{winChance.toFixed(2)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" animate={{ width: `${winChance}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-purple-500/40 shadow-lg shadow-purple-500/20 animate-pulse" disabled={rolling || betAmount <= 0 || betAmount > balance} onClick={handleRoll}>
            {rolling ? 'SLINGSHOT IGNITED' : 'LAUNCH STAR-CORE'}
          </Button>
          <Button variant="ghost" className="w-full text-2xs text-slate-400 hover:text-slate-400" onClick={onClose}>
            Close Shaft
          </Button>
        </div>
      </Card>

      {/* Infinite Vertical Shaft viewport */}
      <motion.div 
        className={`flex-1 relative rounded-2xl border border-slate-900 overflow-hidden min-h-[360px] bg-slate-950 cursor-zoom-in transition-all duration-300 ${
          glitchActive ? 'filter invert saturate-200 hue-rotate-90 scale-95' : ''
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={canvasRef} width={600} height={400} className="absolute inset-0 w-full h-full" />
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-wider z-10">
          <Navigation size={11} className="text-purple-400" /><span>COSMIC SHIELD: 4%</span>
        </div>
        
        {/* Core descent overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 p-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={displayNum}
              initial={{ scale: 0.85, opacity: 0.8 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0.8 }}
              transition={{ duration: 0.05 }}
            >
              <p className="text-7xl md:text-8xl font-black font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                style={{ color: numColor }}>
                {displayNum}x
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="min-h-[32px] text-center">
            {win === true && <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest animate-bounce">🌌 DIMENSION SHATTERED</p>}
            {win === false && !nearMiss && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">☄️ CORE COLLAPSED</p>}
            {win === false && nearMiss && <span className="text-2xs px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold">QUANTUM GLITCH</span>}
            {rolling && <p className="text-2xs text-slate-400 animate-pulse uppercase tracking-widest font-bold">GRAVITY SLINGSHOT Descent...</p>}
          </div>

          {/* Star chart constellation logs */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-sm">
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Constellation History:</span>
              <div className="flex gap-1">
                {starChart.map((s, idx) => (
                  <span 
                    key={s.id + idx}
                    className={`text-2xs font-bold font-mono px-1.5 py-0.5 rounded border ${
                      s.hit 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}
                  >
                    {s.mult.toFixed(1)}x
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[9px] text-slate-400 font-bold font-mono">TARGET: {targetMultiplier.toFixed(2)}x</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
