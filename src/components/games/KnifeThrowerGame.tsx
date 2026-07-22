import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import { X } from 'lucide-react';

interface Props { onClose: () => void }

type Knife = { angle: number; embedded: boolean; flying: boolean; y: number };
type Apple = { angle: number; collected: boolean };
type Trap = { angle: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number; type?: 'splinter' | 'apple' | 'log' | 'knife' | 'spark'; angle?: number };
type LogPiece = { x: number; y: number; vx: number; vy: number; angle: number; va: number; imgIndex: number };

const BOSS_NAMES = ['The Cheese', 'The Tomato', 'The Lemon', 'The Sushi Roll', 'The Donut'];
const BOSS_COLORS = ['#f4d03f', '#e74c3c', '#f1c40f', '#e67e22', '#9b59b6'];

export function KnifeThrowerGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const stateRef = useRef({
    phase: 'idle' as 'idle' | 'playing' | 'dead' | 'stageclear' | 'bossintro',
    logAngle: 0, 
    logSpeed: 0.03,
    logSpeedBase: 0.03,
    logRotDir: 1,
    knives: [] as Knife[], 
    apples: [] as Apple[], 
    traps: [] as Trap[],
    particles: [] as Particle[],
    logPieces: [] as LogPiece[],
    flyingKnife: null as Knife | null,
    score: parseInt(localStorage.getItem('kh-score') || '0'), 
    stage: parseInt(localStorage.getItem('kh-stage') || '1'), 
    applesCollected: parseInt(localStorage.getItem('kh-apples') || '0'),
    knivesLeft: 0,
    targetKnives: 0,
    frame: 0, 
    lastTime: 0,
    best: parseInt(localStorage.getItem('kh-best') || '0'),
    screenShake: 0,
    isBossFight: false,
    bossType: 0,
  });
  
  const [disp, setDisp] = useState({ 
    score: stateRef.current.score, 
    stage: stateRef.current.stage, 
    apples: stateRef.current.applesCollected,
    knives: 0, 
    targetKnives: 0,
    phase: 'idle', 
    best: stateRef.current.best,
    isBoss: false,
    bossName: ''
  });

  const W = 400, H = 600, LOG_R = 90, LOG_Y = 220;

  const spawnParticles = (x: number, y: number, color: string, type: 'splinter' | 'apple' | 'spark', n = 15) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 8;
      stateRef.current.particles.push({ 
        x, y, 
        vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, 
        life: 1, color, r: 2 + Math.random()*4, type 
      });
    }
  };

  const shatterLog = () => {
    const s = stateRef.current;
    s.logPieces = [];
    
    // Spawn 6 large chunks
    for (let i=0; i<6; i++) {
      const ang = (Math.PI*2 / 6) * i;
      s.logPieces.push({
        x: W/2 + Math.cos(ang)*20, y: LOG_Y + Math.sin(ang)*20,
        vx: Math.cos(ang)* (5 + Math.random()*5),
        vy: Math.sin(ang)* (5 + Math.random()*5) - 3,
        angle: ang, va: (Math.random()-0.5)*0.2,
        imgIndex: i
      });
    }
    
    // Spawn embedded knives as falling debris
    s.knives.forEach(k => {
      const px = W/2 + Math.cos(k.angle + s.logAngle) * LOG_R;
      const py = LOG_Y + Math.sin(k.angle + s.logAngle) * LOG_R;
      s.particles.push({
        x: px, y: py,
        vx: (Math.random()-0.5)*10, vy: -5 - Math.random()*5,
        life: 2, color: '#aaa', r: 8, type: 'knife'
      });
    });

    s.knives = [];
    s.apples = [];
    s.traps = [];
    playTone(150, 0.3, 'square', 0.2); // Shatter sound
    vibrate([30, 30, 50]);
  };

  const startStage = useCallback((stageOverride?: number) => {
    const s = stateRef.current;
    s.stage = stageOverride ?? s.stage;
    s.isBossFight = s.stage % 5 === 0;
    
    if (s.isBossFight) {
      s.bossType = Math.floor(Math.random() * BOSS_NAMES.length);
      s.phase = 'bossintro';
    } else {
      s.phase = 'playing';
    }

    s.logAngle = 0;
    s.logRotDir = Math.random() > 0.5 ? 1 : -1;
    s.logSpeedBase = 0.02 + Math.min(s.stage * 0.003, 0.05); // Speed increases per stage
    s.logSpeed = s.logSpeedBase * s.logRotDir;

    // Determine target knives (similar to Process.cs Control)
    if (s.stage <= 2) {
      s.targetKnives = Math.floor(Math.random() * (5 - 2) + 2); // 2 to 4
    } else if (s.stage <= 5) {
      s.targetKnives = Math.floor(Math.random() * (8 - 4) + 4); // 4 to 7
    } else {
      s.targetKnives = Math.floor(Math.random() * (10 - 6) + 6); // 6 to 9
    }
    s.knivesLeft = s.targetKnives;
    
    s.knives = [];
    s.flyingKnife = null;
    s.logPieces = [];
    
    // Object Spawn Logic (similar to Process.cs ObjectSpawn)
    s.apples = [];
    s.traps = [];
    
    // 8 possible slot points around the log
    const slots = Array.from({length: 8}, (_, i) => (Math.PI*2 / 8) * i);
    
    // Shuffle slots
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    if (s.stage === 1) {
      // 1 apple, 0 traps
      s.apples.push({ angle: slots.pop()!, collected: false });
    } else {
      // Random obstacles
      const obstacleCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 objects
      for (let i = 0; i < obstacleCount; i++) {
        if (slots.length === 0) break;
        const z = Math.random() * 10;
        if (z <= 5) {
          s.apples.push({ angle: slots.pop()!, collected: false });
        } else {
          s.traps.push({ angle: slots.pop()! });
        }
      }
    }

    // Save progress
    localStorage.setItem('kh-stage', s.stage.toString());
    localStorage.setItem('kh-score', s.score.toString());
    localStorage.setItem('kh-apples', s.applesCollected.toString());

    setDisp(d => ({ 
      ...d, 
      knives: s.knivesLeft, 
      targetKnives: s.targetKnives,
      phase: s.phase, 
      stage: s.stage,
      score: s.score,
      apples: s.applesCollected,
      isBoss: s.isBossFight,
      bossName: s.isBossFight ? BOSS_NAMES[s.bossType] : ''
    }));

    if (s.phase === 'bossintro') {
      setTimeout(() => {
        if (stateRef.current.phase === 'bossintro') {
          stateRef.current.phase = 'playing';
          setDisp(d => ({...d, phase: 'playing'}));
        }
      }, 1500);
    }

  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.stage = 1;
    startStage(1);
  }, [startStage]);

  const throwKnife = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing' || s.flyingKnife || s.knivesLeft <= 0) return;
    s.flyingKnife = { angle: 0, embedded: false, flying: true, y: H - 40 };
    s.knivesLeft--;
    setDisp(d => ({ ...d, knives: s.knivesLeft }));
    playTone(600, 0.05, 'triangle', 0.1); // throw sound
    vibrate(10);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); throwKnife(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [throwKnife]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const drawKnife = (cx: number, cy: number, angle: number) => {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(angle);
      
      // Blade
      const blade = ctx.createLinearGradient(-3, -40, 3, 0);
      blade.addColorStop(0, '#f0f0f0'); blade.addColorStop(0.5, '#b0b0b0'); blade.addColorStop(1, '#666');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(0, -45); ctx.lineTo(4, -10); ctx.lineTo(-4, -10); ctx.closePath();
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(2, -10); ctx.lineTo(0, -10); ctx.fill();

      // Handle
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(-3, -10, 6, 25);
      
      // Rivets
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(0, -5, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 5, 1, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    };

    const drawLog = (cx: number, cy: number, r: number) => {
      const s = stateRef.current;
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.logAngle);

      if (s.isBossFight) {
        // Draw Boss (Procedural shapes based on bossType)
        const c = BOSS_COLORS[s.bossType];
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Details
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        if (s.bossType === 0) { // Cheese holes
          ctx.beginPath(); ctx.arc(-30, -30, 15, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(40, 20, 20, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(-20, 50, 12, 0, Math.PI*2); ctx.fill();
        } else if (s.bossType === 4) { // Donut hole
          ctx.beginPath(); ctx.arc(0, 0, r*0.4, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2); ctx.stroke(); // sprinkles
        }
      } else {
        // Normal Wood Log
        const woodGrad = ctx.createRadialGradient(-20, -20, 10, 0, 0, r);
        woodGrad.addColorStop(0, '#d38b55');
        woodGrad.addColorStop(0.5, '#a0522d');
        woodGrad.addColorStop(1, '#5a2b16');
        ctx.fillStyle = woodGrad;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
        
        // Tree rings
        for (let ri = r*0.8; ri > 10; ri -= 15) {
          ctx.beginPath(); ctx.arc(0, 0, ri, 0, Math.PI*2);
          ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2);
        ctx.fillStyle = '#4a2010'; ctx.fill();
      }

      // Draw Apples
      s.apples.forEach(a => {
        if (!a.collected) {
          ctx.save();
          ctx.rotate(a.angle);
          ctx.translate(0, r + 15);
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#2ecc71'; // leaf
          ctx.beginPath(); ctx.ellipse(5, -10, 3, 6, Math.PI/4, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      });

      // Draw Traps (Enemy Knives)
      s.traps.forEach(t => {
        ctx.save();
        ctx.rotate(t.angle);
        ctx.translate(0, r);
        drawKnife(0, 0, 0); // pointing outwards
        ctx.restore();
      });

      // Draw Embedded Player Knives
      s.knives.forEach(k => {
        ctx.save();
        ctx.rotate(k.angle);
        ctx.translate(0, r);
        drawKnife(0, 0, Math.PI); // pointing inwards
        ctx.restore();
      });

      ctx.restore();
    };

    const drawDebris = () => {
      const s = stateRef.current;
      // Draw log pieces
      s.logPieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        if (s.isBossFight) {
          ctx.fillStyle = BOSS_COLORS[s.bossType];
        } else {
          ctx.fillStyle = '#a0522d';
        }
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 40, 0, Math.PI/3);
        ctx.lineTo(0,0);
        ctx.fill();
        ctx.restore();
      });
    };

    const loop = (time: number) => {
      const s = stateRef.current;
      const dt = s.lastTime ? (time - s.lastTime) : 16;
      s.lastTime = time;
      s.frame++;

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, W, H);

      // Screen shake
      if (s.screenShake > 0) {
        const dx = (Math.random()-0.5) * s.screenShake;
        const dy = (Math.random()-0.5) * s.screenShake;
        ctx.translate(dx, dy);
        s.screenShake *= 0.8;
        if (s.screenShake < 0.5) s.screenShake = 0;
      }

      if (s.phase === 'playing' || s.phase === 'bossintro') {
        // Variable speed pattern (stop and go, reverse)
        if (s.frame % 180 === 0 && s.stage > 2) {
           s.logRotDir *= -1; // Reverse occasionally
           s.logSpeed = s.logSpeedBase * s.logRotDir;
        }
        
        // Speed mod for boss
        let speedMod = 1;
        if (s.isBossFight && s.frame % 100 < 20) speedMod = 2.5; // sudden dashes
        
        s.logAngle += s.logSpeed * speedMod;
        
        // Log Wobble
        const logX = W/2 + Math.cos(s.frame*0.1)*1.5;
        const logY = LOG_Y + Math.sin(s.frame*0.13)*1.5;

        drawLog(logX, logY, LOG_R);

        // Flying Knife Update
        if (s.flyingKnife) {
          s.flyingKnife.y -= dt * 1.5;
          drawKnife(W/2, s.flyingKnife.y, 0);

          // Hit detection
          if (s.flyingKnife.y <= logY + LOG_R + 25) { // Impact radius
            const impactAngle = (-s.logAngle) % (Math.PI*2);
            const normalizedImpact = impactAngle < 0 ? impactAngle + Math.PI*2 : impactAngle;

            // Check hit against Traps
            let hitObstacle = false;
            for (const t of s.traps) {
              const diff = Math.abs(t.angle - normalizedImpact);
              if (diff < 0.25 || Math.abs(diff - Math.PI*2) < 0.25) {
                hitObstacle = true; break;
              }
            }

            // Check hit against embedded knives
            if (!hitObstacle) {
              for (const k of s.knives) {
                const diff = Math.abs(k.angle - normalizedImpact);
                if (diff < 0.25 || Math.abs(diff - Math.PI*2) < 0.25) {
                  hitObstacle = true; break;
                }
              }
            }

            if (hitObstacle) {
              // Game Over / Bounce off
              s.phase = 'dead';
              s.flyingKnife.flying = false;
              s.screenShake = 15;
              playTone(100, 0.3, 'sawtooth', 0.5); // Hit metal
              vibrate([50, 100, 50]);
              
              // Bounce particle
              s.particles.push({
                x: W/2, y: logY + LOG_R + 25,
                vx: (Math.random()-0.5)*15, vy: 5 + Math.random()*10,
                life: 3, color: '#aaa', r: 8, type: 'knife', angle: 0
              });
              s.flyingKnife = null;
              
              if (s.score > s.best) {
                s.best = s.score;
                localStorage.setItem('kh-best', s.best.toString());
              }
              setDisp(d => ({ ...d, phase: 'dead', best: s.best }));
            } else {
              // Successful hit
              s.knives.push({ angle: normalizedImpact, embedded: true, flying: false, y: 0 });
              s.flyingKnife = null;
              s.score += 10;
              s.screenShake = 5;
              playTone(300 + Math.random()*100, 0.1, 'sine', 0.2); // Chunk sound
              spawnParticles(W/2, logY + LOG_R, '#d38b55', 'splinter', 8);

              // Check hit against apples
              for (const a of s.apples) {
                if (!a.collected) {
                  const diff = Math.abs(a.angle - normalizedImpact);
                  if (diff < 0.35 || Math.abs(diff - Math.PI*2) < 0.35) {
                    a.collected = true;
                    s.applesCollected++;
                    s.score += 25;
                    playTone(800, 0.2, 'square', 0.1); // Apple slice
                    spawnParticles(W/2, logY + LOG_R, '#e74c3c', 'apple', 15);
                  }
                }
              }

              if (s.knivesLeft === 0) {
                // Stage Clear!
                s.phase = 'stageclear';
                shatterLog();
                setDisp(d => ({ ...d, phase: 'stageclear', score: s.score, apples: s.applesCollected }));
                
                setTimeout(() => {
                  if (stateRef.current.phase === 'stageclear') {
                    startStage(s.stage + 1);
                  }
                }, 1500);
              } else {
                setDisp(d => ({ ...d, score: s.score, apples: s.applesCollected }));
              }
            }
          }
        }
      } else if (s.phase === 'stageclear' || s.phase === 'dead') {
        // Draw debris
        s.logPieces.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.4; // gravity
          p.angle += p.va;
        });
        drawDebris();
      }

      // Draw Idle Knife
      if (s.phase === 'playing' && s.knivesLeft > 0 && !s.flyingKnife) {
        drawKnife(W/2, H - 40, 0);
      }

      // Particles Update
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= 0.02;
        
        if (p.type === 'knife') {
          p.angle = (p.angle || 0) + 0.2;
          drawKnife(p.x, p.y, p.angle);
        } else {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        return p.life > 0 && p.y < H + 50;
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset screen shake
      rafRef.current = requestAnimationFrame(loop);
    };

    if (stateRef.current.phase === 'idle') {
      startStage(1);
    }
    
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startStage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative bg-gray-900 rounded-3xl shadow-2xl overflow-hidden ring-4 ring-gray-800"
           style={{ width: 400, height: 600 }}>
        
        {/* Top UI */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-1">
            <span className="text-white text-xl font-black">{disp.score}</span>
            <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Best {disp.best}</span>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className="bg-gray-800/80 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2 pointer-events-auto">
              <span className="text-red-500 font-bold text-lg leading-none">🍎</span>
              <span className="text-white font-mono font-bold">{disp.apples}</span>
            </div>
            <span className="text-white/80 font-bold text-sm bg-black/50 px-2 py-0.5 rounded backdrop-blur mt-1">
              {disp.isBoss ? <span className="text-red-400 animate-pulse">BOSS</span> : `STAGE ${disp.stage}`}
            </span>
          </div>
        </div>

        {/* HUD: Target Knives Stack (Bottom Left) */}
        <div className="absolute bottom-6 left-6 flex flex-col-reverse gap-1.5 pointer-events-none z-10">
          {Array.from({ length: disp.targetKnives }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-1.5 h-6 rounded-sm ${i < disp.knives ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-gray-600'}`} />
            </div>
          ))}
        </div>

        {/* Canvas */}
        <canvas 
          ref={canvasRef} width={400} height={600} 
          className="block w-full h-full cursor-pointer touch-none"
          onPointerDown={throwKnife}
        />

        {/* Overlays */}
        {disp.phase === 'bossintro' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-black text-red-500 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-bounce">
              BOSS FIGHT
            </h2>
            <p className="text-white text-2xl font-bold mt-2">{disp.bossName}</p>
          </div>
        )}

        {disp.phase === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 animate-in fade-in duration-300">
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">GAME OVER</h2>
            <p className="text-gray-400 font-bold mb-6">Stage {disp.stage} • Score: {disp.score}</p>
            <div className="flex gap-4">
              <Button onClick={resetGame} size="lg" className="bg-white text-black hover:bg-gray-200 font-bold rounded-xl px-8">
                RETRY
              </Button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button onClick={onClose} className="absolute bottom-4 right-4 bg-gray-800/80 p-3 rounded-full text-gray-400 hover:text-white transition-colors z-30 pointer-events-auto">
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
