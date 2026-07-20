// src/components/games/FlappyBirdGame.tsx — Procedural 4D Flappy Bird
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import { GameFrame } from './GameFrame';

interface Props { onClose: () => void }

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Pipe = { x: number; gapY: number; scored: boolean; velocityY: number };

export function FlappyBirdGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  
  const stateRef = useRef({
    phase: 'idle' as 'idle' | 'playing' | 'dead' | 'warp',
    bird: { x: 80, y: 260, vy: 0, rot: 0, wingFrame: 0 },
    pipes: [] as Pipe[],
    particles: [] as Particle[],
    stars: [] as { x: number; y: number; r: number; alpha: number; speedZ: number }[],
    
    score: 0,
    best: parseInt(localStorage.getItem('fb-best') || '0'),
    
    // Infinite Progression State
    level: 1,
    pipesPassed: 0,
    targetPipes: 10,
    isWarping: false,
    gravity: 0.45,
    jump: -8.5,
    pipeSpeed: 2.8,
    gapSize: 135,
    movingPipes: false,
    
    frame: 0,
    lastTime: 0,
    bgOffset: 0,
    hillOffset: 0,
  });

  const [display, setDisplay] = useState({ 
    score: 0, best: parseInt(localStorage.getItem('fb-best') || '0'), 
    phase: 'idle' as 'idle' | 'playing' | 'dead' | 'warp',
    level: 1, pipesPassed: 0, targetPipes: 10, isWarping: false
  });
  
  const W = 380, H = 520, PIPE_W = 52;

  const syncDisp = () => {
    const s = stateRef.current;
    setDisplay(d => ({ 
      ...d, 
      score: s.score, best: s.best, phase: s.phase,
      level: s.level, pipesPassed: s.pipesPassed, 
      targetPipes: s.targetPipes, isWarping: s.isWarping
    }));
  };

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
      s.lastTime = performance.now();
      syncDisp();
    }
    if (s.phase !== 'playing') return;
    s.bird.vy = s.jump;
    playTone(520, 0.04, 'sine', 0.08);
    vibrate(15);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  const nextLevel = useCallback(() => {
    const s = stateRef.current;
    s.level++;
    s.pipesPassed = 0;
    s.targetPipes = 10 + s.level * 2;
    s.isWarping = false;
    s.phase = 'playing';
    
    // Procedural Difficulty Scaling
    s.pipeSpeed = 2.8 + (s.level * 0.2);
    s.gapSize = Math.max(90, 135 - (s.level * 4));
    s.gravity = 0.45 + (s.level * 0.015);
    s.movingPipes = s.level >= 3;
    
    s.pipes = []; // clear pipes for new level
    s.bird.y = 260; // recenter bird
    s.bird.vy = 0;
    
    syncDisp();
  }, []);

  const triggerWarp = useCallback(() => {
    const s = stateRef.current;
    s.phase = 'warp';
    s.isWarping = true;
    playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(800, 0.4, 'sine', 0.2), 200);
    syncDisp();
    
    setTimeout(() => {
       nextLevel();
    }, 1800); // Wait for CSS warp animation
  }, [nextLevel]);

  const restart = () => {
    const s = stateRef.current;
    s.phase = 'idle';
    s.bird = { x: 80, y: 260, vy: 0, rot: 0, wingFrame: 0 };
    s.pipes = [];
    s.particles = [];
    s.score = 0;
    s.level = 1;
    s.pipesPassed = 0;
    s.targetPipes = 10;
    s.pipeSpeed = 2.8;
    s.gapSize = 135;
    s.gravity = 0.45;
    s.movingPipes = false;
    s.frame = 0;
    syncDisp();
  };

  const die = () => {
    const s = stateRef.current;
    s.phase = 'dead';
    if (s.score > s.best) {
      s.best = s.score;
      localStorage.setItem('fb-best', String(s.best));
    }
    spawnParticles(s.bird.x, s.bird.y, 25);
    playTone(300, 0.1, 'sawtooth', 0.2);
    setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.3), 100);
    vibrate(60);
    syncDisp();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Init 4D Stars
    const s = stateRef.current;
    s.stars = Array.from({ length: 50 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 2,
      alpha: 0.4 + Math.random() * 0.6,
      speedZ: 0.2 + Math.random() * 1.5
    }));

    const loop = (timestamp: number) => {
      const s = stateRef.current;
      const dt = Math.min((timestamp - s.lastTime) / 16, 3);
      s.lastTime = timestamp;
      s.frame++;

      ctx.clearRect(0, 0, W, H);

      // Background sky gradient scales with level
      const hue = (220 + s.level * 15) % 360;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `hsl(${hue}, 60%, 15%)`);
      sky.addColorStop(1, `hsl(${hue}, 40%, 30%)`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 4D Parallax Stars
      s.stars.forEach(star => {
        if (s.phase === 'playing' || s.phase === 'warp') {
          star.x -= (star.speedZ * s.pipeSpeed * 0.2) * dt;
          if (s.phase === 'warp') star.x -= star.speedZ * 5 * dt; // Hyperspace effect
          if (star.x < 0) star.x = W;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.alpha * (0.8 + 0.2 * Math.sin(s.frame * 0.05 + star.x))})`;
        ctx.fill();
      });

      // Distant hills (parallax)
      s.hillOffset = (s.hillOffset + ((s.phase === 'playing' || s.phase === 'warp') ? 0.5 * dt : 0)) % W;
      ctx.fillStyle = `hsl(${hue}, 30%, 45%)`;
      for (let i = -1; i < 3; i++) {
        const hx = i * 160 - s.hillOffset % 160;
        ctx.beginPath();
        ctx.moveTo(hx, H * 0.7);
        ctx.quadraticCurveTo(hx + 40, H * 0.48, hx + 80, H * 0.7);
        ctx.quadraticCurveTo(hx + 120, H * 0.52, hx + 160, H * 0.7);
        ctx.closePath();
        ctx.fill();
      }

      // Pipes
      if (s.phase === 'playing' || s.phase === 'dead') {
        if (s.phase === 'playing') {
          // Spawn pipes based on spatial distance to avoid rendering overlap
          const lastPipe = s.pipes.length > 0 ? s.pipes[s.pipes.length - 1] : null;
          if (!lastPipe || W - lastPipe.x >= 350) {
            const gapY = 100 + Math.random() * (H - 280);
            const vY = s.movingPipes ? (Math.random() - 0.5) * 1.5 : 0;
            s.pipes.push({ x: W + 20, gapY, scored: false, velocityY: vY });
          }

          // Update pipes
          s.pipes.forEach(pipe => { 
            pipe.x -= s.pipeSpeed * dt; 
            if (s.movingPipes) {
               pipe.gapY += pipe.velocityY * dt;
               if (pipe.gapY < 50 || pipe.gapY > H - 250) pipe.velocityY *= -1;
            }
          });
          s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);
        }

        // Draw pipes
        s.pipes.forEach(pipe => {
          const topH = pipe.gapY;
          const botY = pipe.gapY + s.gapSize;
          const botH = H - botY - 40; // above ground

          const pg1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
          pg1.addColorStop(0, '#2ecc71'); pg1.addColorStop(0.4, '#27ae60'); pg1.addColorStop(1, '#1e8449');
          ctx.fillStyle = pg1;
          
          // Top
          ctx.beginPath();
          ctx.roundRect(pipe.x, 0, PIPE_W, topH - 12, [0, 0, 6, 6]);
          ctx.fill();
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          ctx.roundRect(pipe.x - 5, topH - 28, PIPE_W + 10, 28, 6);
          ctx.fill();

          // Bottom
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
            s.pipesPassed++;
            syncDisp();
            playTone(700 + s.score * 5, 0.06, 'sine', 0.12);
            spawnParticles(s.bird.x, s.bird.y, 6);
            
            if (s.pipesPassed >= s.targetPipes) {
               triggerWarp();
            }
          }

          // Collision detection
          if (s.phase === 'playing') {
            const bx = s.bird.x, by = s.bird.y, br = 14;
            const inX = bx + br > pipe.x + 4 && bx - br < pipe.x + PIPE_W - 4;
            if (inX && (by - br < topH - 12 || by + br > botY + 12)) {
              die();
            }
          }
        });
      }

      // Ground
      s.bgOffset = (s.bgOffset + ((s.phase === 'playing' || s.phase === 'warp') ? s.pipeSpeed * dt : 0)) % W;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, H - 40, W, 40);
      ctx.fillStyle = '#A0522D';
      for (let i = 0; i < W / 20 + 2; i++) {
        ctx.fillRect(i * 20 - s.bgOffset % 20, H - 40, 18, 40);
      }
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, H - 40, W, 10);

      // Particles
      s.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= 0.03 * dt;
        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });
      s.particles = s.particles.filter(p => p.life > 0);

      // Bird
      if (s.phase !== 'warp') {
        if (s.phase === 'playing' || s.phase === 'dead') {
          s.bird.vy += s.gravity * dt;
          s.bird.y += s.bird.vy * dt;
          // Rotation
          s.bird.rot = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, (s.bird.vy * 0.1)));
        } else if (s.phase === 'idle') {
          s.bird.y = 260 + Math.sin(s.frame * 0.1) * 8;
        }

        if (s.bird.y > H - 40 - 15) {
          s.bird.y = H - 40 - 15;
          if (s.phase === 'playing') die();
        }
        if (s.bird.y < 15) {
          s.bird.y = 15;
          s.bird.vy = 0;
        }

        ctx.save();
        ctx.translate(s.bird.x, s.bird.y);
        ctx.rotate(s.bird.rot);

        // Body
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(8, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(10, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(14, 2);
        ctx.lineTo(24, 5);
        ctx.lineTo(14, 8);
        ctx.closePath();
        ctx.fill();

        // Wing
        if (s.phase !== 'dead') {
           s.bird.wingFrame += dt * 0.2;
        }
        const wingY = Math.sin(s.bird.wingFrame) * 6;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.ellipse(-4, wingY, 8, 5, -Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DDD';
        ctx.stroke();

        ctx.restore();
      }

      // 4D HUD 
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(8, 8, 160, 48, 8); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`LVL ${s.level} GOAL: ${s.pipesPassed}/${s.targetPipes}`, 16, 24);
      
      ctx.fillStyle = '#fff';
      ctx.fillText(`SCORE: ${s.score} | BEST: ${s.best}`, 16, 44);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [triggerWarp]);

  return (
    <GameFrame 
      title="4D Flappy Bird" 
      onClose={onClose} 
      score={display.score} 
      level={display.level}
      isWarping={display.isWarping}
    >
      <div className="flex-1 w-full flex items-center justify-center bg-black">
        <div className="relative" style={{ width: 380, height: 520, maxWidth: '100%', aspectRatio: '38/52' }}>
          <canvas
            ref={canvasRef}
            width={380}
            height={520}
            className="w-full h-full object-contain rounded-xl shadow-2xl"
            style={{ 
              background: '#000',
              transition: 'transform 0.1s ease',
              transform: display.isWarping ? 'scale(1.05)' : 'scale(1)',
              filter: display.isWarping ? 'brightness(1.5) contrast(1.2)' : 'none'
            }}
            onClick={jump}
          />

          {display.phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl z-10 backdrop-blur-sm p-6 text-center">
              <h2 className="text-white text-3xl font-bold mb-2">Flappy 4D</h2>
              <p className="text-gray-300 text-sm mb-6 max-w-[200px]">
                Pass pipes to level up. 
                Beware of moving pipes and gravity shifts!
              </p>
              <Button onClick={jump} size="lg" className="w-48 shadow-lg shadow-blue-500/30 w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" variant="neon">
                Tap to Start
              </Button>
            </div>
          )}

          {display.phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl z-10 backdrop-blur-md">
              <h2 className="text-white text-3xl font-bold mb-2">Game Over</h2>
              <div className="flex gap-6 mb-8 text-center mt-4">
                 <div>
                  <p className="text-gray-400 text-sm">Level Reached</p>
                  <p className="text-cyan-300 text-2xl font-bold">{display.level}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Score</p>
                  <p className="text-white text-2xl font-bold">{display.score}</p>
                </div>
              </div>
              <Button onClick={restart} size="lg" className="w-48 shadow-lg shadow-blue-500/30 w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" variant="neon">
                Play Again
              </Button>
            </div>
          )}
          
          {display.phase === 'warp' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                <h1 className="text-white text-4xl font-black italic tracking-widest drop-shadow-2xl opacity-80">
                  LEVEL UP!
                </h1>
             </div>
          )}
        </div>
      </div>
    </GameFrame>
  );
}
