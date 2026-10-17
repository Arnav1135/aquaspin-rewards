// src/components/games/ChickenGame.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield, Sparkles, Flame, Utensils } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChickenGameProps { onClose: () => void; }
type TileState = { id: number; isBone: boolean; clicked: boolean; };
type SteamParticle = { id: number; x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; maxLife: number; color: string; };

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
  const [smokeSet, setSmokeSet] = useState<Set<number>>(new Set());
  const [lastClickedTile, setLastClickedTile] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientSteamRef = useRef<SteamParticle[]>([]);
  const rAFRef = useRef<number | null>(null);

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMultiplier(boneCount, clicks);

  // Smooth Multiplier Ticker
  useEffect(() => {
    const target = currentMultiplier;
    let step = 0; const steps = 10; const start = displayMult; const diff = target - start;
    const id = setInterval(() => {
      step++; setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMultiplier]);

  // Ambient Luxury Culinary Banquet Background FX Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize warm banquet aroma particles
    ambientSteamRef.current = Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 400,
      y: Math.random() * 450,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.3 + Math.random() * 0.6),
      size: 1.5 + Math.random() * 3,
      alpha: 0.15 + Math.random() * 0.35,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      color: Math.random() > 0.4 ? 'rgba(245, 158, 11, ' : 'rgba(217, 249, 157, '
    }));

    const renderLoop = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;

      // Clear with VIP banquet table lighting gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, W * 0.65);
      bgGrad.addColorStop(0, '#0c1b30');
      bgGrad.addColorStop(0.6, '#060f1e');
      bgGrad.addColorStop(1, '#020610');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle table cloth surface grid line texture
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Warm culinary aroma & gold dust motes
      ambientSteamRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        if (p.y < -10 || p.life >= p.maxLife) {
          p.x = Math.random() * W;
          p.y = H + 10;
          p.life = 0;
          p.maxLife = 100 + Math.random() * 100;
          p.vx = (Math.random() - 0.5) * 0.4;
        }

        const currentAlpha = p.alpha * Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.fillStyle = `${p.color}${Math.max(0, currentAlpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      rAFRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, []);

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
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id); } catch {}
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    const boneIdx = new Set<number>();
    while (boneIdx.size < boneCount) boneIdx.add(Math.floor(Math.random() * 25));
    setTiles(Array.from({ length: 25 }, (_, i) => ({ id: i, isBone: boneIdx.has(i), clicked: false })));
    setIsPlaying(true); setClicks(0); setGameOver(false); setHasWon(false);
    setEarnedTokens(0); setDisplayMult(1.0); setSmokeSet(new Set());
    setLastClickedTile(null);

    // Silver cloche setup chime
    playTone(587.33, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(880, 0.12, 'triangle', 0.2), 60);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;
    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true };
    setLastClickedTile(id);

    // Unseal silver cloche sound: sharp metallic ring
    playTone(1046.5, 0.06, 'sine', 0.18);

    if (tile.isBone) {
      setTiles(newTiles);
      setSmokeSet(prev => new Set(prev).add(id));
      setTimeout(() => setSmokeSet(prev => { const s = new Set(prev); s.delete(id); return s; }), 850);
      setGameOver(true); setIsPlaying(false); setHasWon(false);

      // Deep volcanic trap bass shockwave & tremor
      playTone(110, 0.4, 'sawtooth', 0.35);
      setTimeout(() => playTone(55, 0.5, 'sine', 0.4), 80);
      vibrate([120, 40, 200]);
      toast.error('💀 Molten Bone Uncovered! Banquet lost.');

      const boneIds = newTiles.filter(t => t.isBone && t.id !== id).map(t => t.id);
      boneIds.forEach((bid, i) => {
        setTimeout(() => setTiles(prev => { const c = [...prev]; c[bid] = { ...c[bid], clicked: true }; return c; }), (i + 1) * 90);
      });
      if (profile && !profile.id.startsWith('guest')) {
        try { await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 }); } catch {}
      }
    } else {
      setTiles(newTiles);
      const nc = clicks + 1; setClicks(nc);

      // Ascending gourmet triumph chime
      const baseFreq = 523.25 + nc * 35;
      playTone(baseFreq, 0.1, 'sine', 0.22);
      setTimeout(() => playTone(baseFreq * 1.25, 0.12, 'triangle', 0.2), 70);
      vibrate(25);

      if (nc === 25 - boneCount) await handleCashOut(nc);
    }
  }, [isPlaying, gameOver, tiles, clicks, boneCount]);

  const handleCashOut = async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;
    const mult = getMultiplier(boneCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    setEarnedTokens(won); setIsPlaying(false); setGameOver(true); setHasWon(true);
    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));
    toast.success(`Royal Banquet Cashed out! +${won - betAmount} tokens 🍗`);

    // Triple fanfare chord sequence
    playTone(523.25, 0.18, 'sine', 0.3);
    setTimeout(() => playTone(659.25, 0.18, 'sine', 0.3), 90);
    setTimeout(() => playTone(783.99, 0.28, 'triangle', 0.35), 180);
    vibrate([60, 50, 120, 60, 150]);

    const fb = balance + won;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (won - betAmount), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch {}
    }
    updateProfile({ tokens: fb });
  };

  const dangerPct = Math.min(100, (boneCount / 24) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      {/* Control Panel Card */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950/95 border border-navy-800/80 rounded-2xl shrink-0 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Subtle Luxury Gold Corner Accent */}
        <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between pb-2 border-b border-navy-800/60">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Utensils size={16} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-wide">Royal Chicken</h3>
                <p className="text-3xs text-text-secondary uppercase tracking-wider font-mono">PBR Banquet Suite</p>
              </div>
            </div>
            <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-navy-900 border border-navy-700/80 text-amber-400/90 font-bold">
              3.5% Edge
            </span>
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

          {/* Bone Count Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
                <Flame size={12} className="text-danger" /> Hazard Bones
              </span>
              <span className="text-2xs font-mono text-muted">{25 - boneCount} safe dishes</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 3, 5, 10, 15].map(n => (
                <Button key={n} variant={boneCount === n ? 'primary' : 'ghost'} disabled={isPlaying}
                  onClick={() => { setBoneCount(n); playTone(440 + n * 20, 0.05, 'sine', 0.1); }}
                  className={`py-2 text-xs rounded-xl font-bold transition-all ${
                    boneCount === n
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'border-navy-800 hover:border-navy-600'
                  }`}>{n}</Button>
              ))}
            </div>
            <input type="number" min="1" max="24" value={boneCount} disabled={isPlaying}
              onChange={e => setBoneCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, 24)))}
              className="w-full bg-navy-900/90 border border-navy-700/60 rounded-xl px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:border-amber-400 transition-colors" placeholder="Custom" />
          </div>

          {/* Active Multiplier HUD */}
          {isPlaying && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-xl bg-gradient-to-br from-navy-900/90 via-navy-900/60 to-amber-950/20 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xs uppercase tracking-wider text-amber-300/80 font-semibold mb-0.5 flex items-center gap-1">
                    <Sparkles size={11} /> Current Banquet Payout
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
                    {displayMult.toFixed(2)}x
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xs text-muted block uppercase">Yield</span>
                  <span className="text-sm font-bold font-mono text-success">
                    +{Math.floor(betAmount * displayMult) - betAmount}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-navy-800/80 flex justify-between items-center text-xs">
                <span className="text-muted">Total Dish Claim:</span>
                <span className="font-mono font-bold text-amber-300">{Math.floor(betAmount * displayMult)} tokens</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-2 relative z-10">
          {isPlaying ? (
            <motion.div
              animate={clicks > 0 ? {
                boxShadow: [
                  '0 0 0 0 rgba(16, 185, 129, 0.45)',
                  '0 0 0 12px rgba(16, 185, 129, 0)',
                  '0 0 0 0 rgba(16, 185, 129, 0.45)'
                ]
              } : {}}
              transition={{ repeat: Infinity, duration: 1.4 }}>
              <Button
                variant="success"
                size="lg"
                className="w-full font-bold py-4 rounded-xl text-base tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-[0_4px_20px_rgba(16,185,129,0.3)] border-t border-emerald-300/30"
                disabled={clicks === 0}
                onClick={() => handleCashOut()}>
                Cash Out ({Math.floor(betAmount * currentMultiplier)} Tokens)
              </Button>
            </motion.div>
          ) : (
            <Button
              variant="neon"
              size="lg"
              className="w-full font-bold py-4 rounded-xl text-base tracking-wide bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:brightness-110 shadow-[0_4px_20px_rgba(0,240,255,0.25)] border-t border-cyan-300/40"
              disabled={betAmount <= 0 || betAmount > balance}
              onClick={startNewGame}>
              Start Banquet Feast
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-muted hover:text-text-primary" onClick={onClose}>
            Close Game
          </Button>
        </div>
      </Card>

      {/* Main Game Stage Card */}
      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[460px] bg-navy-950/70 border border-navy-800/80 rounded-2xl p-6 overflow-hidden shadow-2xl">
        {/* Background Canvas for Ambient Banquet Table Lighting */}
        <canvas ref={canvasRef} width={520} height={480} className="absolute inset-0 w-full h-full pointer-events-none" />

        <div className="absolute top-4 right-4 flex items-center gap-1.5 text-2xs text-amber-300/80 font-mono bg-navy-900/80 px-2.5 py-1 rounded-full border border-navy-700/60 z-10 shadow-sm backdrop-blur-sm">
          <HelpCircle size={11} />
          <span>Provably Fair RNG</span>
        </div>

        <div className="flex gap-4 items-center relative z-10">
          {/* 5x5 Cloche Grid */}
          <div className="grid grid-cols-5 gap-2.5 w-[320px] sm:w-[350px]">
            {tiles.length === 0 ? Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-gradient-to-b from-navy-800/60 to-navy-900/80 border border-navy-700/40 flex items-center justify-center shadow-inner relative group">
                <PbrSilverClocheSvg isWaiting={true} />
              </div>
            )) : tiles.map(tile => (
              <div key={tile.id} className="relative aspect-square">
                <AnimatePresence mode="wait">
                  {!tile.clicked ? (
                    <motion.button
                      key="cloche"
                      exit={{ y: -60, rotate: -14, opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                      disabled={!isPlaying || gameOver}
                      onClick={() => handleTileClick(tile.id)}
                      whileHover={isPlaying && !gameOver ? {
                        scale: 1.07,
                        y: -3,
                        boxShadow: '0 12px 24px -4px rgba(0, 240, 255, 0.3), 0 0 16px rgba(245, 158, 11, 0.25)'
                      } : {}}
                      whileTap={{ scale: 0.94 }}
                      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none group focus:outline-none"
                      style={{
                        background: 'radial-gradient(circle at 50% 120%, #1e293b, #0f172a 70%, #020617)',
                        boxShadow: '0 6px 14px -2px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)'
                      }}>
                      {/* Under-dish charger rim */}
                      <div className="absolute inset-1 rounded-xl border border-navy-700/60 pointer-events-none" />
                      
                      {/* Render PBR Silver Cloche Dome */}
                      <PbrSilverClocheSvg isWaiting={!isPlaying} isHovered={lastClickedTile === tile.id} />

                      {/* Interactive Sheen Glint Sweep on Hover */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                      </div>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ scale: 0.2, opacity: 0, rotate: tile.isBone ? -10 : 10 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      className={`absolute inset-0 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden select-none ${
                        tile.isBone
                          ? 'bg-gradient-to-b from-red-950/80 via-black/90 to-red-950/90 border-red-500/70 shadow-[0_0_24px_rgba(239,68,68,0.45)]'
                          : 'bg-gradient-to-b from-amber-950/40 via-navy-900/80 to-amber-900/30 border-amber-400/70 shadow-[0_0_22px_rgba(245,158,11,0.35)]'
                      }`}>

                      {tile.isBone ? (
                        /* Molten Obsidian Crossbones Hazard */
                        <div className="relative flex flex-col items-center justify-center w-full h-full">
                          {/* Molten Magma Texture Inset */}
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.25)_0%,_transparent_70%)] pointer-events-none animate-pulse" />
                          <div className="text-2xl sm:text-3xl filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
                            💀
                          </div>
                          <span className="text-3xs font-mono font-bold text-red-400 uppercase tracking-widest mt-0.5">
                            BONE
                          </span>

                          {/* Dynamic Magma Explosion Sparks */}
                          {smokeSet.has(tile.id) && Array.from({ length: 6 }).map((_, si) => {
                            const angle = (si / 6) * Math.PI * 2;
                            return (
                              <motion.div
                                key={si}
                                className="absolute w-2 h-2 rounded-full pointer-events-none bg-gradient-to-r from-red-500 to-amber-500 shadow-[0_0_8px_rgba(239,68,68,1)]"
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: Math.cos(angle) * 26, y: Math.sin(angle) * 26, opacity: 0, scale: 0 }}
                                transition={{ duration: 0.65, ease: 'easeOut' }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        /* Golden Roast Feast Platter */
                        <div className="relative flex flex-col items-center justify-center w-full h-full">
                          {/* Warm Culinary Aura Bloom */}
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.3)_0%,_transparent_75%)] pointer-events-none" />
                          
                          <motion.div
                            animate={{ y: [0, -2, 0] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            className="text-2xl sm:text-3xl filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.7)]">
                            🍗
                          </motion.div>
                          
                          {/* Golden Multiplier Badge */}
                          <div className="mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-3xs font-bold shadow-sm">
                            WIN
                          </div>

                          {/* Rising Culinary Steam Puffs */}
                          {lastClickedTile === tile.id && (
                            <motion.div
                              initial={{ y: 0, opacity: 0.8, scale: 0.5 }}
                              animate={{ y: -24, opacity: 0, scale: 1.4 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="absolute top-1 text-2xs text-amber-300 pointer-events-none">
                              ✨
                            </motion.div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* High-Precision Risk Plasma Tube */}
          <div className="flex flex-col items-center gap-1.5 h-[320px] sm:h-[350px] p-2 bg-navy-950/80 rounded-2xl border border-navy-800/80 shadow-lg">
            <span className="text-3xs text-amber-400/90 font-mono font-bold uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              HAZARD GAUGING
            </span>
            <div className="flex-1 w-3.5 rounded-full bg-navy-900 border border-navy-700/80 overflow-hidden flex flex-col justify-end p-0.5 shadow-inner relative">
              {/* Plasma Liquid Column */}
              <motion.div
                className="w-full rounded-full shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                style={{
                  background: 'linear-gradient(to top, #10b981 0%, #eab308 50%, #ef4444 100%)'
                }}
                animate={{ height: `${dangerPct}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
              {/* Glowing Boiling Plasma Head */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 w-2.5 h-1 rounded-full bg-white/80 blur-[1px]"
                style={{ bottom: `calc(${dangerPct}% - 2px)` }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            </div>
            <span className="text-3xs font-mono text-muted">{dangerPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Status / Outcome Footer Banner */}
        <div className="mt-5 text-center min-h-[48px] relative z-10">
          <AnimatePresence mode="wait">
            {gameOver && (
              <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                {hasWon ? (
                  <div className="px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Sparkles size={13} /> Royal Banquet Cashed Out!
                    </p>
                    <p className="text-xl font-extrabold font-mono text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]">
                      +{earnedTokens} tokens
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                    <p className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Flame size={13} /> Molten Bone Trap!
                    </p>
                    <p className="text-xs text-muted font-mono mt-0.5">Bet of {betAmount} tokens forfeited</p>
                  </div>
                )}
              </motion.div>
            )}
            {!isPlaying && !gameOver && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-text-secondary flex items-center gap-1.5 justify-center font-medium bg-navy-900/60 px-4 py-1.5 rounded-full border border-navy-800">
                <Shield size={12} className="text-amber-400" />
                Select bone count and click Start Banquet Feast
              </motion.p>
            )}
            {isPlaying && !gameOver && clicks === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-amber-300/90 flex items-center gap-1.5 justify-center font-medium animate-pulse">
                <Utensils size={12} />
                Select any silver cloche to reveal dish
              </motion.p>
            )}
            {isPlaying && !gameOver && clicks > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center font-medium">
                <Sparkles size={12} />
                {clicks} safe dishes uncovered! Cash out or continue tasting.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}

/**
 * Photorealistic PBR Silver Cloche Dome
 * Handcrafted multi-gradient SVG with anisotropic specular highlights,
 * 24K gold filigree lip, beaded finial handle, and charger plate shadow.
 */
function PbrSilverClocheSvg({ isWaiting, isHovered }: { isWaiting?: boolean; isHovered?: boolean }) {
  return (
    <svg viewBox="0 0 72 64" className="w-[84%] h-[84%] filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Specular Chrome Body Gradient */}
        <linearGradient id="clocheChromeGrad" x1="12" y1="14" x2="60" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="18%" stopColor="#e2e8f0" />
          <stop offset="45%" stopColor="#94a3b8" />
          <stop offset="72%" stopColor="#475569" />
          <stop offset="90%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Top Specular Arc Sheen */}
        <linearGradient id="clocheSpecularSheen" x1="24" y1="16" x2="48" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
        </linearGradient>

        {/* 24K Gold Filigree Lip Band */}
        <linearGradient id="goldLipGrad" x1="10" y1="48" x2="62" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="25%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="75%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Finial Knob Gradient */}
        <radialGradient id="finialGrad" cx="36" cy="11" r="5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="85%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>

        {/* Platter Base Gradient */}
        <linearGradient id="platterBaseGrad" x1="6" y1="53" x2="66" y2="57" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="30%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* 1. Base Charger Platter (Bottom Plate) */}
      <ellipse cx="36" cy="54" rx="30" ry="5.5" fill="#090d16" opacity="0.8" />
      <path d="M7 53.5C7 50.8 20 49 36 49C52 49 65 50.8 65 53.5C65 56.2 52 58 36 58C20 58 7 56.2 7 53.5Z" fill="url(#platterBaseGrad)" stroke="#64748b" strokeWidth="0.5" />
      <ellipse cx="36" cy="53.5" rx="27" ry="4" stroke="url(#goldLipGrad)" strokeWidth="0.75" fill="none" opacity="0.9" />

      {/* 2. Main Cloche Silver Dome */}
      <path
        d="M14 49.5C14 27 23.5 17 36 17C48.5 17 58 27 58 49.5H14Z"
        fill="url(#clocheChromeGrad)"
        stroke="#475569"
        strokeWidth="0.75"
      />

      {/* 3. Curved Specular Highlight Sheen */}
      <path
        d="M20 46C18 30 25 21 34 19C30 23 27 32 29 46H20Z"
        fill="url(#clocheSpecularSheen)"
      />

      {/* 4. Royal Emblem Engraving Watermark on Dome */}
      <path
        d="M36 26L38 31H34L36 26ZM33 33L36 31L39 33L38 36H34L33 33Z"
        fill="#fef08a"
        opacity="0.35"
      />

      {/* 5. Gold Filigree Trim Rim Along Dome Base */}
      <rect x="13.5" y="47.5" width="45" height="2.5" rx="1.25" fill="url(#goldLipGrad)" stroke="#78350f" strokeWidth="0.4" />
      <line x1="15" y1="46.5" x2="57" y2="46.5" stroke="#fef08a" strokeWidth="0.5" opacity="0.6" />

      {/* 6. Finial Handle (Beaded Knob on Top) */}
      <ellipse cx="36" cy="18" rx="4" ry="1.5" fill="url(#goldLipGrad)" />
      <circle cx="36" cy="13" r="4.2" fill="url(#finialGrad)" stroke="#475569" strokeWidth="0.5" />
      <circle cx="34.8" cy="11.8" r="1.2" fill="#ffffff" opacity="0.9" />

      {/* 7. Subtle Ambient Reflection Glint Star */}
      {(isHovered || isWaiting) && (
        <circle cx="27" cy="24" r="1" fill="#ffffff" opacity="0.8" />
      )}
    </svg>
  );
}
