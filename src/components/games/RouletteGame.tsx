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

const CX = 190;
const CY = 190;
const SECTOR_ANGLE = (Math.PI * 2) / 15;

// Physical wheel geometry
const RADIUS_OUTER_BEZEL = 184;
const RADIUS_BRASS_RIM = 172;
const RADIUS_BALL_TRACK = 154;
const RADIUS_POCKET_OUTER = 138;
const RADIUS_POCKET_INNER = 88;
const RADIUS_CONE_INNER = 46;
const RADIUS_POCKET_CENTER = 114;

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

  // Physical ivory ball dynamics
  const ballAngleRef = useRef(-Math.PI / 2);
  const ballRadiusRef = useRef(RADIUS_POCKET_CENTER);
  const ballVelocityRef = useRef(0);
  const ballTrailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);

  const balance = profile?.tokens ?? 0;

  const drawWheel = (wheelAngle: number, currentOutcome: WheelTile | null = outcome) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Outer Deep Mahogany / Obsidian Bowl Casing with Ambient Shadow
    const outerCasingGrad = ctx.createRadialGradient(CX - 15, CY - 15, 60, CX, CY, RADIUS_OUTER_BEZEL + 4);
    outerCasingGrad.addColorStop(0, '#101726');
    outerCasingGrad.addColorStop(0.7, '#070b14');
    outerCasingGrad.addColorStop(1, '#020409');
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_OUTER_BEZEL + 4, 0, Math.PI * 2);
    ctx.fillStyle = outerCasingGrad;
    ctx.shadowBlur = 16;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Multi-Stop Physical PBR Metallic Brass Rim
    const brassGrad = ctx.createRadialGradient(CX - 25, CY - 25, 80, CX, CY, RADIUS_OUTER_BEZEL);
    brassGrad.addColorStop(0, '#fff4b8');
    brassGrad.addColorStop(0.15, '#e5a93c');
    brassGrad.addColorStop(0.4, '#8a5712');
    brassGrad.addColorStop(0.7, '#fcd34d');
    brassGrad.addColorStop(0.85, '#92400e');
    brassGrad.addColorStop(1, '#451a03');

    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_OUTER_BEZEL, 0, Math.PI * 2);
    ctx.arc(CX, CY, RADIUS_BRASS_RIM, 0, Math.PI * 2, true);
    ctx.fillStyle = brassGrad;
    ctx.fill();

    // High-specular bevel edge rings on the outer brass rim
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_OUTER_BEZEL - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 245, 180, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_BRASS_RIM + 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(50, 25, 5, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Recessed Ball Track (Concave Ball Gutter with Ambient Occlusion)
    const trackGrad = ctx.createRadialGradient(CX - 15, CY - 15, RADIUS_BALL_TRACK - 10, CX, CY, RADIUS_BRASS_RIM);
    trackGrad.addColorStop(0, '#04070e');
    trackGrad.addColorStop(0.35, '#152136');
    trackGrad.addColorStop(0.75, '#090e18');
    trackGrad.addColorStop(1, '#020408');

    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_BRASS_RIM, 0, Math.PI * 2);
    ctx.arc(CX, CY, RADIUS_POCKET_OUTER, 0, Math.PI * 2, true);
    ctx.fillStyle = trackGrad;
    ctx.fill();

    // Ball Track Specular Guideway Groove
    ctx.beginPath();
    ctx.arc(CX, CY, (RADIUS_BRASS_RIM + RADIUS_POCKET_OUTER) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8 Traditional Polished Brass Diamond Ball Deflectors
    for (let d = 0; d < 8; d++) {
      const deflAngle = (d * Math.PI) / 4 + 0.2;
      const deflR = (RADIUS_BRASS_RIM + RADIUS_POCKET_OUTER) / 2;
      const dx = CX + Math.cos(deflAngle) * deflR;
      const dy = CY + Math.sin(deflAngle) * deflR;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(deflAngle);

      // Deflector shadow
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0); ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Top faceted brass highlight
      ctx.beginPath();
      ctx.moveTo(0, -4.5); ctx.lineTo(2.5, 0); ctx.lineTo(0, 4.5); ctx.closePath();
      ctx.fillStyle = '#fff4b8';
      ctx.fill();

      // Bottom facet shadow
      ctx.beginPath();
      ctx.moveTo(0, -4.5); ctx.lineTo(-2.5, 0); ctx.lineTo(0, 4.5); ctx.closePath();
      ctx.fillStyle = '#a16207';
      ctx.fill();
      ctx.restore();
    }

    // 4. Wheel Pockets & Separator Frets
    const isLanded = currentOutcome !== null || (!spinningRef.current && winIdxRef.current !== undefined);
    const pulseFactor = 0.5 + 0.5 * Math.sin(Date.now() / 140);

    WHEEL_TILES.forEach((tile, i) => {
      const start = wheelAngle + i * SECTOR_ANGLE;
      const end = start + SECTOR_ANGLE;
      const mid = start + SECTOR_ANGLE / 2;
      const isWinningTile = isLanded && i === winIdxRef.current;

      // Draw pocket floor
      ctx.beginPath();
      ctx.arc(CX, CY, RADIUS_POCKET_OUTER, start, end);
      ctx.arc(CX, CY, RADIUS_POCKET_INNER, end, start, true);
      ctx.closePath();

      // Physical radial gradient for depth trough
      const midX = CX + Math.cos(mid) * RADIUS_POCKET_CENTER;
      const midY = CY + Math.sin(mid) * RADIUS_POCKET_CENTER;
      const pocketGrad = ctx.createRadialGradient(midX, midY, 4, midX, midY, 32);

      if (tile.color === 'red') {
        pocketGrad.addColorStop(0, '#f87171');
        pocketGrad.addColorStop(0.4, '#dc2626');
        pocketGrad.addColorStop(1, '#500707');
      } else if (tile.color === 'green') {
        pocketGrad.addColorStop(0, '#4ade80');
        pocketGrad.addColorStop(0.4, '#16a34a');
        pocketGrad.addColorStop(1, '#052e16');
      } else {
        pocketGrad.addColorStop(0, '#334155');
        pocketGrad.addColorStop(0.4, '#0f172a');
        pocketGrad.addColorStop(1, '#020408');
      }

      ctx.fillStyle = pocketGrad;
      ctx.fill();

      // Illuminated Winning Pocket Highlights
      if (isWinningTile) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, RADIUS_POCKET_OUTER + 2, start, end);
        ctx.arc(CX, CY, RADIUS_POCKET_INNER - 2, end, start, true);
        ctx.closePath();

        const glowColor = tile.color === 'green' ? 'rgba(74, 222, 128,' : tile.color === 'red' ? 'rgba(248, 113, 113,' : 'rgba(0, 240, 255,';
        ctx.fillStyle = `${glowColor} ${0.35 + 0.25 * pulseFactor})`;
        ctx.shadowBlur = 18;
        ctx.shadowColor = tile.color === 'green' ? '#4ade80' : tile.color === 'red' ? '#ef4444' : '#00f0ff';
        ctx.fill();
        ctx.strokeStyle = `${glowColor} ${0.8 + 0.2 * pulseFactor})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Pocket Separator Fret (Brass/Chrome divider)
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(start) * RADIUS_POCKET_INNER, CY + Math.sin(start) * RADIUS_POCKET_INNER);
      ctx.lineTo(CX + Math.cos(start) * RADIUS_POCKET_OUTER, CY + Math.sin(start) * RADIUS_POCKET_OUTER);
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fret end rivet pin
      const pinX = CX + Math.cos(start) * (RADIUS_POCKET_OUTER - 1);
      const pinY = CY + Math.sin(start) * (RADIUS_POCKET_OUTER - 1);
      ctx.beginPath();
      ctx.arc(pinX, pinY, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      // Crisp Embossed Number Typography
      const lx = CX + Math.cos(mid) * RADIUS_POCKET_CENTER;
      const ly = CY + Math.sin(mid) * RADIUS_POCKET_CENTER;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(mid + Math.PI / 2);
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Etched text shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = isWinningTile ? '#ffffff' : '#f8fafc';
      ctx.fillText(String(tile.num), 0, 0);
      ctx.restore();
    });

    // 5. Inner Cone / Deflector Slope (Slanted metal slope rising toward center hub)
    const coneGrad = ctx.createRadialGradient(CX - 15, CY - 15, 10, CX, CY, RADIUS_POCKET_INNER);
    coneGrad.addColorStop(0, '#2d3e56');
    coneGrad.addColorStop(0.3, '#1a273b');
    coneGrad.addColorStop(0.7, '#0b121e');
    coneGrad.addColorStop(1, '#03060c');

    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_POCKET_INNER, 0, Math.PI * 2);
    ctx.arc(CX, CY, RADIUS_CONE_INNER, 0, Math.PI * 2, true);
    ctx.fillStyle = coneGrad;
    ctx.fill();

    // Lathe-turned concentric micro-groove rings on inner slope
    ctx.beginPath();
    ctx.arc(CX, CY, (RADIUS_POCKET_INNER + RADIUS_CONE_INNER) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 6. Center Casino Turret & 4-Arm Polished Brass Spinner Handles
    const turretBaseGrad = ctx.createRadialGradient(CX - 10, CY - 10, 5, CX, CY, RADIUS_CONE_INNER);
    turretBaseGrad.addColorStop(0, '#fef08a');
    turretBaseGrad.addColorStop(0.3, '#d97706');
    turretBaseGrad.addColorStop(0.7, '#78350f');
    turretBaseGrad.addColorStop(1, '#291102');

    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS_CONE_INNER, 0, Math.PI * 2);
    ctx.fillStyle = turretBaseGrad;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Iconic 4-Arm Brass Spinner Turret Handles (Rotating with wheel)
    for (let arm = 0; arm < 4; arm++) {
      const armAngle = wheelAngle + (arm * Math.PI) / 2;
      const armEndR = RADIUS_CONE_INNER + 6;
      const ax = CX + Math.cos(armAngle) * armEndR;
      const ay = CY + Math.sin(armAngle) * armEndR;

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Brass Finial Knob
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Center Raised Hub Dome
    const domeGrad = ctx.createRadialGradient(CX - 8, CY - 8, 2, CX, CY, 26);
    domeGrad.addColorStop(0, '#00f0ff');
    domeGrad.addColorStop(0.2, '#0284c7');
    domeGrad.addColorStop(0.6, '#0f172a');
    domeGrad.addColorStop(1, '#020617');

    ctx.beginPath();
    ctx.arc(CX, CY, 26, 0, Math.PI * 2);
    ctx.fillStyle = domeGrad;
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Laser-etched typography
    ctx.font = 'bold 7px "JetBrains Mono", monospace';
    ctx.fillStyle = '#70f3ff';
    ctx.textAlign = 'center';
    ctx.fillText('AQUA', CX, CY - 2.5);
    ctx.fillText('SPIN', CX, CY + 7);

    // 7. Physical Ivory Ball & Dynamic Shadow Projection
    const bRad = ballRadiusRef.current;
    const bAng = ballAngleRef.current;
    const bx = CX + Math.cos(bAng) * bRad;
    const by = CY + Math.sin(bAng) * bRad;

    // Render motion blur trail if moving fast
    if (spinningRef.current && ballTrailRef.current.length > 0) {
      ballTrailRef.current.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${point.alpha * 0.3})`;
        ctx.fill();
      });
    }

    // Ball Ambient Shadow cast onto the wheel track
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx + 2, by + 2.5, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    ctx.restore();

    // 3D Ivory Sphere with Specular Highlight
    const ballGrad = ctx.createRadialGradient(bx - 1.5, by - 1.5, 0.6, bx, by, 4.8);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.3, '#f8fafc');
    ballGrad.addColorStop(0.7, '#cbd5e1');
    ballGrad.addColorStop(1, '#64748b');

    ctx.beginPath();
    ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const spinLoop = () => {
    if (!spinningRef.current) return;
    const elapsed = Date.now() - spinStartRef.current;
    const duration = spinDurationRef.current;
    const t = Math.min(elapsed / duration, 1);

    // Wheel rotation deceleration curve
    angleRef.current = startAngleRef.current + totalSpinRef.current * easeOut(t);

    // Ball dynamics: high-speed orbital flight dropping into pocket
    const winTargetAngle = angleRef.current + winIdxRef.current * SECTOR_ANGLE + SECTOR_ANGLE / 2;

    if (t < 0.68) {
      // Fast orbit in outer ball track
      ballRadiusRef.current = RADIUS_BALL_TRACK - 2 + Math.sin(elapsed / 90) * 1.5;
      ballVelocityRef.current = (1 - t * 0.75) * 0.28;
      ballAngleRef.current -= ballVelocityRef.current;

      // Update motion trail
      const curX = CX + Math.cos(ballAngleRef.current) * ballRadiusRef.current;
      const curY = CY + Math.sin(ballAngleRef.current) * ballRadiusRef.current;
      ballTrailRef.current.unshift({ x: curX, y: curY, alpha: 1 });
      if (ballTrailRef.current.length > 5) ballTrailRef.current.pop();
    } else {
      // Inward drop and pocket capture
      const dropT = (t - 0.68) / 0.32;
      const easedDrop = Math.sin((dropT * Math.PI) / 2);
      ballRadiusRef.current = (RADIUS_BALL_TRACK - 2) - easedDrop * (RADIUS_BALL_TRACK - 2 - RADIUS_POCKET_CENTER);

      // Settle smoothly into winning pocket center
      const angleDiff = ((winTargetAngle - ballAngleRef.current) % (Math.PI * 2));
      ballAngleRef.current += angleDiff * Math.min(0.25, dropT * 0.4);
      ballTrailRef.current = [];
    }

    drawWheel(angleRef.current);

    if (t < 1) {
      playTone(280 + (1 - t) * 220, 0.01, 'sine', 0.02);
      rAFRef.current = requestAnimationFrame(spinLoop);
    } else {
      spinningRef.current = false;
      setSpinning(false);
      ballRadiusRef.current = RADIUS_POCKET_CENTER;
      ballAngleRef.current = angleRef.current + winIdxRef.current * SECTOR_ANGLE + SECTOR_ANGLE / 2;
      finalizeResult();
    }
  };

  const idleLoop = () => {
    if (spinningRef.current) return;
    angleRef.current += 0.002;

    // Resting ball moves synchronously nestled in pocket
    ballRadiusRef.current = RADIUS_POCKET_CENTER;
    ballAngleRef.current = angleRef.current + winIdxRef.current * SECTOR_ANGLE + SECTOR_ANGLE / 2;

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
      } catch {}
    }
    updateProfile({ tokens: fb });
    // Restart idle
    rAFRef.current = requestAnimationFrame(idleLoop);
  };

  const handleSpin = async () => {
    if (!betSelection) { toast.error('Pick Red, Black or Green!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile: currentProfile, isOwner, updateProfile: updateProf } = useAuthStore.getState();
    const freeTrials = currentProfile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProfile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProfile?.has_deposited && freeTrials <= 0;
    
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
    if (currentProfile && !currentProfile.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', currentProfile.id); } catch {}
    }
    updateProf({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    const winIdx = Math.floor(Math.random() * 15);
    winIdxRef.current = winIdx;

    // Pointer is calibrated at 12 o'clock (-Math.PI / 2)
    const targetOffset = -Math.PI / 2 - (winIdx * SECTOR_ANGLE + SECTOR_ANGLE / 2);
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
          {/* Luxury Jeweled Indicator Needle Pointer at 12 o'clock */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 z-20 flex flex-col items-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-200 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.6)] border border-amber-100 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#00f0ff]" />
            </div>
            <div className="w-0 h-0 -mt-1"
              style={{
                borderLeft: '9px solid transparent',
                borderRight: '9px solid transparent',
                borderTop: '16px solid #00F0FF',
                filter: 'drop-shadow(0 0 8px #00F0FF)'
              }} />
          </div>

          <canvas ref={canvasRef} width={380} height={380} className="rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.85)] border border-navy-800/60" />
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
