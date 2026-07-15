// src/components/games/PlinkoGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { playTone, vibrate } from '@/lib/utils';
import {
  createAppError,
  logError,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';
import toast from 'react-hot-toast';

interface PlinkoGameProps { onClose: () => void; }
type RiskLevel = 'low' | 'medium' | 'high';
type BallType = 'gold' | 'platinum' | 'diamond';

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  active: boolean;
  betAmount: number;
  settled: boolean;
  type: BallType;
  mass: number;
  color: string;
};

type Peg = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  flash: number;
  flexX: number;
  flexY: number;
};

type BucketFlash = { idx: number; frames: number; };

const MULTS: Record<RiskLevel, Record<number, number[]>> = {
  low: { 8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6], 10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9], 12: [10, 5, 2, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2, 5, 10] },
  medium: { 8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], 10: [22, 5, 2, 1.4, 0.9, 0.4, 0.9, 1.4, 2, 5, 22], 12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33] },
  high: { 8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29], 10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76], 12: [170, 33, 11, 4, 2, 0.2, 0.2, 0.2, 2, 4, 11, 33, 170] }
};

const BALL_SPECS = {
  gold: { color: '#ffd700', mass: 1.0, gravity: 0.32, speedMult: 1.0 },
  platinum: { color: '#e5e4e2', mass: 1.4, gravity: 0.28, speedMult: 1.0 },
  diamond: { color: '#b9f2ff', mass: 1.9, gravity: 0.24, speedMult: 1.0 }
};

export function PlinkoGame({ onClose }: PlinkoGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [rows, setRows] = useState(8);
  const [autoDrop, setAutoDrop] = useState(false);
  const [selectedBallType, setSelectedBallType] = useState<BallType>('gold');
  const [ballsInFlight, setBallsInFlight] = useState(0);

  // Parallax tilt offset based on mouse movement
  const [tiltOffset, setTiltOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const rAFRef = useRef<number | null>(null);
  const bucketFlashesRef = useRef<BucketFlash[]>([]);
  const autoDropRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileRef = useRef(profile);
  const balanceRef = useRef(profile?.tokens ?? 0);

  // Mechanical Arm Drop Animation references
  const armTargetX = useRef(210);
  const armCurrentX = useRef(210);

  useEffect(() => { profileRef.current = profile; balanceRef.current = profile?.tokens ?? 0; }, [profile]);

  const multipliers = MULTS[risk][rows] || MULTS[risk][8];
  const W = 420, H = 430;
  const startY = 65, pegSpacing = 28;

  const buildPegs = useCallback(() => {
    const pegs: Peg[] = [];
    const rowSpacing = (H - 150) / rows;
    for (let r = 0; r <= rows; r++) {
      const count = r + 3;
      const rowY = startY + r * rowSpacing;
      const totalW = (count - 1) * pegSpacing;
      for (let c = 0; c < count; c++) {
        const x = W / 2 - totalW / 2 + c * pegSpacing;
        pegs.push({
          x,
          y: rowY,
          originalX: x,
          originalY: rowY,
          flash: 0,
          flexX: 0,
          flexY: 0
        });
      }
    }
    pegsRef.current = pegs;
  }, [rows]);

  useEffect(() => { buildPegs(); }, [buildPegs]);

  const getBucketX = (i: number) => W / 2 - ((multipliers.length - 1) * pegSpacing) / 2 + i * pegSpacing;

  // Render Caustic Plasma Receptacle Energy
  const drawPlasmaBucket = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isFlashing: boolean, mult: number) => {
    ctx.save();
    
    // Define bucket color scheme based on multiplier value
    let baseColor = 'rgba(30,41,59,0.3)';
    let strokeColor = '#334155';
    let glowColor = 'rgba(51,65,85,0.4)';
    
    if (mult >= 10) {
      baseColor = 'rgba(239,68,68,0.2)';
      strokeColor = '#ef4444';
      glowColor = 'rgba(239,68,68,0.6)';
    } else if (mult >= 2) {
      baseColor = 'rgba(245,158,11,0.2)';
      strokeColor = '#f59e0b';
      glowColor = 'rgba(245,158,11,0.6)';
    } else if (mult >= 1) {
      baseColor = 'rgba(16,185,129,0.15)';
      strokeColor = '#10b981';
      glowColor = 'rgba(16,185,129,0.5)';
    }

    // Outer Glow Neon tube
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = isFlashing ? 20 : 8;
    ctx.lineWidth = isFlashing ? 3 : 1.5;
    ctx.strokeStyle = strokeColor;
    
    // Draw neon tubing path
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, h, 6);
    ctx.stroke();

    // Internal Plasma swirling energy
    ctx.shadowBlur = 0;
    if (isFlashing) {
      const gradient = ctx.createRadialGradient(x, y + h / 2, 2, x, y + h / 2, w / 2);
      gradient.addColorStop(0, strokeColor);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x - w / 2 + 1, y + 1, w - 2, h - 2, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.roundRect(x - w / 2 + 1, y + 1, w - 2, h - 2, 5);
      ctx.fill();
    }

    ctx.restore();
  };

  const physicsLoop = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        rAFRef.current = requestAnimationFrame(physicsLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rAFRef.current = requestAnimationFrame(physicsLoop);
        return;
      }

      // 3D Parallax Tilt transformation
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(tiltOffset.x * 3, tiltOffset.y * 3);

      // Cyberpunk LED matrix shifting color gradients - lighter and more vivid
      const ledGradient = ctx.createLinearGradient(0, 0, 0, H);
      ledGradient.addColorStop(0, '#0f1f3d'); // deep indigo-blue
      ledGradient.addColorStop(0.5, '#152b52'); // brighter royal navy
      ledGradient.addColorStop(1, '#1e1b4b'); // vibrant dark purple
      ctx.fillStyle = ledGradient;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // Reactive LED Grid backdrop
      ctx.fillStyle = 'rgba(255,255,255,0.015)';
      const matrixSpacing = 16;
      for (let mx = 0; mx < W; mx += matrixSpacing) {
        for (let my = 0; my < H; my += matrixSpacing) {
          ctx.fillRect(mx, my, 2, 2);
        }
      }

      // Smooth mechanical arm positioning
      const activeBall = ballsRef.current.find(b => b.y < 35);
      if (activeBall) {
        armTargetX.current = activeBall.x;
      } else {
        armTargetX.current = W / 2;
      }
      armCurrentX.current += (armTargetX.current - armCurrentX.current) * 0.15;

      // Draw Mechanical Arm
      ctx.save();
      ctx.strokeStyle = 'rgba(229, 228, 226, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(armCurrentX.current, 0);
      ctx.lineTo(armCurrentX.current, 18);
      ctx.stroke();

      // Magnetic Claws
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(armCurrentX.current, 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Peg physical flex return logic and peg drawing
      pegsRef.current.forEach(peg => {
        // Return flex back to center slowly (spring physics damping)
        peg.flexX *= 0.85;
        peg.flexY *= 0.85;
        peg.x = peg.originalX + peg.flexX;
        peg.y = peg.originalY + peg.flexY;

        // Peg core rendering: Chrome cylinders with oil-slick shine
        ctx.save();
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, 4.5, 0, Math.PI * 2);
        
        // Oil-slick gradient
        const chromeGrad = ctx.createRadialGradient(peg.x - 1, peg.y - 1, 1, peg.x, peg.y, 4.5);
        if (peg.flash > 0) {
          chromeGrad.addColorStop(0, '#ffffff');
          chromeGrad.addColorStop(0.3, '#b9f2ff');
          chromeGrad.addColorStop(1, '#00f0ff');
          ctx.shadowColor = '#00F0FF';
          ctx.shadowBlur = 15;
        } else {
          chromeGrad.addColorStop(0, '#ffffff');
          chromeGrad.addColorStop(0.4, '#a1a1aa'); // chrome silver
          chromeGrad.addColorStop(0.7, '#64748b'); // navy steel
          chromeGrad.addColorStop(1, '#334155');
        }

        ctx.fillStyle = chromeGrad;
        ctx.fill();
        ctx.restore();

        // Peg flash state decay
        if (peg.flash > 0) peg.flash--;
      });

      // Bottom Neon/Plasma Receptacles
      const bucketY = H - 55;
      multipliers.forEach((mult, i) => {
        const bx = getBucketX(i);
        const isFlashing = bucketFlashesRef.current.some(bf => bf.idx === i && bf.frames > 0);
        drawPlasmaBucket(ctx, bx, bucketY, 24, 30, isFlashing, mult);

        // Multiplier labels
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = mult >= 10 ? '#ef4444' : mult >= 2 ? '#f59e0b' : mult >= 1 ? '#10b981' : '#64748b';
        ctx.textAlign = 'center';
        ctx.fillText(`${mult}x`, bx, bucketY + 18);
      });

      // Decay bucket flashing state
      bucketFlashesRef.current.forEach(bf => { if (bf.frames > 0) bf.frames--; });
      bucketFlashesRef.current = bucketFlashesRef.current.filter(bf => bf.frames > 0);

      // Balls physics update
      const toSettle: Ball[] = [];
      ballsRef.current.forEach(ball => {
        if (ball.settled) return;

        // Apply physical properties based on Ball Selection
        const spec = BALL_SPECS[ball.type];
        ball.vy += spec.gravity;
        ball.x += ball.vx * spec.speedMult;
        ball.y += ball.vy * spec.speedMult;
        ball.vx *= 0.992; // Damping air resistance

        // Peg collision detection with spring mechanics
        pegsRef.current.forEach(peg => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 11.5) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dot = ball.vx * nx + ball.vy * ny;
            
            // Transfer kinetic energy
            ball.vx -= 2 * dot * nx;
            ball.vy -= 2 * dot * ny;
            
            // Flex physics
            ball.vx *= 0.52; 
            ball.vy *= 0.52;
            ball.vx += (Math.random() - 0.5) * 1.6;

            // Push ball out of overlapping
            const overlap = 11.5 - dist;
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Flex/tilt peg physically based on impact momentum
            peg.flexX = -nx * ball.mass * 2.2;
            peg.flexY = -ny * ball.mass * 2.2;
            peg.flash = 12;

            // Collision tone based on ball type
            const baseTone = ball.type === 'diamond' ? 200 : ball.type === 'platinum' ? 400 : 600;
            playTone(baseTone + Math.random() * 120, 0.03, 'sine', 0.06);
            vibrate(4);
          }
        });

        // Board boundary collisions
        if (ball.x < 15) { ball.x = 15; ball.vx = Math.abs(ball.vx) * 0.65; }
        if (ball.x > W - 15) { ball.x = W - 15; ball.vx = -Math.abs(ball.vx) * 0.65; }

        // Trail positions
        ball.trail.unshift({ x: ball.x, y: ball.y });
        if (ball.trail.length > 8) ball.trail.pop();

        if (ball.y > H - 56) {
          ball.settled = true;
          toSettle.push(ball);
        }

        // Draw Trails
        ball.trail.forEach((tp, ti) => {
          ctx.save();
          ctx.globalAlpha = ((8 - ti) / 8) * 0.35;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = ball.color;
          ctx.fill();
          ctx.restore();
        });

        // Draw Ball
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6.5, 0, Math.PI * 2);
        
        // Dynamic lighting refraction on sphere
        const ballGrad = ctx.createRadialGradient(ball.x - 1.5, ball.y - 1.5, 1, ball.x, ball.y, 6.5);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, ball.color);
        ballGrad.addColorStop(1, '#000000');

        ctx.fillStyle = ballGrad;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      // Settle balls logic
      toSettle.forEach(async ball => {
        try {
          ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id);
          setBallsInFlight(prev => Math.max(0, prev - 1));

          let bucketIdx = 0;
          let minDist = Infinity;
          multipliers.forEach((_, i) => {
            const d = Math.abs(ball.x - getBucketX(i));
            if (d < minDist) {
              minDist = d;
              bucketIdx = i;
            }
          });

          if (bucketIdx < 0 || bucketIdx >= multipliers.length) {
            throw createAppError(
              'Invalid bucket index calculated',
              ErrorCategory.GAME_LOGIC,
              ErrorSeverity.ERROR
            );
          }

          bucketFlashesRef.current.push({ idx: bucketIdx, frames: 18 });
          const mult = multipliers[bucketIdx];

          if (typeof mult !== 'number' || !Number.isFinite(mult)) {
            throw createAppError(
              'Invalid multiplier value',
              ErrorCategory.GAME_LOGIC,
              ErrorSeverity.ERROR
            );
          }

          // Calculate final payout
          const won = Math.floor(ball.betAmount * mult);
          const pr = profileRef.current;
          const finalBalance = balanceRef.current + won;

          if (mult >= 1) {
            toast.success(`${mult}x payout! +${won} tokens!`, { icon: '💎' });
            // Bass-drop scale-up effect simulation
            playTone(260, 0.15, 'triangle', 0.35);
            setTimeout(() => playTone(520, 0.1, 'sine', 0.25), 80);
            vibrate([50, 20, 80]);
          } else {
            toast.error(`${mult}x return.`);
            playTone(180, 0.18, 'sawtooth', 0.15);
          }

          // DB update
          if (pr && !pr.id.startsWith('guest')) {
            const netWinLoss = won - ball.betAmount;
            await (supabase.from('users') as any)
              .update({
                tokens: finalBalance,
                total_earned: pr.total_earned + Math.max(0, netWinLoss),
                xp: pr.xp + Math.floor(ball.betAmount * 0.1),
              })
              .eq('id', pr.id);

            await (supabase.from('game_stats') as any).upsert({
              user_id: pr.id,
              games_played: 1,
              games_won: mult >= 1 ? 1 : 0,
            });
          }

          balanceRef.current = finalBalance;
          updateProfile({ tokens: finalBalance });
        } catch (error) {
          logError(error, { context: 'plinko_settle_error' });
          ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id);
          setBallsInFlight(prev => Math.max(0, prev - 1));
        }
      });

      ctx.restore(); // Restore parallax translation
      rAFRef.current = requestAnimationFrame(physicsLoop);
    } catch (error) {
      logError(error, { context: 'plinko_physics_loop' });
      rAFRef.current = requestAnimationFrame(physicsLoop);
    }
  }, [multipliers, updateProfile, tiltOffset]);

  useEffect(() => {
    rAFRef.current = requestAnimationFrame(physicsLoop);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, [physicsLoop]);

  // Track Mouse movement to shift tilt offset (Parallax)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 4; // -2 to +2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 4;
    setTiltOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setTiltOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (autoDrop) {
      autoDropRef.current = setInterval(() => handleDropBall(), 1500);
    } else {
      if (autoDropRef.current) clearInterval(autoDropRef.current);
    }
    return () => { if (autoDropRef.current) clearInterval(autoDropRef.current); };
  }, [autoDrop, betAmount, selectedBallType]);

  const validateBet = useCallback((amount: number, balance: number): { valid: boolean; error?: string } => {
    if (amount <= 0) return { valid: false, error: 'Bet amount must be greater than 0' };
    if (amount > balance) return { valid: false, error: 'Insufficient tokens for this bet' };
    return { valid: true };
  }, []);

  const updateUserBalance = useCallback(
    async (newBalance: number, freeTrialsUsed?: boolean) => {
      const pr = profileRef.current;
      if (!pr || pr.id.startsWith('guest')) return true;
      const dbUpdates: any = { tokens: newBalance };
      if (freeTrialsUsed) {
        const currentTrials = pr.free_trials ?? 3;
        dbUpdates.free_trials = Math.max(0, currentTrials - 1);
      }
      const { error } = await (supabase.from('users') as any).update(dbUpdates).eq('id', pr.id);
      return !error;
    },
    []
  );

  const handleDropBall = useCallback(async () => {
    try {
      const bal = balanceRef.current;
      const baseBet = betAmount;
      const pr = profileRef.current;
      
      if (!pr) return;

      const isOwner = pr?.email === 'vermaarnav113@gmail.com';
      const freeTrials = pr?.free_trials ?? 3;
      const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
      const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

      if (outOfTrials) {
        if (!autoDrop) {
          toast.error('Out of free trials! Deposit to play.');
        }
        return;
      }

      // Ball costs multiplier Gold: 1x, Platinum: 2x, Diamond: 5x
      const ballMultiplier = selectedBallType === 'diamond' ? 5 : selectedBallType === 'platinum' ? 2 : 1;
      const actualBet = isFreeTrial ? 0 : baseBet * ballMultiplier;

      const validation = validateBet(actualBet, bal);
      if (!validation.valid) {
        if (!autoDrop) toast.error(validation.error || 'Invalid bet');
        return;
      }

      const newBalance = bal - actualBet;

      if (!pr.id.startsWith('guest')) {
        const updateSuccess = await updateUserBalance(newBalance, isFreeTrial);
        if (!updateSuccess) return;
      }

      updateProfile({
        tokens: newBalance,
        ...(isFreeTrial ? { free_trials: Math.max(0, freeTrials - 1) } : {}),
      });

      if (isFreeTrial) {
        toast.success(`Free Trial Used! (${Math.max(0, freeTrials - 1)} left)`, {
          icon: '🎁',
          duration: 2000,
        });
      }

      // Spawn ball
      const jitter = (Math.random() - 0.5) * 12;
      const spec = BALL_SPECS[selectedBallType];
      
      const newBall: Ball = {
        id: Date.now() + Math.random(),
        x: W / 2 + jitter,
        y: 22,
        vx: jitter * 0.08,
        vy: 1.2,
        trail: [],
        active: true,
        betAmount: actualBet,
        settled: false,
        type: selectedBallType,
        mass: spec.mass,
        color: spec.color
      };

      ballsRef.current.push(newBall);
      setBallsInFlight(prev => prev + 1);
      
      // Arm release magnetic click tone
      playTone(550, 0.04, 'sine', 0.15);
    } catch (error) {
      toast.error('Failed to launch ball.');
    }
  }, [betAmount, autoDrop, selectedBallType, updateProfile, validateBet, updateUserBalance]);

  return (
    <ErrorBoundary name="PlinkoGame">
      <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #0d1e3d 0%, #1e1b4b 50%, #16223f 100%)' }}>
        
        {/* Left Controls Panel */}
        <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0">
          <div className="space-y-4">
            <BetControl
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              disabled={false}
            />

            {/* Premium Ball Selector Carousel */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Select Orb Material</span>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['gold', 'platinum', 'diamond'] as BallType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setSelectedBallType(t);
                      playTone(300 + (t === 'diamond' ? 200 : t === 'platinum' ? 100 : 0), 0.05, 'sine', 0.1);
                    }}
                    className={`py-2 rounded-lg text-2xs font-bold capitalize transition-all ${
                      selectedBallType === t
                        ? 'bg-slate-900 border border-cyan-400/50 text-cyan-300 shadow-md'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span 
                      className="inline-block w-2.5 h-2.5 rounded-full mr-1"
                      style={{ backgroundColor: BALL_SPECS[t].color }}
                    />
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 text-center font-mono">
                {selectedBallType === 'diamond' ? '💎 Cost: 5x | Yield: 5x Payout' : selectedBallType === 'platinum' ? '💍 Cost: 2x | Yield: 2x Payout' : '🪙 Cost: 1x | Yield: 1x Payout'}
              </p>
            </div>

            {/* Vertical Risk Slider */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Risk Factor</span>
              <div className="flex flex-col gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
                {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setRisk(r);
                      playTone(400, 0.05, 'sine', 0.1);
                    }}
                    className={`w-full py-2.5 text-xs font-bold rounded-lg capitalize border transition-all ${
                      risk === r
                        ? 'bg-red-500/10 border-red-500/60 text-red-300 shadow-sm'
                        : 'bg-transparent border-slate-900 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    {r} risk
                  </button>
                ))}
              </div>
            </div>

            {/* Rows selection */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Pins Rows</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[8, 10, 12].map(n => (
                  <Button
                    key={n}
                    variant={rows === n ? 'primary' : 'ghost'}
                    onClick={() => {
                      setRows(n);
                      buildPegs();
                      playTone(400, 0.05, 'sine', 0.1);
                    }}
                    className={`py-2 text-xs rounded-xl font-bold font-mono ${
                      rows === n
                        ? 'border-cyan-400/80 bg-cyan-500/10 text-cyan-300'
                        : 'border-slate-800 text-slate-500'
                    }`}
                  >
                    {n} Rows
                  </Button>
                ))}
              </div>
            </div>

            {/* Auto Drop Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <div
                className={`w-9 h-5 rounded-full transition-colors ${
                  autoDrop ? 'bg-cyan-500/30 border border-cyan-400' : 'bg-slate-800 border border-slate-700'
                } relative`}
              >
                <div
                  className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    autoDrop ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={autoDrop}
                onChange={e => setAutoDrop(e.target.checked)}
              />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Auto Launch</span>
            </label>

            {ballsInFlight > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-2xs text-cyan-300 font-mono font-bold">
                  {ballsInFlight} CYLINDER{ballsInFlight > 1 ? 'S' : ''} IN FLIGHT
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant="neon"
              size="lg"
              className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
              disabled={betAmount <= 0 || betAmount * (selectedBallType === 'diamond' ? 5 : selectedBallType === 'platinum' ? 2 : 1) > (profile?.tokens ?? 0)}
              onClick={handleDropBall}
            >
              LAUNCH ORB
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-slate-500 hover:text-slate-400"
              onClick={onClose}
            >
              Close Board
            </Button>
          </div>
        </Card>

        {/* Game Glass Tower Drawing Canvas */}
        <div 
          className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
            <ShieldCheck size={11} className="text-cyan-400" />
            <span>GYRO PARALLAX ACTIVE</span>
          </div>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full max-w-[420px]"
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
