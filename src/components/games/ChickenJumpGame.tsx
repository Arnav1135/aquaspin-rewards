// src/components/games/ChickenJumpGame.tsx — Premium Endless Runner
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Obstacle = { x: number; w: number; h: number; type: 'cactus' | 'rock' | 'log' };
type Coin = { x: number; y: number; collected: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Cloud = { x: number; y: number; w: number; speed: number };

export function ChickenJumpGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'playing'|'dead',
    chickenY: 0, chickenVY: 0, onGround: false,
    obstacles: [] as Obstacle[], coins: [] as Coin[], particles: [] as Particle[],
    clouds: [] as Cloud[], stars: [] as { x:number; y:number; r:number }[],
    score: 0, dist: 0, speed: 4, spawnTimer: 0, coinTimer: 0,
    frame: 0, lastTime: 0, wingFrame: 0,
    best: parseInt(localStorage.getItem('cj-best') || '0'),
    groundY: 0, doubleJump: false,
  });
  const [disp, setDisp] = useState({ score: 0, phase: 'idle' as 'idle'|'playing'|'dead', best: parseInt(localStorage.getItem('cj-best')||'0') });
  const W = 420, H = 480, GROUND_Y = H - 60, CHICK_X = 80;

  const jump = useCallback(() => {
    const gs = s.current;
    if (gs.phase === 'idle') {
      gs.phase = 'playing'; gs.lastTime = performance.now();
      setDisp(d => ({ ...d, phase: 'playing' }));
    }
    if (gs.phase !== 'playing') return;
    if (gs.onGround) { gs.chickenVY = -12; gs.onGround = false; gs.doubleJump = true; playTone(580, 0.04, 'sine', 0.08); vibrate(12); }
    else if (gs.doubleJump) { gs.chickenVY = -10; gs.doubleJump = false; playTone(680, 0.04, 'sine', 0.08); vibrate(12); }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  const restart = useCallback(() => {
    const gs = s.current;
    gs.phase = 'idle'; gs.chickenY = GROUND_Y - 40; gs.chickenVY = 0; gs.onGround = true;
    gs.obstacles = []; gs.coins = []; gs.particles = []; gs.score = 0; gs.dist = 0;
    gs.speed = 4; gs.spawnTimer = 0; gs.coinTimer = 0; gs.frame = 0; gs.doubleJump = false;
    setDisp(d => ({ ...d, score: 0, phase: 'idle' }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const gs = s.current;
    gs.chickenY = GROUND_Y - 40; gs.onGround = true;
    gs.clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 100, y: 40 + Math.random()*80, w: 60+Math.random()*60, speed: 0.5+Math.random()*0.5 }));
    gs.stars = Array.from({ length: 30 }, () => ({ x: Math.random()*W, y: Math.random()*(GROUND_Y*0.6), r: 0.5+Math.random() }));

    const drawChicken = (x: number, y: number, onGround: boolean, wingFrame: number) => {
      ctx.save(); ctx.translate(x, y);
      // Body
      const bodyGrad = ctx.createRadialGradient(-4, -4, 4, 0, 0, 22);
      bodyGrad.addColorStop(0, '#FFE082'); bodyGrad.addColorStop(1, '#F9A825');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI*2); ctx.fill();
      // Wing animation
      const wingY = onGround ? 0 : Math.sin(wingFrame * 0.4) * 6;
      ctx.fillStyle = '#FFC107';
      ctx.beginPath(); ctx.ellipse(-8, wingY, 14, 8, -0.3, 0, Math.PI*2); ctx.fill();
      // Head
      ctx.fillStyle = '#FFE082';
      ctx.beginPath(); ctx.arc(18, -10, 12, 0, Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(22, -12, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(23, -13, 1.2, 0, Math.PI*2); ctx.fill();
      // Beak
      ctx.fillStyle = '#FF8F00';
      ctx.beginPath(); ctx.moveTo(30, -10); ctx.lineTo(38, -8); ctx.lineTo(30, -6); ctx.closePath(); ctx.fill();
      // Comb
      ctx.fillStyle = '#E53935';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(14+i*4, -22+i*1.5, 4, 0, Math.PI*2); ctx.fill();
      }
      // Legs
      const legBob = onGround ? 0 : Math.sin(wingFrame * 0.5) * 5;
      ctx.strokeStyle = '#E65100'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-5, 16); ctx.lineTo(-10+legBob, 34); ctx.moveTo(-10+legBob, 34); ctx.lineTo(-16+legBob, 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, 16); ctx.lineTo(10-legBob, 34); ctx.moveTo(10-legBob, 34); ctx.lineTo(16-legBob, 38); ctx.stroke();
      ctx.restore();
    };

    const drawObstacle = (ob: Obstacle) => {
      if (ob.type === 'cactus') {
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.roundRect(ob.x + ob.w/2 - 8, GROUND_Y - ob.h, 16, ob.h, [4,4,0,0]); ctx.fill();
        ctx.beginPath(); ctx.roundRect(ob.x + ob.w/2 - 18, GROUND_Y - ob.h*0.6, 10, ob.h*0.4, [4,4,0,0]); ctx.fill();
        ctx.beginPath(); ctx.roundRect(ob.x + ob.w/2 + 8, GROUND_Y - ob.h*0.7, 10, ob.h*0.45, [4,4,0,0]); ctx.fill();
      } else if (ob.type === 'rock') {
        const rg = ctx.createLinearGradient(ob.x, GROUND_Y-ob.h, ob.x+ob.w, GROUND_Y);
        rg.addColorStop(0, '#78909c'); rg.addColorStop(1, '#455a64');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.ellipse(ob.x+ob.w/2, GROUND_Y-ob.h/2, ob.w/2, ob.h/2, 0, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = '#795548';
        ctx.beginPath(); ctx.roundRect(ob.x, GROUND_Y-ob.h, ob.w, ob.h, 4); ctx.fill();
        // Wood grain
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1;
        for (let li = 1; li < 3; li++) {
          ctx.beginPath(); ctx.moveTo(ob.x, GROUND_Y-ob.h+li*ob.h/3); ctx.lineTo(ob.x+ob.w, GROUND_Y-ob.h+li*ob.h/3); ctx.stroke();
        }
      }
    };

    const loop = (timestamp: number) => {
      const gs = s.current;
      const dt = Math.min((timestamp - gs.lastTime) / 16, 3);
      gs.lastTime = timestamp; gs.frame++;

      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, '#0d47a1'); sky.addColorStop(1, '#1976d2');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND_Y);

      // Stars
      gs.stars.forEach(st => {
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${0.3+0.7*Math.abs(Math.sin(gs.frame*0.03+st.x))})`; ctx.fill();
      });

      // Clouds
      gs.clouds.forEach(cl => {
        if (gs.phase === 'playing') cl.x -= cl.speed * dt;
        if (cl.x + cl.w < 0) cl.x = W + 20;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w, 18, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cl.x - cl.w*0.3, cl.y + 4, cl.w*0.5, 14, 0, 0, Math.PI*2); ctx.fill();
      });

      // Ground
      ctx.fillStyle = '#33691e'; ctx.fillRect(0, GROUND_Y, W, H-GROUND_Y);
      ctx.fillStyle = '#558b2f'; ctx.fillRect(0, GROUND_Y, W, 8);
      // Dashes
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let gi = -(gs.frame*gs.speed*dt%60); gi < W; gi += 60) { ctx.fillRect(gi, GROUND_Y+4, 30, 3); }

      if (gs.phase === 'playing') {
        gs.dist += gs.speed * dt;
        gs.score = Math.floor(gs.dist / 10);
        gs.speed = Math.min(10, 4 + gs.dist / 2000);
        setDisp(d => d.score !== gs.score ? { ...d, score: gs.score } : d);

        // Physics
        gs.chickenVY += 0.55 * dt;
        gs.chickenY += gs.chickenVY * dt;
        gs.wingFrame++;
        if (gs.chickenY >= GROUND_Y - 40) {
          gs.chickenY = GROUND_Y - 40; gs.chickenVY = 0;
          gs.onGround = true; gs.doubleJump = false;
        } else { gs.onGround = false; }

        // Spawn obstacles
        gs.spawnTimer += dt;
        if (gs.spawnTimer > Math.max(55, 90 - gs.dist/200)) {
          gs.spawnTimer = 0;
          const types: Obstacle['type'][] = ['cactus','rock','log'];
          const type = types[Math.floor(Math.random()*3)];
          const h = 35 + Math.random()*30;
          gs.obstacles.push({ x: W+20, w: type==='log'?50:28, h, type });
        }
        // Spawn coins
        gs.coinTimer += dt;
        if (gs.coinTimer > 40) {
          gs.coinTimer = 0;
          const coinY = GROUND_Y - 60 - Math.random()*80;
          for (let ci = 0; ci < 3; ci++) gs.coins.push({ x: W + ci*40, y: coinY, collected: false });
        }

        // Update obstacles
        gs.obstacles.forEach(ob => { ob.x -= gs.speed * dt; });
        gs.obstacles = gs.obstacles.filter(ob => ob.x + ob.w > -20);
        gs.coins.forEach(coin => { coin.x -= gs.speed * dt; });
        gs.coins = gs.coins.filter(c => c.x > -20);

        // Collision
        const cx2 = CHICK_X, cy2 = gs.chickenY;
        for (const ob of gs.obstacles) {
          if (cx2+16 > ob.x && cx2-16 < ob.x+ob.w && cy2+16 > GROUND_Y-ob.h && cy2-16 < GROUND_Y) {
            gs.phase = 'dead';
            const newBest = Math.max(gs.score, gs.best);
            gs.best = newBest; localStorage.setItem('cj-best', String(newBest));
            setDisp({ score: gs.score, phase: 'dead', best: newBest });
            for (let pi = 0; pi < 14; pi++) {
              const a = Math.random()*Math.PI*2, sp = 3+Math.random()*6;
              gs.particles.push({ x: cx2, y: cy2, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp-3, life: 1, color: '#FFE082' });
            }
            playTone(150, 0.2, 'sawtooth', 0.3); vibrate(150);
            toast.error(`Score: ${gs.score} | Best: ${newBest}`);
            break;
          }
        }
        // Coin collection
        gs.coins.forEach(coin => {
          if (!coin.collected && Math.abs(cx2-coin.x)<20 && Math.abs(cy2-coin.y)<20) {
            coin.collected = true; gs.score += 10;
            gs.particles.push({ x: coin.x, y: coin.y, vx: 0, vy: -4, life: 1, color: '#FFD700' });
            playTone(900, 0.03, 'sine', 0.06);
          }
        });
      }

      // Draw obstacles
      gs.obstacles.forEach(drawObstacle);

      // Draw coins
      gs.coins.filter(c => !c.collected).forEach(coin => {
        ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🪙', coin.x, coin.y);
      });

      // Draw chicken
      gs.wingFrame++;
      drawChicken(CHICK_X, gs.chickenY, gs.onGround, gs.wingFrame);

      // Particles
      gs.particles.forEach(p => {
        p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.3*dt; p.life -= 0.05*dt;
        if (p.life <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5*p.life, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.floor(p.life*200).toString(16).padStart(2,'0'); ctx.fill();
      });
      gs.particles = gs.particles.filter(p => p.life > 0);

      // Score HUD
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.roundRect(8, 10, 100, 30, 15); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`🏃 ${gs.score}`, 18, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.roundRect(W-100, 10, 92, 30, 15); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.textAlign = 'right';
      ctx.fillText(`⭐ ${gs.best}`, W-12, 30);

      // Double jump indicator
      if (!gs.onGround && gs.doubleJump) {
        ctx.fillStyle = 'rgba(0,255,200,0.7)';
        ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('↑ Double Jump!', CHICK_X, gs.chickenY - 40);
      }

      // Idle / Dead overlays
      if (gs.phase === 'idle') {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(W/2-110, H/2-55, 220, 110, 20); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('CHICKEN JUMP', W/2, H/2-18);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '13px system-ui';
        ctx.fillText('Tap / Space to jump (double jump!)', W/2, H/2+10);
        ctx.fillStyle = '#aaa'; ctx.font = '12px system-ui';
        ctx.fillText(`Best: ${gs.best}`, W/2, H/2+35);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={W} height={H}
        className="rounded-2xl select-none touch-none cursor-pointer"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '100%' }}
        onClick={jump}
        onTouchStart={e => { e.preventDefault(); jump(); }}
      />
      <div className="flex gap-3">
        {disp.phase === 'dead' && <Button variant="neon" onClick={restart} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">▶ Play Again</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
