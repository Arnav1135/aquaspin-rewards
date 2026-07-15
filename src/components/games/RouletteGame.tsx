// src/components/games/RouletteGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Flame } from 'lucide-react';
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
  { num: 0, color: 'green' }, { num: 32, color: 'red' }, { num: 15, color: 'black' },
  { num: 19, color: 'red' }, { num: 4, color: 'black' }, { num: 21, color: 'red' },
  { num: 2, color: 'black' }, { num: 25, color: 'red' }, { num: 17, color: 'black' },
  { num: 34, color: 'red' }, { num: 6, color: 'black' }, { num: 27, color: 'red' },
  { num: 13, color: 'black' }, { num: 36, color: 'red' }, { num: 11, color: 'black' },
  { num: 30, color: 'red' }, { num: 8, color: 'black' }, { num: 23, color: 'red' },
  { num: 10, color: 'black' }, { num: 5, color: 'red' }, { num: 24, color: 'black' },
  { num: 16, color: 'red' }, { num: 33, color: 'black' }, { num: 1, color: 'red' },
  { num: 20, color: 'black' }, { num: 14, color: 'red' }, { num: 31, color: 'black' },
  { num: 9, color: 'red' }, { num: 22, color: 'black' }, { num: 18, color: 'red' },
  { num: 29, color: 'black' }, { num: 7, color: 'red' }, { num: 28, color: 'black' },
  { num: 12, color: 'red' }, { num: 35, color: 'black' }, { num: 3, color: 'red' },
  { num: 26, color: 'black' }
];

const CX = 190, CY = 190, RADIUS = 145, SECTOR_ANGLE = (Math.PI * 2) / 37;

export function RouletteGame({ onClose }: RouletteGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<WheelTile | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [history, setHistory] = useState<string[]>(['R', 'B', 'R', 'G', 'B', 'R']);
  const actualBetRef = useRef(0);

  // Parallax / Camera Dolly zoom states
  const [zoomScale, setZoomScale] = useState(1.0);
  const [radialShimmer, setRadialShimmer] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0); // rotation angle of wheel
  const ballAngleRef = useRef(0); // rotation angle of ball
  const ballRadiusRef = useRef(RADIUS * 0.88); // distance of ball from center
  const rAFRef = useRef<number | null>(null);
  
  const spinningRef = useRef(false);
  const spinStartRef = useRef(0);
  const spinDurationRef = useRef(4800);
  const winIdxRef = useRef(0);
  const startAngleRef = useRef(0);
  const totalSpinRef = useRef(0);
  const balance = profile?.tokens ?? 0;

  // Draw wheel with mahogany, brass, and chrome styling details
  const drawWheel = (wheelAngle: number, ballAngle: number, ballRadius: number, zoom: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Zoom/Dolly transition
    ctx.translate(CX, CY);
    ctx.scale(zoom, zoom);
    ctx.translate(-CX, -CY);

    // 1. Mahogany Wood outer rim ring
    const woodGrad = ctx.createRadialGradient(CX, CY, RADIUS + 10, CX, CY, RADIUS + 28);
    woodGrad.addColorStop(0, '#2b1105'); // dark mahogany red-brown
    woodGrad.addColorStop(0.5, '#4a1e0b');
    woodGrad.addColorStop(1, '#1b0a03');
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS + 28, 0, Math.PI * 2);
    ctx.fillStyle = woodGrad;
    ctx.fill();

    // 2. Brass rim accent line
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS + 11, 0, Math.PI * 2);
    ctx.strokeStyle = '#d4af37'; // brass gold
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Sectors (inner wheel)
    WHEEL_TILES.forEach((tile, i) => {
      const start = wheelAngle + i * SECTOR_ANGLE;
      const end = start + SECTOR_ANGLE;
      
      // Draw pocket slice
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, RADIUS, start, end);
      ctx.closePath();
      
      ctx.fillStyle = tile.color === 'red' ? '#991b1b' : tile.color === 'green' ? '#065f46' : '#0f172a';
      ctx.fill();

      // Brass spokes dividers
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Numbers overlay (rotated)
      const mid = start + SECTOR_ANGLE / 2;
      const lx = CX + Math.cos(mid) * (RADIUS * 0.82);
      const ly = CY + Math.sin(mid) * (RADIUS * 0.82);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(mid + Math.PI / 2);
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(String(tile.num), 0, 0);
      ctx.restore();
    });

    // 4. Polished Chrome center hub
    ctx.beginPath();
    ctx.arc(CX, CY, 38, 0, Math.PI * 2);
    const chromeGrad = ctx.createRadialGradient(CX - 8, CY - 8, 2, CX, CY, 38);
    chromeGrad.addColorStop(0, '#ffffff');
    chromeGrad.addColorStop(0.3, '#cbd5e1'); // chrome silver
    chromeGrad.addColorStop(0.7, '#475569'); // dark steel
    chromeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = chromeGrad;
    ctx.fill();

    // Brass center spindle cap
    ctx.beginPath();
    ctx.arc(CX, CY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();

    // 5. Draw the ivory rolling ball
    if (spinningRef.current || outcome) {
      const bx = CX + Math.cos(ballAngle) * ballRadius;
      const by = CY + Math.sin(ballAngle) * ballRadius;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      
      // Ivory shading gradient
      const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 0.5, bx, by, 6);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.4, '#fffff0'); // ivory white
      ballGrad.addColorStop(1, '#cccccc');
      ctx.fillStyle = ballGrad;
      
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t: number) => t * t * t;

  const spinLoop = () => {
    if (!spinningRef.current) return;
    const elapsed = Date.now() - spinStartRef.current;
    const duration = spinDurationRef.current;
    const t = Math.min(elapsed / duration, 1);

    // 1. Wheel rotates in one direction, gradually slowing down
    const wheelRotations = 5 * Math.PI * 2;
    angleRef.current = wheelRotations * easeOut(t);

    // 2. Ball rotates in OPPOSITE direction (counter-rotation)
    const ballRotations = -14 * Math.PI * 2;
    ballAngleRef.current = ballRotations * easeOut(t);

    // 3. Ball radius collapses inward as it loses momentum
    if (t > 0.6) {
      // Dolly camera zoom in during last 40% (the heartbeat moment)
      const zoomRatio = (t - 0.6) / 0.4;
      setZoomScale(1.0 + easeOut(zoomRatio) * 0.18);
      
      // Ball drops into pocket track
      const dropProgress = (t - 0.6) / 0.4;
      ballRadiusRef.current = RADIUS * 0.88 - (RADIUS * 0.16) * easeIn(dropProgress);
    } else {
      setZoomScale(1.0);
      ballRadiusRef.current = RADIUS * 0.88;
    }

    // 4. Tick sound of ball passing frets
    const speed = (1 - t);
    if (Math.random() < speed * 0.5) {
      playTone(600 + Math.random() * 200, 0.01, 'sine', 0.04);
      vibrate(2);
    }

    drawWheel(angleRef.current, ballAngleRef.current, ballRadiusRef.current, zoomScale);

    if (t < 1) {
      rAFRef.current = requestAnimationFrame(spinLoop);
    } else {
      spinningRef.current = false;
      setSpinning(false);
      finalizeResult();
    }
  };

  const idleLoop = () => {
    if (spinningRef.current) return;
    angleRef.current += 0.003;
    drawWheel(angleRef.current, 0, 0, 1.0);
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
    setHistory(prev => [...prev.slice(-14), tile.color === 'red' ? 'R' : tile.color === 'green' ? 'G' : 'B']);

    let earned = 0;
    if (isWin) {
      earned = tile.color === 'green' ? Math.floor(betAmount * 14) : Math.floor(betAmount * 2);
      toast.success(`🏆 Payout Secured! +${earned - betAmount} tokens!`, { icon: '🎡' });
      
      // Green Zero hits gets special emerald shimmer particle explosion
      if (tile.color === 'green') {
        setRadialShimmer(true);
        setTimeout(() => setRadialShimmer(false), 2000);
        playTone(392, 0.15, 'sine', 0.35);
        setTimeout(() => playTone(523, 0.25, 'sine', 0.35), 100);
        vibrate([100, 50, 150, 50, 200]);
      } else {
        playTone(523.25, 0.15, 'sine', 0.3);
        vibrate([50, 50, 100]);
      }
    } else {
      toast.error(`Outcome: ${tile.color} ${tile.num}. Lost bet.`);
      playTone(160, 0.25, 'sawtooth', 0.2);
      vibrate(100);
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
    
    // Resume slow decorative wheel rotation
    rAFRef.current = requestAnimationFrame(idleLoop);
  };

  const handleSpin = async () => {
    if (!betSelection) { toast.error('Choose selection to place bet!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit to play.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    actualBetRef.current = actualBetAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    if (spinning) return;
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    
    setSpinning(true);
    spinningRef.current = true;
    setOutcome(null);
    setWin(null);
    setZoomScale(1.0);

    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    // Pick random pocket index
    const winIdx = Math.floor(Math.random() * 37);
    winIdxRef.current = winIdx;

    // Calculate ending angle: align pocket index to pointer at top (12 o'clock = -Math.PI / 2)
    const targetSectorOffset = -(winIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2);
    const finalWheelAngle = targetSectorOffset - Math.PI / 2;
    
    // Set counter-rotations
    startAngleRef.current = angleRef.current % (Math.PI * 2);
    totalSpinRef.current = (Math.PI * 2) * 6 + (finalWheelAngle - startAngleRef.current);

    spinStartRef.current = Date.now();
    spinDurationRef.current = 4400 + Math.random() * 600;
    
    // Launch/Flick sound
    playTone(280, 0.12, 'sine', 0.2);
    rAFRef.current = requestAnimationFrame(spinLoop);
  };


  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Visual Shimmer overlay on Green Zero hits */}
      {radialShimmer && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-emerald-500/10 shadow-[inset_0_0_80px_rgba(16,185,129,0.4)] animate-pulse" />
      )}

      {/* Left controls panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-emerald-400 to-slate-200 tracking-wider">
              MONTE CARLO
            </h2>
            <Flame size={16} className="text-emerald-400" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={spinning} />
          
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Select Sector Layout</span>
            <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={betSelection === 'red' ? 'primary' : 'ghost'}
                  disabled={spinning}
                  onClick={() => { setBetSelection('red'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-lg text-xs font-bold transition-all ${
                    betSelection === 'red' 
                      ? 'border-red-500 bg-red-500/10 text-red-300' 
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  🔴 Red (2x)
                </Button>
                <Button 
                  variant={betSelection === 'black' ? 'primary' : 'ghost'}
                  disabled={spinning}
                  onClick={() => { setBetSelection('black'); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-3 rounded-lg text-xs font-bold transition-all ${
                    betSelection === 'black' 
                      ? 'border-slate-300 bg-slate-500/10 text-slate-300' 
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  ⚫ Black (2x)
                </Button>
              </div>
              <Button 
                variant={betSelection === 'green' ? 'primary' : 'ghost'}
                disabled={spinning}
                onClick={() => { setBetSelection('green'); playTone(400, 0.05, 'sine', 0.1); }}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                  betSelection === 'green' 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                🟢 Green (14x)
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" disabled={spinning || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleSpin}>
            {spinning ? '🎡 WEAVING TENSION...' : 'SPIN CYLINDER'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Close Salon
          </Button>
        </div>
      </Card>

      {/* Photorealistic mechanical wheel viewport */}
      <Card className="flex-1 flex flex-col items-center justify-between relative min-h-[440px] bg-slate-950 border border-slate-900 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>FRENCH RULES ACTIVE</span>
        </div>

        {/* Photorealistic Felt background and Wheel container */}
        <div className="relative flex flex-col items-center justify-center flex-1">
          {/* Static physical gold pointer indicator on top */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3.5 z-20 w-0 h-0"
            style={{ 
              borderLeft: '11px solid transparent', 
              borderRight: '11px solid transparent', 
              borderTop: '20px solid #d4af37', 
              filter: 'drop-shadow(0 0 8px #d4af37)' 
            }} 
          />
          
          {/* Wheel canvas drawing */}
          <canvas 
            ref={canvasRef} 
            width={380} 
            height={380} 
            className="rounded-full shadow-2xl border-4 border-slate-900" 
          />
        </div>

        {/* Dynamic win status presentation overlay */}
        <div className="min-h-[48px] text-center flex items-center justify-center">
          <AnimatePresence>
            {outcome && (
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-1">
                <h3 className={`text-2xl font-black font-display uppercase tracking-widest leading-none ${
                  outcome.color === 'red' ? 'text-red-500' : outcome.color === 'green' ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {outcome.color} {outcome.num}
                </h3>
                {win !== null && (
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${win ? 'text-emerald-400' : 'text-red-500'}`}>
                    {win ? '🎉 payout secured' : 'table sweep'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bead road statistics */}
        <div className="w-full space-y-1">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono text-center">Session Statistics</p>
          <div className="flex justify-center gap-1 overflow-x-auto py-1">
            {history.slice(-20).map((h, i) => (
              <motion.span 
                key={i} 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                className={`w-3.5 h-3.5 rounded-full border text-[7px] font-black font-mono flex items-center justify-center ${
                  h === 'R' 
                    ? 'bg-red-950/60 border-red-500/40 text-red-400' 
                    : h === 'G' 
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {h}
              </motion.span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
