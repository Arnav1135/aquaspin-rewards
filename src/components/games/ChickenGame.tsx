// src/components/games/ChickenGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield, CloudSun } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChickenGameProps { onClose: () => void; }
type TileState = { id: number; isBone: boolean; clicked: boolean; };
type HazardTheme = 'farm' | 'pirate' | 'space';

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0; if (k === 0 || k === n) return 1;
  let r = 1; for (let i = 1; i <= k; i++) r *= (n - k + i) / i; return Math.round(r);
}

function getMultiplier(bones: number, clicks: number): number {
  if (clicks === 0) return 1.0;
  const total = combinations(25, clicks), win = combinations(25 - bones, clicks);
  if (win === 0) return 0;
  return Math.round((total / win) * 0.965 * 100) / 100;
}

export function ChickenGame({ onClose }: ChickenGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [boneCount, setBoneCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [displayMult, setDisplayMult] = useState(1.0);
  
  // Custom Visual Themes
  const [activeTheme, setActiveTheme] = useState<HazardTheme>('farm');
  const [chickenPosition, setChickenPosition] = useState<number | null>(null);

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMultiplier(boneCount, clicks);

  // Dynamic confidence rating
  const getConfidenceLevel = () => {
    if (!isPlaying) return 'Resting';
    const safetyRatio = clicks / (25 - boneCount);
    if (safetyRatio > 0.6) return 'Panic Flaps! 😱';
    if (safetyRatio > 0.3) return 'Nervous Waddles 😰';
    return 'Determined strut 😎';
  };

  useEffect(() => {
    const target = currentMultiplier;
    let step = 0; const steps = 12; const start = displayMult; const diff = target - start;
    const id = setInterval(() => {
      step++; setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
   
  }, [currentMultiplier]);

  const startNewGame = async () => {
    if (isPlaying) return;
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit to play.'); return; }
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
    
    const boneIdx = new Set<number>();
    while (boneIdx.size < boneCount) boneIdx.add(Math.floor(Math.random() * 25));
    setTiles(Array.from({ length: 25 }, (_, i) => ({ id: i, isBone: boneIdx.has(i), clicked: false })));
    setIsPlaying(true);
    setClicks(0);
    setGameOver(false);
    setHasWon(false);
    setEarnedTokens(0);
    setDisplayMult(1.0);
    setChickenPosition(null);

    // Startup bawk tone
    playTone(392, 0.12, 'sine', 0.25);
    setTimeout(() => playTone(587.33, 0.15, 'sine', 0.2), 80);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;
    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true };

    setChickenPosition(id);

    if (tile.isBone) {
      // Splintering bridge collapse slow-motion sequence
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setHasWon(false);

      playTone(180, 0.4, 'sawtooth', 0.3); // crack wood
      playTone(95, 0.6, 'sine', 0.4); // plummet crash
      vibrate([100, 50, 200]);
      
      toast.error('💀 Splinter! Plank collapsed!');

      // Reveal other bones
      const boneIds = newTiles.filter(t => t.isBone && t.id !== id).map(t => t.id);
      boneIds.forEach((bid, i) => {
        setTimeout(() => setTiles(prev => { 
          const c = [...prev]; 
          c[bid] = { ...c[bid], clicked: true }; 
          return c; 
        }), (i + 1) * 90);
      });

      if (profile && !profile.id.startsWith('guest')) {
        try { 
          await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 });
        } catch (e) {
          console.error('Failed to update game stats:', e);
        }
      }
    } else {
      // Safe step on plank
      setTiles(newTiles);
      const nc = clicks + 1;
      setClicks(nc);

      // Triumphant chirp scale
      playTone(440 + nc * 45, 0.12, 'sine', 0.25);
      vibrate([35, 15, 30]);

      if (nc === 25 - boneCount) await handleCashOut(nc);
    }
  }, [isPlaying, gameOver, tiles, clicks, boneCount, profile]);

  const handleCashOut = useCallback(async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;
    const mult = getMultiplier(boneCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    setEarnedTokens(won);
    setIsPlaying(false);
    setGameOver(true);
    setHasWon(true);
    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));

    toast.success(`🐔 Triumphant bawk! +${won - betAmount} tokens!`);
    playTone(523.25, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659.25, 0.15, 'sine', 0.3), 80);
    setTimeout(() => playTone(783.99, 0.25, 'sine', 0.3), 160);
    vibrate([60, 40, 120]);

    const fb = balance + won;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (won - betAmount), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch (e) {
        console.error('Failed to update user after cashout:', e);
      }
    }
    updateProfile({ tokens: fb });
  }, [isPlaying, gameOver, clicks, boneCount, profile, balance, betAmount, updateProfile]);

  const dangerPct = Math.min(100, (boneCount / 24) * 100);

  // Return background gradient themes based on active costume selection
  const getThemeGradient = () => {
    switch (activeTheme) {
      case 'space': return 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 100%)';
      case 'pirate': return 'linear-gradient(to bottom, #0d5c56 0%, #134e4a 100%)';
      default: return 'linear-gradient(to bottom, #854d0e 0%, #451a03 100%)'; // storybook farm warm sunset
    }
  };

  return (
    <div 
      className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch transition-all duration-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl"
      style={{ background: getThemeGradient() }}
    >
      <style>{`
        /* Wooden sign mechanical flip numbers */
        .wooden-sign-numeric {
          font-family: monospace;
          background: #472b15;
          border: 2px solid #2d1808;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
        }

        /* Sweat droplets animation for chicken button */
        .sweat-drop {
          animation: dropSweat 0.8s infinite linear;
        }
        @keyframes dropSweat {
          0% { transform: translateY(-5px) scale(1); opacity: 0.8; }
          100% { transform: translateY(12px) scale(0.4); opacity: 0; }
        }

        /* Floating Farm bridge background styling */
        .bridge-table {
          background-image: 
            radial-gradient(circle at 50% 120%, rgba(245, 158, 11, 0.04) 0%, transparent 80%);
        }

        /* Rickety rope bridge look */
        .plank-tile {
          background: linear-gradient(135deg, #6b4423 0%, #3d2310 100%);
          border: 2px solid #2d1808;
          box-shadow: 0 4px 6px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1);
        }
        .plank-tile-ropes {
          position: absolute;
          top: -3px;
          inset-x: 6px;
          height: 6px;
          border-left: 2px solid #85623f;
          border-right: 2px solid #85623f;
          opacity: 0.8;
        }
      `}</style>

      {/* Left controls card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-amber-200 tracking-wider">
              HIGH WIRE
            </h2>
            <CloudSun size={16} className="text-orange-400 animate-pulse" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

          {/* Theme / Hazard Selector */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Select Theme</span>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['farm', 'pirate', 'space'] as HazardTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setActiveTheme(t);
                    playTone(350, 0.05, 'sine', 0.1);
                  }}
                  className={`py-1.5 rounded-lg text-3xs font-bold capitalize transition-all ${
                    activeTheme === t
                      ? 'bg-slate-900 border border-orange-500/50 text-orange-400 shadow-md'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Bone count selector */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Bone Count</span>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 15].map(n => (
                <Button key={n} variant={boneCount === n ? 'primary' : 'ghost'} disabled={isPlaying}
                  onClick={() => { setBoneCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-1.5 text-xs rounded-xl font-bold font-mono ${boneCount === n ? 'border-orange-500/80 bg-orange-500/10 text-orange-300' : 'border-slate-850 text-slate-400'}`}>
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {/* Chicken confidence rating */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Confidence:</span>
            <span className="text-xs font-bold text-orange-300">
              {getConfidenceLevel()}
            </span>
          </div>

          {/* Wooden flip multiplier display */}
          {isPlaying && (
            <div className="p-3.5 rounded-xl wooden-sign-numeric text-center space-y-1.5">
              <span className="text-[9px] text-yellow-500/70 font-bold tracking-widest uppercase">STEPS MULTIPLIER</span>
              <p className="text-3xl font-black text-yellow-300 font-mono tracking-tighter">
                {displayMult.toFixed(2)}x
              </p>
            </div>
          )}
        </div>

        {/* Action button operations */}
        <div className="space-y-2">
          {isPlaying ? (
            <div className="relative">
              <Button variant="success" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl disabled:opacity-30 shadow-md shadow-emerald-500/10 border border-emerald-400/20" disabled={clicks === 0} onClick={() => handleCashOut()}>
                RETRIEVE CHICKEN ({Math.floor(betAmount * currentMultiplier)})
              </Button>
            </div>
          ) : (
            <Button variant="neon" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-orange-400/40 shadow-lg shadow-orange-500/20" disabled={betAmount <= 0 || betAmount > balance} onClick={startNewGame}>
              START JOURNEY
            </Button>
          )}
          <Button variant="ghost" className="w-full text-2xs text-slate-400 hover:text-slate-400" onClick={onClose}>
            Close Sanctuary
          </Button>
        </div>
      </Card>

      {/* Storybook Farm rope bridge layout */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] bridge-table rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-orange-400" />
          <span>FARMHOUSE ADVANTAGE: 3.5%</span>
        </div>

        {/* Floating bridge environment */}
        <div className="flex gap-4 items-start z-10">
          {/* Bridge 5x5 planks grid */}
          <div className="grid grid-cols-5 gap-2 max-w-[320px]">
            {tiles.length === 0 ? Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-center">
                <span className="text-slate-700 text-xs font-mono">?</span>
              </div>
            )) : tiles.map(tile => {
              const hasChicken = chickenPosition === tile.id;
              return (
                <div key={tile.id} className="relative aspect-square">
                  <AnimatePresence mode="wait">
                    {!tile.clicked ? (
                      <motion.button 
                        key="unrevealed" 
                        exit={{ y: 25, opacity: 0, scale: 0.7 }} 
                        transition={{ duration: 0.25 }}
                        disabled={!isPlaying || gameOver} 
                        onClick={() => handleTileClick(tile.id)}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(245,158,11,0.45)' }}
                        whileTap={{ scale: 0.92 }}
                        className="plank-tile absolute inset-0 rounded-xl flex flex-col items-center justify-center overflow-hidden cursor-pointer"
                      >
                        <div className="plank-tile-ropes" />
                        <span className="text-xs text-yellow-600/70 font-mono select-none font-bold">?</span>
                      </motion.button>
                    ) : (
                      // Revealed plank slot
                      <motion.div 
                        key="revealed"
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={tile.isBone ? { scale: [1, 1.25, 0.95, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className={`absolute inset-0 rounded-xl border flex flex-col items-center justify-center text-xl z-10 ${
                          tile.isBone 
                            ? 'bg-red-950/30 border-red-500/40' 
                            : 'bg-orange-950/20 border-orange-500/30'
                        }`}
                      >
                        {/* Render cute expressive chicken waddling or collapse bones */}
                        <div className="relative flex flex-col items-center justify-center">
                          {tile.isBone ? (
                            <span className="text-2xl filter drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">💀</span>
                          ) : (
                            <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">🐔</span>
                          )}

                          {/* Active waddling location ring indicator */}
                          {hasChicken && !tile.isBone && (
                            <motion.span 
                              className="absolute w-7 h-7 rounded-full border border-orange-400 pointer-events-none"
                              animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.2, 0.8] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Vertically sliding hazard thermometer */}
          <div className="flex flex-col items-center gap-1.5 h-[310px] pt-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>DANGER</span>
            <div className="flex-1 w-2.5 rounded-full bg-slate-950 overflow-hidden flex flex-col justify-end border border-slate-900 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl">
              <motion.div className="w-full rounded-full" style={{ background: 'linear-gradient(to top, #10b981, #eab308, #ef4444)' }}
                animate={{ height: `${dangerPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>

        {/* Narrative status panel */}
        <div className="mt-6 text-center min-h-[48px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {gameOver && (
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-0.5">
                {hasWon ? (
                  <div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">🎉 Journey complete</p>
                    <p className="text-lg font-black text-white">+{earnedTokens} tokens secured</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">💀 Plank Ruptured</p>
                    <p className="text-md font-bold text-red-400">CHICKEN FELL INTO CAULDRON</p>
                  </div>
                )}
              </motion.div>
            )}
            {!isPlaying && !gameOver && (
              <p className="text-2xs text-slate-400 font-mono tracking-wider flex items-center gap-1">
                <Shield size={11} className="text-orange-400" />
                INITIATE CORE ELEVATION SYSTEM TO CROSS BRIDGE
              </p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
