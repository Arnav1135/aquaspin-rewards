// src/components/games/PoolGame.tsx — Premium Pool/Billiards Canvas Game
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Ball = { id:number; x:number; y:number; vx:number; vy:number; r:number; color:string; num:number; pocketed:boolean; isCue:boolean };

const BALL_COLORS = ['#fff','#FFD700','#2196F3','#F44336','#9C27B0','#FF5722','#4CAF50','#795548','#111','#FFD700','#2196F3','#F44336','#9C27B0','#FF5722','#4CAF50','#795548'];

export function PoolGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'aiming'|'shooting'|'win'|'lose',
    balls: [] as Ball[], pockets: [] as { x:number; y:number }[],
    aimAngle: 0, power: 0, mouseX: 0, mouseY: 0,
    score: 0, shots: 0, dragging: false,
    particles: [] as { x:number; y:number; vx:number; vy:number; life:number; color:string }[],
    frame: 0, lastTime: 0,
    best: parseInt(localStorage.getItem('pool-best')||'0'),
  });
  const [disp, setDisp] = useState({ score: 0, shots: 0, phase: 'idle' as 'idle'|'aiming'|'shooting'|'win'|'lose', best: parseInt(localStorage.getItem('pool-best')||'0') });
  const W = 420, H = 520, TABLE_PAD = 30;
  const TL = TABLE_PAD, TR = W-TABLE_PAD, TT = TABLE_PAD, TB = H-TABLE_PAD;

  const initBalls = useCallback(() => {
    const balls: Ball[] = [];
    // Cue ball
    balls.push({ id:0, x:TL+90, y:(TT+TB)/2, vx:0, vy:0, r:11, color:'#fff', num:0, pocketed:false, isCue:true });
    // Rack triangle at right
    const rx = TR - 140, ry = (TT+TB)/2;
    const rows = [[rx,ry],[rx+24,ry-12],[rx+24,ry+12],[rx+48,ry-24],[rx+48,ry],[rx+48,ry+24],[rx+72,ry-36],[rx+72,ry-12],[rx+72,ry+12],[rx+72,ry+36],[rx+96,ry-48],[rx+96,ry-24],[rx+96,ry],[rx+96,ry+24],[rx+96,ry+48]];
    rows.forEach(([bx,by], i) => {
      balls.push({ id:i+1, x:bx, y:by, vx:0, vy:0, r:11, color:BALL_COLORS[i+1], num:i+1, pocketed:false, isCue:false });
    });
    // Pockets
    const pockets = [
      { x:TL+6, y:TT+6 }, { x:W/2, y:TT+4 }, { x:TR-6, y:TT+6 },
      { x:TL+6, y:TB-6 }, { x:W/2, y:TB-4 }, { x:TR-6, y:TB-6 },
    ];
    return { balls, pockets };
  }, [TL,TR,TT,TB]);

  const reset = useCallback(() => {
    const { balls, pockets } = initBalls();
    s.current.balls = balls; s.current.pockets = pockets;
    s.current.phase = 'aiming'; s.current.score = 0; s.current.shots = 0;
    s.current.power = 0; s.current.aimAngle = 0;
    setDisp(d => ({ ...d, score: 0, shots: 0, phase: 'aiming' }));
  }, [initBalls]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const gs = s.current;

    const getBallPhysics = () => gs.balls.some(b => Math.abs(b.vx) > 0.05 || Math.abs(b.vy) > 0.05);

    const onMouseMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      gs.mouseX = (e.clientX-r.left)*(W/r.width);
      gs.mouseY = (e.clientY-r.top)*(H/r.height);
      const cue = gs.balls.find(b => b.isCue);
      if (cue && gs.phase === 'aiming') {
        gs.aimAngle = Math.atan2(gs.mouseY - cue.y, gs.mouseX - cue.x);
        gs.power = Math.min(100, Math.sqrt((gs.mouseX-cue.x)**2+(gs.mouseY-cue.y)**2) / 1.5);
      }
    };
    const onMouseDown = () => { if (gs.phase === 'aiming') gs.dragging = true; };
    const onMouseUp = () => {
      if (gs.phase !== 'aiming' || !gs.dragging) return;
      gs.dragging = false;
      const cue = gs.balls.find(b => b.isCue);
      if (!cue) return;
      const force = (gs.power / 100) * 16;
      cue.vx = Math.cos(gs.aimAngle) * force;
      cue.vy = Math.sin(gs.aimAngle) * force;
      gs.phase = 'shooting'; gs.shots++;
      setDisp(d => ({ ...d, shots: gs.shots, phase: 'shooting' }));
      playTone(500, 0.07, 'sine', 0.12); vibrate(20);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0] || e.changedTouches[0];
      const r = canvas.getBoundingClientRect();
      gs.mouseX = (t.clientX-r.left)*(W/r.width);
      gs.mouseY = (t.clientY-r.top)*(H/r.height);
      const cue = gs.balls.find(b => b.isCue);
      if (cue && gs.phase === 'aiming') {
        gs.aimAngle = Math.atan2(gs.mouseY-cue.y, gs.mouseX-cue.x);
        gs.power = Math.min(100, Math.sqrt((gs.mouseX-cue.x)**2+(gs.mouseY-cue.y)**2)/1.5);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (gs.phase !== 'aiming') return;
      const cue = gs.balls.find(b => b.isCue);
      if (!cue) return;
      const force = (gs.power/100)*16;
      cue.vx = Math.cos(gs.aimAngle)*force; cue.vy = Math.sin(gs.aimAngle)*force;
      gs.phase = 'shooting'; gs.shots++;
      setDisp(d => ({ ...d, shots: gs.shots, phase: 'shooting' }));
      playTone(500, 0.07, 'sine', 0.12); vibrate(20);
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchmove', onTouch, { passive:false });
    canvas.addEventListener('touchend', onTouchEnd, { passive:false });

    const loop = (ts: number) => {
      const gs = s.current;
      const dt = Math.min((ts - gs.lastTime)/16, 3);
      gs.lastTime = ts; gs.frame++;

      ctx.clearRect(0, 0, W, H);

      // Table felt
      const feltGrad = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, 300);
      feltGrad.addColorStop(0, '#1b5e20'); feltGrad.addColorStop(1, '#0a3d0e');
      ctx.fillStyle = '#0a3d0e'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = feltGrad; ctx.fillRect(TL, TT, TR-TL, TB-TT);

      // Rail / cushion
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(0, 0, W, TT); ctx.fillRect(0, TB, W, H-TB);
      ctx.fillRect(0, 0, TL, H); ctx.fillRect(TR, 0, W-TR, H);
      // Rail inset
      ctx.strokeStyle = '#4a2e20'; ctx.lineWidth = 3;
      ctx.strokeRect(TL, TT, TR-TL, TB-TT);

      // Pockets
      gs.pockets.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI*2);
        const pGrad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 16);
        pGrad.addColorStop(0,'#111'); pGrad.addColorStop(1,'#000');
        ctx.fillStyle = pGrad; ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();
      });

      // Physics step
      if (gs.phase === 'shooting') {
        for (let step = 0; step < 3; step++) {
          gs.balls.forEach(ball => {
            if (ball.pocketed) return;
            ball.x += ball.vx * (dt/3);
            ball.y += ball.vy * (dt/3);
            ball.vx *= 0.988;
            ball.vy *= 0.988;

            // Wall bounce
            if (ball.x - ball.r < TL) { ball.x = TL+ball.r; ball.vx = Math.abs(ball.vx)*0.85; playTone(300,0.03,'sine',0.05); }
            if (ball.x + ball.r > TR) { ball.x = TR-ball.r; ball.vx = -Math.abs(ball.vx)*0.85; playTone(300,0.03,'sine',0.05); }
            if (ball.y - ball.r < TT) { ball.y = TT+ball.r; ball.vy = Math.abs(ball.vy)*0.85; playTone(300,0.03,'sine',0.05); }
            if (ball.y + ball.r > TB) { ball.y = TB-ball.r; ball.vy = -Math.abs(ball.vy)*0.85; playTone(300,0.03,'sine',0.05); }

            // Pocket detection
            gs.pockets.forEach(p => {
              const dx = ball.x-p.x, dy = ball.y-p.y;
              if (Math.sqrt(dx*dx+dy*dy) < 16) {
                ball.pocketed = true; ball.vx = 0; ball.vy = 0;
                if (!ball.isCue) {
                  gs.score += 50; setDisp(d => ({ ...d, score: gs.score }));
                  toast.success(`🎱 Ball ${ball.num} pocketed! +50`);
                  playTone(700,0.08,'sine',0.15); vibrate(40);
                  for (let pi = 0; pi < 10; pi++) {
                    const a = Math.random()*Math.PI*2, sp = 2+Math.random()*4;
                    gs.particles.push({ x:p.x, y:p.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, color:ball.color });
                  }
                } else {
                  // Cue ball sunk — respawn
                  setTimeout(() => { ball.x=TL+90; ball.y=(TT+TB)/2; ball.pocketed=false; ball.vx=0; ball.vy=0; }, 600);
                  playTone(150,0.1,'sawtooth',0.2);
                  gs.score = Math.max(0, gs.score-25);
                  toast.error('Cue ball sunk! -25pts');
                }
              }
            });

            // Ball-ball collision
            gs.balls.forEach(b2 => {
              if (b2.id <= ball.id || b2.pocketed) return;
              const dx = b2.x-ball.x, dy = b2.y-ball.y;
              const dist = Math.sqrt(dx*dx+dy*dy);
              if (dist < ball.r+b2.r && dist > 0) {
                const nx = dx/dist, ny = dy/dist;
                const relV = (b2.vx-ball.vx)*nx+(b2.vy-ball.vy)*ny;
                if (relV < 0) {
                  const imp = relV * 0.9;
                  ball.vx += imp*nx; ball.vy += imp*ny;
                  b2.vx -= imp*nx; b2.vy -= imp*ny;
                }
                const overlap = (ball.r+b2.r-dist)/2;
                ball.x -= nx*overlap; ball.y -= ny*overlap;
                b2.x += nx*overlap; b2.y += ny*overlap;
                if (Math.abs(relV) > 0.5) playTone(400+Math.random()*200,0.04,'sine',0.06);
              }
            });
          });
        }

        if (!getBallPhysics()) {
          const remaining = gs.balls.filter(b => !b.pocketed && !b.isCue).length;
          if (remaining === 0) {
            gs.phase = 'win';
            const newBest = Math.max(gs.score, gs.best);
            gs.best = newBest; localStorage.setItem('pool-best', String(newBest));
            setDisp(d => ({ ...d, phase: 'win', best: newBest }));
            toast.success(`🏆 Table cleared! ${gs.score}pts`);
          } else {
            gs.phase = 'aiming';
            setDisp(d => ({ ...d, phase: 'aiming' }));
          }
        }
      }

      // Draw balls
      gs.balls.filter(b => !b.pocketed).forEach(ball => {
        const grad = ctx.createRadialGradient(ball.x-3, ball.y-3, 1, ball.x, ball.y, ball.r);
        grad.addColorStop(0,'rgba(255,255,255,0.4)'); grad.addColorStop(1, ball.color);
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
        if (ball.num > 0) {
          ctx.fillStyle = ball.num > 8 ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)';
          ctx.font = `bold ${ball.r}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(ball.num), ball.x, ball.y);
        }
      });

      // Aim guide
      const cue = gs.balls.find(b => b.isCue && !b.pocketed);
      if (cue && gs.phase === 'aiming') {
        // Dotted aim line
        ctx.strokeStyle = 'rgba(255,255,200,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([5,8]);
        ctx.beginPath(); ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(cue.x + Math.cos(gs.aimAngle)*200, cue.y + Math.sin(gs.aimAngle)*200);
        ctx.stroke(); ctx.setLineDash([]);

        // Cue stick
        ctx.save(); ctx.translate(cue.x, cue.y); ctx.rotate(gs.aimAngle+Math.PI);
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(170, 0); ctx.stroke();
        ctx.strokeStyle = '#D7CCC8'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(20, 0); ctx.stroke();
        ctx.restore();

        // Power bar
        const barX = W/2-70, barY = H-22;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(barX-2, barY-2, 144, 14, 7); ctx.fill();
        const pwGrad = ctx.createLinearGradient(barX, 0, barX+140, 0);
        pwGrad.addColorStop(0,'#66bdf2'); pwGrad.addColorStop(0.5,'#FFD700'); pwGrad.addColorStop(1,'#7b8bc1');
        ctx.fillStyle = pwGrad; ctx.beginPath(); ctx.roundRect(barX, barY, 140*(gs.power/100), 10, 5); ctx.fill();
      }

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= 0.05*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*200).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(8,8,130,30,15); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`🎱 ${gs.score}pts  Shot ${gs.shots}`, 18, 27);

      // Idle
      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.roundRect(W/2-100, H/2-55, 200, 115, 20); ctx.fill();
        ctx.fillStyle = '#66bdf2'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🎱 POOL', W/2, H/2-18);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px system-ui';
        ctx.fillText('Aim & drag to set power, release!', W/2, H/2+10);
        ctx.fillStyle = '#FFD700'; ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${gs.best}pts`, W/2, H/2+35);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [TL, TR, TT, TB]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '100%', cursor: 'crosshair' }}
      />
      <div className="flex gap-3">
        {disp.phase === 'idle' && <Button variant="neon" onClick={reset} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">🎮 Start Game</Button>}
        {(disp.phase === 'win' || disp.phase === 'lose') && <Button variant="neon" onClick={reset} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">▶ New Game</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
