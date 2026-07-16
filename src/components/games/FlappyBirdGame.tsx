// src/components/games/FlappyBirdGame.tsx — Premium Flappy Bird
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Pipe = { x: number; gapY: number; scored: boolean };

export function FlappyBirdGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    phase: 'idle' as 'idle' | 'playing' | 'dead',
    bird: { x: 80, y: 260, vy: 0, rot: 0, wingFrame: 0 },
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    stars: [] as { x: number; y: number; r: number; alpha: number }[],
    score: 0,
    best: parseInt(localStorage.getItem('fb-best') || '0'),
    frame: 0,
    lastTime: 0,
    bgOffset: 0,
    groundOffset: 0,
    hillOffset: 0,
  });

  const [display, setDisplay] = useState({ score: 0, best: parseInt(localStorage.getItem('fb-best') || '0'), phase: 'idle' as 'idle' | 'playing' | 'dead' });
  const W = 380, H = 520;
  const GRAVITY = 0.45, JUMP = -8.5, PIPE_W = 52, GAP = 135, PIPE_SPEED = 2.8;

  const spawnParticles = (x: number, y: number, count = 12) => {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#f06fff'];
    for (let i = 0; i < count; i++) {
      stateRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 5,
      });
    }
  };

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle') {
      s.phase = 'playing';
      setDisplay(d => ({ ...d, phase: 'playing' }));
      s.lastTime = performance.now();
    }
    if (s.phase !== 'playing') return;
    s.bird.vy = JUMP;
    playTone(520, 0.04, 'sine', 0.08);
    vibrate(15);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  const restart = () => {
    const s = stateRef.current;
    s.phase = 'idle';
    s.bird = { x: 80, y: 260, vy: 0, rot: 0, wingFrame: 0 };
    s.pipes = [];
    s.particles = [];
    s.score = 0;
    s.frame = 0;
    s.bgOffset = 0;
    s.groundOffset = 0;
    s.hillOffset = 0;
    setDisplay(d => ({ ...d, score: 0, phase: 'idle' }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Init stars
    const s = stateRef.current;
    s.stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * (H * 0.55),
      r: 0.5 + Math.random() * 1.5,
      alpha: 0.4 + Math.random() * 0.6,
    }));

    const loop = (timestamp: number) => {
      const s = stateRef.current;
      const dt = Math.min((timestamp - s.lastTime) / 16, 3);
      s.lastTime = timestamp;
      s.frame++;

      ctx.clearRect(0, 0, W, H);

      // ── Background sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
      sky.addColorStop(0, '#0a1628');
      sky.addColorStop(1, '#1a3a6b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // ── Stars
      s.stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.alpha * (0.8 + 0.2 * Math.sin(s.frame * 0.05 + star.x))})`;
        ctx.fill();
      });

      // ── Distant hills (parallax layer 1)
      s.hillOffset = (s.hillOffset + (s.phase === 'playing' ? 0.5 * dt : 0)) % W;
      ctx.fillStyle = '#7b8bc1';
      for (let i = -1; i < 3; i++) {
        const hx = i * 160 - s.hillOffset % 160;
        ctx.beginPath();
        ctx.moveTo(hx, H * 0.7);
        ctx.quadraticCurveTo(hx + 40, H * 0.48, hx + 80, H * 0.7);
        ctx.quadraticCurveTo(hx + 120, H * 0.52, hx + 160, H * 0.7);
        ctx.closePath();
        ctx.fill();
      }

      // ── Mid hills
      ctx.fillStyle = '#1E3A5F';
      for (let i = -1; i < 4; i++) {
        const hx = i * 120 - (s.hillOffset * 1.5) % 120;
        ctx.beginPath();
        ctx.moveTo(hx, H * 0.75);
        ctx.quadraticCurveTo(hx + 30, H * 0.60, hx + 60, H * 0.75);
        ctx.quadraticCurveTo(hx + 90, H * 0.62, hx + 120, H * 0.75);
        ctx.closePath();
        ctx.fill();
      }

      // ── Pipes
      if (s.phase === 'playing') {
        s.bgOffset = (s.bgOffset + PIPE_SPEED * dt) % W;
        // Spawn pipes
        if (s.frame % Math.round(90 / dt) === 0 || s.pipes.length === 0) {
          const gapY = 140 + Math.random() * (H - 280 - 80);
          s.pipes.push({ x: W + 20, gapY, scored: false });
        }

        // Update pipes
        s.pipes.forEach(pipe => { pipe.x -= PIPE_SPEED * dt; });
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

        // Draw pipes
        s.pipes.forEach(pipe => {
          const topH = pipe.gapY;
          const botY = pipe.gapY + GAP;
          const botH = H - botY - 40;

          // Top pipe
          const pg1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
          pg1.addColorStop(0, '#2ecc71'); pg1.addColorStop(0.4, '#27ae60'); pg1.addColorStop(1, '#1e8449');
          ctx.fillStyle = pg1;
          ctx.beginPath();
          ctx.roundRect(pipe.x, 0, PIPE_W, topH - 12, [0, 0, 6, 6]);
          ctx.fill();
          // Top pipe cap
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          ctx.roundRect(pipe.x - 5, topH - 28, PIPE_W + 10, 28, 6);
          ctx.fill();

          // Bottom pipe
          ctx.fillStyle = pg1;
          ctx.beginPath();
          ctx.roundRect(pipe.x, botY + 12, PIPE_W, botH, [6, 6, 0, 0]);
          ctx.fill();
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          ctx.roundRect(pipe.x - 5, botY, PIPE_W + 10, 28, 6);
          ctx.fill();

          // Score detection
          if (!pipe.scored && pipe.x + PIPE_W < s.bird.x - 10) {
            pipe.scored = true;
            s.score++;
            setDisplay(d => ({ ...d, score: s.score }));
            playTone(700 + s.score * 5, 0.06, 'sine', 0.12);
            // Coin sparkle
            spawnParticles(s.bird.x, s.bird.y, 6);
          }

          // Collision detection
          const bx = s.bird.x, by = s.bird.y, br = 14;
          const inX = bx + br > pipe.x + 4 && bx - br < pipe.x + PIPE_W - 4;
          if (inX && (by - br < topH - 12 || by + br > botY + 12)) {
            if (s.phase === 'playing') die();
          }
        });
      }

      // ── Ground
      s.groundOffset = (s.groundOffset + (s.phase === 'playing' ? PIPE_SPEED * 1.5 * dt : 0)) % 30;
      ctx.fillStyle = '#2d5a1b';
      ctx.fillRect(0, H - 40, W, 40);
      ctx.fillStyle = '#3a7a25';
      for (let i = -1; i < W / 30 + 1; i++) {
        ctx.fillRect(i * 30 - s.groundOffset, H - 40, 15, 5);
      }

      // ── Bird physics
      if (s.phase === 'playing') {
        s.bird.vy += GRAVITY * dt;
        s.bird.y += s.bird.vy * dt;
        s.bird.rot = Math.max(-30, Math.min(90, s.bird.vy * 4));
        s.bird.wingFrame++;

        // Ground / ceiling collision
        if (s.bird.y + 14 >= H - 40) { s.bird.y = H - 40 - 14; die(); }
        if (s.bird.y - 14 <= 0) { s.bird.y = 14; s.bird.vy = 0; }
      } else if (s.phase === 'idle') {
        s.bird.y = 260 + Math.sin(s.frame * 0.05) * 8;
        s.bird.wingFrame++;
      }

      // ── Draw Bird
      ctx.save();
      ctx.translate(s.bird.x, s.bird.y);
      ctx.rotate((s.bird.rot * Math.PI) / 180);

      // Body
      const birdGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
      birdGrad.addColorStop(0, '#FFE066');
      birdGrad.addColorStop(1, '#F59E0B');
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      const wingY = Math.sin(s.bird.wingFrame * 0.25) * 5;
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(-6, wingY, 10, 6, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(6, -4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(7, -4, 3, 0, Math.PI * 2); ctx.fill();

      // Beak
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(22, -3); ctx.lineTo(22, 3);
      ctx.closePath(); ctx.fill();

      ctx.restore();

      // ── Particles
      s.particles = s.particles.filter(p => p.life > 0);
      s.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.3 * dt;
        p.life -= 0.04 * dt;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // ── Score HUD
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 32, 12, 64, 34, 17); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(s.score), W / 2, 35);

      // ── Idle screen
      if (s.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.roundRect(W / 2 - 90, H / 2 - 55, 180, 110, 18); ctx.fill();
        ctx.fillStyle = '#FFE066';
        ctx.font = 'bold 26px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('FLAPPY BIRD', W / 2, H / 2 - 20);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(s.frame * 0.08)) + ')';
        ctx.font = '14px system-ui';
        ctx.fillText('Tap or press Space to fly', W / 2, H / 2 + 15);
        ctx.fillStyle = 'rgba(255,230,102,0.7)';
        ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${s.best}`, W / 2, H / 2 + 38);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  const die = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    s.phase = 'dead';
    const newBest = Math.max(s.score, s.best);
    s.best = newBest;
    localStorage.setItem('fb-best', String(newBest));
    setDisplay({ score: s.score, best: newBest, phase: 'dead' });
    spawnParticles(s.bird.x, s.bird.y, 16);
    playTone(180, 0.2, 'sawtooth', 0.3);
    vibrate(100);
    if (s.score > 0) toast.success(`Score: ${s.score}! Best: ${newBest}`);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-2xl cursor-pointer select-none touch-none"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.45)', maxWidth: '100%' }}
        onClick={jump}
        onTouchStart={e => { e.preventDefault(); jump(); }}
      />
      {display.phase === 'dead' && (
        <div className="flex gap-3">
          <Button variant="primary" onClick={restart}>▶ Play Again</Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
        </div>
      )}
      {display.phase === 'idle' && (
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      )}
    </div>
  );
}
