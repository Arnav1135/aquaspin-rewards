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
type Particle = { x: number; y: number; vx: number; vy: number; life: number; };
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
  const crashEffectRef = useRef<{ radius: number; opacity: number } | null>(null);
  const cashedOutRef = useRef(false);
  const autoCashOutRef = useRef<number | null>(null);
  const socialIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balance = profile?.tokens ?? 0;

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

    // Dark bg
    ctx.fillStyle = '#050e1a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = H - (H / 5) * i;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W, y); ctx.stroke();
      const x = 40 + ((W - 40) / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 30); ctx.stroke();
    }
    // Y labels
    ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'right';
    const yLabels = [{ v: 1, label: '1x' }, { v: 2, label: '2x' }, { v: 5, label: '5x' }, { v: 10, label: '10x' }];
    const scaleY = H / Math.max(2, val * 1.25);
    yLabels.forEach(({ v, label }) => {
      const py = H - v * scaleY;
      if (py > 10 && py < H - 20) ctx.fillText(label, 38, py + 4);
    });

    // Curve
    const scaleX = (W - 50) / Math.max(10, elapsed * 1.5);
    const points: { px: number; py: number }[] = [];
    for (let t = 0; t <= elapsed; t += 0.08) {
      const v = Math.pow(Math.E, 0.075 * t);
      points.push({ px: 40 + t * scaleX, py: H - v * scaleY });
    }
    if (points.length < 2) return;
    const lastPt = points[points.length - 1];

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, crashed ? 'rgba(239,68,68,0.35)' : 'rgba(0,240,255,0.28)');
    grad.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.beginPath();
    ctx.moveTo(40, H);
    points.forEach(p => ctx.lineTo(p.px, p.py));
    ctx.lineTo(lastPt.px, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#ef4444' : '#00F0FF';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 14; ctx.shadowColor = crashed ? '#ef4444' : '#00F0FF';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.px, p.py) : ctx.lineTo(p.px, p.py));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Crash explosion
    if (crashEffectRef.current) {
      const ce = crashEffectRef.current;
      ctx.beginPath();
      ctx.arc(lastPt.px, lastPt.py, ce.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239,68,68,${ce.opacity})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ce.radius += 5; ce.opacity -= 0.03;
      if (ce.opacity <= 0) crashEffectRef.current = null;
    }

    // Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    if (!crashed) {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x: lastPt.px, y: lastPt.py,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2 + 1,
          life: 1
        });
      }
    }
    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.07;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.life * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${p.life})`;
      ctx.fill();
    });

    // Rocket
    if (!crashed) {
      const prevPt = points[Math.max(0, points.length - 3)];
      const angle = Math.atan2(prevPt.py - lastPt.py, lastPt.px - prevPt.px);
      ctx.save();
      ctx.translate(lastPt.px, lastPt.py);
      ctx.rotate(-angle);
      ctx.font = '22px serif';
      ctx.fillText('🚀', -11, 8);
      ctx.restore();
    }
  };

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const currentMult = Math.round(Math.pow(Math.E, 0.075 * elapsed) * 100) / 100;

    if (currentMult >= crashPointRef.current) {
      setMultiplier(crashPointRef.current);
      setGameState('crashed');
      crashEffectRef.current = { radius: 10, opacity: 1 };
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

    setGameState('climbing'); setMultiplier(1.0); setCashedOut(false);
    cashedOutRef.current = false; setEarnedTokens(0); setSocialFeed([]);
    particlesRef.current = []; crashEffectRef.current = null;
    playTone(261.63, 0.15, 'sine', 0.2);
    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id); } catch {}
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
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

      <Card className="flex-1 flex flex-col relative min-h-[400px] bg-navy-900/40 border border-navy-800/80 rounded-2xl overflow-hidden">
        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <AnimatePresence>
            <motion.h2 key={multiplier.toFixed(2)} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="text-5xl font-extrabold font-mono drop-shadow-lg" style={{ color: multColor }}>
              {multiplier.toFixed(2)}x
            </motion.h2>
          </AnimatePresence>
          <div className="flex items-center gap-1 text-2xs text-muted"><HelpCircle size={10} /><span>4% edge</span></div>
        </div>
        {gameState === 'crashed' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="text-center"><p className="text-4xl font-extrabold text-danger drop-shadow-lg">💥 CRASHED</p><p className="text-sm text-danger/80">at {crashPointRef.current}x</p></div>
          </motion.div>
        )}
        <canvas ref={canvasRef} width={500} height={300} className="w-full h-[300px]" />
        <div className="px-4 pb-3 space-y-1 min-h-[90px]">
          <p className="text-2xs text-muted uppercase tracking-wider">Live Bets</p>
          <AnimatePresence>
            {socialFeed.map((e, i) => (
              <motion.div key={e.user+i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-between text-xs text-text-secondary font-mono">
                <span className="text-cyan-neon">{e.user}</span>
                <span>{e.amount} @ <span className="text-gold-neon">{e.mult}x</span></span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
