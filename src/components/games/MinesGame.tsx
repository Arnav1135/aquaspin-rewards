// src/components/games/MinesGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, X, Zap, Target, Trophy } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MinesGameProps { onClose: () => void; }
type TileState = { id: number; isMine: boolean; clicked: boolean; exploding: boolean; revealed: boolean; };

// Background themes that change per game
const BACKGROUND_THEMES = [
  {
    name: 'Neon Blue',
    gradient: 'linear-gradient(135deg, #001f3f 0%, #003d5c 50%, #00539b 100%)',
    accent: 'from-cyan-500/40 to-blue-600/20',
    particles: '🔵',
  },
  {
    name: 'Purple Storm',
    gradient: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #660099 100%)',
    accent: 'from-purple-500/40 to-pink-600/20',
    particles: '⚡',
  },
  {
    name: 'Dark Forest',
    gradient: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #2d6a4f 100%)',
    accent: 'from-emerald-500/40 to-green-600/20',
    particles: '🌿',
  },
  {
    name: 'Crimson Abyss',
    gradient: 'linear-gradient(135deg, #2a0000 0%, #5c0000 50%, #8b0000 100%)',
    accent: 'from-red-500/40 to-orange-600/20',
    particles: '🔥',
  },
  {
    name: 'Gold Mine',
    gradient: 'linear-gradient(135deg, #3d2817 0%, #8b6914 50%, #daa520 20%)',
    accent: 'from-amber-500/40 to-yellow-600/20',
    particles: '✨',
  },
];

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0; if (k === 0 || k === n) return 1;
  let r = 1; for (let i = 1; i <= k; i++) r *= (n - k + i) / i; return Math.round(r);
}

function getMinesMultiplier(mines: number, clicks: number): number {
  if (clicks === 0) return 1.0;
  const total = combinations(25, clicks), win = combinations(25 - mines, clicks);
  if (win === 0) return 0;
  return Math.round((total / win) * 0.97 * 100) / 100;
}

export function MinesGame({ onClose }: MinesGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [displayMult, setDisplayMult] = useState(1.0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [currentTheme, setCurrentTheme] = useState(0);
  const [winStreak, setWinStreak] = useState(0);
  const [showCashOutPulse, setShowCashOutPulse] = useState(false);

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMinesMultiplier(mineCount, clicks);
  const nextMultiplier = getMinesMultiplier(mineCount, clicks + 1);
  const theme = BACKGROUND_THEMES[currentTheme];

  // Animated multiplier display
  useEffect(() => {
    const target = currentMultiplier;
    const steps = 12;
    let step = 0;
    const start = displayMult;
    const diff = target - start;
    const id = setInterval(() => {
      step++;
      setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [currentMultiplier]);

  // Pulse animation for cashout when multiplier gets high
  useEffect(() => {
    if (isPlaying && clicks > 0 && currentMultiplier > 2.0) {
      setShowCashOutPulse(true);
    } else {
      setShowCashOutPulse(false);
    }
  }, [isPlaying, clicks, currentMultiplier]);

  const startNewGame = async () => {
    if (isPlaying) return;
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    
    const mineIdx = new Set<number>();
    while (mineIdx.size < mineCount) mineIdx.add(Math.floor(Math.random() * 25));
    
    setTiles(Array.from({ length: 25 }, (_, i) => ({ id: i, isMine: mineIdx.has(i), clicked: false, exploding: false, revealed: false })));
    setIsPlaying(true);
    setClicks(0);
    setGameOver(false);
    setHasWon(false);
    setEarnedTokens(0);
    setDisplayMult(1.0);
    setShowCashOutPulse(false);
    
    // Rotate theme for each new game
    setCurrentTheme((prev) => (prev + 1) % BACKGROUND_THEMES.length);
    
    // Celebration particles on start
    createParticles(13, 13);
    playTone(440, 0.1, 'sine', 0.2);
  };

  const createParticles = (centerX: number, centerY: number) => {
    const newParticles = Array.from({ length: 12 }, () => ({
      id: Math.random(),
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles([]), 1000);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;

    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true, revealed: true };

    if (tile.isMine) {
      // Mine hit - explosion sequence
      newTiles[id].exploding = true;
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setHasWon(false);
      setWinStreak(0);

      playTone(150, 0.4, 'sawtooth', 0.25);
      vibrate([100, 50, 150, 50, 200]);
      
      // Create explosion particles
      createParticles(id % 5 * 70 + 35, Math.floor(id / 5) * 70 + 35);
      
      toast.error('💥 BOOM! Hit a mine!', { duration: 3000 });

      // Reveal other mines with delay
      const mineIds = newTiles.filter(t => t.isMine && t.id !== id).map(t => t.id);
      mineIds.forEach((mid, i) => {
        setTimeout(() => {
          setTiles(prev => {
            const copy = [...prev];
            copy[mid] = { ...copy[mid], clicked: true };
            return copy;
          });
          playTone(120 + i * 15, 0.05, 'sawtooth', 0.08);
        }, (i + 1) * 80);
      });

      if (profile && !profile.id.startsWith('guest')) {
        try { 
          await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 });
        } catch (e) {
          console.error('Failed to update game stats:', e);
        }
      }
    } else {
      // Safe tile - successful click
      setTiles(newTiles);
      const nc = clicks + 1;
      setClicks(nc);

      // Progressive sound pitch
      playTone(600 + nc * 35, 0.1, 'sine', 0.15);
      vibrate([20, 10, 30]);

      // Win particles
      createParticles(id % 5 * 70 + 35, Math.floor(id / 5) * 70 + 35);

      if (nc === 25 - mineCount) {
        // Auto-cashout when all safe tiles revealed
        await handleCashOut(nc);
      }
    }
  }, [isPlaying, gameOver, tiles, clicks, mineCount, profile]);

  const handleCashOut = useCallback(async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;

    const mult = getMinesMultiplier(mineCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    
    setEarnedTokens(won);
    setIsPlaying(false);
    setGameOver(true);
    setHasWon(true);
    const newStreak = winStreak + 1;
    setWinStreak(newStreak);

    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));

    const profit = won - betAmount;
    toast.success(`🎉 Cashed Out! +${profit} tokens`, { duration: 3000, icon: '💰' });

    // Victory sound
    playTone(523, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.25, 'sine', 0.3), 100);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.3), 200);
    vibrate([50, 50, 100, 50, 150]);

    // Celebration particles
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        createParticles(13 + (Math.random() - 0.5) * 20, 13 + (Math.random() - 0.5) * 20);
      }, i * 150);
    }

    const fb = balance + won;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({
          tokens: fb,
          total_earned: profile.total_earned + profit,
          xp: profile.xp + Math.floor(betAmount * 0.15),
        }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch (e) {
        console.error('Failed to update user after cashout:', e);
      }
    }
    updateProfile({ tokens: fb });
  }, [isPlaying, gameOver, clicks, mineCount, profile, balance, betAmount, updateProfile, winStreak]);

  const dangerPct = Math.min(100, (mineCount / 24) * 100);
  const safeRevealedCount = tiles.filter(t => t.clicked && !t.isMine).length;

  return (
    <div 
      className="relative flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-screen items-stretch overflow-hidden"
      style={{ background: theme.gradient }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, idx) => (
          <motion.div
            key={idx}
            className="absolute text-3xl opacity-10"
            animate={{
              x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
              y: [-50, window.innerHeight + 50],
              rotate: [0, 360],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ left: `${Math.random() * 100}%`, top: '-50px' }}
          >
            {theme.particles}
          </motion.div>
        ))}
      </div>

      {/* Floating particles on tile clicks */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute text-4xl pointer-events-none"
            initial={{ x: particle.x, y: particle.y, scale: 1, opacity: 1 }}
            animate={{ x: particle.x + (Math.random() - 0.5) * 100, y: particle.y - 100, scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            💎
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Left Control Panel */}
      <Card className="w-full lg:w-96 flex flex-col justify-between p-6 space-y-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-2 border-cyan-500/40 rounded-3xl shrink-0 backdrop-blur-sm">
        {/* Header */}
        <motion.div className="space-y-2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
            MINES
          </h2>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Win Streak: <span className="text-gold-neon">{winStreak}</span></p>
        </motion.div>

        <div className="space-y-5">
          {/* Bet Control */}
          <motion.div className="space-y-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />
          </motion.div>

          {/* Mine Count Selector */}
          <motion.div className="space-y-3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mine Count</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 5, 10].map(n => (
                <motion.div key={n} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={mineCount === n ? 'primary' : 'ghost'}
                    disabled={isPlaying}
                    onClick={() => { setMineCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                    className={`py-3 text-sm font-bold rounded-2xl transition-all ${
                      mineCount === n
                        ? 'border-2 border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/30'
                        : 'border-2 border-slate-700 hover:border-cyan-500/60 text-slate-400'
                    }`}
                  >
                    {n}
                  </Button>
                </motion.div>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="24"
              value={mineCount}
              disabled={isPlaying}
              onChange={e => setMineCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, 24)))}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-cyan-300 outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20"
              placeholder="Custom mines"
            />
          </motion.div>

          {/* Multiplier Display */}
          {isPlaying && (
            <motion.div
              className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-2 border-purple-500/40 space-y-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Next Multiplier</span>
                <motion.span
                  className="text-cyan-300 font-mono font-black text-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {nextMultiplier.toFixed(2)}x
                </motion.span>
              </div>
              <motion.div className="text-center" key={displayMult}>
                <motion.p
                  className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-gold-neon via-yellow-300 to-orange-300"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  {displayMult.toFixed(2)}x
                </motion.p>
                <p className="text-sm font-mono text-cyan-300/80 mt-2">= {Math.floor(betAmount * displayMult)} 🪙</p>
              </motion.div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-400"
                  animate={{ width: `${(clicks / (25 - mineCount)) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-slate-400 text-center font-mono">
                Safe Tiles: {safeRevealedCount} / {25 - mineCount}
              </p>
            </motion.div>
          )}

          {/* Risk Indicator */}
          <motion.div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase">Risk Level</span>
              <span className="text-red-400 font-bold font-mono">{dangerPct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(to right, #10b981, #eab308, #dc2626)`,
                }}
                animate={{ width: `${dangerPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          {isPlaying ? (
            <>
              <motion.div
                animate={showCashOutPulse ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: showCashOutPulse ? Infinity : 0, duration: 0.6 }}
              >
                <Button
                  variant="success"
                  size="lg"
                  className="w-full font-black py-4 text-lg rounded-2xl transition-all disabled:opacity-30"
                  disabled={clicks === 0}
                  onClick={() => handleCashOut()}
                >
                  <Trophy size={20} className="mr-2" />
                  CASH OUT ({Math.floor(betAmount * currentMultiplier)})
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  className="w-full text-sm border-2 border-red-500/40 text-red-400 hover:border-red-500/70 py-2 rounded-xl font-bold"
                  onClick={startNewGame}
                >
                  Restart Game
                </Button>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Button
                variant="neon"
                size="lg"
                className="w-full font-black py-4 text-lg rounded-2xl shadow-xl shadow-cyan-500/40 transition-all"
                disabled={betAmount <= 0 || betAmount > balance}
                onClick={startNewGame}
              >
                <Zap size={20} className="mr-2" />
                START GAME
              </Button>
            </motion.div>
          )}
          <Button
            variant="ghost"
            className="w-full text-xs text-slate-400 border-2 border-slate-700 hover:border-slate-600 hover:text-slate-300 py-2 rounded-xl"
            onClick={onClose}
          >
            <X size={16} className="mr-1" /> Close
          </Button>
        </div>

        {/* Info Footer */}
        <motion.div className="pt-4 border-t border-slate-700 text-xs text-slate-400 space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="flex justify-between">
            <span>House Edge:</span>
            <span className="text-slate-300 font-mono font-bold">3%</span>
          </div>
          <div className="flex justify-between">
            <span>Balance:</span>
            <span className="text-cyan-400 font-mono font-bold">{balance} 🪙</span>
          </div>
        </motion.div>
      </Card>

      {/* Game Board */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[500px] bg-gradient-to-br from-slate-900/60 to-slate-800/60 border-2 border-cyan-500/40 rounded-3xl p-8 overflow-hidden backdrop-blur-sm">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-cyan-500/40 rounded-bl-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-cyan-500/40 rounded-bl-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-cyan-500/40 rounded-tr-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-cyan-500/40 rounded-tl-3xl pointer-events-none" />

        {/* Game Info */}
        <motion.div
          className="absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-widest z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Target size={14} />
          <span>Theme: {theme.name}</span>
        </motion.div>

        {/* Tiles Grid */}
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-3 w-full max-w-md">
            {tiles.length === 0 ? (
              // Placeholder tiles
              Array.from({ length: 25 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-2xl bg-slate-800/40 border-2 border-slate-700/50 flex items-center justify-center text-slate-600/40 text-3xl font-black"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.02, type: 'spring' }}
                >
                  ?
                </motion.div>
              ))
            ) : (
              // Active tiles
              tiles.map((tile) => (
                <motion.div key={tile.id} layout className="aspect-square">
                  <AnimatePresence mode="wait">
                    {!tile.clicked ? (
                      <motion.button
                        key="unclicked"
                        disabled={!isPlaying || gameOver}
                        onClick={() => handleTileClick(tile.id)}
                        initial={{ scale: 0, rotateY: 90 }}
                        animate={{ scale: 1, rotateY: 0 }}
                        exit={{ scale: 0, rotateY: -90 }}
                        whileHover={isPlaying && !gameOver ? { scale: 1.1, boxShadow: '0 0 30px rgba(0,240,255,0.6)' } : {}}
                        whileTap={isPlaying && !gameOver ? { scale: 0.85 } : {}}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border-3 border-cyan-500/60 flex items-center justify-center text-4xl font-black text-cyan-300/80 cursor-pointer shadow-lg hover:shadow-cyan-500/50 active:shadow-none transition-all"
                      >
                        ?
                      </motion.button>
                    ) : (
                      <motion.div
                        key="clicked"
                        initial={{ scale: 0, rotateY: 90 }}
                        animate={tile.exploding ? { scale: [0, 1.4, 0.95, 1], rotateY: 0, rotate: [0, 15, -15, 0] } : { scale: 1, rotateY: 0 }}
                        transition={tile.exploding ? { duration: 0.6, type: 'spring' } : { duration: 0.4 }}
                        exit={{ scale: 0, rotateY: -90 }}
                        className={`w-full h-full rounded-2xl border-3 flex items-center justify-center text-4xl font-black transition-all ${
                          tile.isMine
                            ? 'bg-gradient-to-br from-red-900/60 to-red-950/80 border-red-500/80 shadow-lg shadow-red-600/40'
                            : 'bg-gradient-to-br from-cyan-900/40 to-blue-900/50 border-cyan-400/80 shadow-lg shadow-cyan-500/50'
                        }`}
                        style={tile.isMine ? {} : { boxShadow: `0 0 ${15 + clicks * 4}px rgba(0,240,255,${0.3 + clicks * 0.05})` }}
                      >
                        <motion.span
                          animate={tile.isMine ? { rotate: [0, 360], scale: [1, 1.2, 1] } : { scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.6 }}
                        >
                          {tile.isMine ? '💣' : '💎'}
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Game Status */}
        <motion.div className="mt-8 text-center min-h-20 space-y-3">
          <AnimatePresence mode="wait">
            {gameOver && (
              <motion.div
                key="game-over"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="space-y-2"
              >
                {hasWon ? (
                  <motion.div
                    initial={{ y: -10 }}
                    animate={{ y: 0 }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="space-y-1"
                  >
                    <motion.p className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-2">
                      <Trophy size={16} /> Victory!
                    </motion.p>
                    <motion.p className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-gold-neon via-yellow-300 to-orange-300">
                      +{earnedTokens} 🪙
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center justify-center gap-2">
                      <AlertTriangle size={16} /> Game Over
                    </p>
                    <p className="text-2xl font-black text-red-300">MINE HIT!</p>
                  </motion.div>
                )}
              </motion.div>
            )}
            {!isPlaying && !gameOver && (
              <motion.p
                key="start-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-slate-300 flex items-center gap-2 justify-center uppercase tracking-wider font-bold"
              >
                <Shield size={16} className="text-cyan-300" />
                Set your bet and click START GAME
              </motion.p>
            )}
            {isPlaying && !gameOver && clicks === 0 && (
              <motion.p
                key="playing-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-cyan-300 flex items-center gap-2 justify-center uppercase tracking-wider font-bold animate-pulse"
              >
                <Zap size={16} /> Click tiles carefully!
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </Card>
    </div>
  );
}
