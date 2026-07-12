// src/components/games/PlinkoGame.tsx
// Canvas-based Plinko game with dynamic physics and customizable risk/rows

import { useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PlinkoGameProps {
  onClose: () => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

// Multipliers for different risks/rows (Example for 8 rows)
const PLINKO_MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    12: [10.0, 5.0, 2.0, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2.0, 5.0, 10.0]
  },
  medium: {
    8: [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
    10: [22.0, 5.0, 2.0, 1.4, 0.9, 0.4, 0.9, 1.4, 2.0, 5.0, 22.0],
    12: [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0]
  },
  high: {
    8: [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0],
    10: [76.0, 10.0, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10.0, 76.0],
    12: [170.0, 33.0, 11.0, 4.0, 2.0, 0.2, 0.2, 0.2, 2.0, 4.0, 11.0, 33.0, 170.0]
  }
};

type Ball = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  targetCol: number; // path chosen
  path: number[]; // directions chosen (left=0, right=1)
  bounceStep: number;
  active: boolean;
};

export function PlinkoGame({ onClose }: PlinkoGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [rows, setRows] = useState<number>(8);
  const [dropping, setDropping] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const requestRef = useRef<number | null>(null);

  const balance = profile?.tokens ?? 0;
  const multipliers = PLINKO_MULTIPLIERS[risk][rows] || PLINKO_MULTIPLIERS[risk][8];

  const handleDropBall = async () => {
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }
    if (betAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }

    setDropping(true);

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Generate Path
    // N rows, at each peg choose left (0) or right (1)
    const path: number[] = [];
    let rightCount = 0;
    for (let r = 0; r < rows; r++) {
      const dir = Math.random() < 0.5 ? 0 : 1;
      path.push(dir);
      if (dir === 1) rightCount++;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create physics ball
    const startX = canvas.width / 2;
    const startY = 30;

    const newBall: Ball = {
      id: Date.now() + Math.random(),
      x: startX,
      y: startY,
      vx: 0,
      vy: 1.5,
      row: 0,
      targetCol: rightCount,
      path,
      bounceStep: 0,
      active: true,
    };

    ballsRef.current.push(newBall);
    playTone(450, 0.05, 'sine', 0.1);
  };

  const updateBallPhysics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    // Grid details
    const startY = 60;
    const rowSpacing = (h - 100) / rows;

    ballsRef.current.forEach(async (ball) => {
      if (!ball.active) return;

      // Peg coordinate lookup
      const targetY = startY + ball.row * rowSpacing;

      if (ball.y < targetY) {
        // Ball falls towards the next peg row
        ball.y += ball.vy;
        ball.x += ball.vx;
        ball.vy += 0.08; // Gravity
      } else {
        // Collide/bounce on peg
        if (ball.row < rows) {
          const _dir = ball.path[ball.row]; void _dir;
          ball.row++;

          // Adjust velocity to simulate physics bounce left/right
          // peg spacing decreases/increases based on row width
          const rowWidth = ball.row * 24;
          const targetX = w / 2 - rowWidth / 2 + ball.path.slice(0, ball.row).reduce((a, b) => a + b, 0) * 24;

          ball.vx = (targetX - ball.x) / 10;
          ball.vy = 2; // Bounce down velocity
          playTone(600 + ball.row * 20, 0.02, 'sine', 0.08);
          vibrate(5);
        } else {
          // Reached bottom multiplier buckets!
          ball.active = false;
          setDropping(false);

          // Get multiplier
          const mult = multipliers[ball.targetCol];
          const won = Math.floor(betAmount * mult);

          // Remove ball from array
          ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id);

          if (mult >= 1.0) {
            toast.success(`Plinko hit! +${won} tokens (${mult}x) 🔴`);
            playTone(523.25, 0.1, 'sine', 0.25);
            vibrate([50, 50, 100]);
          } else {
            toast.error(`Hit ${mult}x. Lost tokens.`);
            playTone(180, 0.2, 'sawtooth', 0.15);
          }

          const finalBalance = balance + won; // bet already deducted
          if (profile && !profile.id.startsWith('guest')) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('users') as any).update({
                tokens: finalBalance,
                total_earned: profile.total_earned + (won - betAmount > 0 ? (won - betAmount) : 0),
                xp: profile.xp + Math.floor(betAmount * 0.1),
              }).eq('id', profile.id);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('game_stats') as any).upsert({
                user_id: profile.id,
                games_played: 1,
                games_won: mult >= 1.0 ? 1 : 0,
              });
            } catch {}
          }
          updateProfile({ tokens: finalBalance });
        }
      }
    });

    drawPlinkoBoard();
    requestRef.current = requestAnimationFrame(updateBallPhysics);
  };

  const drawPlinkoBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw pegs (triangle)
    const startY = 60;
    const rowSpacing = (h - 100) / rows;

    for (let r = 0; r <= rows; r++) {
      const rowY = startY + r * rowSpacing;
      const count = r + 3; // pegs in this row
      const pegSpacing = 24;
      const rowWidth = (count - 1) * pegSpacing;

      for (let c = 0; c < count; c++) {
        const x = w / 2 - rowWidth / 2 + c * pegSpacing;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.arc(x, rowY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw multiplier buckets at the bottom
    const bucketY = h - 35;
    const bucketSpacing = 24;
    const totalBuckets = rows + 1;
    const totalWidth = (totalBuckets - 1) * bucketSpacing;

    multipliers.forEach((mult, i) => {
      const x = w / 2 - totalWidth / 2 + i * bucketSpacing;

      // Color coding buckets based on payout size
      ctx.fillStyle = mult >= 10 ? 'rgba(239, 68, 68, 0.2)' :
                      mult >= 2.0 ? 'rgba(245, 158, 11, 0.2)' :
                      mult >= 1.0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.3)';

      ctx.strokeStyle = mult >= 10 ? '#EF4444' :
                        mult >= 2.0 ? '#F59E0B' :
                        mult >= 1.0 ? '#10B981' : '#334155';

      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - 10, bucketY, 20, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Multiplier label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '2xs font-mono font-bold';
      ctx.textAlign = 'center';
      ctx.fillText(`${mult >= 10 ? Math.floor(mult) : mult}x`, x, bucketY + 13);
    });

    // Draw active Plinko balls
    ballsRef.current.forEach((ball) => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FF0055';
      ctx.fillStyle = '#FF0055';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  };

  useEffect(() => {
    // Start animation loop
    requestRef.current = requestAnimationFrame(updateBallPhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [multipliers]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={dropping}
          />

          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Risk Level</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                <Button
                  key={r}
                  variant={risk === r ? 'primary' : 'ghost'}
                  disabled={dropping}
                  onClick={() => {
                    setRisk(r);
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-2 text-xs rounded-xl capitalize ${risk === r ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Rows</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[8, 10, 12].map((num) => (
                <Button
                  key={num}
                  variant={rows === num ? 'primary' : 'ghost'}
                  disabled={dropping}
                  onClick={() => {
                    setRows(num);
                    playTone(400, 0.05, 'sine', 0.1);
                  }}
                  className={`py-2 text-xs rounded-xl ${rows === num ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
            disabled={betAmount <= 0 || betAmount > balance}
            onClick={handleDropBall}
          >
            Drop Ball
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Visual stage */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[380px] bg-navy-900/50 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        {/* Help Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 2% to 4%</span>
        </div>

        {/* Plinko board canvas */}
        <canvas
          ref={canvasRef}
          width={400}
          height={320}
          className="w-full h-[320px] max-w-sm"
        />
      </Card>
    </div>
  );
}


