// src/components/games/MinesGame.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Zap, Trophy, Play } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MinesGameProps { onClose: () => void; }
type TileState = { id: number; isMine: boolean; clicked: boolean; exploding: boolean; revealed: boolean; };

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
  
  // Custom Visual State
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [proximityFactor, setProximityFactor] = useState(0); // 0 = safe, 1 = warning red, 2 = critical
  const [vinnitusActive, setVinnitusActive] = useState(false); // tinnitus visual effect
  const [screenJolt, setScreenJolt] = useState<{ x: number; y: number } | null>(null);
  const [safePath, setSafePath] = useState<number[]>([]); // array of clicked safe tile IDs

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMinesMultiplier(mineCount, clicks);

  // Sound and visual tick rate for heart rate pulse
  const heartRateInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const clicksRef = useRef(clicks);
  clicksRef.current = clicks;

  // Track dynamic heartbeat sound & visual pulses
  useEffect(() => {
    if (isPlaying && !gameOver) {
      const bpm = 60 + clicks * 25; // Speed up as they find more gems
      const intervalMs = (60 / bpm) * 1000;
      
      heartRateInterval.current = setInterval(() => {
        // Soft heartbeat sound
        playTone(90, 0.08, 'sine', 0.15);
      }, intervalMs);
    } else {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    }
    return () => {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    };
  }, [isPlaying, clicks, gameOver]);

  // Handle tile click coordinates for SVG paths
  const getTileCenter = (id: number) => {
    const col = id % 5;
    const row = Math.floor(id / 5);
    // Grid gap and cell dimensions
    return {
      x: col * 76 + 38,
      y: row * 76 + 38
    };
  };

  // Smooth Multiplier interpolation
  useEffect(() => {
    const target = currentMultiplier;
    const steps = 15;
    let step = 0;
    const start = displayMult;
    const diff = target - start;
    const id = setInterval(() => {
      step++;
      setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [currentMultiplier]);

  // Proximity checker on hover
  useEffect(() => {
    if (!isPlaying || gameOver || hoveredTile === null) {
      setProximityFactor(0);
      return;
    }

    const hoverCol = hoveredTile % 5;
    const hoverRow = Math.floor(hoveredTile / 5);

    let minD = Infinity;
    tiles.forEach(tile => {
      if (tile.isMine) {
        const col = tile.id % 5;
        const row = Math.floor(tile.id / 5);
        const dist = Math.sqrt(Math.pow(hoverCol - col, 2) + Math.pow(hoverRow - row, 2));
        if (dist < minD) minD = dist;
      }
    });

    if (minD <= 1.0) {
      setProximityFactor(2); // Critical: directly adjacent or hovering mine
    } else if (minD <= 1.5) {
      setProximityFactor(1); // Warning proximity
    } else {
      setProximityFactor(0);
    }
  }, [hoveredTile, tiles, isPlaying, gameOver]);

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
    setSafePath([]);
    setVinnitusActive(false);
    setScreenJolt(null);
    
    // Starting sonic pulse
    playTone(180, 0.1, 'sawtooth', 0.25);
    setTimeout(() => playTone(360, 0.15, 'sine', 0.2), 100);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;

    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true, revealed: true };

    if (tile.isMine) {
      // Detonation time slow sequence + shockwave
      newTiles[id].exploding = true;
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setHasWon(false);

      // Directional Shockwave: jolt screen away from mine
      const mineCol = id % 5;
      const joltX = mineCol < 2.5 ? 40 : -40; // If mine left, push right. If right, push left.
      setScreenJolt({ x: joltX, y: 15 });
      setTimeout(() => setScreenJolt(null), 300);

      // Visual Tinnitus (Chromatic Aberration + Desaturation)
      setVinnitusActive(true);
      setTimeout(() => setVinnitusActive(false), 2000);

      playTone(100, 0.8, 'sawtooth', 0.4);
      playTone(50, 1.2, 'sine', 0.5); // Deep sub-bass thud
      vibrate([150, 75, 200, 75, 300]);
      
      toast.error('💥 DETONATED! Hit a live mine!', { duration: 3000 });

      // Reveal all other mines
      const mineIds = newTiles.filter(t => t.isMine && t.id !== id).map(t => t.id);
      mineIds.forEach((mid, i) => {
        setTimeout(() => {
          setTiles(prev => {
            const copy = [...prev];
            copy[mid] = { ...copy[mid], clicked: true };
            return copy;
          });
          playTone(90 + i * 20, 0.05, 'sawtooth', 0.1);
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
      // Safe Gem reveal
      setTiles(newTiles);
      const nc = clicks + 1;
      setClicks(nc);
      setSafePath(prev => [...prev, id]);

      // Gem reveal sonar tone
      playTone(400 + nc * 50, 0.15, 'sine', 0.2);
      vibrate([40, 20, 50]);

      if (nc === 25 - mineCount) {
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

    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));

    const profit = won - betAmount;
    toast.success(`🎉 Secure Abort! +${profit} tokens`, { duration: 3000, icon: '💰' });

    // Triumphant landing melody
    playTone(523.25, 0.12, 'sine', 0.25);
    setTimeout(() => playTone(659.25, 0.12, 'sine', 0.25), 80);
    setTimeout(() => playTone(783.99, 0.15, 'sine', 0.25), 160);
    setTimeout(() => playTone(1046.50, 0.25, 'sine', 0.3), 240);
    vibrate([60, 40, 100, 40, 150]);

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
  }, [isPlaying, gameOver, clicks, mineCount, profile, balance, betAmount, updateProfile]);


  return (
    <div 
      className={`relative flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-screen items-stretch overflow-hidden text-text-primary transition-all duration-300 ${
        vinnitusActive ? 'filter saturate-50 contrast-125' : ''
      }`}
      style={{
        transform: screenJolt ? `translate3d(${screenJolt.x}px, ${screenJolt.y}px, 0px)` : 'none',
        background: 'linear-gradient(135deg, #0d1b38 0%, #0a1628 40%, #0f1535 100%)',
      }}
    >
      {/* Volumetric Hologram projection light beams */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[700px] bg-gradient-to-t from-cyan-500/5 to-transparent filter blur-3xl rounded-full opacity-60" />
        <div className="absolute top-12 left-1/4 w-[300px] h-[300px] bg-purple-500/5 filter blur-3xl rounded-full" />
      </div>

      {/* Screen edge proximity warnings */}
      {proximityFactor > 0 && isPlaying && !gameOver && (
        <div 
          className={`absolute inset-0 pointer-events-none z-10 transition-all duration-500 ${
            proximityFactor === 2 
              ? 'shadow-[inset_0_0_80px_rgba(239,68,68,0.45)] animate-pulse' 
              : 'shadow-[inset_0_0_40px_rgba(239,68,68,0.2)]'
          }`}
        />
      )}

      {/* Volumetric Light projection rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-full pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(0,240,255,0.06)_0%,_rgba(0,0,0,0)_60%)]" />

      {/* CSS Styles injection for hex grid and specialized animations */}
      <style>{`
        .mines-hex-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(5, 76px);
          grid-gap: 8px;
          padding: 12px;
          background: rgba(5, 12, 28, 0.7);
          border-radius: 24px;
          border: 1px solid rgba(0, 240, 255, 0.18);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.04);
        }

        .hex-cell {
          width: 76px;
          height: 76px;
          position: relative;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .hex-cell::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: #111827;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          z-index: 1;
        }

        .hex-cell-rim {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(0,240,255,0.4) 50%, rgba(0,0,0,0.8) 100%);
          z-index: 0;
        }

        .hex-cell-frosted {
          position: absolute;
          inset: 2px;
          background: rgba(15, 25, 55, 0.85);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 240, 255, 0.08);
        }

        .hex-cell-pulsing-red {
          animation: hexPulseRed 2.5s infinite ease-in-out;
        }

        @keyframes hexPulseRed {
          0%, 100% { background: rgba(239, 68, 68, 0.03); }
          50% { background: rgba(239, 68, 68, 0.09); }
        }

        /* Proximity tremor micro-vibrations */
        .grid-tremor-1 {
          animation: tremorMicro 0.3s infinite linear;
        }
        .grid-tremor-2 {
          animation: tremorCritical 0.15s infinite linear;
        }

        @keyframes tremorMicro {
          0% { transform: translate(0.5px, 0.5px); }
          50% { transform: translate(-0.5px, -0.5px); }
          100% { transform: translate(0.5px, -0.5px); }
        }
        @keyframes tremorCritical {
          0% { transform: translate(1.5px, 1.5px) rotate(0.5deg); }
          50% { transform: translate(-1.5px, -1.5px) rotate(-0.5deg); }
          100% { transform: translate(1.5px, -1.5px) rotate(0.5deg); }
        }

        /* Heartbeat monitor animation for multiplier */
        .multiplier-heartrate {
          animation: heartRateBeat 1.2s infinite ease-in-out;
        }
        @keyframes heartRateBeat {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          25% { transform: scale(1.04); filter: brightness(1.2); }
          40% { transform: scale(0.98); }
          55% { transform: scale(1.02); }
        }

        /* Metallic game board */
        .metallic-burn-table {
          background: linear-gradient(135deg, #0d1b38 0%, #0a1628 50%, #0f1f3d 100%);
          border: 1px solid rgba(0, 240, 255, 0.12);
          position: relative;
        }
        .metallic-burn-table::after {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.15;
          background-image: 
            radial-gradient(circle at 40% 60%, rgba(255,255,255,0.08) 1px, transparent 1px),
            radial-gradient(circle at 20% 80%, rgba(239,68,68,0.1) 4px, transparent 8px);
          background-size: 140px 140px;
          pointer-events: none;
        }

        /* Volumetric shadow caustic pattern */
        .caustic-effect {
          background: radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%);
          filter: blur(6px);
        }
      `}</style>

      {/* Left Control Panel */}
      <Card className="w-full lg:w-96 flex flex-col justify-between p-6 space-y-6 bg-slate-900/90 border-2 border-cyan-500/20 rounded-3xl shrink-0 backdrop-blur-md z-20">
        <div className="space-y-4">
          <motion.div className="flex justify-between items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-200 uppercase tracking-wider">
              MINES
            </h2>
            {/* LED bomb display */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-bold text-red-500 tracking-widest shadow-red-500/50">
                BOMBS: {mineCount.toString().padStart(2, '0')}
              </span>
            </div>
          </motion.div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

          {/* Mine count selector */}
          <div className="space-y-2">
            <label className="text-2xs font-bold text-slate-400 uppercase tracking-widest">Mine Count</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 5, 10].map(n => (
                <Button
                  key={n}
                  variant={mineCount === n ? 'primary' : 'ghost'}
                  disabled={isPlaying}
                  onClick={() => { setMineCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    mineCount === n
                      ? 'border-cyan-400/80 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {/* Live Heartbeat Multiplier counter */}
          {isPlaying && (
            <div className={`p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/20 text-center space-y-2 ${
              clicks > 0 ? 'multiplier-heartrate' : ''
            }`}>
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">MULTIPLIER</span>
              <h3 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-gold-neon via-yellow-200 to-amber-400 leading-none">
                {displayMult.toFixed(2)}x
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                = {Math.floor(betAmount * displayMult)} tokens
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {isPlaying ? (
            <>
              {/* Cash out button with glow particle layers */}
              <div className="relative group">
                <Button
                  variant="success"
                  size="lg"
                  className="w-full font-bold py-3.5 text-sm rounded-xl disabled:opacity-30 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
                  disabled={clicks === 0}
                  onClick={() => handleCashOut()}
                >
                  <Trophy size={16} />
                  ABORT & SECURE PAYOUT
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 py-2 rounded-xl border border-red-500/20"
                onClick={startNewGame}
              >
                Trigger Force Restart
              </Button>
            </>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full font-bold py-3.5 text-sm rounded-xl shadow-lg shadow-cyan-500/20 border border-cyan-400/40"
              disabled={betAmount <= 0 || betAmount > balance}
              onClick={startNewGame}
            >
              <Play size={16} className="mr-1" /> START PROJECTION
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-2xs text-slate-500 hover:text-slate-400 py-1.5 rounded-lg"
            onClick={onClose}
          >
            Close Hologram
          </Button>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-slate-800 text-2xs text-slate-500 flex justify-between font-mono">
          <span>Safe Path Return: 97%</span>
          <span>Balance: {balance} tokens</span>
        </div>
      </Card>

      {/* Game Board */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[500px] metallic-burn-table rounded-3xl p-8 overflow-hidden z-20">
        {/* Hologram projecting beam lines */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

        {/* Mines grid container with proximity micro-tremor logic */}
        <div 
          className={`relative ${
            proximityFactor === 2 ? 'grid-tremor-2' : proximityFactor === 1 ? 'grid-tremor-1' : ''
          }`}
        >
          {/* SVG Connector path overlay for the Safe Path Trail */}
          {safePath.length > 1 && (
            <svg 
              className="absolute inset-0 pointer-events-none z-10 w-full h-full"
              style={{ mixBlendMode: 'screen' }}
            >
              <defs>
                <linearGradient id="gold-trail" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ffae00" stopOpacity="0.4" />
                </linearGradient>
                <filter id="glow-filter">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path
                d={safePath.reduce((acc, tileId, index) => {
                  const pt = getTileCenter(tileId);
                  return index === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
                }, '')}
                fill="none"
                stroke="url(#gold-trail)"
                strokeWidth="4"
                strokeDasharray="6 4"
                filter="url(#glow-filter)"
                className="animate-[dash_10s_linear_infinite]"
              />
            </svg>
          )}

          {/* Hexagonal Grid */}
          <div className="mines-hex-grid">
            {tiles.length === 0 ? (
              // Placeholder Grid
              Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="hex-cell">
                  <div className="hex-cell-rim" />
                  <div className="hex-cell-frosted text-slate-600 font-black text-lg">
                    ?
                  </div>
                </div>
              ))
            ) : (
              // Active Interactive Grid
              tiles.map((tile) => {
                const isHovered = hoveredTile === tile.id;
                return (
                  <div 
                    key={tile.id} 
                    className="hex-cell"
                    onMouseEnter={() => setHoveredTile(tile.id)}
                    onMouseLeave={() => setHoveredTile(null)}
                  >
                    <div className="hex-cell-rim" />
                    
                    <AnimatePresence mode="wait">
                      {!tile.clicked ? (
                        <motion.button
                          key="unclicked"
                          disabled={!isPlaying || gameOver}
                          onClick={() => handleTileClick(tile.id)}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          className={`hex-cell-frosted text-xl font-bold transition-all duration-300 ${
                            isPlaying && !gameOver ? 'hex-cell-pulsing-red hover:text-cyan-300 text-slate-400' : 'text-slate-600'
                          }`}
                          style={{
                            boxShadow: isHovered && isPlaying && !gameOver ? 'inset 0 0 15px rgba(0, 240, 255, 0.4)' : 'none'
                          }}
                        >
                          {isHovered && isPlaying && !gameOver ? <Zap size={14} className="text-cyan-300 animate-pulse" /> : '?'}
                        </motion.button>
                      ) : (
                        // Revealed cell state
                        <motion.div
                          key="revealed"
                          initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
                          animate={tile.exploding ? { scale: [1, 1.3, 0.95, 1], rotate: [0, 8, -8, 0], rotateY: 0, opacity: 1 } : { scale: 1, rotateY: 0, opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          className={`hex-cell-frosted text-2xl z-20 ${
                            tile.isMine
                              ? 'bg-gradient-to-br from-red-950/70 to-red-900/40 border border-red-500/40'
                              : 'bg-gradient-to-br from-cyan-950/40 to-blue-900/20 border border-cyan-400/40'
                          }`}
                        >
                          <AnimatePresence>
                            {tile.isMine ? (
                              // Detonated/swirling crimson orb mine representation
                              <motion.div 
                                className="relative w-8 h-8 rounded-full bg-radial from-red-500 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                                animate={{ scale: [1, 1.15, 1], rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                              >
                                <span className="text-lg">💣</span>
                                <span className="absolute inset-0 rounded-full border border-red-400/50 animate-ping" />
                              </motion.div>
                            ) : (
                              // Luminous slow-rotating gem representation
                              <motion.div
                                className="text-xl filter drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                              >
                                💎
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Caustic / ray effect on table underneath active safe gem tiles */}
                    {tile.clicked && !tile.isMine && (
                      <div className="absolute -bottom-2 inset-x-0 h-4 caustic-effect pointer-events-none z-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Informative Status Banner */}
        <div className="mt-8 text-center min-h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {gameOver && (
              <motion.div
                key="gameover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-1"
              >
                {hasWon ? (
                  <div>
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                      <Trophy size={14} /> Mission Completed
                    </span>
                    <h4 className="text-xl font-black text-white">
                      +{earnedTokens} Tokens Secured
                    </h4>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs uppercase tracking-widest text-red-500 font-bold flex items-center justify-center gap-1.5">
                      <AlertTriangle size={14} /> Detonation Sequence Fired
                    </span>
                    <h4 className="text-lg font-black text-red-400">
                      GRID COMPROMISED
                    </h4>
                  </div>
                )}
              </motion.div>
            )}

            {!isPlaying && !gameOver && (
              <p className="text-xs text-slate-500 font-mono tracking-wider flex items-center gap-1.5">
                <Shield size={12} className="text-cyan-400" />
                INITIALIZE CORE AND CHOOSE SAFE COORDINATES
              </p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
