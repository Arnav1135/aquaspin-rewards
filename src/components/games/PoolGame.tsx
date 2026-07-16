// src/components/games/PoolGame.tsx
import { useState, useEffect, useRef } from 'react';
import { HelpCircle, RefreshCw, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PoolGameProps {
  onClose: () => void;
}

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isCue: boolean;
  active: boolean;
};

type Pocket = {
  x: number;
  y: number;
  radius: number;
};

export function PoolGame({ onClose }: PoolGameProps) {
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);

  // Pool physics state refs to bypass React render cycle lag
  const balls = useRef<Ball[]>([]);
  const cueAngle = useRef(0); // Cue stick angle in radians
  const cuePower = useRef(50); // Striker force %

  const W = 400;
  const H = 220;
  const ballRadius = 8;

  // Pocket coordinates around table corners and sides
  const pockets: Pocket[] = [
    { x: 12, y: 12, radius: 14 },
    { x: W / 2, y: 10, radius: 13 },
    { x: W - 12, y: 12, radius: 14 },
    { x: 12, y: H - 12, radius: 14 },
    { x: W / 2, y: H - 10, radius: 13 },
    { x: W - 12, y: H - 12, radius: 14 }
  ];

  const initGame = () => {
    // Spawn cue ball + 6 colored target balls in a triangle setup
    const ballList: Ball[] = [
      // Cue ball
      { id: 0, x: 100, y: H / 2, vx: 0, vy: 0, color: '#f8fafc', isCue: true, active: true },
      // Triangle rack
      { id: 1, x: 260, y: H / 2, vx: 0, vy: 0, color: '#ef4444', isCue: false, active: true },
      { id: 2, x: 276, y: H / 2 - 10, vx: 0, vy: 0, color: '#eab308', isCue: false, active: true },
      { id: 3, x: 276, y: H / 2 + 10, vx: 0, vy: 0, color: '#3b82f6', isCue: false, active: true },
      { id: 4, x: 292, y: H / 2 - 20, vx: 0, vy: 0, color: '#22c55e', isCue: false, active: true },
      { id: 5, x: 292, y: H / 2, vx: 0, vy: 0, color: '#a855f7', isCue: false, active: true },
      { id: 6, x: 292, y: H / 2 + 20, vx: 0, vy: 0, color: '#f97316', isCue: false, active: true }
    ];

    balls.current = ballList;
    setScore(0);
    setStrikes(0);
    setIsPlaying(true);
    setGameOver(false);
    setWon(false);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const handleShoot = () => {
    if (!isPlaying || gameOver || won) return;
    const cueBall = balls.current.find(b => b.isCue);
    if (!cueBall || !cueBall.active) return;

    // Verify all balls are stopped before next strike
    const anyMoving = balls.current.some(b => b.active && (Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05));
    if (anyMoving) {
      toast('Wait for all balls to settle!', { id: 'pool-settle-feedback' });
      return;
    }

    const force = (cuePower.current / 100) * 8.5;
    cueBall.vx = Math.cos(cueAngle.current) * force;
    cueBall.vy = Math.sin(cueAngle.current) * force;

    setStrikes(s => s + 1);
    playTone(350, 0.08, 'sine', 0.25);
    vibrate(30);
  };

  // Update logic loop
  const updateLoop = () => {
    if (!isPlaying || gameOver || won) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Pool Table Felt
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, W, H);

    // Table cushion borders
    ctx.strokeStyle = '#022c22';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, W, H);

    // Draw Pockets
    ctx.fillStyle = '#0f172a';
    pockets.forEach(pocket => {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, pocket.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Physics logic and boundaries
    const friction = 0.985;
    const activeBalls = balls.current.filter(b => b.active);

    activeBalls.forEach(ball => {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= friction;
      ball.vy *= friction;

      // Table Cushion bounce check
      const boundX = 10 + ballRadius;
      const boundY = 10 + ballRadius;

      if (ball.x < boundX) {
        ball.x = boundX;
        ball.vx = -ball.vx;
        playTone(300, 0.02, 'sine', 0.05);
      }
      if (ball.x > W - boundX) {
        ball.x = W - boundX;
        ball.vx = -ball.vx;
        playTone(300, 0.02, 'sine', 0.05);
      }
      if (ball.y < boundY) {
        ball.y = boundY;
        ball.vy = -ball.vy;
        playTone(300, 0.02, 'sine', 0.05);
      }
      if (ball.y > H - boundY) {
        ball.y = H - boundY;
        ball.vy = -ball.vy;
        playTone(300, 0.02, 'sine', 0.05);
      }

      // Pocket entry check
      pockets.forEach(pocket => {
        const dx = ball.x - pocket.x;
        const dy = ball.y - pocket.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= pocket.radius) {
          ball.active = false;
          ball.vx = 0;
          ball.vy = 0;

          if (ball.isCue) {
            // Scratch cue ball! respawn it
            setTimeout(() => {
              ball.x = 100;
              ball.y = H / 2;
              ball.active = true;
              toast.error('Scratch! Cue ball respawned.');
            }, 1000);
            playTone(200, 0.2, 'sawtooth', 0.15);
          } else {
            setScore(s => s + 100);
            playTone(800, 0.08, 'sine', 0.18);
            toast.success('Ball Pocketed! +100 pts');

            // Check win condition
            const targetBallsLeft = balls.current.some(b => !b.isCue && b.active);
            if (!targetBallsLeft) {
              setWon(true);
              setIsPlaying(false);
              playTone(523, 0.15, 'sine', 0.2);
              toast.success('🥇 Table Cleared!');
            }
          }
        }
      });
    });

    // 3. Rigid body elastic collisions (ball to ball)
    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        const b1 = activeBalls[i];
        const b2 = activeBalls[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ballRadius * 2) {
          // Push apart to prevent overlap lock
          const overlap = ballRadius * 2 - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5;
          b2.y += ny * overlap * 0.5;

          // Simple elastic collision vector velocity swap
          const kx = b1.vx - b2.vx;
          const ky = b1.vy - b2.vy;
          const p = nx * kx + ny * ky;

          b1.vx -= nx * p;
          b1.y -= ny * p;
          b2.vx += nx * p;
          b2.vy += ny * p;

          playTone(500, 0.03, 'sine', 0.08);
          vibrate(15);
        }
      }
    }

    // 4. Render balls
    activeBalls.forEach(ball => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.strokeStyle = '#022c22';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 5. Draw cue stick guide line (if all balls stopped)
    const anyMoving = activeBalls.some(b => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);
    const cueBall = activeBalls.find(b => b.isCue);
    if (!anyMoving && cueBall) {
      // Guide direction line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(cueBall.x + Math.cos(cueAngle.current) * 80, cueBall.y + Math.sin(cueAngle.current) * 80);
      ctx.stroke();

      // Cue stick draw
      const stickLength = 70;
      const distFromBall = 15;
      const sx = cueBall.x - Math.cos(cueAngle.current) * (distFromBall + stickLength);
      const sy = cueBall.y - Math.sin(cueAngle.current) * (distFromBall + stickLength);
      const ex = cueBall.x - Math.cos(cueAngle.current) * distFromBall;
      const ey = cueBall.y - Math.sin(cueAngle.current) * distFromBall;

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    rAFRef.current = requestAnimationFrame(updateLoop);
  };

  useEffect(() => {
    if (isPlaying && !gameOver) {
      rAFRef.current = requestAnimationFrame(updateLoop);
    }
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0d1e3d 100%)' }}>
      
      {/* Settings & controls Card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase tracking-widest">
              8-Ball Pool
            </h2>
            <Target size={16} className="text-emerald-400" />
          </div>

          {/* Cue stick angle controllers */}
          <div className="space-y-1.5">
            <span className="text-2xs text-slate-400 font-bold uppercase">Cue Direction Angle</span>
            <input 
              type="range" 
              min="0" 
              max="6.28" 
              step="0.05"
              value={cueAngle.current}
              onChange={e => { cueAngle.current = parseFloat(e.target.value); playTone(500, 0.01, 'sine', 0.05); }}
              className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Cue strike power controller */}
          <div className="space-y-1.5">
            <span className="text-2xs text-slate-400 font-bold uppercase">Strike force</span>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="5"
              value={cuePower.current}
              onChange={e => { cuePower.current = parseInt(e.target.value); }}
              className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Total score:</span>
            <span className="text-yellow-400 font-bold">{score} pts</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">Strikes:</span>
            <span className="text-cyan-400 font-bold">{strikes} shots</span>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={initGame}>
              Start Match
            </Button>
          ) : (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={handleShoot}>
              <Zap size={14} className="mr-1.5 text-amber-400 animate-pulse" /> Strike Cue
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Table
          </Button>
        </div>
      </Card>

      {/* Main Table view */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>USE SLIDERS TO AIM AND STRIKE</span>
        </div>

        {isPlaying ? (
          <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block bg-slate-950"
            />
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {won ? (
              <>
                <RefreshCw size={36} className="text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-yellow-300">TABLE CLEARED</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Total Score: <span className="text-cyan-400 font-bold">{score} pts</span></p>
                  <p className="text-slate-400">Total Strikes: <span className="text-indigo-400 font-bold">{strikes}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={initGame}>
                  Play Again
                </Button>
              </>
            ) : (
              <>
                <Target size={36} className="text-emerald-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">8-Ball Pool</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use the sliders to adjust the cue stick angle and power. Pocket all colored target balls without scratching the cue ball!
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={initGame}>
                  Start Match
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
