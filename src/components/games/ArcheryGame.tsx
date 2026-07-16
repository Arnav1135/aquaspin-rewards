// src/components/games/ArcheryGame.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Trophy, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ArcheryGameProps {
  onClose: () => void;
}

type ArrowShot = {
  x: number;
  y: number;
  score: number;
};

export function ArcheryGame({ onClose }: ArcheryGameProps) {
  const [stage, setStage] = useState(1);
  const [arrowsLeft, setArrowsLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [windX, setWindX] = useState(0); // Wind drift value
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gameplay physics trackers
  const arrowHits = useRef<ArrowShot[]>([]);
  const isAiming = useRef(false);
  const aimCursor = useRef({ x: 190, y: 190 });
  const flightArrow = useRef<{ x: number; y: number; targetX: number; targetY: number; progress: number } | null>(null);

  const W = 380;
  const H = 380;
  const CX = 190;
  const CY = 190;
  
  // Board radii rings
  const RINGS = [
    { radius: 110, color: '#ffffff', textColor: '#000000', score: 1 },
    { radius: 95, color: '#ffffff', textColor: '#000000', score: 2 },
    { radius: 80, color: '#00f0ff', textColor: '#ffffff', score: 3 },
    { radius: 65, color: '#00f0ff', textColor: '#ffffff', score: 4 },
    { radius: 50, color: '#ef4444', textColor: '#ffffff', score: 6 },
    { radius: 35, color: '#ef4444', textColor: '#ffffff', score: 8 },
    { radius: 20, color: '#eab308', textColor: '#000000', score: 10 },
    { radius: 8, color: '#eab308', textColor: '#000000', score: 12 } // Inner Gold Bulls
  ];

  const initStage = () => {
    setArrowsLeft(3);
    arrowHits.current = [];
    flightArrow.current = null;
    isAiming.current = false;
    // Set random wind speed for this stage
    const wind = (Math.random() - 0.5) * 8;
    setWindX(Math.round(wind * 10) / 10);
  };

  const startTournament = () => {
    setScore(0);
    setStage(1);
    setIsPlaying(true);
    setGameOver(false);
    setWon(false);
    initStage();
    playTone(550, 0.05, 'sine', 0.15);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || won || arrowsLeft <= 0 || flightArrow.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isAiming.current = true;
    aimCursor.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    playTone(280, 0.15, 'sine', 0.05); // draw string creak
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAiming.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    aimCursor.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseUp = () => {
    if (!isAiming.current || flightArrow.current) return;
    isAiming.current = false;

    // Apply wind drift to target coordinates
    const targetX = aimCursor.current.x + windX * 8;
    const targetY = aimCursor.current.y;

    setArrowsLeft(prev => prev - 1);

    // Launch arrow flying animation
    flightArrow.current = {
      x: CX,
      y: H - 10,
      targetX,
      targetY,
      progress: 0
    };
    playTone(380, 0.06, 'triangle', 0.1);
  };

  const checkArrowScore = (x: number, y: number): ArrowShot => {
    const dx = x - CX;
    const dy = y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Find the smallest ring target that contains the hit point
    const hitRing = [...RINGS].reverse().find(ring => dist <= ring.radius);
    if (hitRing) {
      return { x, y, score: hitRing.score };
    }
    return { x, y, score: 0 };
  };

  const resolveArrowLanding = (tx: number, ty: number) => {
    const hit = checkArrowScore(tx, ty);
    arrowHits.current.push(hit);

    setScore(s => s + hit.score);
    playTone(hit.score >= 10 ? 800 : 500, 0.06, 'sine', 0.12);
    vibrate(hit.score >= 10 ? 60 : 20);

    if (hit.score >= 10) {
      toast.success('🎯 Bullseye! perfect shot.', { id: 'archery-feedback' });
    } else if (hit.score > 0) {
      toast.success(`Hit Ring! +${hit.score} pts`, { id: 'archery-feedback' });
    } else {
      toast.error('Missed target!', { id: 'archery-feedback' });
    }

    // Check round progression
    if (arrowsLeft - 1 <= 0) {
      setTimeout(() => {
        if (stage >= 3) {
          setWon(true);
          setIsPlaying(false);
          toast.success('🥇 Tournament Completed! Great Job.');
        } else {
          setStage(s => s + 1);
          initStage();
        }
      }, 1500);
    }
  };

  const drawTarget = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // Background grass field
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, W, H);

    // 1. Draw Target rings from largest to smallest
    RINGS.forEach(ring => {
      ctx.beginPath();
      ctx.arc(CX, CY, ring.radius, 0, Math.PI * 2);
      ctx.fillStyle = ring.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Outer Target Stand
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(CX - 8, CY + 110, 16, 60);

    // 2. Draw Stuck arrow shafts
    arrowHits.current.forEach(hit => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Yellow tail feathers
      ctx.fillStyle = '#eab308';
      ctx.fillRect(hit.x - 1, hit.y - 12, 2, 8);
    });

    // 3. Draw active flying arrow
    if (flightArrow.current) {
      const fa = flightArrow.current;
      fa.progress += 0.06;
      fa.x += (fa.targetX - fa.x) * 0.06;
      fa.y += (fa.targetY - fa.y) * 0.06;

      ctx.beginPath();
      ctx.arc(fa.x, fa.y, 8 - fa.progress * 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();

      if (fa.progress >= 1.0) {
        const targetX = fa.targetX;
        const targetY = fa.targetY;
        flightArrow.current = null;
        resolveArrowLanding(targetX, targetY);
      }
    }

    // 4. Draw aiming crosshairs
    if (isAiming.current) {
      const aim = aimCursor.current;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(aim.x, aim.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Center cross lines
      ctx.beginPath();
      ctx.moveTo(aim.x - 30, aim.y);
      ctx.lineTo(aim.x + 30, aim.y);
      ctx.moveTo(aim.x, aim.y - 30);
      ctx.lineTo(aim.x, aim.y + 30);
      ctx.stroke();
    }
  };

  useEffect(() => {
    let animId: number;
    const animate = () => {
      drawTarget();
      animId = requestAnimationFrame(animate);
    };
    if (isPlaying) {
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      drawTarget();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, stage]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #064e3b 100%)' }}>
      
      {/* Settings Card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase tracking-widest">
              Archery Pro
            </h2>
            <Target size={16} className="text-emerald-400 animate-pulse" />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Active Stage</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-400">Stage {stage} / 3</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Score</span>
            </div>
            <span className="font-mono text-sm font-bold text-yellow-400">{score} pts</span>
          </div>

          {/* Wind gauge display */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Crosswind Drift</span>
              <span className={Math.abs(windX) > 4 ? 'text-red-400 animate-pulse' : 'text-slate-400'}>
                {windX > 0 ? `➔ ${windX} m/s` : windX < 0 ? `➔ ${Math.abs(windX)} m/s` : '0 m/s'}
              </span>
            </div>
            {/* Wind visual indicator bar */}
            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden relative">
              <motion.div 
                className="absolute h-full bg-cyan-400 rounded-full" 
                style={{ 
                  left: windX < 0 ? 'auto' : '50%',
                  right: windX < 0 ? '50%' : 'auto',
                  width: `${(Math.abs(windX) / 8) * 50}%` 
                }} 
              />
            </div>
          </div>

          {/* Arrows Left display */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Quiver Arrows</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className={`w-1.5 h-6 rounded bg-emerald-500 ${idx < arrowsLeft ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-900'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startTournament}>
              Start Tournament
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Abort Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Range
          </Button>
        </div>
      </Card>

      {/* Main Archery view */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>DRAG ON CANVAS TO AIM, RELEASE TO SHOOT</span>
        </div>

        {isPlaying ? (
          <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="block cursor-pointer bg-slate-950"
            />
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {won ? (
              <>
                <Sparkles size={36} className="text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-yellow-300 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">TOURNAMENT WON</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Total Score: <span className="text-cyan-400 font-bold">{score} pts</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={startTournament}>
                  Restart Tournament
                </Button>
              </>
            ) : (
              <>
                <Target size={36} className="text-emerald-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Olympic Archery</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hold and drag your cursor to aim, then release to shoot. Watch the wind speed drift gauge closely before firing!
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={startTournament}>
                  Initiate Tournament
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
