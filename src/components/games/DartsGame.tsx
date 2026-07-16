// src/components/games/DartsGame.tsx
import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Target, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DartsGameProps {
  onClose: () => void;
}

type DartsScoreMode = 301 | 501;

type ThrownDart = {
  x: number;
  y: number;
  score: number;
  ring: 'single' | 'double' | 'triple' | 'outer-bull' | 'inner-bull' | 'miss';
};

// Darts sector angles around the board
const BOARD_SECTORS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5
];

export function DartsGame({ onClose }: DartsGameProps) {
  const [scoreMode, setScoreMode] = useState<DartsScoreMode>(301);
  const [remainingScore, setRemainingScore] = useState(301);
  const [dartsLeft, setDartsLeft] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const thrownDarts = useRef<ThrownDart[]>([]);
  const isMouseDown = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const flyingDart = useRef<{ x: number; y: number; targetX: number; targetY: number; progress: number } | null>(null);

  const W = 380;
  const H = 380;
  const CX = 190;
  const CY = 190;
  
  // Board radii percentages
  const R_DOUBLE = 145;
  const R_TRIPLE_OUTER = 96;
  const R_TRIPLE_INNER = 88;
  const R_BULL_OUTER = 16;
  const R_BULL_INNER = 6;

  const initGame = () => {
    setRemainingScore(scoreMode);
    setDartsLeft(3);
    thrownDarts.current = [];
    flyingDart.current = null;
    setIsPlaying(true);
    setGameOver(false);
    setWon(false);
    playTone(523, 0.05, 'sine', 0.15);
    setTimeout(() => drawBoard(), 50);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlaying || gameOver || won || dartsLeft <= 0 || flyingDart.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isMouseDown.current = true;
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDown.current || !isPlaying || flyingDart.current) return;
    isMouseDown.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Calculate swipe velocity
    const dx = endX - dragStart.current.x;
    const dy = endY - dragStart.current.y;
    
    // Target coordinate based on swipe
    const targetX = CX + dx * 1.5;
    const targetY = CY + dy * 1.5;

    setDartsLeft(prev => prev - 1);
    
    // Launch dart flying animation
    flyingDart.current = {
      x: CX,
      y: H - 20,
      targetX,
      targetY,
      progress: 0
    };
    playTone(300, 0.04, 'triangle', 0.08);
  };

  const calculateDartScore = (x: number, y: number): ThrownDart => {
    const dx = x - CX;
    const dy = y - CY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > R_DOUBLE + 10) {
      return { x, y, score: 0, ring: 'miss' };
    }

    if (dist <= R_BULL_INNER) {
      return { x, y, score: 50, ring: 'inner-bull' };
    }
    if (dist <= R_BULL_OUTER) {
      return { x, y, score: 25, ring: 'outer-bull' };
    }

    // Calculate sector angle
    // Math.atan2 returns angle in radians [-PI, PI]
    let angle = Math.atan2(dy, dx);
    // Shift by half sector to align with 20 at the top center
    angle = -angle + Math.PI / 2 + Math.PI / 20;
    if (angle < 0) angle += Math.PI * 2;
    const sectorIndex = Math.floor((angle / (Math.PI * 2)) * 20) % 20;
    const sectorValue = BOARD_SECTORS[sectorIndex];

    if (dist >= R_TRIPLE_INNER && dist <= R_TRIPLE_OUTER) {
      return { x, y, score: sectorValue * 3, ring: 'triple' };
    }
    if (dist >= R_DOUBLE && dist <= R_DOUBLE + 8) {
      return { x, y, score: sectorValue * 2, ring: 'double' };
    }

    return { x, y, score: sectorValue, ring: 'single' };
  };

  const resolveDartLanding = (targetX: number, targetY: number) => {
    const dart = calculateDartScore(targetX, targetY);
    thrownDarts.current.push(dart);

    const nextScore = remainingScore - dart.score;

    if (nextScore === 0) {
      setRemainingScore(0);
      setWon(true);
      setIsPlaying(false);
      playTone(523, 0.15, 'sine', 0.2);
      setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
      toast.success('🥇 Zero Reached! Victory.');
    } else if (nextScore < 0) {
      playTone(180, 0.35, 'sawtooth', 0.25);
      toast.error('Bust! Went below zero.', { id: 'dart-feedback' });
      // Reset darts in hand
      setDartsLeft(3);
    } else {
      setRemainingScore(nextScore);
      playTone(600, 0.05, 'triangle', 0.1);
      vibrate(20);
      toast.success(`Hit ${dart.ring.toUpperCase()} ${dart.score}!`, { id: 'dart-feedback' });

      if (dartsLeft - 1 <= 0) {
        // Hand finished, reset round
        setDartsLeft(3);
      }
    }
    drawBoard();
  };

  const drawBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // Draw backing board felt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // 1. Draw outer boundary ring
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(CX, CY, R_DOUBLE + 10, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Sectors
    for (let i = 0; i < 20; i++) {
      const startAngle = (i * Math.PI * 2) / 20 - Math.PI / 2 - Math.PI / 20;
      const endAngle = startAngle + (Math.PI * 2) / 20;
      const isEven = i % 2 === 0;

      // Outer Single Sector
      ctx.fillStyle = isEven ? '#1e293b' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R_DOUBLE, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Double ring
      ctx.fillStyle = isEven ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R_DOUBLE + 8, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Inner Single Sector
      ctx.fillStyle = isEven ? '#1e293b' : '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R_TRIPLE_OUTER, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();

      // Triple ring
      ctx.fillStyle = isEven ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R_TRIPLE_OUTER, startAngle, endAngle);
      ctx.arc(CX, CY, R_TRIPLE_INNER, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();
    }

    // 3. Draw Bullseyes
    ctx.fillStyle = '#22c55e'; // Green outer bull
    ctx.beginPath();
    ctx.arc(CX, CY, R_BULL_OUTER, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444'; // Red inner bull
    ctx.beginPath();
    ctx.arc(CX, CY, R_BULL_INNER, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw stuck darts
    thrownDarts.current.forEach(dart => {
      ctx.beginPath();
      ctx.arc(dart.x, dart.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 5. Draw flying dart shadow
    if (flyingDart.current) {
      const fd = flyingDart.current;
      fd.progress += 0.08;
      fd.x += (fd.targetX - fd.x) * 0.08;
      fd.y += (fd.targetY - fd.y) * 0.08;

      ctx.beginPath();
      ctx.arc(fd.x, fd.y, 6 - fd.progress * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();

      if (fd.progress >= 1.0) {
        const targetX = fd.targetX;
        const targetY = fd.targetY;
        flyingDart.current = null;
        resolveDartLanding(targetX, targetY);
      }
    }
  };

  useEffect(() => {
    let animId: number;
    const animate = () => {
      if (flyingDart.current) {
        drawBoard();
      }
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
      drawBoard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, scoreMode]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #090b11 0%, #1e1b4b 50%, #0d1e3d 100%)' }}>
      
      {/* Left controls & stats */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-300 uppercase tracking-widest">
              Dart Simulator
            </h2>
            <Target size={16} className="text-green-400" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Score Mode</span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button disabled={isPlaying} onClick={() => setScoreMode(301)} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${scoreMode === 301 ? 'bg-green-500/20 text-green-300' : 'text-slate-500'}`}>
                301 Pts
              </button>
              <button disabled={isPlaying} onClick={() => setScoreMode(501)} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${scoreMode === 501 ? 'bg-green-500/20 text-green-300' : 'text-slate-500'}`}>
                501 Pts
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Points Left</span>
            <span className="font-bold text-green-400">{remainingScore}</span>
          </div>

          {/* Darts in hand */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Darts Left</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className={`w-2.5 h-6 rounded-full border border-slate-800 ${idx < dartsLeft ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-900'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={initGame}>
              Start Throwing
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Abort Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Panel
          </Button>
        </div>
      </Card>

      {/* Main Board view */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>DRAG & SWIPE TO THROW DART</span>
        </div>

        {isPlaying ? (
          <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              className="block cursor-pointer bg-slate-950"
            />
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {won ? (
              <>
                <Sparkles size={36} className="text-yellow-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-yellow-300 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">LEG CLEARED</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Congratulations on hitting zero! Outstanding accuracy.
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={initGame}>
                  Play Again
                </Button>
              </>
            ) : (
              <>
                <Target size={36} className="text-green-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Darts Tournament</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Swipe your cursor forward on the dartboard to throw. Score multipliers apply on double/triple rings!
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={initGame}>
                  Start Throwing
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
