// src/components/games/PlinkoGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PlinkoGameProps { onClose: () => void; }
type RiskLevel = 'low' | 'medium' | 'high';
type Ball = { id: number; x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[]; active: boolean; betAmount: number; settled: boolean; };
type Peg = { x: number; y: number; flash: number; };
type BucketFlash = { idx: number; frames: number; };

const MULTS: Record<RiskLevel, Record<number, number[]>> = {
  low: { 8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6], 10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9], 12: [10, 5, 2, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2, 5, 10] },
  medium: { 8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], 10: [22, 5, 2, 1.4, 0.9, 0.4, 0.9, 1.4, 2, 5, 22], 12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33] },
  high: { 8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29], 10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76], 12: [170, 33, 11, 4, 2, 0.2, 0.2, 0.2, 2, 4, 11, 33, 170] }
};

export function PlinkoGame({ onClose }: PlinkoGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [rows, setRows] = useState(8);
  const [autoDrop, setAutoDrop] = useState(false);
  const [ballsInFlight, setBallsInFlight] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const rAFRef = useRef<number | null>(null);
  const bucketFlashesRef = useRef<BucketFlash[]>([]);
  const autoDropRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileRef = useRef(profile);
  const balanceRef = useRef(profile?.tokens ?? 0);

  useEffect(() => { profileRef.current = profile; balanceRef.current = profile?.tokens ?? 0; }, [profile]);

  const multipliers = MULTS[risk][rows] || MULTS[risk][8];
  const W = 420, H = 430;
  const startY = 55, pegSpacing = 28;

  const buildPegs = useCallback(() => {
    const pegs: Peg[] = [];
    const rowSpacing = (H - 140) / rows;
    for (let r = 0; r <= rows; r++) {
      const count = r + 3;
      const rowY = startY + r * rowSpacing;
      const totalW = (count - 1) * pegSpacing;
      for (let c = 0; c < count; c++) {
        pegs.push({ x: W / 2 - totalW / 2 + c * pegSpacing, y: rowY, flash: 0 });
      }
    }
    pegsRef.current = pegs;
  }, [rows]);

  useEffect(() => { buildPegs(); }, [buildPegs]);

  const getBucketX = (i: number) => W / 2 - ((multipliers.length - 1) * pegSpacing) / 2 + i * pegSpacing;

  const physicsLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) { rAFRef.current = requestAnimationFrame(physicsLoop); return; }

    ctx.fillStyle = '#050e1a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const x = (W / 5) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const y = (H / 5) * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Pegs
    pegsRef.current.forEach(peg => {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = peg.flash > 0 ? '#ffffff' : 'rgba(0,240,255,0.75)';
      ctx.shadowBlur = peg.flash > 0 ? 14 : 7;
      ctx.shadowColor = '#00F0FF';
      ctx.fill();
      ctx.shadowBlur = 0;
      if (peg.flash > 0) peg.flash--;
    });

    // Buckets
    const bucketY = H - 60;
    multipliers.forEach((mult, i) => {
      const bx = getBucketX(i);
      const isFlashing = bucketFlashesRef.current.some(bf => bf.idx === i && bf.frames > 0);
      ctx.beginPath();
      ctx.roundRect(bx - 12, bucketY, 24, 36, 5);
      ctx.fillStyle = mult >= 10 ? (isFlashing ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.18)') :
        mult >= 2 ? (isFlashing ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.18)') :
        mult >= 1 ? (isFlashing ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.15)') : 'rgba(30,41,59,0.35)';
      ctx.strokeStyle = mult >= 10 ? '#ef4444' : mult >= 2 ? '#f59e0b' : mult >= 1 ? '#10b981' : '#334155';
      ctx.lineWidth = isFlashing ? 2 : 1;
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`${mult >= 10 ? Math.floor(mult) : mult}x`, bx, bucketY + 22);
    });
    bucketFlashesRef.current.forEach(bf => { if (bf.frames > 0) bf.frames--; });
    bucketFlashesRef.current = bucketFlashesRef.current.filter(bf => bf.frames > 0);

    // Balls physics + drawing
    const toSettle: Ball[] = [];
    ballsRef.current.forEach(ball => {
      if (ball.settled) return;
      ball.vy += 0.32;
      ball.x += ball.vx; ball.y += ball.vy;
      ball.vx *= 0.995;
      pegsRef.current.forEach(peg => {
        const dx = ball.x - peg.x, dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) {
          const nx = dx / dist, ny = dy / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny;
          ball.vx *= 0.55; ball.vy *= 0.55;
          ball.vx += (Math.random() - 0.5) * 1.5;
          const overlap = 12 - dist;
          ball.x += nx * overlap; ball.y += ny * overlap;
          peg.flash = 10;
          playTone(600 + Math.random() * 100, 0.02, 'sine', 0.05);
          vibrate(3);
        }
      });
      if (ball.x < 15) { ball.x = 15; ball.vx = Math.abs(ball.vx) * 0.7; }
      if (ball.x > W - 15) { ball.x = W - 15; ball.vx = -Math.abs(ball.vx) * 0.7; }
      ball.trail.unshift({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) ball.trail.pop();
      if (ball.y > H - 65) {
        ball.settled = true;
        toSettle.push(ball);
      }
      // Trail
      ball.trail.forEach((tp, ti) => {
        ctx.globalAlpha = ((9 - ti) / 9) * 0.5;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FF0055'; ctx.fill();
      });
      ctx.globalAlpha = 1;
      // Ball
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FF0055'; ctx.shadowBlur = 14; ctx.shadowColor = '#FF0055'; ctx.fill(); ctx.shadowBlur = 0;
    });

    // Settle
    toSettle.forEach(async ball => {
      ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id);
      setBallsInFlight(prev => Math.max(0, prev - 1));
      let bucketIdx = 0, minDist = Infinity;
      multipliers.forEach((_, i) => { const d = Math.abs(ball.x - getBucketX(i)); if (d < minDist) { minDist = d; bucketIdx = i; } });
      bucketFlashesRef.current.push({ idx: bucketIdx, frames: 22 });
      const mult = multipliers[bucketIdx];
      const won = Math.floor(ball.betAmount * mult);
      if (mult >= 1) { toast.success(`${mult}x → +${won} tokens!`); playTone(523, 0.1, 'sine', 0.25); vibrate([40, 40, 80]); }
      else { toast.error(`${mult}x — lost tokens.`); playTone(180, 0.2, 'sawtooth', 0.15); }
      const pr = profileRef.current;
      const fb = balanceRef.current + won;
      if (pr && !pr.id.startsWith('guest')) {
        try {
          await (supabase.from('users') as any).update({ tokens: fb, total_earned: pr.total_earned + Math.max(0, won - ball.betAmount), xp: pr.xp + Math.floor(ball.betAmount * 0.1) }).eq('id', pr.id);
          await (supabase.from('game_stats') as any).upsert({ user_id: pr.id, games_played: 1, games_won: mult >= 1 ? 1 : 0 });
        } catch {}
      }
      updateProfile({ tokens: fb });
    });

    rAFRef.current = requestAnimationFrame(physicsLoop);
  }, [multipliers, updateProfile]);

  useEffect(() => {
    rAFRef.current = requestAnimationFrame(physicsLoop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, [physicsLoop]);

  useEffect(() => {
    if (autoDrop) {
      autoDropRef.current = setInterval(() => handleDropBall(), 1600);
    } else {
      if (autoDropRef.current) clearInterval(autoDropRef.current);
    }
    return () => { if (autoDropRef.current) clearInterval(autoDropRef.current); };
  }, [autoDrop, betAmount]);

  const handleDropBall = useCallback(async () => {
    const bal = balanceRef.current;
    const bet = betAmount;
    const pr = profileRef.current;
    const isOwner = pr?.email === 'vermaarnav113@gmail.com';
    const freeTrials = pr?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

    if (outOfTrials) { if (!autoDrop) toast.error('Out of free trials! Deposit to play.'); return; }
    
    const actualBet = isFreeTrial ? 0 : bet;
    if (bet <= 0 || actualBet > bal) { if (!autoDrop) toast.error('Insufficient tokens!'); return; }
    
    const nb = bal - actualBet;
    if (pr && !pr.id.startsWith('guest')) {
      const dbUpdates: any = { tokens: nb };
      if (isFreeTrial) dbUpdates.free_trials = freeTrials - 1;
      try { await (supabase.from('users') as any).update(dbUpdates).eq('id', pr.id); } catch {}
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    if (isFreeTrial) toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    const jitter = (Math.random() - 0.5) * 8;
    ballsRef.current.push({ id: Date.now() + Math.random(), x: W / 2 + jitter, y: 20, vx: jitter * 0.1, vy: 1.5, trail: [], active: true, betAmount: actualBet, settled: false });
    setBallsInFlight(prev => prev + 1);
    playTone(450, 0.05, 'sine', 0.1);
  }, [betAmount, autoDrop, updateProfile]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={false} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Risk Level</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                <Button key={r} variant={risk === r ? 'primary' : 'ghost'} onClick={() => { setRisk(r); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 text-xs rounded-xl capitalize ${risk === r ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}>{r}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Rows</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[8, 10, 12].map(n => (
                <Button key={n} variant={rows === n ? 'primary' : 'ghost'} onClick={() => { setRows(n); buildPegs(); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 text-xs rounded-xl ${rows === n ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}>{n}</Button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors ${autoDrop ? 'bg-cyan-neon' : 'bg-navy-700'} relative`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoDrop ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <input type="checkbox" className="sr-only" checked={autoDrop} onChange={e => setAutoDrop(e.target.checked)} />
            <span className="text-xs text-text-secondary">Auto Drop</span>
          </label>
          {ballsInFlight > 0 && <p className="text-xs text-cyan-neon font-mono">{ballsInFlight} ball{ballsInFlight > 1 ? 's' : ''} in flight</p>}
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={betAmount <= 0 || betAmount > (profile?.tokens ?? 0)} onClick={handleDropBall}>
            Drop Ball
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10"><HelpCircle size={10} /><span>2–4% edge</span></div>
        <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-[420px]" />
      </Card>
    </div>
  );
}
