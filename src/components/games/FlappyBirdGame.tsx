// src/components/games/FlappyBirdGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, RefreshCw, Trophy, Coins, Feather } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FlappyBirdGameProps {
  onClose: () => void;
}

type Pipe = {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
};

type StarParticle = {
  x: number;
  y: number;
  speed: number;
};

export function FlappyBirdGame({ onClose }: FlappyBirdGameProps) {
  const [highScore, setHighScore] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<'yellow' | 'pink' | 'cyan'>('yellow');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rAFRef = useRef<number | null>(null);

  // Physics engine states using useRef to bypass React re-render lags
  const birdY = useRef(150);
  const birdVelocity = useRef(0);
  const gravity = 0.35;
  const jumpStrength = -6.2;
  const pipes = useRef<Pipe[]>([]);
  const particles = useRef<StarParticle[]>([]);
  const bgStars = useRef<StarParticle[]>([]);
  const gameFrame = useRef(0);

  const W = 400;
  const H = 400;
  const birdX = 80;
  const birdRadius = 12;
  const pipeWidth = 46;
  const pipeGap = 100;
  const pipeSpeed = 2.2;

  // Initialize background stars
  useEffect(() => {
    const stars: StarParticle[] = [];
    for (let i = 0; i < 20; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.2 + Math.random() * 0.4
      });
    }
    bgStars.current = stars;
  }, []);

  const handleJump = useCallback(() => {
    if (!isPlaying) return;
    birdVelocity.current = jumpStrength;
    playTone(320, 0.04, 'sine', 0.1);
  }, [isPlaying]);

  const startGame = () => {
    birdY.current = 150;
    birdVelocity.current = 0;
    pipes.current = [];
    particles.current = [];
    setScore(0);
    setIsPlaying(true);
    setGameOver(false);
    playTone(550, 0.05, 'sine', 0.15);
  };

  const endGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    playTone(150, 0.3, 'sawtooth', 0.2);
    vibrate(150);

    setHighScore(prev => {
      const nextHigh = Math.max(prev, score);
      if (score > prev) {
        toast.success(`New High Score! ${score}`, { icon: '🏆' });
      }
      return nextHigh;
    });

    // Award coins equal to score
    setCoins(prev => prev + score);
  };

  // Keyboard support for spacebar jump
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleJump]);

  // Main rendering physics tick loop
  const updateLoop = () => {
    if (!isPlaying || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    gameFrame.current++;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Starry Night background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0a23');
    bgGrad.addColorStop(0.5, '#0d1e3d');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Render scrolling stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    bgStars.current.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
      star.x -= star.speed;
      if (star.x < 0) star.x = W;
    });

    // 2. Physics logic for Bird
    birdVelocity.current += gravity;
    birdY.current += birdVelocity.current;

    // Check bottom/top boundaries
    if (birdY.current + birdRadius > H - 10 || birdY.current - birdRadius < 0) {
      endGame();
      return;
    }

    // 3. Draw Flappy Bird skin
    ctx.save();
    ctx.translate(birdX, birdY.current);
    // Rotate based on downward speed
    const rotation = Math.max(-0.5, Math.min(0.8, birdVelocity.current * 0.08));
    ctx.rotate(rotation);

    // Bird body
    ctx.fillStyle = selectedSkin === 'yellow' ? '#ffd700' : selectedSkin === 'pink' ? '#ec4899' : '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(5, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(9, 1);
    ctx.lineTo(16, 3);
    ctx.lineTo(9, 6);
    ctx.fill();

    ctx.restore();

    // 4. Procedural Pipe logic
    if (gameFrame.current % 90 === 0) {
      const minHeight = 40;
      const maxHeight = H - pipeGap - 80;
      const topHeight = minHeight + Math.floor(Math.random() * (maxHeight - minHeight));
      const bottomHeight = H - pipeGap - topHeight;
      pipes.current.push({
        x: W,
        topHeight,
        bottomHeight,
        passed: false
      });
    }

    // Render & Move pipes
    pipes.current.forEach(pipe => {
      pipe.x -= pipeSpeed;

      // Draw Top Pipe with linear glass gradient
      const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
      topGrad.addColorStop(0, '#00f0ff');
      topGrad.addColorStop(1, '#0077ff');
      ctx.fillStyle = topGrad;
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
      
      // Draw Bottom Pipe
      const bottomGrad = ctx.createLinearGradient(pipe.x, H - pipe.bottomHeight, pipe.x + pipeWidth, 0);
      bottomGrad.addColorStop(0, '#00f0ff');
      bottomGrad.addColorStop(1, '#0077ff');
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(pipe.x, H - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);

      // Check collision
      const checkCollision = (
        birdX + birdRadius > pipe.x &&
        birdX - birdRadius < pipe.x + pipeWidth &&
        (birdY.current - birdRadius < pipe.topHeight || birdY.current + birdRadius > H - pipe.bottomHeight)
      );

      if (checkCollision) {
        endGame();
        return;
      }

      // Check score
      if (!pipe.passed && pipe.x + pipeWidth < birdX) {
        pipe.passed = true;
        setScore(s => s + 1);
        playTone(600, 0.05, 'sine', 0.1);
      }
    });

    // Remove offscreen pipes
    pipes.current = pipes.current.filter(pipe => pipe.x + pipeWidth > 0);

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
  }, [isPlaying, gameOver, selectedSkin]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch" style={{ background: 'linear-gradient(135deg, #09091e 0%, #0d1e3d 50%, #1e1b4b 100%)' }}>
      
      {/* Left controls & shop panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20 text-white animate-fade-in">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 uppercase tracking-widest">
              Flappy Star
            </h2>
            <Trophy size={16} className="text-yellow-400" />
          </div>

          {/* Stats */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Best Score</span>
            </div>
            <span className="font-mono text-sm font-bold text-cyan-400">{highScore}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Coins size={14} className="text-amber-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Coins Wallet</span>
            </div>
            <span className="font-mono text-sm font-bold text-amber-400">{coins}</span>
          </div>

          {/* Skin Shop */}
          <div className="space-y-2">
            <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">Flap Costumes</span>
            <div className="grid grid-cols-3 gap-2">
              {(['yellow', 'pink', 'cyan'] as const).map(skin => (
                <button
                  key={skin}
                  onClick={() => { setSelectedSkin(skin); playTone(450, 0.05, 'sine', 0.1); }}
                  className={`py-2 rounded-xl text-3xs font-mono font-bold capitalize border transition-all ${
                    selectedSkin === skin 
                      ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' 
                      : 'border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <Feather size={10} className="mx-auto mb-1" />
                  {skin}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {!isPlaying ? (
            <Button variant="neon" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={startGame}>
              Start Flapping
            </Button>
          ) : (
            <Button variant="danger" size="lg" className="w-full font-bold py-3 text-sm rounded-xl" onClick={endGame}>
              Surrender Run
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Exit Arcade
          </Button>
        </div>
      </Card>

      {/* Main Flappy Game Board View */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] border border-slate-800 rounded-2xl p-6 overflow-hidden bg-slate-950/40 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>SPACEBAR / TAP TO FLAP</span>
        </div>

        {isPlaying ? (
          <div className="relative flex flex-col items-center w-full h-full justify-center">
            {/* Score Overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-3xl font-black drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] z-10">
              {score}
            </div>

            {/* Click/Touch trigger area */}
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
                <h3 className="text-2xl font-black text-slate-200">RUN CRASHED</h3>
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 font-mono space-y-1.5 text-sm">
                  <p className="text-slate-400">Score Reached: <span className="text-cyan-400 font-bold">{score}</span></p>
                  <p className="text-slate-400">Record Score: <span className="text-indigo-400 font-bold">{highScore}</span></p>
                </div>
                <Button variant="neon" size="lg" className="w-full animate-bounce" onClick={startGame}>
                  Restart Run
                </Button>
              </>
            ) : (
              <>
                <Feather size={36} className="text-cyan-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold">Ready to Flap?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Avoid the glowing neon pipes. Tap on the canvas or press the Spacebar key to flap upward.
                </p>
                <Button variant="neon" size="lg" className="w-full" onClick={startGame}>
                  Initiate Run
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
