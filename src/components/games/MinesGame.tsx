// src/components/games/MinesGame.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Shield, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MinesGameProps { onClose: () => void; }
type TileState = { id: number; isMine: boolean; clicked: boolean; exploding: boolean; };

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

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMinesMultiplier(mineCount, clicks);
  const nextMultiplier = getMinesMultiplier(mineCount, clicks + 1);

  useEffect(() => {
    const target = currentMultiplier;
    const steps = 10;
    let step = 0;
    const start = displayMult;
    const diff = target - start;
    const id = setInterval(() => {
      step++;
      setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMultiplier]);

  const startNewGame = async () => {
    if (isPlaying) return;
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    if (betAmount > balance) { toast.error('Insufficient tokens!'); return; }
    const nb = balance - betAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id); } catch {}
    }
    updateProfile({ tokens: nb });
    const mineIdx = new Set<number>();
    while (mineIdx.size < mineCount) mineIdx.add(Math.floor(Math.random() * 25));
    setTiles(Array.from({ length: 25 }, (_, i) => ({ id: i, isMine: mineIdx.has(i), clicked: false, exploding: false })));
    setIsPlaying(true); setClicks(0); setGameOver(false); setHasWon(false); setEarnedTokens(0); setDisplayMult(1.0);
    playTone(440, 0.1, 'sine', 0.2);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;
    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true };
    if (tile.isMine) {
      newTiles[id].exploding = true;
      setTiles(newTiles);
      setGameOver(true); setIsPlaying(false); setHasWon(false);
      playTone(150, 0.4, 'sawtooth', 0.25); vibrate(200);
      toast.error('💥 Hit a mine! Bet lost.');
      // Stagger reveal remaining mines
      const mineIds = newTiles.filter(t => t.isMine && t.id !== id).map(t => t.id);
      mineIds.forEach((mid, i) => {
        setTimeout(() => {
          setTiles(prev => {
            const copy = [...prev];
            copy[mid] = { ...copy[mid], clicked: true };
            return copy;
          });
          playTone(120 + i * 10, 0.05, 'sawtooth', 0.08);
        }, (i + 1) * 110);
      });
      if (profile && !profile.id.startsWith('guest')) {
        try { await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 }); } catch {}
      }
    } else {
      setTiles(newTiles);
      const nc = clicks + 1;
      setClicks(nc);
      playTone(600 + nc * 45, 0.1, 'sine', 0.2); vibrate(25);
      if (nc === 25 - mineCount) { await handleCashOut(nc); }
    }
  }, [isPlaying, gameOver, tiles, clicks, mineCount]);

  const handleCashOut = async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;
    const mult = getMinesMultiplier(mineCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    setEarnedTokens(won); setIsPlaying(false); setGameOver(true); setHasWon(true);
    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));
    toast.success(`Cashed Out! +${won - betAmount} tokens 🎉`);
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

  const dangerPct = Math.min(100, (mineCount / 24) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary">Mines Count</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 3, 5, 10].map(n => (
                <Button key={n} variant={mineCount === n ? 'primary' : 'ghost'} disabled={isPlaying}
                  onClick={() => { setMineCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 text-xs rounded-xl ${mineCount === n ? 'border-cyan-neon bg-cyan-neon/10' : 'border-navy-700'}`}>{n}</Button>
              ))}
            </div>
            <input type="number" min="1" max="24" value={mineCount} disabled={isPlaying}
              onChange={e => setMineCount(Math.max(1, Math.min(parseInt(e.target.value) || 1, 24)))}
              className="w-full bg-navy-900 border border-navy-700/60 rounded-xl px-3 py-1.5 text-sm font-mono text-text-primary outline-none" placeholder="Custom" />
          </div>
          {isPlaying && (
            <div className="p-3 rounded-xl bg-navy-900/60 border border-navy-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Multiplier</span>
                <span className="text-gold-neon font-mono font-bold">{nextMultiplier.toFixed(2)}x next</span>
              </div>
              <motion.p className="text-3xl font-extrabold font-mono text-cyan-neon" key={displayMult}>
                {displayMult.toFixed(2)}x
              </motion.p>
              <p className="text-xs text-muted">= {Math.floor(betAmount * displayMult)} tokens</p>
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
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10"><HelpCircle size={10} /><span>3% edge</span></div>
        <div className="flex gap-4 items-start">
          <div className="grid grid-cols-5 gap-1.5 w-full max-w-[310px]">
            {tiles.length === 0 ? Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-navy-800/40 border border-navy-700/50 flex items-center justify-center text-navy-600/40 text-xl font-bold">?</div>
            )) : tiles.map(tile => (
              <div key={tile.id} className="relative aspect-square">
                <AnimatePresence>
                  {!tile.clicked && (
                    <motion.button exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}
                      disabled={!isPlaying || gameOver}
                      onClick={() => handleTileClick(tile.id)}
                      whileHover={{ scale: 1.06, boxShadow: '0 0 12px rgba(0,240,255,0.3)' }}
                      whileTap={{ scale: 0.93 }}
                      className="absolute inset-0 rounded-xl bg-navy-800 border-2 border-navy-700 flex items-center justify-center text-xl font-bold text-navy-500 cursor-pointer">
                      ?
                    </motion.button>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {tile.clicked && (
                    <motion.div
                      initial={{ scale: 0, rotateY: 90 }} animate={tile.exploding ? { scale: [0, 1.3, 0.9, 1], rotateY: 0 } : { scale: 1, rotateY: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className={`absolute inset-0 rounded-xl border-2 flex items-center justify-center text-xl ${tile.isMine ? 'bg-red-950/40 border-danger/60' : 'bg-cyan-950/30 border-cyan-500/60'}`}
                      style={tile.isMine ? {} : { boxShadow: `0 0 ${8 + clicks * 3}px rgba(0,240,255,${0.25 + clicks * 0.04})` }}>
                      {tile.isMine ? '💥' : '💎'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {/* Danger meter */}
          <div className="flex flex-col items-center gap-1 h-[310px]">
            <span className="text-2xs text-muted uppercase tracking-wider" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>RISK</span>
            <div className="flex-1 w-3 rounded-full bg-navy-800 overflow-hidden flex flex-col justify-end">
              <motion.div className="w-full rounded-full" style={{ background: 'linear-gradient(to top, #16a34a, #eab308, #dc2626)' }}
                animate={{ height: `${dangerPct}%` }} transition={{ duration: 0.4 }} />
            </div>
          </div>
        </div>

        <div className="mt-5 text-center min-h-[48px]">
          <AnimatePresence>
            {gameOver && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                {hasWon ? (
                  <div><p className="text-xs text-success font-semibold uppercase tracking-wider">🎉 Cashed Out!</p>
                    <p className="text-xl font-bold text-gold-neon">+{earnedTokens} tokens</p></div>
                ) : (
                  <p className="text-xs text-danger font-semibold uppercase tracking-wider flex items-center gap-1.5 justify-center"><AlertTriangle size={12} /> Boom! Mine Hit</p>
                )}
              </motion.div>
            )}
            {!isPlaying && !gameOver && (
              <p className="text-xs text-text-secondary flex items-center gap-1.5 justify-center"><Shield size={12} className="text-cyan-neon" /> Pick settings and click Start</p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
