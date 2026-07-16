// src/components/games/KnifeThrowerGame.tsx — Premium Knife Hit Canvas Game
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Knife = { angle: number; embedded: boolean; flying: boolean; y: number };
type Apple = { angle: number; collected: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number };

export function KnifeThrowerGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle' | 'playing' | 'dead' | 'stageclear',
    logAngle: 0, logSpeed: 0.022,
    knives: [] as Knife[], apples: [] as Apple[], particles: [] as Particle[],
    flyingKnife: null as Knife | null,
    score: 0, stage: 1, knivesLeft: 7,
    frame: 0, lastTime: 0,
    best: parseInt(localStorage.getItem('kt-best') || '0'),
    screenShake: 0,
  });
  const [disp, setDisp] = useState({ score: 0, stage: 1, knives: 7, phase: 'idle' as 'idle'|'playing'|'dead'|'stageclear', best: parseInt(localStorage.getItem('kt-best')||'0') });
  const W = 360, H = 520, LOG_R = 80, LOG_Y = 200;

  const spawnParticles = (x: number, y: number, color: string, n = 10) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      s.current.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 1, color, r: 2+Math.random()*4 });
    }
  };

  const initStage = useCallback((stage: number) => {
    const gs = s.current;
    gs.logAngle = 0;
    gs.logSpeed = 0.018 + stage * 0.008;
    gs.knivesLeft = 7 + stage;
    gs.knives = [];
    gs.flyingKnife = null;
    gs.phase = 'playing';
    // Random apples on log
    const appleCount = Math.min(stage + 1, 4);
    gs.apples = Array.from({ length: appleCount }, (_, i) => ({
      angle: (Math.PI * 2 * i) / appleCount + Math.PI / 3,
      collected: false,
    }));
    setDisp(d => ({ ...d, knives: gs.knivesLeft, phase: 'playing', stage }));
  }, []);

  const throwKnife = useCallback(() => {
    const gs = s.current;
    if (gs.phase !== 'playing' || gs.flyingKnife || gs.knivesLeft <= 0) return;
    gs.flyingKnife = { angle: 0, embedded: false, flying: true, y: H - 60 };
    gs.knivesLeft--;
    setDisp(d => ({ ...d, knives: gs.knivesLeft }));
    playTone(800, 0.05, 'sine', 0.08); vibrate(10);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); throwKnife(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [throwKnife]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const drawLog = (cx: number, cy: number, r: number) => {
      // Outer wood ring
      const woodGrad = ctx.createRadialGradient(cx-20, cy-20, 10, cx, cy, r);
      woodGrad.addColorStop(0, '#c8793c');
      woodGrad.addColorStop(0.5, '#a0522d');
      woodGrad.addColorStop(1, '#6b3520');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = woodGrad; ctx.fill();
      // Wood rings
      for (let ri = r*0.7; ri > 10; ri -= 12) {
        ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
      ctx.fillStyle = '#4a2010'; ctx.fill();
    };

    const drawKnife = (cx: number, cy: number, angle: number, alpha = 1) => {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      // Blade
      const blade = ctx.createLinearGradient(-2, -45, 2, 0);
      blade.addColorStop(0, '#e8e8e8'); blade.addColorStop(0.5, '#c0c0c0'); blade.addColorStop(1, '#888');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(0, -45); ctx.lineTo(3, -10); ctx.lineTo(-3, -10); ctx.closePath();
      ctx.fill();
      // Handle
      ctx.fillStyle = '#5c3317';
      ctx.beginPath(); ctx.roundRect(-4, -10, 8, 28, 2); ctx.fill();
      // Handle wrapping
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 2;
      for (let hy = -6; hy < 18; hy += 7) {
        ctx.beginPath(); ctx.moveTo(-4, hy); ctx.lineTo(4, hy); ctx.stroke();
      }
      // Guard
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.roundRect(-6, -12, 12, 4, 1); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawApple = (x: number, y: number, collected: boolean) => {
      if (collected) return;
      ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍎', x, y);
    };

    const loop = (timestamp: number) => {
      const gs = s.current;
      const dt = Math.min((timestamp - gs.lastTime) / 16, 3);
      gs.lastTime = timestamp; gs.frame++;

      const cx = W / 2, cy = LOG_Y;

      // Screen shake
      const shakeX = gs.screenShake > 0 ? (Math.random()-0.5)*gs.screenShake*3 : 0;
      const shakeY = gs.screenShake > 0 ? (Math.random()-0.5)*gs.screenShake*3 : 0;
      if (gs.screenShake > 0) gs.screenShake -= dt;

      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.clearRect(-10, -10, W+20, H+20);

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1a0a2e'); bg.addColorStop(1, '#0d0820');
      ctx.fillStyle = bg; ctx.fillRect(-10, -10, W+20, H+20);

      // Spotlight
      const spot = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200);
      spot.addColorStop(0, 'rgba(255,200,100,0.12)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);

      // Stage info
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`STAGE ${gs.stage}`, cx, 20);

      // Score HUD
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(W-85, 8, 78, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`⭐ ${gs.score}`, W-46, 27);

      // Knives left display at bottom
      const kx = cx - (gs.knivesLeft * 14) / 2;
      for (let i = 0; i < gs.knivesLeft; i++) {
        ctx.save(); ctx.translate(kx + i*14 + 7, H-30); ctx.rotate(Math.PI);
        drawKnife(0, 0, 0, 0.8);
        ctx.restore();
      }

      if (gs.phase === 'playing' || gs.phase === 'stageclear') {
        // Rotate log
        gs.logAngle += gs.logSpeed * dt;
        if (gs.frame % 180 === 0) gs.logSpeed *= -1; // direction change

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(gs.logAngle);

        // Draw embedded knives (rotating with log)
        gs.knives.forEach(k => {
          const kx2 = Math.sin(k.angle) * (LOG_R + 30);
          const ky2 = -Math.cos(k.angle) * (LOG_R + 30);
          drawKnife(kx2, ky2, k.angle);
        });

        // Draw apples on log
        gs.apples.forEach(a => {
          const ax2 = Math.sin(a.angle) * (LOG_R + 8);
          const ay2 = -Math.cos(a.angle) * (LOG_R + 8);
          drawApple(ax2, ay2, a.collected);
        });

        ctx.restore();

        drawLog(cx, cy, LOG_R);

        // Draw embedded knives again (on top of log) — same rotation
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(gs.logAngle);
        gs.knives.forEach(k => {
          const kx2 = Math.sin(k.angle) * (LOG_R);
          const ky2 = -Math.cos(k.angle) * (LOG_R);
          drawKnife(kx2, ky2, k.angle);
        });
        ctx.restore();

        // Flying knife
        if (gs.flyingKnife && gs.flyingKnife.flying) {
          gs.flyingKnife.y -= 12 * dt;
          const fk = gs.flyingKnife;

          // Check collision with log
          const dist = Math.sqrt((cx - cx)**2 + (fk.y - cy)**2);
          if (dist <= LOG_R + 38) {
            // Compute the angle where knife hit relative to log
            const hitAngle = Math.atan2(cx - cx, cy - fk.y) - gs.logAngle;

            // Check overlap with existing knives
            let collision = false;
            for (const ek of gs.knives) {
              let diff = Math.abs(hitAngle - ek.angle);
              if (diff > Math.PI) diff = Math.PI*2 - diff;
              if (diff < 0.28) { collision = true; break; }
            }

            if (collision) {
              // Hit existing knife → game over
              gs.phase = 'dead';
              const newBest = Math.max(gs.score, gs.best);
              gs.best = newBest; localStorage.setItem('kt-best', String(newBest));
              setDisp(d => ({ ...d, phase: 'dead', best: newBest, score: gs.score }));
              spawnParticles(cx, fk.y, '#ff4444', 16);
              gs.screenShake = 8;
              playTone(150, 0.25, 'sawtooth', 0.35); vibrate(200);
              toast.error('💥 Hit a knife! Game Over');
            } else {
              // Check apple collection
              let gotApple = false;
              gs.apples.forEach(a => {
                if (a.collected) return;
                let diff2 = Math.abs(hitAngle - a.angle);
                if (diff2 > Math.PI) diff2 = Math.PI*2 - diff2;
                if (diff2 < 0.3) {
                  a.collected = true; gotApple = true;
                  spawnParticles(cx, fk.y, '#ff6600', 12);
                  toast.success('🍎 Apple! +50pts');
                  gs.score += 50;
                }
              });
              // Embed knife
              gs.knives.push({ angle: hitAngle, embedded: true, flying: false, y: 0 });
              gs.score += 10 + gs.stage * 5;
              if (gotApple) gs.score += 0; // already added
              setDisp(d => ({ ...d, score: gs.score }));
              spawnParticles(cx + Math.sin(hitAngle)*LOG_R, cy - Math.cos(hitAngle)*LOG_R, '#c8793c', 8);
              playTone(600 + gs.stage*30, 0.06, 'sine', 0.1); vibrate(25);

              // Check stage clear
              if (gs.knivesLeft === 0) {
                gs.phase = 'stageclear';
                setTimeout(() => {
                  gs.stage++;
                  gs.score += 200 * gs.stage;
                  setDisp(d => ({ ...d, score: gs.score, stage: gs.stage }));
                  initStage(gs.stage);
                  toast.success(`🎉 Stage ${gs.stage} cleared!`);
                }, 1200);
              }
            }
            gs.flyingKnife = null;
          } else {
            drawKnife(cx, fk.y, 0);
          }
        }
      }

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.2*dt; p.life -= 0.04*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*220).toString(16).padStart(2,'0');
        ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Idle screen
      if (gs.phase === 'idle') {
        drawLog(cx, cy, LOG_R);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.roundRect(cx-110, H/2+40, 220, 110, 20); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('KNIFE THROWER', cx, H/2+68);
        ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '13px system-ui';
        ctx.fillText('Tap or Space to throw', cx, H/2+92);
        ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${gs.best}`, cx, H/2+115);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };

    gs.logAngle = 0;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [initStage]);

  const gs = s.current;

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none cursor-pointer"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: '100%' }}
        onClick={throwKnife}
        onTouchStart={e => { e.preventDefault(); throwKnife(); }}
      />
      <div className="flex gap-3">
        {disp.phase === 'idle' && (
          <Button variant="primary" onClick={() => { gs.stage = 1; gs.score = 0; initStage(1); }}>🎮 Play</Button>
        )}
        {disp.phase === 'dead' && (
          <Button variant="primary" onClick={() => { gs.stage = 1; gs.score = 0; setDisp(d=>({...d,score:0,stage:1})); initStage(1); }}>▶ Retry</Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
