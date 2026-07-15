// src/components/games/RouletteGame.tsx
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

interface RouletteGameProps { onClose: () => void; }
type BetType = 'red' | 'black' | 'green' | null;
type WheelTile = { num: number; color: 'red' | 'black' | 'green' };

const WHEEL_TILES: WheelTile[] = [
  { num: 0, color: 'green' }, { num: 1, color: 'red' }, { num: 8, color: 'black' },
  { num: 2, color: 'red' }, { num: 9, color: 'black' }, { num: 3, color: 'red' },
  { num: 10, color: 'black' }, { num: 4, color: 'red' }, { num: 11, color: 'black' },
  { num: 5, color: 'red' }, { num: 12, color: 'black' }, { num: 6, color: 'red' },
  { num: 13, color: 'black' }, { num: 7, color: 'red' }, { num: 14, color: 'black' },
];

const CX = 190, CY = 190, RADIUS = 158, SECTOR_ANGLE = (Math.PI * 2) / 15;

export function RouletteGame({ onClose }: RouletteGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<WheelTile | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const actualBetRef = useRef(0);
  const [history, setHistory] = useState<string[]>(['R', 'B', 'R', 'G', 'B', 'R']);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const rAFRef = useRef<number | null>(null);
  const spinningRef = useRef(false);
  const spinStartRef = useRef(0);
  const spinDurationRef = useRef(4500);
  const startAngleRef = useRef(0);
  const totalSpinRef = useRef(0);
  const winIdxRef = useRef(0);
  const balance = profile?.tokens ?? 0;

  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer glow ring
    const outerGrad = ctx.createRadialGradient(CX, CY, RADIUS + 2, CX, CY, RADIUS + 14);
    outerGrad.addColorStop(0, 'rgba(0,240,255,0.5)');
    outerGrad.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.beginPath(); ctx.arc(CX, CY, RADIUS + 14, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad; ctx.fill();

    // Sectors
    WHEEL_TILES.forEach((tile, i) => {
      const start = angle + i * SECTOR_ANGLE;
      const end = start + SECTOR_ANGLE;
      ctx.beginPath(); ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, RADIUS, start, end); ctx.closePath();
      ctx.fillStyle = tile.color === 'red' ? '#dc2626' : tile.color === 'green' ? '#16a34a' : '#0f172a';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Number label
      const mid = start + SECTOR_ANGLE / 2;
      const lx = CX + Math.cos(mid) * (RADIUS * 0.72);
      const ly = CY + Math.sin(mid) * (RADIUS * 0.72);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(mid + Math.PI / 2);
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(String(tile.num), 0, 0); ctx.restore();
    });

    // Outer border
    ctx.beginPath(); ctx.arc(CX, CY, RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#00F0FF'; ctx.lineWidth = 3;
    ctx.shadowBlur = 12; ctx.shadowColor = '#00F0FF'; ctx.stroke(); ctx.shadowBlur = 0;

    // Center circle
    ctx.beginPath(); ctx.arc(CX, CY, 36, 0, Math.PI * 2);
    const cGrad = ctx.createRadialGradient(CX - 8, CY - 8, 2, CX, CY, 36);
    cGrad.addColorStop(0, '#1e3a5f'); cGrad.addColorStop(1, '#050e1a');
    ctx.fillStyle = cGrad; ctx.fill();
    ctx.strokeStyle = 'rgba(0,240,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(0,240,255,0.7)'; ctx.textAlign = 'center';
    ctx.fillText('AQUA', CX, CY - 3); ctx.fillText('SPIN', CX, CY + 7);
  };

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const spinLoop = () => {
    if (!spinningRef.current) return;
    const elapsed = Date.now() - spinStartRef.current;
    const duration = spinDurationRef.current;
    const t = Math.min(elapsed / duration, 1);
    angleRef.current = startAngleRef.current + totalSpinRef.current * easeOut(t);
    drawWheel(angleRef.current);
    if (t < 1) {
      playTone(300 + (1 - t) * 200, 0.01, 'sine', 0.02);
      rAFRef.current = requestAnimationFrame(spinLoop);
    } else {
      spinningRef.current = false;
      setSpinning(false);
      finalizeResult();
    }
  };

  const idleLoop = () => {
    if (spinningRef.current) return;
    angleRef.current += 0.002;
    drawWheel(angleRef.current);
    rAFRef.current = requestAnimationFrame(idleLoop);
  };

  useEffect(() => {
    rAFRef.current = requestAnimationFrame(idleLoop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, []);

  const finalizeResult = async () => {
    const tile = WHEEL_TILES[winIdxRef.current];
    setOutcome(tile);
    const isWin = betSelection === tile.color;
    setWin(isWin);
    setHistory(prev => [...prev.slice(-29), tile.color === 'red' ? 'R' : tile.color === 'green' ? 'G' : 'B']);
    let earned = 0;
    if (isWin) {
      earned = tile.color === 'green' ? Math.floor((profile?.tokens ?? 0) + 14 * betAmount) : Math.floor((profile?.tokens ?? 0) + 2 * betAmount);
      // recalc correctly:
      earned = tile.color === 'green' ? Math.floor(betAmount * 14) : Math.floor(betAmount * 2);
      toast.success(`🏆 Won! +${earned - betAmount} tokens!`);
      playTone(523, 0.15, 'sine', 0.3); vibrate([50, 50, 100]);
    } else {
      toast.error(`Rolled ${tile.color} ${tile.num}. Lost bet.`);
      playTone(180, 0.3, 'sawtooth', 0.2); vibrate(100);
    }
    const fb = (balance - actualBetRef.current) + earned;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? earned - betAmount : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });
      } catch (e) {
        console.error('Failed to update user after spin:', e);
      }
    }
    updateProfile({ tokens: fb });
    // Restart idle
    rAFRef.current = requestAnimationFrame(idleLoop);
  };

  const handleSpin = async () => {
    if (!betSelection) { toast.error('Pick Red, Black or Green!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    actualBetRef.current = actualBetAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    if (spinning) return;
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    setSpinning(true); spinningRef.current = true; setOutcome(null); setWin(null);
    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    const winIdx = Math.floor(Math.random() * 15);
    winIdxRef.current = winIdx;
    const targetOffset = -(winIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2);
    const fullSpins = 8 * Math.PI * 2;
    startAngleRef.current = angleRef.current;
    totalSpinRef.current = fullSpins + ((targetOffset - (angleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    spinStartRef.current = Date.now();
    spinDurationRef.current = 4200 + Math.random() * 600;
    playTone(220, 0.1, 'sine', 0.2);
    rAFRef.current = requestAnimationFrame(spinLoop);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={spinning} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Select Bet</span>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={spinning}
                  onClick={() => { setBetSelection('red'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'red' ? 'border-red-500 bg-red-950/30 text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.3)]' : 'border-navy-700 text-text-secondary'}`}>
                  🔴 Red (2x)
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={spinning}
                  onClick={() => { setBetSelection('black'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'black' ? 'border-slate-500 bg-slate-950/30 text-slate-300 shadow-[0_0_16px_rgba(100,116,139,0.3)]' : 'border-navy-700 text-text-secondary'}`}>
                  ⚫ Black (2x)
                </motion.button>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={spinning}
                onClick={() => { setBetSelection('green'); playTone(400, 0.05, 'sine', 0.1); }}
                className={`w-full py-3 rounded-xl border-2 font-bold text-sm transition-all ${betSelection === 'green' ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-[0_0_16px_rgba(22,163,74,0.4)]' : 'border-navy-700 text-text-secondary'}`}>
                🟢 Green (14x)
              </motion.button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={spinning || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleSpin}>
            {spinning ? '🎡 Spinning...' : 'Spin'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col items-center gap-4 relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl p-4 overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted"><HelpCircle size={10} /><span>2.7% edge</span></div>
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 w-0 h-0"
            style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '18px solid #00F0FF', filter: 'drop-shadow(0 0 6px #00F0FF)' }} />
          <canvas ref={canvasRef} width={380} height={380} className="rounded-full" />
        </div>

        <AnimatePresence>
          {outcome && (
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="text-center">
              <h3 className={`text-2xl font-bold font-display uppercase tracking-widest ${outcome.color === 'red' ? 'text-red-500' : outcome.color === 'green' ? 'text-emerald-400' : 'text-slate-300'}`}>
                {outcome.color} {outcome.num}
              </h3>
              {win !== null && <p className={`text-xs font-semibold uppercase tracking-wider ${win ? 'text-success' : 'text-danger'}`}>{win ? '🏆 WIN!' : 'Lost'}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bead road */}
        <div className="grid grid-cols-10 gap-1 w-full">
          {history.slice(-30).map((h, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`w-5 h-5 rounded-full border ${h === 'R' ? 'bg-red-500 border-red-400' : h === 'G' ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`} />
          ))}
        </div>
      </Card>
    </div>
  );
}
