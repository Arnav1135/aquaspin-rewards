// src/components/games/ChickenGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChickenGameProps { onClose: () => void; }
type TileState = { id: number; isBone: boolean; clicked: boolean; };

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

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMultiplier(boneCount, clicks);

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
    playTone(440, 0.1, 'sine', 0.2);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;
    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true };

    if (tile.isBone) {
      setTiles(newTiles);
      setSmokeSet(prev => new Set(prev).add(id));
      setTimeout(() => setSmokeSet(prev => { const s = new Set(prev); s.delete(id); return s; }), 700);
      setGameOver(true); setIsPlaying(false); setHasWon(false);
      playTone(140, 0.4, 'sawtooth', 0.25); vibrate(200);
      toast.error('💀 Bone found! Bet lost.');
      const boneIds = newTiles.filter(t => t.isBone && t.id !== id).map(t => t.id);
      boneIds.forEach((bid, i) => {
        setTimeout(() => setTiles(prev => { const c = [...prev]; c[bid] = { ...c[bid], clicked: true }; return c; }), (i + 1) * 100);
      });
      if (profile && !profile.id.startsWith('guest')) {
        try { await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 }); } catch {}
      }
    } else {
      setTiles(newTiles);
      const nc = clicks + 1; setClicks(nc);
      playTone(500 + nc * 40, 0.1, 'sine', 0.2); vibrate(22);
      if (nc === 25 - boneCount) await handleCashOut(nc);
    }
  }, [isPlaying, gameOver, tiles, clicks, boneCount]);

  const handleCashOut = async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;
    const mult = getMultiplier(boneCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    setEarnedTokens(won); setIsPlaying(false); setGameOver(true); setHasWon(true);
    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));
    toast.success(`Cashed out! +${won - betAmount} tokens 🐔`);
    playTone(523, 0.15, 'sine', 0.3); setTimeout(() => playTone(659, 0.25, 'sine', 0.3), 100);
    vibrate([50, 50, 100]);
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
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary">Bones Count</span>
            <div className="grid grid-cols-5 gap-1">
              {[1, 3, 5, 10, 15].map(n => (
                <Button key={n} variant={boneCount === n ? 'primary' : 'ghost'} disabled={isPlaying}
                  onClick={() => { setBoneCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 text-xs rounded-xl ${boneCount === n ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}>{n}</Button>
              ))}
            </div>
            <input type="number" min="1" max="24" value={boneCount} disabled={isPlaying}
              onChange={e => setBoneCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, 24)))}
              className="w-full bg-navy-900 border border-navy-700/60 rounded-xl px-3 py-1.5 text-sm font-mono text-text-primary outline-none" placeholder="Custom" />
            <p className="text-xs text-muted">Safe tiles: {25 - boneCount}</p>
          </div>
          {isPlaying && (
            <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-800">
              <p className="text-xs text-muted mb-1">Multiplier</p>
              <p className="text-3xl font-extrabold font-mono text-gold-neon">{displayMult.toFixed(2)}x</p>
              <p className="text-xs text-muted">{Math.floor(betAmount * displayMult)} tokens</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {isPlaying ? (
            <motion.div animate={clicks > 0 ? { boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 10px rgba(16,185,129,0)', '0 0 0 0 rgba(16,185,129,0.4)'] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Button variant="success" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={clicks === 0} onClick={() => handleCashOut()}>
                Cash Out ({Math.floor(betAmount * currentMultiplier)})
              </Button>
            </motion.div>
          ) : (
            <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={betAmount <= 0 || betAmount > balance} onClick={startNewGame}>
              Start Game
            </Button>
          )}
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[440px] bg-navy-900/40 border border-navy-800/80 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10"><HelpCircle size={10} /><span>3.5% edge</span></div>

        <div className="flex gap-3 items-start">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1.5 max-w-[310px]">
            {tiles.length === 0 ? Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-navy-800/40 border border-navy-700/50 flex items-center justify-center">
                <div style={{ width: '65%', height: '55%', background: 'radial-gradient(ellipse at 40% 30%, #9ca3af, #4b5563)', borderRadius: '50% 50% 4px 4px' }} />
              </div>
            )) : tiles.map(tile => (
              <div key={tile.id} className="relative aspect-square">
                <AnimatePresence mode="wait">
                  {!tile.clicked ? (
                    <motion.button key="cloche" exit={{ y: -50, opacity: 0, scale: 0.8 }} transition={{ duration: 0.28 }}
                      disabled={!isPlaying || gameOver} onClick={() => handleTileClick(tile.id)}
                      whileHover={{ scale: 1.06, boxShadow: '0 0 14px rgba(0,240,255,0.3)' }}
                      whileTap={{ scale: 0.93 }}
                      className="absolute inset-0 rounded-xl flex flex-col items-center justify-end overflow-hidden cursor-pointer"
                      style={{ background: 'radial-gradient(ellipse at 40% 30%, #d1d5db, #6b7280, #374151)', border: '2px solid #4b5563' }}>
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-400 border border-gray-300 shadow-sm" />
                      <div style={{ width: '70%', height: '55%', background: 'radial-gradient(ellipse at 40% 30%, #9ca3af, #4b5563)', borderRadius: '50% 50% 0 0' }} />
                      <div style={{ width: '100%', height: '7px', background: '#374151', borderTop: '2px solid #6b7280' }} />
                    </motion.button>
                  ) : (
                    <motion.div key="content"
                      initial={{ scale: 0, opacity: 0 }} animate={tile.isBone ? { scale: [0, 1.25, 0.9, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`absolute inset-0 rounded-xl border-2 flex items-center justify-center text-2xl ${tile.isBone ? 'bg-red-950/40 border-danger/60' : 'bg-cyan-950/30 border-cyan-500/60'}`}
                      style={tile.isBone ? {} : { boxShadow: `0 0 ${8 + clicks * 3}px rgba(0,240,255,${0.25 + clicks * 0.04})` }}>
                      {tile.isBone ? '💀' : '🐔'}
                      {/* Smoke puffs */}
                      {tile.isBone && smokeSet.has(tile.id) && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy], si) => (
                        <motion.div key={si} className="absolute w-6 h-6 rounded-full pointer-events-none"
                          style={{ top: '50%', left: '50%', marginTop: -12, marginLeft: -12, background: 'radial-gradient(circle, rgba(210,210,210,0.6), transparent)', filter: 'blur(4px)' }}
                          initial={{ scale: 0, opacity: 0.8, x: 0, y: 0 }}
                          animate={{ scale: 2.5, opacity: 0, x: dx * 18, y: dy * 18 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {/* Thermometer */}
          <div className="flex flex-col items-center gap-1 h-[310px] pt-1">
            <span className="text-2xs text-muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>RISK</span>
            <div className="flex-1 w-3 rounded-full bg-navy-800 overflow-hidden flex flex-col justify-end">
              <motion.div className="w-full rounded-full" style={{ background: 'linear-gradient(to top, #16a34a, #eab308, #dc2626)' }}
                animate={{ height: `${dangerPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>

        <div className="mt-5 text-center min-h-[48px]">
          <AnimatePresence>
            {gameOver && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                {hasWon ? (
                  <div><p className="text-xs text-success font-semibold uppercase tracking-wider">🎉 Cashed Out!</p><p className="text-xl font-bold text-gold-neon">+{earnedTokens} tokens</p></div>
                ) : (
                  <p className="text-xs text-danger font-semibold uppercase tracking-wider">💀 Bone found! Bet lost.</p>
                )}
              </motion.div>
            )}
            {!isPlaying && !gameOver && (
              <p className="text-xs text-text-secondary flex items-center gap-1.5 justify-center"><Shield size={12} className="text-cyan-neon" /> Select bones and click Start</p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
