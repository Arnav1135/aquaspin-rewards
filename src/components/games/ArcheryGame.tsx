// src/components/games/ArcheryGame.tsx — Infinite Procedural 4D Archery
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; r:number };

export function ArcheryGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  
  const s = useRef({
    phase: 'idle' as 'idle'|'aiming'|'flying'|'result'|'dead'|'warp',
    aimX: 0, aimY: 0, power: 0, charging: false, chargeDir: 1,
    arrowX: 0, arrowY: 0, arrowVX: 0, arrowVY: 0, arrowAngle: 0,
    windX: 0, particles: [] as Particle[],
    targetX: 0, targetY: 0, baseTargetY: 0, targetVelocity: 0,
    arrows: [] as { x:number; y:number; angle:number }[],
    
    // Infinite Progression State
    score: 0,
    level: 1,
    levelScore: 0,
    targetScore: 100,
    arrowsLeft: 3,
    isWarping: false,
    
    best: parseInt(localStorage.getItem('arch-best')||'0'),
    roundResult: '',
    frame: 0, lastTime: 0,
  });

  const [disp, setDisp] = useState({ 
    score: 0, level: 1, arrowsLeft: 3, targetScore: 100, levelScore: 0,
    phase: 'idle' as 'idle'|'aiming'|'flying'|'result'|'dead'|'warp', 
    best: parseInt(localStorage.getItem('arch-best')||'0'), 
    roundResult: '',
    isWarping: false
  });
  
  const W = 400, H = 500;

  const syncDisp = () => {
    const gs = s.current;
    setDisp(d => ({ 
      ...d, 
      score: gs.score, level: gs.level, arrowsLeft: gs.arrowsLeft,
      targetScore: gs.targetScore, levelScore: gs.levelScore,
      phase: gs.phase, roundResult: gs.roundResult, best: gs.best,
      isWarping: gs.isWarping
    }));
  };

  const nextLevel = useCallback(() => {
    const gs = s.current;
    gs.level++;
    gs.targetScore = gs.level * 120;
    gs.levelScore = 0;
    gs.arrowsLeft = 3;
    gs.isWarping = false;
    gs.phase = 'aiming';
    
    // Procedural Difficulty Scaling
    gs.targetX = 260 + Math.random() * 80;
    gs.baseTargetY = 120 + Math.random() * 160;
    gs.targetY = gs.baseTargetY;
    gs.windX = (Math.random() - 0.5) * (3 + gs.level * 0.8); // Wind gets stronger
    
    gs.aimX = 80; gs.aimY = H - 80;
    gs.power = 0; gs.chargeDir = 1;
    gs.arrows = []; gs.roundResult = `Level ${gs.level} Start!`;
    syncDisp();
  }, []);

  const nextArrow = useCallback(() => {
    const gs = s.current;
    gs.aimX = 80; gs.aimY = H - 80;
    gs.power = 0; gs.chargeDir = 1;
    gs.phase = 'aiming';
    gs.roundResult = '';
    syncDisp();
  }, []);

  const startGame = useCallback(() => {
    const gs = s.current;
    gs.score = 0; gs.level = 0;
    nextLevel();
  }, [nextLevel]);

  const triggerWarp = useCallback(() => {
    const gs = s.current;
    gs.phase = 'warp';
    gs.isWarping = true;
    gs.roundResult = `Level ${gs.level} Cleared! 🚀`;
    playTone(400, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(600, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(800, 0.4, 'sine', 0.2), 200);
    syncDisp();
    
    setTimeout(() => {
       nextLevel();
    }, 1800); // 1.8s warp animation
  }, [nextLevel]);

  const gameOver = useCallback(() => {
    const gs = s.current;
    const newBest = Math.max(gs.score, gs.best);
    gs.best = newBest; localStorage.setItem('arch-best', String(newBest));
    gs.phase = 'dead';
    syncDisp();
    toast.error(`Game Over! Final Score: ${gs.score}`, { icon: '💀' });
  }, []);

  const shoot = useCallback(() => {
    const gs = s.current;
    if (gs.phase !== 'aiming') return;
    gs.phase = 'flying';
    gs.arrowsLeft--;
    
    const power = (gs.power / 100) * 18 + 6;
    const angle = Math.atan2(gs.targetY - gs.aimY, gs.targetX - gs.aimX);
    gs.arrowX = gs.aimX; gs.arrowY = gs.aimY;
    gs.arrowVX = Math.cos(angle) * power; gs.arrowVY = Math.sin(angle) * power;
    gs.arrowAngle = angle;
    playTone(700, 0.06, 'sine', 0.1); vibrate(20);
    syncDisp();
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
    
    if (gs.phase === 'idle') {
        gs.targetX = 280; gs.targetY = 180; gs.aimX = 80; gs.aimY = H - 80;
    }

    const drawTarget = (x: number, y: number) => {
      // Add slight 3D shadow based on level
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      
      const rings = [40, 32, 22, 14, 6];
      const colors = ['#FFFFFF', '#000000', '#66bdf2', '#7b8bc1', '#FFD700'];
      rings.forEach((r, i) => {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = colors[i]; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.shadowColor = 'transparent';
    };

    const drawArcher = (x: number, y: number) => {
      ctx.fillStyle = '#66bdf2';
      ctx.beginPath(); ctx.ellipse(x, y-10, 12, 20, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFDBA0'; ctx.beginPath(); ctx.arc(x, y-36, 10, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#795548'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x+10, y-10, 22, -Math.PI*0.65, Math.PI*0.65); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x+10, y-10-22*Math.sin(0.65));
      ctx.lineTo(x+24, y-10);
      ctx.lineTo(x+10, y-10+22*Math.sin(0.65));
      ctx.stroke();
    };

    const drawArrow = (x: number, y: number, angle: number, length = 40) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      
      // Dynamic depth scaling for 4D feel (simulate Z axis towards target)
      let scale = 1;
      if (gs.phase === 'flying' && x > 100) {
          scale = Math.max(0.6, 1 - ((x - 100) / 400) * 0.4);
      }
      ctx.scale(scale, scale);
      
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

      ctx.fillStyle = '#1b5e20';
      for (let hi = 0; hi < 4; hi++) {
        ctx.beginPath(); ctx.arc(hi*120+40, H-60, 80, 0, Math.PI); ctx.fill();
      }
      ctx.fillStyle = '#2e7d32'; ctx.fillRect(0, H-40, W, 40);

      // HUD 
      const windStr = Math.abs(gs.windX).toFixed(1);
      const windDir = gs.windX > 0 ? '→' : '←';
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(W/2-55, 10, 110, 28, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`💨 Wind: ${windStr} ${windDir}`, W/2, 28);

      // Procedural Target Movement
      if (gs.level >= 2 && gs.phase !== 'idle' && gs.phase !== 'dead') {
         // Level 2: slow vertical. Level 5+: fast vertical + erratic.
         const speed = Math.max(10, 60 - gs.level * 4);
         gs.targetY = gs.baseTargetY + Math.sin(gs.frame / speed) * Math.min(80, 20 + gs.level * 5);
      }

      ctx.strokeStyle = '#795548'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(gs.targetX, gs.targetY+40); ctx.lineTo(gs.targetX, H-40); ctx.stroke();
      drawTarget(gs.targetX, gs.targetY);
      drawArcher(gs.aimX, gs.aimY);

      if (gs.phase === 'aiming') {
        gs.power = Math.max(0, Math.min(100, gs.power + gs.chargeDir * (1.5 + gs.level*0.1) * dt));
        if (gs.power >= 100 || gs.power <= 0) gs.chargeDir *= -1;

        ctx.strokeStyle = `rgba(255,200,0,${0.3 + gs.power/200})`;
        ctx.lineWidth = 1; ctx.setLineDash([5, 8]);
        ctx.beginPath(); ctx.moveTo(gs.aimX+24, gs.aimY-10); ctx.lineTo(gs.targetX, gs.targetY); ctx.stroke();
        ctx.setLineDash([]);

        const barW = 140, barX = (W - barW) / 2, barY = H - 28;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(barX-2, barY-2, barW+4, 18, 9); ctx.fill();
        const powerColor = gs.power < 40 ? '#66bdf2' : gs.power < 70 ? '#FFD700' : '#7b8bc1';
        const grad = ctx.createLinearGradient(barX, 0, barX+barW, 0);
        grad.addColorStop(0, '#66bdf2'); grad.addColorStop(0.6, '#FFD700'); grad.addColorStop(1, '#7b8bc1');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(barX, barY, barW*gs.power/100, 14, 7); ctx.fill();
        ctx.fillStyle = powerColor; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(`POWER: ${Math.floor(gs.power)}%`, W/2, barY - 5);
      }

      if (gs.phase === 'flying') {
        gs.arrowVX += gs.windX * 0.04 * dt;
        gs.arrowVY += 0.18 * dt;
        gs.arrowX += gs.arrowVX * dt;
        gs.arrowY += gs.arrowVY * dt;
        gs.arrowAngle = Math.atan2(gs.arrowVY, gs.arrowVX);

        if (gs.frame % 2 === 0) {
          gs.particles.push({ x: gs.arrowX, y: gs.arrowY, vx: 0, vy: 0, life: 0.6, color: '#FFFFFF', r: 3 });
        }

        drawArrow(gs.arrowX, gs.arrowY, gs.arrowAngle);

        const dx = gs.arrowX - gs.targetX, dy = gs.arrowY - gs.targetY;
        const dist = Math.sqrt(dx*dx+dy*dy);
        
        if (dist < 42) {
          let pts = 0, label = '';
          if (dist < 6) { pts = 100; label = '🏆 BULLSEYE! +100'; }
          else if (dist < 14) { pts = 80; label = '🎯 Inner! +80'; }
          else if (dist < 22) { pts = 60; label = '✅ Good! +60'; }
          else if (dist < 32) { pts = 40; label = '👍 OK! +40'; }
          else { pts = 20; label = '📌 Edge! +20'; }
          
          gs.score += pts;
          gs.levelScore += pts; 
          gs.roundResult = label;
          gs.arrows.push({ x: gs.arrowX, y: gs.arrowY, angle: gs.arrowAngle });
          
          for (let pi = 0; pi < 20; pi++) {
            const a = Math.random()*Math.PI*2, sp = 3+Math.random()*6;
            gs.particles.push({ x: gs.arrowX, y: gs.arrowY, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 1, color: pts===100?'#FFD700':'#66bdf2', r: 4+Math.random()*4 });
          }
          
          playTone(pts >= 80 ? 900 : 600, 0.08, 'sine', 0.15); vibrate(pts >= 80 ? 60 : 20);
          gs.phase = 'result';
          syncDisp();

          setTimeout(() => {
            if (gs.levelScore >= gs.targetScore) {
               triggerWarp();
            } else if (gs.arrowsLeft === 0) {
               gameOver();
            } else {
               nextArrow();
            }
          }, 1500);
          
        } else if (gs.arrowX > W+40 || gs.arrowY > H || gs.arrowX < 0) {
          gs.roundResult = '❌ Missed! +0';
          gs.phase = 'result';
          syncDisp();
          playTone(200, 0.08, 'sine', 0.15); vibrate(60);
          
          setTimeout(() => {
            if (gs.levelScore >= gs.targetScore) {
               triggerWarp();
            } else if (gs.arrowsLeft === 0) {
               gameOver();
            } else {
               nextArrow();
            }
          }, 1200);
        }
      }

      gs.arrows.forEach(ar => drawArrow(ar.x, ar.y, ar.angle));

      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.15*dt; p.life -= 0.04*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*220).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Score HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(8, 8, 200, 48, 8); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`LVL ${gs.level} GOAL: ${gs.levelScore}/${gs.targetScore}`, 16, 24);
      
      // Arrows remaining display
      ctx.fillStyle = '#fff';
      ctx.fillText(`Arrows: `, 16, 44);
      for(let i=0; i<gs.arrowsLeft; i++){
          ctx.fillStyle = '#66bdf2';
          ctx.beginPath(); ctx.moveTo(75 + i*14, 40); ctx.lineTo(82 + i*14, 38); ctx.lineTo(82 + i*14, 42); ctx.fill();
      }

      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#66bdf2'; ctx.font = 'bold 28px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('4D ARCHERY', W/2, H/2 - 20);
      } else if (gs.roundResult) {
        ctx.fillStyle = gs.roundResult.includes('Miss') ? '#7b8bc1' : '#FFD700';
        ctx.font = 'bold 24px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(gs.roundResult, W/2, H/2 - 40);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nextLevel, triggerWarp, nextArrow, gameOver]);

  return (
    <GameFrame 
      title="4D Archery" 
      onClose={onClose} 
      score={disp.score} 
      level={disp.level}
      isWarping={disp.isWarping}
    >
      <div className="flex-1 w-full flex items-center justify-center bg-black">
        <div className="relative" style={{ width: 400, height: 500, maxWidth: '100%', aspectRatio: '4/5' }}>
          <canvas
            ref={canvasRef}
            width={400}
            height={500}
            className="w-full h-full object-contain rounded-xl shadow-2xl"
            style={{ 
              background: '#000', 
              transition: 'transform 0.1s ease',
              transform: disp.isWarping ? 'scale(1.05)' : 'scale(1)',
              filter: disp.isWarping ? 'brightness(1.5) contrast(1.2)' : 'none'
            }}
            onClick={shoot}
          />

          {disp.phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/60 rounded-xl z-10 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 border-2 border-cyan-400/50">
                <span className="text-3xl">🏹</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">Infinite Archery</h2>
              <p className="text-gray-300 text-center text-sm mb-6 max-w-[250px]">
                Hit targets to reach the goal score. Wind and target speed scale infinitely!
              </p>
              <Button onClick={startGame} size="lg" className="w-48 shadow-lg shadow-blue-500/30 w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" variant="neon">
                Play Now
              </Button>
            </div>
          )}
          
          {disp.phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-xl z-10 backdrop-blur-md">
              <h2 className="text-white text-3xl font-bold mb-2">Game Over</h2>
              <div className="flex gap-6 mb-8 text-center mt-4">
                <div>
                  <p className="text-gray-400 text-sm">Level Reached</p>
                  <p className="text-cyan-300 text-2xl font-bold">{disp.level}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Score</p>
                  <p className="text-white text-2xl font-bold">{disp.score}</p>
                </div>
              </div>
              <Button onClick={startGame} size="lg" className="w-48 shadow-lg shadow-blue-500/30 w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" variant="neon">
                Play Again
              </Button>
            </div>
          )}
          
          {(disp.phase === 'aiming' || disp.phase === 'flying' || disp.phase === 'result' || disp.phase === 'warp') && (
             <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
               <Button onClick={shoot} disabled={disp.phase !== 'aiming'} className="pointer-events-auto opacity-70 hover:opacity-100 w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" variant="neon" size="lg">
                 {disp.phase === 'warp' ? 'WARPING...' : 'SHOOT (Space)'}
               </Button>
             </div>
          )}
        </div>
      </div>
    </GameFrame>
  );
}
