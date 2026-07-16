// src/components/games/CarromGame.tsx
// Carrom — physics-based striker mechanic with coin friction simulation

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CarromGameProps { onClose: () => void; }

type Disc = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isStriker: boolean;
  pocketed: boolean;
  mass: number;
};

export function CarromGame({ onClose }: CarromGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number>(0);
  const discsRef = useRef<Disc[]>([]);
  const gameActiveRef = useRef(false);

  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [won, setWon] = useState(false);

  const [aimAngle, setAimAngle] = useState(Math.PI / 2);
  const [power, setPower] = useState(50);
  const [canShoot, setCanShoot] = useState(true);

  const scoreRef = useRef(0);
  const canShootRef = useRef(true);

  const W = 380, H = 380;
  const BOARD_PAD = 30;
  const POCKET_R = 16;
  const FRICTION = 0.988;

  const POCKETS = [
    { x: BOARD_PAD, y: BOARD_PAD },
    { x: W - BOARD_PAD, y: BOARD_PAD },
    { x: BOARD_PAD, y: H - BOARD_PAD },
    { x: W - BOARD_PAD, y: H - BOARD_PAD },
  ];

  const COIN_LAYOUT = [
    // Queen (red)
    { id: 0, x: W/2, y: H/2, color: '#ef4444', isStriker: false },
    // Black coins
    { id: 1, x: W/2 - 22, y: H/2,      color: '#1e293b', isStriker: false },
    { id: 2, x: W/2 + 22, y: H/2,      color: '#1e293b', isStriker: false },
    { id: 3, x: W/2, y: H/2 - 22,      color: '#1e293b', isStriker: false },
    { id: 4, x: W/2, y: H/2 + 22,      color: '#1e293b', isStriker: false },
    // White coins
    { id: 5, x: W/2 - 22, y: H/2 - 22, color: '#e2e8f0', isStriker: false },
    { id: 6, x: W/2 + 22, y: H/2 - 22, color: '#e2e8f0', isStriker: false },
    { id: 7, x: W/2 - 22, y: H/2 + 22, color: '#e2e8f0', isStriker: false },
    { id: 8, x: W/2 + 22, y: H/2 + 22, color: '#e2e8f0', isStriker: false },
    // Striker
    { id: 9, x: W/2, y: H - 60, color: '#4A90D9', isStriker: true },
  ];

  const initDiscs = (): Disc[] =>
    COIN_LAYOUT.map(c => ({
      ...c,
      vx: 0, vy: 0,
      radius: c.isStriker ? 14 : 10,
      pocketed: false,
      mass: c.isStriker ? 1.8 : 1,
    }));

  const startGame = () => {
    discsRef.current = initDiscs();
    scoreRef.current = 0;
    setScore(0);

    setWon(false);
    setIsPlaying(true);
    setCanShoot(true);
    canShootRef.current = true;
    gameActiveRef.current = true;
    rAFRef.current = requestAnimationFrame(loop);
    playTone(500, 0.05, 'sine', 0.12);
  };

  const shoot = useCallback(() => {
    if (!canShootRef.current || !isPlaying) return;
    const striker = discsRef.current.find(d => d.isStriker && !d.pocketed);
    if (!striker) return;

    const force = (power / 100) * 14;
    striker.vx = Math.cos(aimAngle) * force;
    striker.vy = Math.sin(aimAngle) * force;

    setCanShoot(false);
    canShootRef.current = false;
    playTone(350, 0.08, 'sine', 0.2);
    vibrate(25);
  }, [aimAngle, power, isPlaying]);

  const loop = useCallback(() => {
    if (!gameActiveRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // Draw board
    ctx.fillStyle = '#f5deb3'; // Carrom board wood color
    ctx.fillRect(0, 0, W, H);

    // Board border lines
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_PAD, BOARD_PAD, W - BOARD_PAD*2, H - BOARD_PAD*2);

    // Center circle
    ctx.beginPath();
    ctx.arc(W/2, H/2, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139,69,19,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pockets
    POCKETS.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
    });

    // Striker guide line
    const striker = discsRef.current.find(d => d.isStriker && !d.pocketed);
    if (striker && canShootRef.current) {
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(striker.x, striker.y);
      ctx.lineTo(striker.x + Math.cos(aimAngle) * 80, striker.y + Math.sin(aimAngle) * 80);
      ctx.strokeStyle = 'rgba(74,144,217,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Update physics
    let anyMoving = false;
    discsRef.current.forEach(disc => {
      if (disc.pocketed) return;
      disc.x += disc.vx;
      disc.y += disc.vy;
      disc.vx *= FRICTION;
      disc.vy *= FRICTION;

      if (Math.abs(disc.vx) > 0.05 || Math.abs(disc.vy) > 0.05) anyMoving = true;

      // Cushion rebounds
      const minX = BOARD_PAD + disc.radius;
      const maxX = W - BOARD_PAD - disc.radius;
      const minY = BOARD_PAD + disc.radius;
      const maxY = H - BOARD_PAD - disc.radius;

      if (disc.x < minX) { disc.x = minX; disc.vx = -disc.vx * 0.8; playTone(250, 0.02, 'sine', 0.05); }
      if (disc.x > maxX) { disc.x = maxX; disc.vx = -disc.vx * 0.8; playTone(250, 0.02, 'sine', 0.05); }
      if (disc.y < minY) { disc.y = minY; disc.vy = -disc.vy * 0.8; playTone(250, 0.02, 'sine', 0.05); }
      if (disc.y > maxY) { disc.y = maxY; disc.vy = -disc.vy * 0.8; playTone(250, 0.02, 'sine', 0.05); }

      // Pocket check
      POCKETS.forEach(p => {
        const dx = disc.x - p.x;
        const dy = disc.y - p.y;
        if (Math.sqrt(dx*dx + dy*dy) <= POCKET_R + disc.radius / 2) {
          disc.pocketed = true;
          disc.vx = 0;
          disc.vy = 0;

          if (disc.isStriker) {
            // Foul! Respawn striker
            setTimeout(() => {
              disc.x = W/2; disc.y = H - 60;
              disc.pocketed = false;
              toast.error('Striker pocketed! Foul!');
            }, 1000);
          } else {
            const pts = disc.color === '#ef4444' ? 5 : disc.color === '#1e293b' ? 3 : 2;
            scoreRef.current += pts;
            setScore(scoreRef.current);
            playTone(700, 0.07, 'sine', 0.15);
            vibrate(20);
          }
        }
      });

      // Disc-to-disc collisions
      discsRef.current.forEach(other => {
        if (other.id === disc.id || other.pocketed) return;
        const dx = other.x - disc.x;
        const dy = other.y - disc.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = disc.radius + other.radius;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          disc.x -= nx * overlap * 0.5;
          disc.y -= ny * overlap * 0.5;
          other.x += nx * overlap * 0.5;
          other.y += ny * overlap * 0.5;

          // Elastic collision
          const dvx = disc.vx - other.vx;
          const dvy = disc.vy - other.vy;
          const dot = dvx * nx + dvy * ny;
          const m1 = disc.mass, m2 = other.mass;
          const imp = (2 * dot) / (m1 + m2);
          disc.vx -= imp * m2 * nx;
          disc.vy -= imp * m2 * ny;
          other.vx += imp * m1 * nx;
          other.vy += imp * m1 * ny;
          playTone(450, 0.02, 'sine', 0.06);
        }
      });

      // Draw disc
      ctx.beginPath();
      ctx.arc(disc.x, disc.y, disc.radius, 0, Math.PI * 2);
      ctx.fillStyle = disc.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Enable shooting when all discs stopped
    if (!anyMoving && !canShootRef.current) {
      canShootRef.current = true;
      setCanShoot(true);
    }

    // Check win (all coins pocketed)
    const remaining = discsRef.current.filter(d => !d.pocketed && !d.isStriker);
    if (remaining.length === 0 && isPlaying) {
      gameActiveRef.current = false;
      setWon(true);
      setIsPlaying(false);
      playTone(700, 0.15, 'sine', 0.3);
      toast.success('🏆 Table Cleared!');
      return;
    }

    rAFRef.current = requestAnimationFrame(loop);
  }, [aimAngle, power, isPlaying]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rAFRef.current);
      gameActiveRef.current = false;
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-5 p-4 max-w-4xl mx-auto items-start">
      {/* Canvas board */}
      <div
        className="rounded-2xl overflow-hidden flex-shrink-0"
        style={{ boxShadow: '0 8px 32px rgba(22,33,62,0.18)' }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: 'block' }}
        />
      </div>

      {/* Controls */}
      <div className="w-full lg:w-64 space-y-4">
        <div className="card-navy on-navy p-4 rounded-2xl">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold font-mono" style={{ color: '#3DDC97' }}>{score}</div>
            <div className="text-2xs" style={{ color: 'rgba(245,248,252,0.50)' }}>points scored</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-2xs font-semibold block mb-1" style={{ color: 'rgba(245,248,252,0.60)' }}>
                AIM ANGLE
              </label>
              <input
                type="range"
                min="0"
                max="6.28"
                step="0.05"
                value={aimAngle}
                onChange={e => setAimAngle(parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: '#4A90D9' }}
              />
            </div>
            <div>
              <label className="text-2xs font-semibold block mb-1" style={{ color: 'rgba(245,248,252,0.60)' }}>
                STRIKE POWER
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={power}
                onChange={e => setPower(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: '#3DDC97' }}
              />
            </div>
          </div>
        </div>

        {isPlaying && (
          <Button
            variant="sky"
            fullWidth
            onClick={shoot}
            disabled={!canShoot}
          >
            {canShoot ? '⚡ Strike!' : 'Wait...'}
          </Button>
        )}

        {!isPlaying && (
          <Button variant="primary" fullWidth onClick={startGame}>
            {won ? '🔄 Play Again' : '🎯 Start Game'}
          </Button>
        )}

        <Button variant="ghost" fullWidth size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
