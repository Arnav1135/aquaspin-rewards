// src/components/games/ArcheryGame.tsx — Premium Archery Canvas Game
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; r:number };

export function ArcheryGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'aiming'|'flying'|'result'|'dead',
    aimX: 0, aimY: 0, power: 0, charging: false, chargeDir: 1,
    arrowX: 0, arrowY: 0, arrowVX: 0, arrowVY: 0, arrowAngle: 0,
    windX: 0, particles: [] as Particle[],
    targetX: 0, targetY: 0,
    arrows: [] as { x:number; y:number; angle:number }[],
    score: 0, round: 0, maxRounds: 10, roundResult: '',
    best: parseInt(localStorage.getItem('arch-best')||'0'),
    frame: 0, lastTime: 0,
  });
  const [disp, setDisp] = useState({ score: 0, round: 0, phase: 'idle' as 'idle'|'aiming'|'flying'|'result'|'dead', best: parseInt(localStorage.getItem('arch-best')||'0'), roundResult: '' });
  const W = 400, H = 500;

  const newRound = useCallback(() => {
    const gs = s.current;
    gs.targetX = 260 + Math.random() * 100;
    gs.targetY = 120 + Math.random() * 160;
    gs.windX = (Math.random() - 0.5) * 3;
    gs.aimX = 80; gs.aimY = H - 80;
    gs.power = 0; gs.chargeDir = 1;
    gs.arrows = []; gs.roundResult = '';
    gs.phase = 'aiming';
    setDisp(d => ({ ...d, phase: 'aiming', roundResult: '' }));
  }, []);

  const startGame = useCallback(() => {
    const gs = s.current;
    gs.score = 0; gs.round = 0;
    setDisp(d => ({ ...d, score: 0, round: 0 }));
    newRound();
    gs.round = 1;
    setDisp(d => ({ ...d, round: 1 }));
  }, [newRound]);

  const shoot = useCallback(() => {
    const gs = s.current;
    if (gs.phase !== 'aiming') return;
    gs.phase = 'flying';
    const power = (gs.power / 100) * 18 + 6;
    const angle = Math.atan2(gs.targetY - gs.aimY, gs.targetX - gs.aimX);
    gs.arrowX = gs.aimX; gs.arrowY = gs.aimY;
    gs.arrowVX = Math.cos(angle) * power; gs.arrowVY = Math.sin(angle) * power;
    gs.arrowAngle = angle;
    playTone(700, 0.06, 'sine', 0.1); vibrate(20);
    setDisp(d => ({ ...d, phase: 'flying' }));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); shoot(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [shoot]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const gs = s.current;
    gs.targetX = 280; gs.targetY = 180; gs.aimX = 80; gs.aimY = H - 80;

    const drawTarget = (x: number, y: number) => {
      const rings = [40, 32, 22, 14, 6];
      const colors = ['#FFFFFF', '#000000', '#66bdf2', '#7b8bc1', '#FFD700'];
      rings.forEach((r, i) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = colors[i]; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      });
    };

    const drawArcher = (x: number, y: number) => {
      // body
      ctx.fillStyle = '#66bdf2';
      ctx.beginPath(); ctx.ellipse(x, y-10, 12, 20, 0, 0, Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle = '#FFDBA0'; ctx.beginPath(); ctx.arc(x, y-36, 10, 0, Math.PI*2); ctx.fill();
      // bow
      ctx.strokeStyle = '#795548'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x+10, y-10, 22, -Math.PI*0.65, Math.PI*0.65); ctx.stroke();
      // string
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x+10, y-10-22*Math.sin(0.65));
      ctx.lineTo(x+24, y-10);
      ctx.lineTo(x+10, y-10+22*Math.sin(0.65));
      ctx.stroke();
    };

    const drawArrow = (x: number, y: number, angle: number, length = 40) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-length/2, 0); ctx.lineTo(length/2, 0); ctx.stroke();
      ctx.fillStyle = '#9E9E9E';
      ctx.beginPath(); ctx.moveTo(length/2, 0); ctx.lineTo(length/2-8, -4); ctx.lineTo(length/2-8, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E53935';
      ctx.beginPath(); ctx.moveTo(-length/2, 0); ctx.lineTo(-length/2+8, -3); ctx.lineTo(-length/2+8, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    const loop = (timestamp: number) => {
      const gs = s.current;
      const dt = Math.min((timestamp - gs.lastTime) / 16, 3);
      gs.lastTime = timestamp; gs.frame++;

      ctx.clearRect(0, 0, W, H);

      // Background sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1a237e'); sky.addColorStop(0.6, '#283593'); sky.addColorStop(1, '#1b5e20');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Distant hills
      ctx.fillStyle = '#1b5e20';
      for (let hi = 0; hi < 4; hi++) {
        ctx.beginPath(); ctx.arc(hi*120+40, H-60, 80, 0, Math.PI); ctx.fill();
      }
      // Ground
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, H-40, W, 40);

      // Wind indicator
      const windStr = Math.abs(gs.windX).toFixed(1);
      const windDir = gs.windX > 0 ? '→' : '←';
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(W/2-55, 10, 110, 28, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`💨 Wind: ${windStr} ${windDir}`, W/2, 28);

      // Target stand
      ctx.strokeStyle = '#795548'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(gs.targetX, gs.targetY+40); ctx.lineTo(gs.targetX, H-40); ctx.stroke();

      // Target
      drawTarget(gs.targetX, gs.targetY);

      // Archer
      drawArcher(gs.aimX, gs.aimY);

      // Power bar
      if (gs.phase === 'aiming') {
        gs.power = Math.max(0, Math.min(100, gs.power + gs.chargeDir * 1.5 * dt));
        if (gs.power >= 100 || gs.power <= 0) gs.chargeDir *= -1;

        // Aim line
        ctx.strokeStyle = `rgba(255,200,0,${0.3 + gs.power/200})`;
        ctx.lineWidth = 1; ctx.setLineDash([5, 8]);
        ctx.beginPath(); ctx.moveTo(gs.aimX+24, gs.aimY-10); ctx.lineTo(gs.targetX, gs.targetY); ctx.stroke();
        ctx.setLineDash([]);

        // Power bar
        const barW = 140, barX = (W - barW) / 2, barY = H - 28;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(barX-2, barY-2, barW+4, 18, 9); ctx.fill();
        const powerColor = gs.power < 40 ? '#66bdf2' : gs.power < 70 ? '#FFD700' : '#7b8bc1';
        const grad = ctx.createLinearGradient(barX, 0, barX+barW, 0);
        grad.addColorStop(0, '#66bdf2'); grad.addColorStop(0.6, '#FFD700'); grad.addColorStop(1, '#7b8bc1');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(barX, barY, barW*gs.power/100, 14, 7); ctx.fill();
        ctx.fillStyle = powerColor; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`POWER: ${Math.floor(gs.power)}%`, W/2, barY - 5);
      }

      // Flying arrow
      if (gs.phase === 'flying') {
        gs.arrowVX += gs.windX * 0.04 * dt;
        gs.arrowVY += 0.18 * dt;
        gs.arrowX += gs.arrowVX * dt;
        gs.arrowY += gs.arrowVY * dt;
        gs.arrowAngle = Math.atan2(gs.arrowVY, gs.arrowVX);

        // Trail particles
        if (gs.frame % 3 === 0) {
          gs.particles.push({ x: gs.arrowX, y: gs.arrowY, vx: 0, vy: 0, life: 0.5, color: '#FFD700', r: 2 });
        }

        drawArrow(gs.arrowX, gs.arrowY, gs.arrowAngle);

        // Hit detection
        const dx = gs.arrowX - gs.targetX, dy = gs.arrowY - gs.targetY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 42) {
          // Score by ring
          let pts = 0, label = '';
          if (dist < 6) { pts = 100; label = '🏆 BULLSEYE! +100'; }
          else if (dist < 14) { pts = 80; label = '🎯 Inner! +80'; }
          else if (dist < 22) { pts = 60; label = '✅ Good! +60'; }
          else if (dist < 32) { pts = 40; label = '👍 OK! +40'; }
          else { pts = 20; label = '📌 Edge! +20'; }
          gs.score += pts; gs.roundResult = label;
          gs.arrows.push({ x: gs.arrowX, y: gs.arrowY, angle: gs.arrowAngle });
          for (let pi = 0; pi < 14; pi++) {
            const a = Math.random()*Math.PI*2, sp = 2+Math.random()*5;
            gs.particles.push({ x: gs.arrowX, y: gs.arrowY, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 1, color: pts===100?'#FFD700':'#66bdf2', r: 3+Math.random()*3 });
          }
          playTone(pts >= 80 ? 900 : 600, 0.08, 'sine', 0.15); vibrate(pts >= 80 ? 60 : 20);
          toast.success(label, { duration: 1200 });
          gs.phase = 'result';
          gs.round++;
          setDisp(d => ({ ...d, score: gs.score, round: gs.round, roundResult: label, phase: 'result' }));
          setTimeout(() => {
            if (gs.round >= gs.maxRounds) {
              const newBest = Math.max(gs.score, gs.best);
              gs.best = newBest; localStorage.setItem('arch-best', String(newBest));
              gs.phase = 'dead';
              setDisp(d => ({ ...d, phase: 'dead', best: newBest }));
              toast.success(`🏹 Final: ${gs.score} | Best: ${newBest}`);
            } else newRound();
          }, 1500);
        } else if (gs.arrowX > W+30 || gs.arrowY > H || gs.arrowX < 0) {
          gs.roundResult = '❌ Missed! +0';
          gs.round++;
          gs.phase = 'result';
          setDisp(d => ({ ...d, round: gs.round, roundResult: '❌ Missed! +0', phase: 'result' }));
          playTone(200, 0.08, 'sine', 0.15); vibrate(60);
          setTimeout(() => {
            if (gs.round >= gs.maxRounds) {
              const newBest = Math.max(gs.score, gs.best);
              gs.best = newBest; localStorage.setItem('arch-best', String(newBest));
              gs.phase = 'dead'; setDisp(d => ({ ...d, phase: 'dead', best: newBest }));
            } else newRound();
          }, 1200);
        }
      }

      // Embedded arrows
      gs.arrows.forEach(ar => drawArrow(ar.x, ar.y, ar.angle));

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.15*dt; p.life -= 0.04*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*220).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Score HUD
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(8, 10, 120, 28, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`🏹 ${gs.score}pts  R${gs.round}/${gs.maxRounds}`, 18, 28);

      // Idle
      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(W/2-105, H/2-55, 210, 115, 20); ctx.fill();
        ctx.fillStyle = '#66bdf2'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🏹 ARCHERY', W/2, H/2-18);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px system-ui';
        ctx.fillText('Tap when power bar peaks!', W/2, H/2+10);
        ctx.fillStyle = '#FFD700'; ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${gs.best}pts`, W/2, H/2+35);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [newRound]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none cursor-crosshair"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '100%' }}
        onClick={disp.phase === 'idle' ? startGame : shoot}
        onTouchStart={e => { e.preventDefault(); if (disp.phase === 'idle') startGame(); else shoot(); }}
      />
      <div className="flex gap-3">
        {disp.phase === 'dead' && <Button variant="primary" onClick={startGame}>▶ Play Again</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
