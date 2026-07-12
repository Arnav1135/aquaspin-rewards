// src/components/games/CrashGame.tsx
// Stake-style Crash game with Canvas visualization (4% house edge)

import { useState, useEffect, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CrashGameProps {
  onClose: () => void;
}

type GameState = 'betting' | 'climbing' | 'crashed';

export function CrashGame({ onClose }: CrashGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashedOut, setCashedOut] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const crashPointRef = useRef<number>(1.0);

  const balance = profile?.tokens ?? 0;

  const handleStartGame = async () => {
    if (betAmount <= 0) {
      toast.error('Enter a valid bet!');
      return;
    }
    if (betAmount > balance) {
      toast.error('Insufficient tokens!');
      return;
    }

    setGameState('climbing');
    setMultiplier(1.0);
    setCashedOut(false);
    setEarnedTokens(0);
    playTone(261.63, 0.15, 'sine', 0.2); // C4

    // Deduct bet immediately
    const intermediateBalance = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({ tokens: intermediateBalance }).eq('id', profile.id);
      } catch {}
    }
    updateProfile({ tokens: intermediateBalance });

    // Calculate crash point
    // 3% chance of instant crash at 1.00x
    if (Math.random() < 0.03) {
      crashPointRef.current = 1.0;
    } else {
      // 4% house edge math: 0.96 / uniform random
      const crashVal = 0.96 / Math.random();
      crashPointRef.current = Math.max(1.01, Math.round(crashVal * 100) / 100);
    }

    startTimeRef.current = Date.now();
    tick();
  };

  const tick = () => {
    if (!startTimeRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // Exponential growth curve: e^(0.065 * t)
    const currentMult = Math.pow(Math.E, 0.075 * elapsed);
    const roundedMult = Math.round(currentMult * 100) / 100;

    if (roundedMult >= crashPointRef.current) {
      // CRASHED!
      setMultiplier(crashPointRef.current);
      setGameState('crashed');
      playTone(100, 0.5, 'sawtooth', 0.3);
      vibrate(250);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);

      if (!cashedOut) {
        toast.error(`Crashed at ${crashPointRef.current}x! Bet lost.`);
      }
      return;
    }

    setMultiplier(roundedMult);
    // Play accelerating sound clicking
    if (Math.floor(elapsed * 10) % 2 === 0) {
      playTone(260 + roundedMult * 5, 0.02, 'sine', 0.04);
    }

    drawGraph(elapsed, roundedMult);
    requestRef.current = requestAnimationFrame(tick);
  };

  const drawGraph = (time: number, val: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Grid lines
    ctx.strokeStyle = 'rgba(6, 21, 41, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = h - (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      const x = (w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw graph line
    ctx.beginPath();
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00F0FF';

    // Graph scale based on time and height
    const scaleX = w / Math.max(10, time * 1.5);
    const scaleY = h / Math.max(2, val * 1.2);

    ctx.moveTo(0, h);
    for (let t = 0; t <= time; t += 0.1) {
      const v = Math.pow(Math.E, 0.075 * t);
      const px = t * scaleX;
      const py = h - v * scaleY;
      ctx.lineTo(px, py);
    }

    const currentX = time * scaleX;
    const currentY = h - val * scaleY;
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw Rocket circle indicator
    ctx.beginPath();
    ctx.fillStyle = '#FFD700';
    ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw neon trail particles
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(currentX - 16, currentY - 2, 10, 4);
  };

  const handleCashOut = async () => {
    if (gameState !== 'climbing' || cashedOut) return;

    setCashedOut(true);
    const earned = Math.floor(betAmount * multiplier);
    setEarnedTokens(earned);
    toast.success(`Cashed out at ${multiplier}x! Win +${earned - betAmount} tokens! 🚀`);
    playTone(523.25, 0.15, 'sine', 0.3); // C5
    vibrate([50, 50, 100]);

    const finalBalance = balance + earned; // Bet already deducted
    if (profile && !profile.id.startsWith('guest')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('users') as any).update({
          tokens: finalBalance,
          total_earned: profile.total_earned + (earned - betAmount),
          xp: profile.xp + Math.floor(betAmount * 0.15),
        }).eq('id', profile.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('game_stats') as any).upsert({
          user_id: profile.id,
          games_played: 1,
          games_won: 1,
        });
      } catch {}
    }
    updateProfile({ tokens: finalBalance });
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-4xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-6 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-5">
          <BetControl
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            disabled={gameState === 'climbing'}
          />
        </div>

        <div className="space-y-3">
          {gameState === 'climbing' ? (
            <Button
              variant="success"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
              disabled={cashedOut}
              onClick={handleCashOut}
            >
              {cashedOut ? 'Cashed Out' : `Cash Out (${(betAmount * multiplier).toFixed(0)})`}
            </Button>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full text-md font-bold py-4 rounded-xl shadow-lg"
              disabled={betAmount <= 0 || betAmount > balance}
              onClick={handleStartGame}
            >
              {gameState === 'crashed' ? 'Play Again' : 'Bet'}
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Visual stage */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[380px] bg-navy-900/50 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        {/* Help Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-muted">
          <HelpCircle size={10} />
          <span>House Edge: 4%</span>
        </div>

        {/* Live Multiplier readout */}
        <div className="absolute top-8 text-center z-10 select-none">
          <h2 className={`text-5xl font-display font-extrabold font-mono tracking-wider ${
            gameState === 'crashed' ? 'text-danger animate-bounce-gentle' :
            cashedOut ? 'text-success' : 'text-cyan-neon'
          }`}>
            {multiplier.toFixed(2)}x
          </h2>
          {gameState === 'crashed' && (
            <span className="text-xs text-danger font-bold uppercase tracking-wider">Crashed</span>
          )}
          {cashedOut && (
            <span className="text-xs text-success font-bold uppercase tracking-wider">Cashed Out</span>
          )}
        </div>

        {/* Canvas for graph */}
        <canvas
          ref={canvasRef}
          width={450}
          height={260}
          className="w-full h-[260px] bg-navy-950/20 rounded-xl"
        />

        {/* Bottom stats */}
        <div className="mt-4 text-center text-xs text-text-secondary min-h-[16px]">
          {cashedOut && (
            <span className="text-gold-neon font-semibold">Won +{earnedTokens - betAmount} tokens!</span>
          )}
        </div>
      </Card>
    </div>
  );
}

