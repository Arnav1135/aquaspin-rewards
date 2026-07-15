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
type Star = { x: number; y: number; size: number; speed: number; };

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
  const starsRef = useRef<Star[]>([]);
  const rAFRef = useRef<number | null>(null);
  const rollingRef = useRef(false);
  const balance = profile?.tokens ?? 0;

  useEffect(() => { rollingRef.current = rolling; }, [rolling]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      size: Math.random() * 2 + 0.5, speed: Math.random() * 0.8 + 0.3
    }));
    const loop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'rgba(5,14,26,0.25)';
      ctx.fillRect(0, 0, W, H);
      starsRef.current.forEach(s => {
        s.y += s.speed * (rollingRef.current ? 5 : 1);
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.4 + s.size * 0.2})`;
        ctx.fill();
      });
      rAFRef.current = requestAnimationFrame(loop);
    };
    rAFRef.current = requestAnimationFrame(loop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, []);

  const handleRoll = async () => {
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
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
        if (isWin) { setBgColor('rgba(16,185,129,0.12)'); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 1200); }
        else setBgColor('rgba(239,68,68,0.10)');
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
      } catch (e) {
        console.error('Failed to update user after roll:', e);
      }
    }
    updateProfile({ tokens: fb });
  };

  const winChance = Math.min(100, (96 / targetMultiplier));
  const numColor = win === true ? '#10b981' : win === false ? '#ef4444' : '#00F0FF';
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
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${targetMultiplier === p ? 'border-cyan-neon bg-cyan-neon/10 text-cyan-neon' : 'border-navy-700 text-muted hover:border-navy-500'}`}>
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
              <motion.div className="h-full rounded-full bg-cyan-neon" animate={{ width: `${winChance}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={rolling || betAmount <= 0 || betAmount > balance} onClick={handleRoll}>
            {rolling ? 'Rolling...' : 'Bet'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <motion.div className="flex-1 relative rounded-2xl border border-navy-800/80 overflow-hidden min-h-[360px]"
        animate={{ backgroundColor: bgColor }} transition={{ duration: 0.5 }}>
        <canvas ref={canvasRef} width={600} height={400} className="absolute inset-0 w-full h-full" />
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10">
          <HelpCircle size={10} /><span>4% edge</span>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 p-6">
          <AnimatePresence mode="wait">
            <motion.div key={displayNum}
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.05 }}>
              <motion.p className="text-7xl md:text-8xl font-extrabold font-mono tracking-tight drop-shadow-lg"
                style={{ color: numColor }}
                animate={nearMiss && win === false ? { boxShadow: ['0 0 0 0 rgba(249,115,22,0.5)', '0 0 0 20px rgba(249,115,22,0)', '0 0 0 0 rgba(249,115,22,0.5)'] } : {}}
                transition={{ repeat: 3, duration: 0.5 }}>
                {displayNum}x
              </motion.p>
            </motion.div>
          </AnimatePresence>

          <div className="min-h-[32px] text-center">
            {win === true && <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-sm font-bold text-success uppercase tracking-widest">🎉 TARGET HIT!</motion.p>}
            {win === false && !nearMiss && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-bold text-danger uppercase tracking-widest">❌ CRASHED</motion.p>}
            {win === false && nearMiss && <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold">⚡ NEAR MISS!</motion.span>}
            {rolling && <p className="text-xs text-muted animate-pulse uppercase tracking-wider">Launching...</p>}
          </div>

          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * Math.PI * 2;
                const dist = 80 + Math.random() * 80;
                return (
                  <motion.div key={i} className="absolute rounded-full"
                    style={{ width: 7, height: 7, top: '50%', left: '50%', marginTop: -3, marginLeft: -3, background: i % 2 === 0 ? '#f59e0b' : '#00F0FF' }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }} />
                );
              })}
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex justify-between text-2xs text-muted mb-1">
              <span>Target: {targetMultiplier.toFixed(2)}x</span><span>{winChance.toFixed(2)}% chance</span>
            </div>
            <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
              <div className="h-full rounded-full bg-cyan-neon/70 transition-all duration-300" style={{ width: `${winChance}%` }} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
