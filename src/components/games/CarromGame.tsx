// src/components/games/CarromGame.tsx — Premium Carrom Physics Canvas Game
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Disc = { id:number; x:number; y:number; vx:number; vy:number; r:number; color:string; pocketed:boolean; isStriker:boolean; isQueen:boolean };
type Particle = { x:number; y:number; vx:number; vy:number; life:number; color:string; r:number };

export function CarromGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'playing'|'won'|'lost',
    discs: [] as Disc[], particles: [] as Particle[],
    strikerX: 0, aimAngle: Math.PI/2, power: 0, powerDir: 1,
    score: 0, shots: 0, queenPocketed: false, queenCovered: false,
    frame: 0, lastTime: 0,
    best: parseInt(localStorage.getItem('carr-best')||'0'),
    pocketedAfterQueen: false,
  });
  const [disp, setDisp] = useState({ score: 0, shots: 0, phase: 'idle' as 'idle'|'playing'|'won'|'lost', best: parseInt(localStorage.getItem('carr-best')||'0') });

  const W = 380, H = 520;
  const BW = 340, BH = 340, BX = (W-BW)/2, BY = (H-BH)/2 - 20;
  const POCKET_R = 18;
  const POCKETS = [{ x:BX+10, y:BY+10 }, { x:BX+BW-10, y:BY+10 }, { x:BX+10, y:BY+BH-10 }, { x:BX+BW-10, y:BY+BH-10 }];
  const STRIKER_Y = BY + BH - 32;

  const initDiscs = useCallback((): Disc[] => {
    const discs: Disc[] = [];
    let id = 0;
    const cx = BX + BW/2, cy = BY + BH/2;
    // Queen
    discs.push({ id: id++, x:cx, y:cy, vx:0, vy:0, r:11, color:'#E91E63', pocketed:false, isStriker:false, isQueen:true });
    // Black coins
    const bPos = [[cx-20,cy],[cx+20,cy],[cx,cy-20],[cx,cy+20],[cx-20,cy-20],[cx+20,cy-20],[cx-20,cy+20],[cx+20,cy+20]];
    const wPos = [[cx-40,cy],[cx+40,cy],[cx,cy-40],[cx,cy+40],[cx-40,cy-40],[cx+40,cy-40],[cx-40,cy+40],[cx+40,cy+40]];
    bPos.forEach(([bx2,by2]) => discs.push({ id:id++, x:bx2, y:by2, vx:0, vy:0, r:10, color:'#1a1a1a', pocketed:false, isStriker:false, isQueen:false }));
    wPos.forEach(([bx2,by2]) => discs.push({ id:id++, x:bx2, y:by2, vx:0, vy:0, r:10, color:'#f5f5f5', pocketed:false, isStriker:false, isQueen:false }));
    // Striker
    discs.push({ id:id++, x:BX+BW/2, y:STRIKER_Y, vx:0, vy:0, r:14, color:'#FFF9C4', pocketed:false, isStriker:true, isQueen:false });
    return discs;
  }, [BX, BW, BY, BH, STRIKER_Y]);

  const isMoving = useCallback(() => s.current.discs.some(d => !d.pocketed && (Math.abs(d.vx)>0.05||Math.abs(d.vy)>0.05)), []);

  const shoot = useCallback(() => {
    const gs = s.current;
    if (gs.phase !== 'playing' || isMoving()) return;
    const striker = gs.discs.find(d => d.isStriker && !d.pocketed);
    if (!striker) return;
    const force = (gs.power / 100) * 15 + 4;
    striker.vx = Math.cos(gs.aimAngle - Math.PI/2) * force;
    striker.vy = Math.sin(gs.aimAngle - Math.PI/2) * force;
    gs.shots++;
    setDisp(d => ({ ...d, shots: gs.shots }));
    playTone(500, 0.06, 'sine', 0.1); vibrate(15);
  }, [isMoving]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); shoot(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [shoot]);

  const startGame = useCallback(() => {
    const gs = s.current;
    gs.discs = initDiscs(); gs.particles = [];
    gs.strikerX = BX + BW/2; gs.aimAngle = Math.PI/2;
    gs.power = 0; gs.powerDir = 1; gs.score = 0; gs.shots = 0;
    gs.queenPocketed = false; gs.queenCovered = false; gs.pocketedAfterQueen = false;
    gs.phase = 'playing';
    setDisp(d => ({ ...d, score: 0, shots: 0, phase: 'playing' }));
  }, [initDiscs, BX, BW]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const gs = s.current;

    const onMouseMove = (e: MouseEvent) => {
      if (gs.phase !== 'playing' || isMoving()) return;
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX-r.left)*(W/r.width), my = (e.clientY-r.top)*(H/r.height);
      const striker = gs.discs.find(d => d.isStriker && !d.pocketed);
      if (!striker) return;
      gs.aimAngle = Math.atan2(my - striker.y, mx - striker.x) + Math.PI/2;
      gs.strikerX = Math.max(BX+40, Math.min(BX+BW-40, mx));
      striker.x = gs.strikerX;
    };
    const onClick = () => { if (!isMoving()) shoot(); };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0]; const r = canvas.getBoundingClientRect();
      const mx = (t.clientX-r.left)*(W/r.width), my = (t.clientY-r.top)*(H/r.height);
      const striker = gs.discs.find(d => d.isStriker && !d.pocketed);
      if (!striker || gs.phase !== 'playing') return;
      gs.aimAngle = Math.atan2(my-striker.y, mx-striker.x) + Math.PI/2;
      gs.strikerX = Math.max(BX+40, Math.min(BX+BW-40, mx)); striker.x = gs.strikerX;
    };
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); if (!isMoving()) shoot(); };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchmove', onTouch, { passive:false });
    canvas.addEventListener('touchend', onTouchEnd, { passive:false });

    const drawBoard = () => {
      // Outer frame
      ctx.fillStyle = '#5d4037';
      ctx.beginPath(); ctx.roundRect(BX-12, BY-12, BW+24, BH+24, 8); ctx.fill();
      // Inner table
      const tg = ctx.createLinearGradient(BX, BY, BX+BW, BY+BH);
      tg.addColorStop(0,'#f5deb3'); tg.addColorStop(0.5,'#e8ca88'); tg.addColorStop(1,'#d4a853');
      ctx.fillStyle = tg; ctx.fillRect(BX, BY, BW, BH);
      // Grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
      for (let gi = 1; gi < 5; gi++) {
        ctx.beginPath(); ctx.moveTo(BX+BW*gi/5, BY); ctx.lineTo(BX+BW*gi/5, BY+BH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(BX, BY+BH*gi/5); ctx.lineTo(BX+BW, BY+BH*gi/5); ctx.stroke();
      }
      // Center circle
      ctx.beginPath(); ctx.arc(BX+BW/2, BY+BH/2, 45, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(BX+BW/2, BY+BH/2, 12, 0, Math.PI*2); ctx.stroke();
      // Baseline
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(BX+30, STRIKER_Y+5); ctx.lineTo(BX+BW-30, STRIKER_Y+5); ctx.stroke();
      // Pockets
      POCKETS.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI*2);
        const pg = ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,POCKET_R);
        pg.addColorStop(0,'#1a0a00'); pg.addColorStop(1,'#000');
        ctx.fillStyle = pg; ctx.fill();
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.stroke();
      });
    };

    const loop = (ts: number) => {
      const gs = s.current;
      const dt = Math.min((ts-gs.lastTime)/16,3);
      gs.lastTime = ts; gs.frame++;

      ctx.clearRect(0,0,W,H);

      // Background
      ctx.fillStyle = '#1a0a00'; ctx.fillRect(0,0,W,H);
      const bgGrad = ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,280);
      bgGrad.addColorStop(0,'rgba(100,60,20,0.2)'); bgGrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = bgGrad; ctx.fillRect(0,0,W,H);

      drawBoard();

      // Power bar (oscillates when not shooting)
      if (gs.phase === 'playing' && !isMoving()) {
        gs.power += gs.powerDir * 1.2 * dt;
        if (gs.power >= 100 || gs.power <= 0) gs.powerDir *= -1;

        // Aim line from striker
        const striker = gs.discs.find(d => d.isStriker && !d.pocketed);
        if (striker) {
          const aimDX = Math.sin(gs.aimAngle), aimDY = -Math.cos(gs.aimAngle);
          ctx.strokeStyle = 'rgba(255,200,0,0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,6]);
          ctx.beginPath(); ctx.moveTo(striker.x, striker.y); ctx.lineTo(striker.x+aimDX*160, striker.y+aimDY*160); ctx.stroke();
          ctx.setLineDash([]);

          // Power bar
          const pBarX = BX, pBarY = BY+BH+18;
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(pBarX-2,pBarY-2,BW+4,16,8); ctx.fill();
          const pwGrad = ctx.createLinearGradient(pBarX,0,pBarX+BW,0);
          pwGrad.addColorStop(0,'#66bdf2'); pwGrad.addColorStop(0.5,'#FFD700'); pwGrad.addColorStop(1,'#7b8bc1');
          ctx.fillStyle = pwGrad; ctx.beginPath(); ctx.roundRect(pBarX,pBarY,BW*gs.power/100,12,6); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('POWER', W/2, pBarY-4);
        }
      }

      // Physics
      if (gs.phase === 'playing') {
        for (let step = 0; step < 3; step++) {
          gs.discs.filter(d => !d.pocketed).forEach(d => {
            d.x += d.vx*(dt/3); d.y += d.vy*(dt/3);
            d.vx *= 0.985; d.vy *= 0.985;
            if (Math.abs(d.vx)<0.04) d.vx=0;
            if (Math.abs(d.vy)<0.04) d.vy=0;
            // Wall bounce
            const margin = d.r + 2;
            if (d.x < BX+margin) { d.x=BX+margin; d.vx=Math.abs(d.vx)*0.82; playTone(300+d.r*10,0.02,'sine',0.04); }
            if (d.x > BX+BW-margin) { d.x=BX+BW-margin; d.vx=-Math.abs(d.vx)*0.82; playTone(300+d.r*10,0.02,'sine',0.04); }
            if (d.y < BY+margin) { d.y=BY+margin; d.vy=Math.abs(d.vy)*0.82; playTone(300+d.r*10,0.02,'sine',0.04); }
            if (d.y > BY+BH-margin) { d.y=BY+BH-margin; d.vy=-Math.abs(d.vy)*0.82; playTone(300+d.r*10,0.02,'sine',0.04); }
            // Pocket check
            POCKETS.forEach(p => {
              const dx=d.x-p.x, dy=d.y-p.y;
              if (Math.sqrt(dx*dx+dy*dy) < POCKET_R+2) {
                d.pocketed=true; d.vx=0; d.vy=0;
                for (let pi=0;pi<10;pi++) { const a=Math.random()*Math.PI*2,sp=2+Math.random()*4; gs.particles.push({x:d.x,y:d.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,color:d.color,r:2+Math.random()*3}); }
                if (d.isStriker) {
                  // Cue disc sunk — respawn
                  setTimeout(()=>{ d.x=BX+BW/2; d.y=STRIKER_Y; d.pocketed=false; },600);
                  gs.score=Math.max(0,gs.score-20);
                  setDisp(d2=>({...d2,score:gs.score}));
                  toast.error('Striker pocketed! -20pts'); playTone(150,0.1,'sawtooth',0.2);
                } else if (d.isQueen) {
                  gs.queenPocketed=true;
                  toast.success('👑 Queen pocketed! Cover with a coin!'); playTone(900,0.1,'sine',0.2);
                } else {
                  gs.score += d.color==='#f5f5f5' ? 10 : 20;
                  if (gs.queenPocketed && !gs.queenCovered) { gs.queenCovered=true; gs.score+=50; toast.success('👑 Queen covered! +50pts!'); }
                  setDisp(d2=>({...d2,score:gs.score}));
                  playTone(650,0.07,'sine',0.12); vibrate(25);
                }
              }
            });
            // Disc-disc collision
            gs.discs.filter(d2=>d2.id>d.id&&!d2.pocketed).forEach(d2=>{
              const dx=d2.x-d.x, dy=d2.y-d.y, dist=Math.sqrt(dx*dx+dy*dy);
              if (dist < d.r+d2.r && dist>0) {
                const nx=dx/dist, ny=dy/dist, rv=(d2.vx-d.vx)*nx+(d2.vy-d.vy)*ny;
                if (rv<0) { const imp=rv*0.88; d.vx+=imp*nx; d.vy+=imp*ny; d2.vx-=imp*nx; d2.vy-=imp*ny; }
                const ov=(d.r+d2.r-dist)/2; d.x-=nx*ov; d.y-=ny*ov; d2.x+=nx*ov; d2.y+=ny*ov;
                if (Math.abs(rv)>0.5) playTone(350+Math.random()*150,0.03,'sine',0.05);
              }
            });
          });
        }

        // Win check
        const remaining = gs.discs.filter(d => !d.pocketed && !d.isStriker && !d.isQueen).length;
        if (remaining===0 && !isMoving()) {
          gs.phase='won';
          const newBest=Math.max(gs.score,gs.best); gs.best=newBest; localStorage.setItem('carr-best',String(newBest));
          setDisp(d=>({...d,phase:'won',best:newBest,score:gs.score}));
          toast.success(`🏆 Table cleared! ${gs.score}pts`);
        }
      }

      // Draw discs
      gs.discs.filter(d=>!d.pocketed).forEach(d=>{
        const grad=ctx.createRadialGradient(d.x-3,d.y-3,1,d.x,d.y,d.r);
        grad.addColorStop(0,'rgba(255,255,255,0.45)'); grad.addColorStop(1,d.color);
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2);
        ctx.fillStyle=grad; ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
        if (d.isQueen) { ctx.fillStyle='#FFD700'; ctx.font='bold 9px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('Q',d.x,d.y); }
        if (d.isStriker) { ctx.strokeStyle='rgba(255,200,0,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(d.x,d.y,d.r+3,0,Math.PI*2); ctx.stroke(); }
      });

      // Particles
      gs.particles.forEach(p=>{
        p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=0.05*dt;
        if(p.life<=0)return;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);
        ctx.fillStyle=p.color+Math.floor(p.life*200).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles=gs.particles.filter(p=>p.life>0);

      // HUD
      ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(8,8,140,30,15); ctx.fill();
      ctx.fillStyle='#FFD700'; ctx.font='bold 14px system-ui'; ctx.textAlign='left';
      ctx.fillText(`⭐ ${gs.score}pts  Shot ${gs.shots}`,18,27);
      if(gs.queenPocketed&&!gs.queenCovered){
        ctx.fillStyle='rgba(233,30,99,0.9)'; ctx.font='bold 12px system-ui'; ctx.textAlign='center';
        ctx.fillText('👑 Cover the Queen!',W/2,BY-5);
      }

      // Idle
      if(gs.phase==='idle'){
        ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.roundRect(W/2-105,BY+BH/2-55,210,115,20); ctx.fill();
        ctx.fillStyle='#E91E63'; ctx.font='bold 22px system-ui'; ctx.textAlign='center';
        ctx.fillText('🎯 CARROM',W/2,BY+BH/2-18);
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='13px system-ui';
        ctx.fillText('Aim with mouse, click to shoot!',W/2,BY+BH/2+10);
        ctx.fillStyle='#FFD700'; ctx.font='12px system-ui';
        ctx.fillText(`Best: ${gs.best}pts`,W/2,BY+BH/2+35);
      }

      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove',onMouseMove);
      canvas.removeEventListener('click',onClick);
      canvas.removeEventListener('touchmove',onTouch);
      canvas.removeEventListener('touchend',onTouchEnd);
    };
  }, [BX,BW,BY,BH,STRIKER_Y,isMoving,shoot]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none cursor-crosshair"
        style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.6)', maxWidth:'100%' }}
      />
      <div className="flex gap-3">
        {disp.phase==='idle' && <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">🎮 Start</Button>}
        {(disp.phase==='won'||disp.phase==='lost') && <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">▶ New Game</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
