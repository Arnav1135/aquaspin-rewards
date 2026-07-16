// src/components/games/NinjaFruitGame.tsx
// Ninja Fruit — canvas-based fruit slicing game with blade trail

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NinjaFruitGameProps { onClose: () => void; }

type Fruit = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  emoji: string;
  color: string;
  isBomb: boolean;
  sliced: boolean;
  active: boolean;
};

type TrailPoint = { x: number; y: number; t: number };

export function NinjaFruitGame({ onClose }: NinjaFruitGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number>(0);
  const fruitsRef = useRef<Fruit[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const nextId = useRef(0);
  const spawnTimer = useRef(0);
  const lastTime = useRef(0);
  const gameActiveRef = useRef(false);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hiScore, setHiScore] = useState(() => parseInt(localStorage.getItem('ninja-hi') || '0'));

  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout>>();

  const W = 380, H = 420;
  const GRAVITY = 0.22;
  const FRUITS = [
    { emoji: '🍎', color: '#ef4444' },
    { emoji: '🍊', color: '#f97316' },
    { emoji: '🍋', color: '#eab308' },
    { emoji: '🍇', color: '#a855f7' },
    { emoji: '🍓', color: '#ec4899' },
    { emoji: '🥭', color: '#f59e0b' },
    { emoji: '🍉', color: '#22c55e' },
  ];

  const spawnFruit = () => {
    const isBomb = Math.random() < 0.12;
    const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const x = 40 + Math.random() * (W - 80);
    const vy = -(6 + Math.random() * 5);
    const mx = (Math.random() - 0.5) * 3;

    fruitsRef.current.push({
      id: nextId.current++,
      x, y: H + 20,
      vx: mx, vy,
      radius: 24,
      emoji: isBomb ? '💣' : fruit.emoji,
      color: isBomb ? '#374151' : fruit.color,
      isBomb,
      sliced: false,
      active: true,
    });
  };

  const checkSlice = useCallback((trail: TrailPoint[]) => {
    if (trail.length < 2) return;
    const p1 = trail[trail.length - 2];
    const p2 = trail[trail.length - 1];
    let slicedCount = 0;

    fruitsRef.current.forEach(fruit => {
      if (!fruit.active || fruit.sliced) return;
      // Check if trail segment intersects fruit circle
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const fx = fruit.x - p1.x;
      const fy = fruit.y - p1.y;
      const t = Math.max(0, Math.min(1, (fx * dx + fy * dy) / (dx * dx + dy * dy)));
      const cx = p1.x + t * dx - fruit.x;
      const cy = p1.y + t * dy - fruit.y;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (dist <= fruit.radius) {
        fruit.sliced = true;
        fruit.active = false;
        slicedCount++;

        if (fruit.isBomb) {
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          comboRef.current = 0;
          playTone(150, 0.25, 'sawtooth', 0.2);
          vibrate(100);
          toast.error('💣 Bomb! -1 Life');
          if (livesRef.current <= 0) endGame();
        } else {
          const pts = 10 * (1 + comboRef.current);
          scoreRef.current += pts;
          setScore(scoreRef.current);
          playTone(600 + comboRef.current * 50, 0.05, 'sine', 0.1);
          vibrate(15);
        }
      }
    });

    if (slicedCount > 0 && !fruitsRef.current.find(f => f.isBomb && f.sliced)) {
      clearTimeout(comboTimer.current);
      comboRef.current += slicedCount;
      comboTimer.current = setTimeout(() => {
        comboRef.current = 0;
      }, 1200);
    }
  }, []);

  const endGame = useCallback(() => {
    gameActiveRef.current = false;
    setIsPlaying(false);
    setGameOver(true);
    const hi = Math.max(scoreRef.current, parseInt(localStorage.getItem('ninja-hi') || '0'));
    localStorage.setItem('ninja-hi', String(hi));
    setHiScore(hi);
    playTone(220, 0.2, 'sawtooth', 0.3);
    toast.error('Game Over!');
  }, []);

  const loop = useCallback((timestamp: number) => {
    if (!gameActiveRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = timestamp - lastTime.current;
    lastTime.current = timestamp;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background — vivid, game-specific — isolated from app chrome by GameFrame
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0a2e');
    bg.addColorStop(1, '#2d1b69');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Spawn
    spawnTimer.current += dt;
    if (spawnTimer.current > 900) {
      spawnFruit();
      spawnTimer.current = 0;
    }

    // Update fruits
    fruitsRef.current.forEach(fruit => {
      if (!fruit.active) return;
      fruit.vy += GRAVITY;
      fruit.x += fruit.vx;
      fruit.y += fruit.vy;

      // Missed fruit (fell below canvas)
      if (fruit.y > H + 50) {
        fruit.active = false;
        if (!fruit.isBomb && !fruit.sliced) {
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          if (livesRef.current <= 0) endGame();
        }
      }

      // Draw fruit
      ctx.font = `${fruit.radius * 1.6}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, fruit.x, fruit.y);
    });

    // Draw blade trail
    const now = Date.now();
    trailRef.current = trailRef.current.filter(p => now - p.t < 300);

    if (trailRef.current.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
      trailRef.current.forEach((p, i) => {
        if (i > 0) ctx.lineTo(p.x, p.y);
      });
      const age = (now - trailRef.current[0].t) / 300;
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - age})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // HUD — score / lives / combo
    ctx.font = 'bold 18px Poppins, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`⚡ ${scoreRef.current}`, 12, 24);

    ctx.textAlign = 'right';
    const hearts = '♥'.repeat(livesRef.current) + '♡'.repeat(3 - livesRef.current);
    ctx.fillStyle = '#F76C6C';
    ctx.fillText(hearts, W - 12, 24);

    if (comboRef.current > 1) {
      ctx.font = 'bold 24px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`COMBO ×${comboRef.current}!`, W / 2, H / 2 - 30);
    }

    rAFRef.current = requestAnimationFrame(loop);
  }, [endGame]);

  const startGame = () => {
    fruitsRef.current = [];
    trailRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    spawnTimer.current = 0;
    setScore(0);
    setLives(3);

    setGameOver(false);
    setIsPlaying(true);
    gameActiveRef.current = true;
    lastTime.current = performance.now();
    rAFRef.current = requestAnimationFrame(loop);
    playTone(550, 0.06, 'sine', 0.15);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const pt: TrailPoint = { x, y, t: Date.now() };
    trailRef.current.push(pt);
    checkSlice(trailRef.current);
  }, [isPlaying, checkSlice]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isPlaying) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    Array.from(e.changedTouches).forEach(touch => {
      const x = (touch.clientX - rect.left) * (W / rect.width);
      const y = (touch.clientY - rect.top) * (H / rect.height);
      const pt: TrailPoint = { x, y, t: Date.now() };
      trailRef.current.push(pt);
      checkSlice(trailRef.current);
    });
  }, [isPlaying, checkSlice]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rAFRef.current);
      gameActiveRef.current = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 p-4 max-w-xl mx-auto">
      {/* Controls row */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="flex flex-col items-center">
          <span className="text-2xs font-semibold" style={{ color: 'rgba(22,33,62,0.50)' }}>SCORE</span>
          <span className="font-bold text-xl font-mono" style={{ color: '#16213E' }}>{score}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xs font-semibold" style={{ color: 'rgba(22,33,62,0.50)' }}>BEST</span>
          <span className="font-bold text-xl font-mono" style={{ color: '#4A90D9' }}>{hiScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xs font-semibold" style={{ color: 'rgba(22,33,62,0.50)' }}>LIVES</span>
          <span className="font-bold text-base" style={{ color: '#F76C6C' }}>
            {'♥'.repeat(lives)}{'♡'.repeat(3 - lives)}
          </span>
        </div>
      </div>

      {/* Canvas — visually isolated, vivid game background stays within bounds */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(22,33,62,0.20)' }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          style={{ display: 'block', cursor: isPlaying ? 'crosshair' : 'default', touchAction: 'none' }}
        />
      </div>

      {/* Start / Game Over overlay rendered outside canvas */}
      {!isPlaying && (
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {gameOver && (
            <p className="font-bold text-lg" style={{ color: '#F76C6C' }}>
              Game Over! Score: {score}
            </p>
          )}
          <Button variant="primary" onClick={startGame}>
            {gameOver ? '🔄 Play Again' : '🥷 Start Slicing'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
        </motion.div>
      )}
    </div>
  );
}
