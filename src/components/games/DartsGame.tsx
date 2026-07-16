// src/components/games/DartsGame.tsx — Premium Darts Canvas Game
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }
type Dart = { x: number; y: number; score: number; label: string };
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; r:number };

export function DartsGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'playing'|'result',
    darts: [] as Dart[], particles: [] as Particle[],
    totalScore: 0, throwsLeft: 10, lastScore: '',
    best: parseInt(localStorage.getItem('drt-best')||'0'),
    frame: 0, lastTime: 0,
    // Oscillating cursor
    cursorAngle: 0, cursorR: 0, cursorDir: 1,
    sway: 0, swayDir: 1,
    throwPending: false,
  });
  const [disp, setDisp] = useState({ score: 0, throwsLeft: 10, phase: 'idle' as 'idle'|'playing'|'result', best: parseInt(localStorage.getItem('drt-best')||'0'), lastScore: '' });
  const W = 380, H = 520;
  const CX = W / 2, CY = 200;

  const SECTORS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];


  const getScore = (dx: number, dy: number): { pts: number; label: string } => {
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist > 175) return { pts: 0, label: 'Miss' };
    if (dist <= 10) return { pts: 50, label: 'BULLSEYE! 🎯' };
    if (dist <= 25) return { pts: 25, label: 'Bull! ✅' };
    const sectorAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    const idx = Math.floor(((sectorAngle + 360 + 9) / 18) % 20);
    const base = SECTORS[idx % 20];
    if (dist > 105 && dist <= 115) return { pts: base * 3, label: `Triple ${base} ×3! 🔥` };
    if (dist > 165 && dist <= 175) return { pts: base * 2, label: `Double ${base} ×2!` };
    return { pts: base, label: `${base}` };
  };

  const throw_ = useCallback(() => {
    const gs = s.current;
    if (gs.phase !== 'playing' || gs.throwPending) return;
    gs.throwPending = true;
    // Add randomness around cursor position
    const noise = 12;
    const hitX = CX + gs.cursorR * Math.cos(gs.cursorAngle) + (Math.random()-0.5)*noise;
    const hitY = CY + gs.cursorR * Math.sin(gs.cursorAngle) + gs.sway + (Math.random()-0.5)*noise;
    const dx = hitX - CX, dy = hitY - CY;
    const { pts, label } = getScore(dx, dy);
    gs.darts.push({ x: hitX, y: hitY, score: pts, label });
    gs.totalScore += pts; gs.throwsLeft--; gs.lastScore = label;
    // Particles
    const color = pts >= 50 ? '#FFD700' : pts >= 25 ? '#66bdf2' : pts > 20 ? '#66bdf2' : '#aaa';
    for (let pi = 0; pi < 10; pi++) {
      const a = Math.random()*Math.PI*2, sp = 2+Math.random()*5;
      gs.particles.push({ x: hitX, y: hitY, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 1, color, r: 2+Math.random()*3 });
    }
    playTone(pts >= 50 ? 900 : pts >= 20 ? 600 : 350, 0.07, 'sine', 0.12); vibrate(30);
    if (pts >= 50) toast.success(`🏆 ${label} +${pts}pts!`);
    else if (pts >= 20) toast.success(`🎯 ${label} +${pts}pts`);
    setDisp(d => ({ ...d, score: gs.totalScore, throwsLeft: gs.throwsLeft, lastScore: label }));
    gs.throwPending = false;
    if (gs.throwsLeft <= 0) {
      gs.phase = 'result';
      const newBest = Math.max(gs.totalScore, gs.best);
      gs.best = newBest; localStorage.setItem('drt-best', String(newBest));
      setDisp(d => ({ ...d, phase: 'result', best: newBest }));
      toast.success(`🎉 Final: ${gs.totalScore}pts | Best: ${newBest}`);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); throw_(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [throw_]);

  const startGame = useCallback(() => {
    const gs = s.current;
    gs.phase = 'playing'; gs.darts = []; gs.particles = [];
    gs.totalScore = 0; gs.throwsLeft = 10; gs.lastScore = '';
    gs.cursorAngle = 0; gs.cursorR = 0; gs.cursorDir = 1; gs.sway = 0; gs.swayDir = 1;
    setDisp(d => ({ ...d, score: 0, throwsLeft: 10, phase: 'playing', lastScore: '' }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const drawBoard = () => {
      // Board bg
      ctx.beginPath(); ctx.arc(CX, CY, 180, 0, Math.PI*2);
      ctx.fillStyle = '#1a1a2e'; ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.stroke();

      // Sector wedges
      const sectorAngle = Math.PI * 2 / 20;
      SECTORS.forEach((num, i) => {
        const startA = (i * sectorAngle) - Math.PI/2 - sectorAngle/2;
        const endA = startA + sectorAngle;
        // Outer single
        ctx.beginPath(); ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, 165, startA, endA);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#1b1b2e' : '#2a2a4e'; ctx.fill();
        // Double ring
        ctx.beginPath(); ctx.moveTo(CX + Math.cos(startA)*165, CY + Math.sin(startA)*165);
        ctx.arc(CX, CY, 175, startA, endA);
        ctx.arc(CX, CY, 165, endA, startA, true);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#c62828' : '#2e7d32'; ctx.fill();
        // Inner single
        ctx.beginPath(); ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, 115, startA, endA);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#1b1b2e' : '#2a2a4e'; ctx.fill();
        // Triple ring
        ctx.beginPath(); ctx.moveTo(CX + Math.cos(startA)*115, CY + Math.sin(startA)*115);
        ctx.arc(CX, CY, 105, startA, endA);
        ctx.arc(CX, CY, 115, endA, startA, true);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#c62828' : '#2e7d32'; ctx.fill();

        // Sector number
        const labelR = 140;
        const midA = startA + sectorAngle/2;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(num), CX + Math.cos(midA)*labelR, CY + Math.sin(midA)*labelR);
      });
      // Bull
      ctx.beginPath(); ctx.arc(CX, CY, 25, 0, Math.PI*2); ctx.fillStyle = '#c62828'; ctx.fill();
      ctx.beginPath(); ctx.arc(CX, CY, 10, 0, Math.PI*2); ctx.fillStyle = '#00cc44'; ctx.fill();

      // Wire ring outlines
      [10,25,105,115,165,175].forEach(r => {
        ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
      });
    };

    const loop = (timestamp: number) => {
      const gs = s.current;
      const dt = Math.min((timestamp - gs.lastTime) / 16, 3);
      gs.lastTime = timestamp; gs.frame++;

      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = '#1a0a2e'; ctx.fillRect(0, 0, W, H);
      // Board shadow/glow
      const glow = ctx.createRadialGradient(CX, CY, 80, CX, CY, 200);
      glow.addColorStop(0, 'rgba(74,144,217,0.12)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      drawBoard();

      // Oscillating cursor
      if (gs.phase === 'playing') {
        gs.cursorAngle += 0.04 * dt;
        gs.cursorR += gs.cursorDir * 0.8 * dt;
        if (gs.cursorR > 80 || gs.cursorR < 0) gs.cursorDir *= -1;
        gs.sway += gs.swayDir * 0.5 * dt;
        if (gs.sway > 20 || gs.sway < -20) gs.swayDir *= -1;

        const curX = CX + gs.cursorR * Math.cos(gs.cursorAngle);
        const curY = CY + gs.cursorR * Math.sin(gs.cursorAngle) + gs.sway;

        // Crosshair
        ctx.strokeStyle = 'rgba(255,50,50,0.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(curX-14, curY); ctx.lineTo(curX+14, curY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(curX, curY-14); ctx.lineTo(curX, curY+14); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(curX, curY, 7, 0, Math.PI*2);
        ctx.strokeStyle = 'rgba(255,50,50,0.8)'; ctx.lineWidth = 2; ctx.stroke();
      }

      // Embedded darts
      gs.darts.forEach((d, i) => {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(-Math.PI/4);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-3, 6); ctx.lineTo(3, 6); ctx.closePath(); ctx.fill();
        // Score pop
        if (i === gs.darts.length - 1 && gs.frame < 40) {
          ctx.rotate(Math.PI/4);
          ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(`+${d.score}`, 0, -30);
        }
        ctx.restore();
      });

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= 0.05*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*220).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.roundRect(0, H-90, W, 90, [0,0,0,0]); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(String(gs.totalScore), W/2, H-52);
      ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui';
      ctx.fillText(`Throws: ${gs.throwsLeft} left`, W/2, H-30);
      if (gs.lastScore) {
        ctx.fillStyle = '#66bdf2'; ctx.font = 'bold 13px system-ui';
        ctx.fillText(gs.lastScore, W/2, H-10);
      }

      // Idle
      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(W/2-100, CY+50, 200, 100, 20); ctx.fill();
        ctx.fillStyle = '#7b8bc1'; ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🎯 DARTS', W/2, CY+85);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px system-ui';
        ctx.fillText('Tap when cursor is on target!', W/2, CY+110);
        ctx.fillStyle = '#FFD700'; ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${gs.best}pts`, W/2, CY+132);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none cursor-crosshair"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: '100%' }}
        onClick={disp.phase === 'idle' ? startGame : throw_}
        onTouchStart={e => { e.preventDefault(); if (disp.phase === 'idle') startGame(); else throw_(); }}
      />
      <div className="flex gap-3">
        {disp.phase === 'result' && <Button variant="primary" onClick={startGame}>▶ Play Again</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
