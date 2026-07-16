// src/components/games/KnifeThrowerGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, RefreshCw, Trophy, Target, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface KnifeThrowerGameProps {
  onClose: () => void;
}

type Knife = {
  angle: number;
  hit: boolean;
  y: number; // For flying animation
};

type Apple = {
  angle: number;
  sliced: boolean;
};

export function KnifeThrowerGame({ onClose }: KnifeThrowerGameProps) {
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [knivesLeft, setKnivesLeft] = useState(7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [selectedKnifeSkin, setSelectedKnifeSkin] = useState<'standard' | 'fire' | 'ice'>('standard');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);

  // Gameplay ref arrays
  const knives = useRef<Knife[]>([]);
  const apples = useRef<Apple[]>([]);
  const targetRotation = useRef(0);
  const targetSpeed = useRef(0.03);
  const flyingKnifeY = useRef<number | null>(null);

  const W = 400;
  const H = 400;
  const targetX = 200;
  const targetY = 130;
  const targetRadius = 60;
  const knifeStartY = 350;

  const initStage = useCallback(() => {
    knives.current = [];
    flyingKnifeY.current = null;
    setKnivesLeft(7 + Math.floor(stage * 0.5));

    // Spawn some initial apples on target wheel
    const spawnedApples: Apple[] = [];
    const appleCount = stage === 1 ? 1 : stage % 3 === 0 ? 3 : 2;
    for (let i = 0; i < appleCount; i++) {
      spawnedApples.push({
        angle: (i * Math.PI * 2) / appleCount + Math.random() * 0.5,
        sliced: false
      });
    }
    apples.current = spawnedApples;

    // Set rotation speed/direction changes per level
    targetSpeed.current = 0.02 + stage * 0.006 * (Math.random() < 0.5 ? -1 : 1);
  }, [stage]);

  const handleThrow = () => {
    if (flyingKnifeY.current !== null || knivesLeft <= 0 || gameOver || won || !isPlaying) return;
    
    flyingKnifeY.current = knifeStartY;
    setKnivesLeft(prev => prev - 1);
    playTone(400, 0.03, 'triangle', 0.08);
  };

  const startNewGame = () => {
    setScore(0);
    setStage(1);
    setIsPlaying(true);
    setGameOver(false);
    setWon(false);
    initStage();
    playTone(550, 0.05, 'sine', 0.15);
  };

  useEffect(() => {
    if (isPlaying) {
      initStage();
    }
  }, [stage, isPlaying, initStage]);

  // Main rendering ticks loop
  const updateLoop = () => {
    if (!isPlaying || gameOver || won) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw dynamic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0518');
    bgGrad.addColorStop(0.5, '#1e0c2e');
    bgGrad.addColorStop(1, '#0c0714');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Rotate the board wheel
    targetRotation.current += targetSpeed.current;

    // 3. Draw Target Board log (wooden pattern)
    ctx.save();
    ctx.translate(targetX, targetY);
    ctx.rotate(targetRotation.current);

    // Outer metal rim
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, targetRadius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Wood base
    ctx.fillStyle = stage % 5 === 0 ? '#b91c1c' : '#78350f'; // Red boss logs
    ctx.beginPath();
    ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
    ctx.fill();

    // Wood rings
    ctx.strokeStyle = stage % 5 === 0 ? '#ef4444' : '#a16207';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, targetRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, targetRadius * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Draw hit knives stuck to target
    knives.current.forEach(knife => {
      ctx.save();
      ctx.rotate(knife.angle);
      
      // Draw Knife Blade
      const bladeGrad = ctx.createLinearGradient(0, targetRadius - 10, 0, targetRadius + 18);
      bladeGrad.addColorStop(0, '#ffffff');
      bladeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bladeGrad;
      ctx.fillRect(-2, targetRadius - 5, 4, 20);

      // Draw Hilt handle
      ctx.fillStyle = selectedKnifeSkin === 'fire' ? '#ef4444' : selectedKnifeSkin === 'ice' ? '#06b6d4' : '#1e293b';
      ctx.fillRect(-4, targetRadius + 15, 8, 12);
      ctx.restore();
    });

    // Draw Apples on target
    apples.current.forEach(apple => {
      if (apple.sliced) return;
      ctx.save();
      ctx.rotate(apple.angle);
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, targetRadius - 8, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Leaf
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-1, targetRadius - 20, 2, 4);
      ctx.restore();
    });

    ctx.restore();

    // 4. Update & Draw Flying Knife
    if (flyingKnifeY.current !== null) {
      flyingKnifeY.current -= 14;

      // Draw active flying knife
      const bladeGrad = ctx.createLinearGradient(0, flyingKnifeY.current, 0, flyingKnifeY.current + 25);
      bladeGrad.addColorStop(0, '#ffffff');
      bladeGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bladeGrad;
      ctx.fillRect(targetX - 2.5, flyingKnifeY.current, 5, 25);

      ctx.fillStyle = selectedKnifeSkin === 'fire' ? '#ef4444' : selectedKnifeSkin === 'ice' ? '#06b6d4' : '#1e293b';
      ctx.fillRect(targetX - 4.5, flyingKnifeY.current + 25, 9, 12);

      // Check collision with target boundary
      if (flyingKnifeY.current <= targetY + targetRadius - 5) {
        const hitAngle = -targetRotation.current + Math.PI / 2; // relative angle stuck

        // Check collision with existing stuck knives
        const collided = knives.current.some(k => {
          const diff = Math.abs(k.angle - hitAngle);
          const tolerance = 0.18; // approx 10 degrees separation
          return diff < tolerance || Math.abs(diff - Math.PI * 2) < tolerance;
        });

        if (collided) {
          // Surrender run, knife deflated
          setIsPlaying(false);
          setGameOver(true);
          playTone(180, 0.35, 'sawtooth', 0.3);
          vibrate([60, 40, 120]);
          toast.error('Log Overlap Detonation! Lost Run.');
          return;
        }

        // Stuck successfully!
        knives.current.push({
          angle: hitAngle,
          hit: true,
          y: targetRadius
        });

        // Check if sliced apples
        apples.current.forEach(apple => {
          if (apple.sliced) return;
          const diff = Math.abs(apple.angle - hitAngle);
          const appleTolerance = 0.22;
          if (diff < appleTolerance || Math.abs(diff - Math.PI * 2) < appleTolerance) {
            apple.sliced = true;
            setScore(s => s + 50);
            playTone(880, 0.08, 'sine', 0.15);
            toast.success('🍎 Apple Sliced! +50 pts', { id: 'knife-apple-feedback' });
          }
        });

        flyingKnifeY.current = null;
        setScore(s => s + 10);
        playTone(600, 0.04, 'triangle', 0.1);
        vibrate(30);

        // Check if Stage cleared
        if (knivesLeft <= 0) {
          if (stage % 5 === 0) {
            toast.success('💀 Boss Annihilated!', { icon: '🔥' });
          } else {
            toast.success('✓ Stage Cleared!', { id: 'knife-stage-feedback' });
          }
          setStage(s => s + 1);
        }
      }
    }

    rAFRef.current = requestAnimationFrame(updateLoop);
  };

  useEffect(() => {
    if (isPlaying && !gameOver) {
      rAFRef.current = requestAnimationFrame(updateLoop);
    }
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameOver, knivesLeft, selectedKnifeSkin]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #10061e 0%, #1e0c2e 50%, #0c0714 100%)' }}>
      
      {/* Settings Panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 uppercase tracking-widest">
              Knife Hit
            </h2>
            <Target size={16} className="text-red-500 animate-pulse" />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Shield size={14} className="text-cyan-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Active Stage</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-400">{stage % 5 === 0 ? 'BOSS STAGE 💀' : `Stage ${stage}`}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total Score</span>
            </div>
            <span className="font-mono text-sm font-bold text-yellow-400">{score}</span>
          </div>

          {/* Knives Skin Selector */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Thrower Blades</span>
            <div className="grid grid-cols-3 gap-2">
              {(['standard', 'fire', 'ice'] as const).map(skin => (
                <button
                  key={skin}
                  onClick={() => { setSelectedKnifeSkin(skin); playTone(450, 0.05, 'sine', 0.1); }}
                  className={`py-2 rounded-xl text-3xs font-mono font-bold capitalize border transition-all ${
                    selectedKnifeSkin === skin 
                      ? 'border-red-500 bg-red-500/10 text-red-300' 
                      : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {skin}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startNewGame}>
              Start Throwing
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Surrender Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Dojo
          </Button>
        </div>
      </Card>

      {/* Main Knife board viewport */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>TAP / CLICK ON BOARD TO THROW</span>
        </div>

        {isPlaying ? (
          <div className="relative flex flex-col items-center w-full h-full justify-center">
            
            {/* Knife indicator pile */}
            <div className="absolute bottom-6 left-4 flex flex-col gap-1 z-10">
              {Array.from({ length: knivesLeft }).map((_, i) => (
                <div key={i} className={`w-1.5 h-6 rounded bg-red-500 ${selectedKnifeSkin === 'ice' ? 'bg-cyan-400' : 'bg-red-500'}`} />
              ))}
            </div>

            <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onClick={handleThrow}
                className="block cursor-pointer bg-slate-950"
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {gameOver ? (
              <>
                <RefreshCw size={36} className="text-red-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-slate-200">RUN DETONATED</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Score Achieved: <span className="text-cyan-400 font-bold">{score} pts</span></p>
                  <p className="text-slate-400">Stage Reached: <span className="text-indigo-400 font-bold">{stage}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={startNewGame}>
                  Restart Dojo Run
                </Button>
              </>
            ) : (
              <>
                <Target size={36} className="text-red-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Ready to Throw?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Throw knives to stick them to the rotating log target. Slice apples for bonus multipliers! Don't overlap knives.
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={startNewGame}>
                  Start Dojo Run
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
