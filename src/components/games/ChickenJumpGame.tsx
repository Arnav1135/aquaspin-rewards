// src/components/games/ChickenJumpGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, RefreshCw, Trophy, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChickenJumpGameProps {
  onClose: () => void;
}

type Hazard = {
  x: number;
  width: number;
  height: number;
  passed: boolean;
};

export function ChickenJumpGame({ onClose }: ChickenJumpGameProps) {
  const [highScore, setHighScore] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedCostume, setSelectedCostume] = useState<'yellow' | 'red' | 'ninja'>('yellow');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);

  // Jump physics values
  const chickenY = useRef(300);
  const chickenVelocity = useRef(0);
  const isGrounded = useRef(true);
  const gravity = 0.42;
  const jumpForce = -7.5;
  const groundY = 300;

  const obstacles = useRef<Hazard[]>([]);
  const gameFrame = useRef(0);

  const W = 400;
  const H = 400;
  const chickenX = 60;
  const chickenWidth = 24;
  const chickenHeight = 24;

  const handleJump = useCallback(() => {
    if (!isPlaying) return;
    if (isGrounded.current) {
      chickenVelocity.current = jumpForce;
      isGrounded.current = false;
      playTone(450, 0.04, 'sine', 0.1);
    }
  }, [isPlaying]);

  const initGame = () => {
    chickenY.current = groundY;
    chickenVelocity.current = 0;
    isGrounded.current = true;
    obstacles.current = [];
    setScore(0);
    setIsPlaying(true);
    setGameOver(false);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const endRun = () => {
    setIsPlaying(false);
    setGameOver(true);
    playTone(170, 0.35, 'sawtooth', 0.25);
    vibrate(120);

    setHighScore(prev => {
      const nextHigh = Math.max(prev, score);
      if (score > prev) {
        toast.success(`New High Score! ${score}`, { icon: '🏆' });
      }
      return nextHigh;
    });

    setCoins(c => c + Math.floor(score * 0.5));
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump]);

  // Main game tick loop
  const updateLoop = () => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    gameFrame.current++;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw storybook sky
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#fef08a'); // Warm yellow sky
    bgGrad.addColorStop(0.6, '#fed7aa'); // Orange sunset
    bgGrad.addColorStop(1, '#ffedd5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Floor ground
    ctx.fillStyle = '#451a03'; // Ground brown
    ctx.fillRect(0, groundY + chickenHeight, W, H - groundY - chickenHeight);
    
    // Grass line
    ctx.fillStyle = '#15803d'; // Green grass
    ctx.fillRect(0, groundY + chickenHeight, W, 6);

    // 3. Apply gravity to chicken
    chickenVelocity.current += gravity;
    chickenY.current += chickenVelocity.current;

    // Ground collision check
    if (chickenY.current >= groundY) {
      chickenY.current = groundY;
      chickenVelocity.current = 0;
      isGrounded.current = true;
    }

    // Draw Chicken Character
    ctx.save();
    ctx.translate(chickenX + chickenWidth / 2, chickenY.current + chickenHeight / 2);
    
    // Squishy stretch logic based on velocity
    let squashY = 1.0;
    let stretchX = 1.0;
    if (!isGrounded.current) {
      squashY = 1.15;
      stretchX = 0.85;
    }

    ctx.scale(stretchX, squashY);

    // Body base
    ctx.fillStyle = selectedCostume === 'yellow' ? '#facc15' : selectedCostume === 'red' ? '#ef4444' : '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, chickenWidth / 2, 0, Math.PI * 2);
    ctx.fill();

    // Comb
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -14, 8, 4);

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(13, 0);
    ctx.lineTo(8, 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(4, -4, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Procedural Obstacles Logic
    const currentSpeed = 3.2 + Math.floor(score / 50) * 0.4;
    if (gameFrame.current % 110 === 0) {
      obstacles.current.push({
        x: W,
        width: 14 + Math.floor(Math.random() * 12),
        height: 18 + Math.floor(Math.random() * 20),
        passed: false
      });
    }

    // Render & Move obstacles
    obstacles.current.forEach(obs => {
      obs.x -= currentSpeed;

      // Draw obstacle (neon red barrier)
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(obs.x, groundY + chickenHeight - obs.height + 6, obs.width, obs.height);

      // Check collision
      const checkCollision = (
        chickenX + chickenWidth > obs.x &&
        chickenX < obs.x + obs.width &&
        chickenY.current + chickenHeight > groundY + chickenHeight - obs.height + 6
      );

      if (checkCollision) {
        endRun();
        return;
      }

      // Check Score
      if (!obs.passed && obs.x + obs.width < chickenX) {
        obs.passed = true;
        setScore(s => s + 10);
        playTone(620, 0.04, 'sine', 0.08);
      }
    });

    // Clean offscreen
    obstacles.current = obstacles.current.filter(obs => obs.x + obs.width > 0);

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
  }, [isPlaying, gameOver, selectedCostume]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #180802 0%, #3d1c08 50%, #0d0f19 100%)' }}>
      
      {/* Settings & costume shop */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 uppercase tracking-widest">
              Chicken Run
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Record Score</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-400">{highScore}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Coins size={14} className="text-amber-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Farm Coins</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-400">{coins}</span>
          </div>

          {/* Skins select */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Feather Costumes</span>
            <div className="grid grid-cols-3 gap-2">
              {(['yellow', 'red', 'ninja'] as const).map(costume => (
                <button
                  key={costume}
                  onClick={() => { setSelectedCostume(costume); playTone(450, 0.05, 'sine', 0.1); }}
                  className={`py-2 rounded-xl text-3xs font-mono font-bold capitalize border transition-all ${
                    selectedCostume === costume 
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300' 
                      : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {costume}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={initGame}>
              Start Jump
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={() => { setIsPlaying(false); setGameOver(true); }}>
              Abort Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Farm
          </Button>
        </div>
      </Card>

      {/* Main Runner Screen view */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>SPACEBAR / TAP OR ARROW-UP TO JUMP</span>
        </div>

        {isPlaying ? (
          <div className="relative flex flex-col items-center w-full h-full justify-center">
            {/* Score display */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-3xl font-black drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] z-10 text-amber-400">
              {score}
            </div>

            <div className="relative border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-lg shadow-black/50">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onClick={handleJump}
                className="block cursor-pointer bg-slate-950"
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 max-w-sm">
            {gameOver ? (
              <>
                <RefreshCw size={36} className="text-red-400 mx-auto animate-pulse" />
                <h3 className="text-2xl font-black text-slate-200">CHICKEN CRASHED</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Score Scored: <span className="text-amber-400 font-bold">{score}</span></p>
                  <p className="text-slate-400">Record Score: <span className="text-cyan-400 font-bold">{highScore}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={initGame}>
                  Restart Run
                </Button>
              </>
            ) : (
              <>
                <Trophy size={36} className="text-amber-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Endless Chicken Jump</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jump over the incoming red warning logs. Tap the screen or press the Spacebar key to jump.
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={initGame}>
                  Initiate Jump
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
