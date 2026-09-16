import { useAIGameEngine } from '@/hooks/useAIGameEngine';
// src/components/games/SnakeGame.tsx
// Neon Snake – Canvas 2D, speed progression, power-ups, secure economy
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { secureRecordGameResult } from '@/lib/secureEconomy';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

const COLS = 20;
const ROWS = 20;
const BASE_SPEED = 150; // ms per tick

type Dir = 'U' | 'D' | 'L' | 'R';
type Pt = { x: number; y: number };
type PowerUp = Pt & { type: 'slow' | 'double' | 'ghost' };

function rand(max: number) { return Math.floor(Math.random() * max); }
function eq(a: Pt, b: Pt) { return a.x === b.x && a.y === b.y; }
function newFood(snake: Pt[]): Pt {
  let f: Pt;
  do { f = { x: rand(COLS), y: rand(ROWS) }; } while (snake.some(s => eq(s, f)));
  return f;
}

export default function SnakeGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pt[],
    dir: 'R' as Dir,
    nextDir: 'R' as Dir,
    food: { x: 15, y: 10 } as Pt,
    powerUp: null as PowerUp | null,
    score: 0,
    best: parseInt(localStorage.getItem('snake-best') || '0'),
    phase: 'idle' as 'idle' | 'playing' | 'dead',
    doublePoints: false,
    slowMode: false,
    ghostMode: false,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    tick: 0,
    powerUpTimer: 0,
  });
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const { profile } = useAuthStore();
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(parseInt(localStorage.getItem('snake-best') || '0'));

  const CELL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 20;
    return Math.floor(Math.min(canvas.width, canvas.height) / COLS);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const st = stateRef.current;
    const cell = CELL();
    const w = COLS * cell, h = ROWS * cell;

    // Background
    ctx.fillStyle = '#050d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0,240,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell); ctx.stroke();
    }

    // Particles
    st.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Food – pulsing red orb
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200);
    const foodX = st.food.x * cell + cell / 2;
    const foodY = st.food.y * cell + cell / 2;
    const grad = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, cell * 0.6 * pulse);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#ff4d4d');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(foodX, foodY, cell * 0.45 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Power-up
    if (st.powerUp) {
      const colors: Record<string, string> = { slow: '#60a5fa', double: '#fbbf24', ghost: '#a78bfa' };
      const px = st.powerUp.x * cell + cell / 2;
      const py = st.powerUp.y * cell + cell / 2;
      const spin = (Date.now() / 500) % (Math.PI * 2);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(spin);
      ctx.fillStyle = colors[st.powerUp.type];
      ctx.shadowColor = colors[st.powerUp.type];
      ctx.shadowBlur = 15;
      ctx.fillRect(-cell * 0.3, -cell * 0.3, cell * 0.6, cell * 0.6);
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // Snake
    st.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const ratio = i / st.snake.length;
      const alpha = 1 - ratio * 0.5;
      const sx = seg.x * cell;
      const sy = seg.y * cell;
      const pad = isHead ? 1 : 2;

      if (st.ghostMode) {
        ctx.globalAlpha = 0.4;
      }

      ctx.shadowBlur = isHead ? 20 : 8;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = isHead
        ? `rgba(0,240,255,${alpha})`
        : `rgba(0,200,230,${alpha * 0.85})`;
      ctx.beginPath();
      ctx.roundRect(sx + pad, sy + pad, cell - pad * 2, cell - pad * 2, isHead ? 6 : 3);
      ctx.fill();

      // Eyes on head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#050d1a';
        const [ex1, ey1, ex2, ey2] = {
          R: [sx + cell * 0.65, sy + cell * 0.3, sx + cell * 0.65, sy + cell * 0.7],
          L: [sx + cell * 0.25, sy + cell * 0.3, sx + cell * 0.25, sy + cell * 0.7],
          U: [sx + cell * 0.3, sy + cell * 0.25, sx + cell * 0.7, sy + cell * 0.25],
          D: [sx + cell * 0.3, sy + cell * 0.75, sx + cell * 0.7, sy + cell * 0.75],
        }[st.dir];
        const er = cell * 0.1;
        ctx.beginPath(); ctx.arc(ex1, ey1, er, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, er, 0, Math.PI * 2); ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h, canvas.width, canvas.height - h);
    ctx.fillStyle = '#00f0ff';
    ctx.font = `bold ${cell * 0.8}px monospace`;
    ctx.fillText(`SCORE: ${st.score}`, cell * 0.5, h + cell * 1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(`BEST: ${st.best}`, w - cell * 5.5, h + cell * 1.2);

    // Active power-up indicators
    if (st.doublePoints || st.slowMode || st.ghostMode) {
      let px2 = cell * 0.5;
      if (st.doublePoints) { ctx.fillStyle = '#fbbf24'; ctx.fillText('2X', px2, h + cell * 2.2); px2 += cell * 2; }
      if (st.slowMode) { ctx.fillStyle = '#60a5fa'; ctx.fillText('SLOW', px2, h + cell * 2.2); px2 += cell * 3; }
      if (st.ghostMode) { ctx.fillStyle = '#a78bfa'; ctx.fillText('GHOST', px2, h + cell * 2.2); }
    }
  }, [CELL]);

  const tick = useCallback(() => {
    const st = stateRef.current;
    if (st.phase !== 'playing') return;
    st.dir = st.nextDir;

    const head = st.snake[0];
    const next: Pt = {
      U: { x: head.x, y: head.y - 1 },
      D: { x: head.x, y: head.y + 1 },
      L: { x: head.x - 1, y: head.y },
      R: { x: head.x + 1, y: head.y },
    }[st.dir];

    // Wrap edges
    next.x = (next.x + COLS) % COLS;
    next.y = (next.y + ROWS) % ROWS;

    // Self collision (skip if ghost)
    if (!st.ghostMode && st.snake.some(s => eq(s, next))) {
      st.phase = 'dead';
      setPhase('dead');
      if (st.score > st.best) {
        st.best = st.score;
        localStorage.setItem('snake-best', String(st.score));
        setBest(st.score);
      }
      audio.play('snake', 'die');
      // Award tokens based on score
      if (profile) {
        const earned = st.score * 10;
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: earned, xpEarned: st.score })
          .catch(console.error);
        if (earned > 0) toast.success(`+${earned.toLocaleString()} Tokens earned!`);
      }
      return;
    }

    st.snake = [next, ...st.snake];

    // Spawn particles at old tail
    const tail = st.snake[st.snake.length - 1];
    const cell = CELL();
    for (let i = 0; i < 3; i++) {
      st.particles.push({
        x: tail.x * cell + cell / 2,
        y: tail.y * cell + cell / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        color: '#00f0ff',
      });
    }

    // Check food
    if (eq(next, st.food)) {
      const pts = st.doublePoints ? 20 : 10;
      st.score += pts;
      setScore(st.score);
      st.food = newFood(st.snake);
      audio.play('snake', 'eat');
      // Spawn power-up every 50 points
      if (st.score % 50 === 0 && !st.powerUp) {
        const types: PowerUp['type'][] = ['slow', 'double', 'ghost'];
        const type = types[rand(3)];
        let pu: Pt;
        do { pu = { x: rand(COLS), y: rand(ROWS) }; }
        while (st.snake.some(s => eq(s, pu)) || eq(pu, st.food));
        st.powerUp = { ...pu, type };
      }
    } else {
      st.snake.pop();
    }

    // Check power-up pickup
    if (st.powerUp && eq(next, st.powerUp)) {
      const type = st.powerUp.type;
      st.powerUp = null;
      st.powerUpTimer = Date.now();
      audio.playChime(800, 0.8, 0.5);
      if (type === 'slow') { st.slowMode = true; setTimeout(() => { stateRef.current.slowMode = false; }, 5000); }
      if (type === 'double') { st.doublePoints = true; setTimeout(() => { stateRef.current.doublePoints = false; }, 8000); }
      if (type === 'ghost') { st.ghostMode = true; setTimeout(() => { stateRef.current.ghostMode = false; }, 6000); }
      toast(`Power-up: ${type.toUpperCase()}!`, { icon: type === 'slow' ? '🧊' : type === 'double' ? '⚡' : '👻' });
    }

    // Decay particles
    st.particles = st.particles.filter(p => p.life > 0.05).map(p => ({
      ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.08,
    }));

    st.tick++;
  }, [CELL, profile]);

  const loop = useCallback((ts: number) => {
    const st = stateRef.current;
    if (st.phase !== 'playing') return;
    const speed = st.slowMode ? BASE_SPEED * 2 : Math.max(60, BASE_SPEED - Math.floor(st.score / 30) * 10);
    if (ts - lastTickRef.current >= speed) {
      tick();
      lastTickRef.current = ts;
    }
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [tick, draw]);

  const startGame = useCallback(() => {
    const st = stateRef.current;
    st.snake = [{ x: 10, y: 10 }];
    st.dir = 'R'; st.nextDir = 'R';
    st.food = { x: 15, y: 10 };
    st.powerUp = null;
    st.score = 0; st.tick = 0;
    st.doublePoints = false; st.slowMode = false; st.ghostMode = false;
    st.particles = [];
    st.phase = 'playing';
    setScore(0); setPhase('playing');
    lastTickRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // Keyboard
  useEffect(() => {
    const MAP: Record<string, Dir> = {
      ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
      w: 'U', s: 'D', a: 'L', d: 'R',
    };
    const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const handle = (e: KeyboardEvent) => {
      const dir = MAP[e.key];
      if (dir) {
        e.preventDefault();
        const st = stateRef.current;
        if (dir !== OPPOSITE[st.dir]) st.nextDir = dir;
      }
      if (e.key === ' ' && stateRef.current.phase !== 'playing') startGame();
    };
    window.addEventListener('keydown', handle);
    return () => { window.removeEventListener('keydown', handle); cancelAnimationFrame(rafRef.current); };
  }, [startGame]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(window.innerWidth - 32, window.innerHeight - 160, 440);
      canvas.width = size;
      canvas.height = size + 60;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  // D-pad
  const handleDir = (dir: Dir) => {
    const OPPOSITE: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const st = stateRef.current;
    if (st.phase === 'playing' && dir !== OPPOSITE[st.dir]) st.nextDir = dir;
  };

  return (
    <div className="min-h-screen bg-[#050d1a] flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md px-4 mb-4">
        <button onClick={onClose} className="text-white/40 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase">
          Neon Snake
        </h1>
        <button onClick={startGame} className="text-white/40 hover:text-cyan-400 transition-colors">
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 0 60px rgba(0,240,255,0.15)' }}>
        <canvas ref={canvasRef} className="block" />

        {/* Overlays */}
        <AnimatePresence>
          {phase !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              {phase === 'dead' ? (
                <>
                  <p className="text-red-400 text-5xl font-black mb-2">GAME OVER</p>
                  <p className="text-white/60 mb-1">Score: <span className="text-cyan-400 font-bold">{score}</span></p>
                  <p className="text-white/40 text-sm mb-8">Best: {best}</p>
                  <p className="text-white/40 text-sm mb-2">Tokens earned: <span className="text-yellow-400 font-bold">+{score * 10}</span></p>
                </>
              ) : (
                <>
                  <p className="text-cyan-400 text-4xl font-black mb-2 drop-shadow-[0_0_20px_rgba(0,240,255,0.5)]">NEON SNAKE</p>
                  <p className="text-white/40 text-sm mb-2">Eat food. Collect power-ups.</p>
                  <p className="text-white/30 text-xs mb-8">10 tokens per point</p>
                </>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg rounded-2xl shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-colors"
              >
                {phase === 'dead' ? 'PLAY AGAIN' : 'START GAME'}
              </motion.button>
              <p className="text-white/20 text-xs mt-3">Press SPACE or WASD / Arrow keys</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* D-Pad (mobile) */}
      <div className="mt-6 grid grid-cols-3 gap-2 w-36">
        <div />
        <button onClick={() => handleDir('U')} className="flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl h-12 transition-colors"><ArrowUp size={20} className="text-white" /></button>
        <div />
        <button onClick={() => handleDir('L')} className="flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl h-12 transition-colors"><ArrowLeft size={20} className="text-white" /></button>
        <button onClick={() => handleDir('D')} className="flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl h-12 transition-colors"><ArrowDown size={20} className="text-white" /></button>
        <button onClick={() => handleDir('R')} className="flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl h-12 transition-colors"><ArrowRight size={20} className="text-white" /></button>
      </div>

      {/* Power-up legend */}
      <div className="mt-4 flex gap-4 text-xs text-white/30">
        <span>🧊 Slow</span>
        <span>⚡ 2× Points</span>
        <span>👻 Ghost</span>
      </div>
    </div>
  );
}
