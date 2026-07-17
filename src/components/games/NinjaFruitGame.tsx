// src/components/games/NinjaFruitGame.tsx — Premium Fruit Ninja Clone
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Fruit = { id: number; x: number; y: number; vx: number; vy: number; emoji: string; color: string; r: number; active: boolean; sliced: boolean; isBomb: boolean };
type TrailPt = { x: number; y: number; t: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number };
type Star = { x: number; y: number; r: number; blink: number };

const FRUITS = [
  { emoji: '🍉', color: '#e74c3c' }, { emoji: '🍊', color: '#e67e22' },
  { emoji: '🍋', color: '#f1c40f' }, { emoji: '🍇', color: '#9b59b6' },
  { emoji: '🍓', color: '#e74c3c' }, { emoji: '🥭', color: '#f39c12' },
  { emoji: '🍎', color: '#c0392b' }, { emoji: '🍑', color: '#e67e22' },
];

export function NinjaFruitGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle' | 'playing' | 'dead',
    fruits: [] as Fruit[], trail: [] as TrailPt[], particles: [] as Particle[],
    stars: [] as Star[], score: 0, lives: 3, combo: 0, comboTimer: 0,
    spawnTimer: 0, frame: 0, nextId: 0, lastTime: 0,
    best: parseInt(localStorage.getItem('nf-best') || '0'),
    flashRed: 0,
  });
  const [disp, setDisp] = useState({ score: 0, lives: 3, phase: 'idle' as 'idle'|'playing'|'dead', best: parseInt(localStorage.getItem('nf-best')||'0') });
  const W = 380, H = 500;

  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 3 + Math.random() * 6;
      s.current.particles.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-2, life: 1, color, r: 3+Math.random()*4 });
    }
  };

  const startGame = useCallback(() => {
    const gs = s.current;
    gs.phase = 'playing'; gs.fruits = []; gs.trail = []; gs.particles = [];
    gs.score = 0; gs.lives = 3; gs.combo = 0; gs.spawnTimer = 0; gs.frame = 0;
    gs.flashRed = 0; gs.lastTime = performance.now();
    setDisp(d => ({ ...d, score: 0, lives: 3, phase: 'playing' }));
    playTone(500, 0.05, 'sine', 0.1);
  }, []);

  const endGame = useCallback(() => {
    const gs = s.current;
    gs.phase = 'dead';
    const newBest = Math.max(gs.score, gs.best);
    gs.best = newBest;
    localStorage.setItem('nf-best', String(newBest));
    setDisp({ score: gs.score, lives: gs.lives, phase: 'dead', best: newBest });
    playTone(180, 0.2, 'sawtooth', 0.3); vibrate(150);
    toast.error(`Game Over! Score: ${gs.score}`);
  }, []);

  const checkSlice = useCallback((trail: TrailPt[]) => {
    if (trail.length < 2) return;
    const gs = s.current;
    const p1 = trail[trail.length - 2], p2 = trail[trail.length - 1];
    let slicedCount = 0;
    gs.fruits.forEach(fruit => {
      if (!fruit.active || fruit.sliced) return;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const fx = fruit.x - p1.x, fy = fruit.y - p1.y;
      const t = Math.max(0, Math.min(1, (fx*dx+fy*dy)/(dx*dx+dy*dy||1)));
      const cx = p1.x+t*dx - fruit.x, cy = p1.y+t*dy - fruit.y;
      if (Math.sqrt(cx*cx+cy*cy) <= fruit.r) {
        fruit.sliced = true; fruit.active = false; slicedCount++;
        if (fruit.isBomb) {
          gs.flashRed = 20;
          gs.lives = Math.max(0, gs.lives - 1);
          gs.combo = 0;
          setDisp(d => ({ ...d, lives: gs.lives }));
          playTone(150, 0.2, 'sawtooth', 0.25); vibrate(100);
          spawnParticles(fruit.x, fruit.y, '#ff0000', 8);
          toast.error('💣 Bomb! -1 Life');
          if (gs.lives <= 0) { setTimeout(endGame, 300); }
        } else {
          const pts = 10 * (1 + Math.floor(gs.combo * 0.5));
          gs.score += pts;
          setDisp(d => ({ ...d, score: gs.score }));
          spawnParticles(fruit.x, fruit.y, fruit.color, 10);
          playTone(550 + gs.combo * 30, 0.05, 'sine', 0.1); vibrate(15);
        }
      }
    });
    if (slicedCount > 0) {
      gs.combo += slicedCount;
      gs.comboTimer = 90;
      if (slicedCount >= 2) { toast.success(`🔥 ${slicedCount}x Combo!`, { duration: 800 }); }
    }
  }, [endGame]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const gs = s.current;
    gs.stars = Array.from({ length: 50 }, () => ({ x: Math.random()*W, y: Math.random()*H, r: 0.5+Math.random()*1.5, blink: Math.random()*100 }));

    let mouseDown = false;
    const addTrailPt = (x: number, y: number) => {
      if (gs.phase !== 'playing') return;
      gs.trail.push({ x, y, t: Date.now() });
      if (gs.trail.length > 12) gs.trail.shift();
      checkSlice(gs.trail);
    };
    const onMouseMove = (e: MouseEvent) => { if (!mouseDown) return; const r = canvas.getBoundingClientRect(); addTrailPt((e.clientX-r.left)*(W/r.width), (e.clientY-r.top)*(H/r.height)); };
    const onMouseDown = (e: MouseEvent) => { mouseDown = true; const r = canvas.getBoundingClientRect(); addTrailPt((e.clientX-r.left)*(W/r.width), (e.clientY-r.top)*(H/r.height)); };
    const onMouseUp = () => { mouseDown = false; gs.trail = []; };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; const r = canvas.getBoundingClientRect(); addTrailPt((t.clientX-r.left)*(W/r.width), (t.clientY-r.top)*(H/r.height)); };
    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); };
    const onTouchEnd = () => { gs.trail = []; };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - gs.lastTime) / 16, 3);
      gs.lastTime = timestamp;
      gs.frame++;

      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a0a1a'); bg.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Red flash
      if (gs.flashRed > 0) {
        ctx.fillStyle = `rgba(255,0,0,${gs.flashRed / 20 * 0.35})`;
        ctx.fillRect(0, 0, W, H);
        gs.flashRed -= dt;
      }

      // Stars
      gs.stars.forEach(star => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin((gs.frame + star.blink) * 0.04));
        ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
      });

      if (gs.phase === 'playing') {
        // Spawn fruits
        gs.spawnTimer += dt;
        const spawnInterval = Math.max(40, 80 - gs.score * 0.3);
        if (gs.spawnTimer >= spawnInterval) {
          gs.spawnTimer = 0;
          const isBomb = Math.random() < 0.12;
          const f = FRUITS[Math.floor(Math.random() * FRUITS.length)];
          const x = 50 + Math.random() * (W - 100);
          gs.fruits.push({
            id: gs.nextId++, x, y: H + 30,
            vx: (Math.random()-0.5)*4,
            vy: -(8 + Math.random()*5),
            emoji: isBomb ? '💣' : f.emoji,
            color: isBomb ? '#555' : f.color,
            r: 28, active: true, sliced: false, isBomb,
          });
        }

        // Update & draw fruits
        gs.fruits.forEach(fruit => {
          if (!fruit.active) return;
          fruit.vy += 0.25 * dt;
          fruit.x += fruit.vx * dt;
          fruit.y += fruit.vy * dt;
          if (fruit.y > H + 60) {
            fruit.active = false;
            if (!fruit.isBomb && !fruit.sliced) {
              gs.lives = Math.max(0, gs.lives - 1);
              setDisp(d => ({ ...d, lives: gs.lives }));
              if (gs.lives <= 0) { setTimeout(endGame, 300); }
            }
          }
          ctx.font = `${fruit.r * 1.6}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fruit.emoji, fruit.x, fruit.y);
        });
        gs.fruits = gs.fruits.filter(f => f.active || f.sliced && gs.frame < 10);

        // Combo timer
        if (gs.comboTimer > 0) gs.comboTimer -= dt;
        else gs.combo = 0;
      }

      // Particles
      gs.particles.forEach((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.25 * dt; p.life -= 0.04 * dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life * 200).toString(16).padStart(2,'0');
        ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Slash trail
      if (gs.trail.length > 1) {
        const now = Date.now();
        ctx.save();
        for (let i = 1; i < gs.trail.length; i++) {
          const age = (now - gs.trail[i].t) / 200;
          if (age > 1) continue;
          const alpha = (1 - age) * 0.8;
          const thickness = (1 - age) * 6;
          ctx.beginPath();
          ctx.moveTo(gs.trail[i-1].x, gs.trail[i-1].y);
          ctx.lineTo(gs.trail[i].x, gs.trail[i].y);
          ctx.strokeStyle = `rgba(0,255,255,${alpha})`;
          ctx.lineWidth = thickness;
          ctx.lineCap = 'round';
          ctx.stroke();
          // Glow
          ctx.beginPath();
          ctx.moveTo(gs.trail[i-1].x, gs.trail[i-1].y);
          ctx.lineTo(gs.trail[i].x, gs.trail[i].y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
          ctx.lineWidth = thickness * 0.4;
          ctx.stroke();
        }
        ctx.restore();
      }

      // HUD
      ctx.textAlign = 'left';
      // Lives (hearts)
      for (let i = 0; i < 3; i++) {
        ctx.font = '22px serif';
        ctx.fillText(i < gs.lives ? '❤️' : '🖤', 12 + i * 32, 40);
      }
      // Score
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(W-90, 10, 80, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(gs.score), W-50, 32);

      // Combo display
      if (gs.combo >= 2 && gs.comboTimer > 0) {
        ctx.fillStyle = `rgba(255,200,0,${gs.comboTimer/90})`;
        ctx.font = `bold ${20+gs.combo*2}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(`${gs.combo}x COMBO!`, W/2, 80);
      }

      // Idle
      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(W/2-110, H/2-70, 220, 140, 22); ctx.fill();
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('NINJA FRUIT', W/2, H/2-25);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '14px system-ui';
        ctx.fillText('Swipe across fruits to slice!', W/2, H/2+8);
        ctx.fillStyle = '#ffd93d';
        ctx.font = '13px system-ui';
        ctx.fillText(`Best: ${gs.best}`, W/2, H/2+35);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [checkSlice, endGame]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '100%', cursor: 'crosshair' }}
      />
      <div className="flex gap-3">
        {disp.phase === 'idle' && <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">🎮 Start Game</Button>}
        {disp.phase === 'dead' && <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">▶ Play Again</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
