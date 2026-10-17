// src/components/games/FlipGame.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface FlipGameProps { onClose: () => void; }

export function FlipGame({ onClose }: FlipGameProps) {
  const { profile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [selection, setSelection] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [wonAmount, setWonAmount] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const [streakHistory, setStreakHistory] = useState<('H' | 'T')[]>([]);
  const [winStreak, setWinStreak] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);

  const balance = profile?.tokens ?? 0;

  const handleFlip = async () => {
    if (!selection) { toast.error('Pick Heads or Tails!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile: currentProfile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = currentProfile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProfile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProfile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    setIsFlipping(true); setResult(null); setIsWin(null); setShowParticles(false);

    // Deduct bet
    const nb = balance - actualBetAmount;
    if (currentProfile && !currentProfile.id.startsWith('guest')) {
      try { await (supabase.from('users') as any).update({ tokens: nb }).eq('id', currentProfile.id); } catch {}
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    // Determine result — 4% house edge
    const flipResult: 'heads' | 'tails' = Math.random() < 0.48 ? selection : (selection === 'heads' ? 'tails' : 'heads');
    const won = flipResult === selection;

    // High-pitched metallic coin chime on toss launch
    playTone(880, 0.08, 'sine', 0.25);
    setTimeout(() => playTone(1320, 0.06, 'triangle', 0.2), 40);

    // Dynamic metallic air whooshes
    [100, 220, 360, 520, 700, 880, 1060].forEach((d, i) => {
      setTimeout(() => playTone(320 + i * 35, 0.03, 'sine', 0.06), d);
    });

    // 5 full rotations + face alignment
    setRotation(prev => prev + 1800 + (flipResult === 'heads' ? 0 : 180));

    setTimeout(async () => {
      setIsFlipping(false);
      setResult(flipResult);
      setIsWin(won);

      // Heavy coin landing impact tone
      playTone(220, 0.12, 'triangle', 0.3);
      vibrate(won ? [40, 40, 120] : 100);

      const payout = Math.floor(betAmount * 1.96);
      setWonAmount(payout);

      if (won) {
        toast.success(`${flipResult.toUpperCase()}! +${payout - betAmount} tokens 🎉`);
        playTone(523, 0.15, 'sine', 0.3); setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 120);
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1200);
        setWinStreak(prev => prev + 1); setLossStreak(0);
      } else {
        toast.error(`${flipResult.toUpperCase()}. Lost ${betAmount} tokens.`);
        playTone(180, 0.3, 'sawtooth', 0.2);
        setLossStreak(prev => prev + 1); setWinStreak(0);
      }

      setStreakHistory(prev => [...prev.slice(-9), flipResult === 'heads' ? 'H' : 'T']);
      const fb = nb + (won ? payout : 0);
      if (currentProfile && !currentProfile.id.startsWith('guest')) {
        try {
          await (supabase.from('users') as any).update({ tokens: fb, total_earned: currentProfile.total_earned + (won ? payout - betAmount : 0), xp: currentProfile.xp + Math.floor(betAmount * 0.1) }).eq('id', currentProfile.id);
          await (supabase.from('game_stats') as any).upsert({ user_id: currentProfile.id, games_played: 1, games_won: won ? 1 : 0 });
        } catch {}
      }
      updateProfile({ tokens: fb });
    }, 1300);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch">
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-navy-950 border border-navy-800/80 rounded-2xl shrink-0">
        <div className="space-y-4">
          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isFlipping} />
          <div className="space-y-2">
            <span className="text-xs text-text-secondary font-medium">Choose Side</span>
            <div className="grid grid-cols-2 gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={isFlipping}
                onClick={() => setSelection('heads')}
                className={`py-5 rounded-2xl border-2 font-bold transition-all relative overflow-hidden ${selection === 'heads' ? 'border-amber-400 bg-amber-950/30 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.4)]' : 'border-navy-700 text-text-secondary hover:border-navy-500'}`}>
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-amber-900/60 flex items-center justify-center text-lg">👑</div>
                </div>
                <div className="text-sm font-display tracking-wider">Gold Crown</div>
                <div className="text-xs text-amber-400/80 font-mono mt-0.5">1.96x</div>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={isFlipping}
                onClick={() => setSelection('tails')}
                className={`py-5 rounded-2xl border-2 font-bold transition-all relative overflow-hidden ${selection === 'tails' ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_24px_rgba(0,240,255,0.4)]' : 'border-navy-700 text-text-secondary hover:border-navy-500'}`}>
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-cyan-300 p-0.5 shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-slate-900/60 flex items-center justify-center text-lg">⭐</div>
                </div>
                <div className="text-sm font-display tracking-wider">Platinum Star</div>
                <div className="text-xs text-cyan-400/80 font-mono mt-0.5">1.96x</div>
              </motion.button>
            </div>
          </div>

          {/* Streak */}
          {streakHistory.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-navy-900/60 border border-navy-800">
              <div className="flex justify-between text-xs text-muted font-mono">
                <span>Streak Momentum</span>
                <span className="font-bold text-amber-400">{winStreak >= 3 ? '🔥 ' : lossStreak >= 3 ? '❄️ ' : ''} {winStreak > 0 ? `${winStreak}W` : lossStreak > 0 ? `${lossStreak}L` : ''}</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {streakHistory.map((h, i) => (
                  <div key={i} className={`w-6 h-6 rounded-full border text-2xs flex items-center justify-center font-bold font-mono shadow-sm ${h === 'H' ? 'bg-amber-500/20 border-amber-500/60 text-amber-400' : 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400'}`}>{h}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl shadow-[0_0_24px_rgba(0,240,255,0.35)]" disabled={isFlipping || !selection || betAmount <= 0 || betAmount > balance} onClick={handleFlip}>
            {isFlipping ? '🪙 Flipping Coin...' : 'Flip Coin!'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[420px] bg-gradient-to-b from-navy-950/80 via-navy-900/50 to-navy-950 border border-navy-800/80 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted z-10"><HelpCircle size={10} /><span>4% edge</span></div>

        {/* Ambient Casino Lighting Aura */}
        <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent pointer-events-none" />

        {/* 3D Coin Toss Arena */}
        <div className="relative flex flex-col items-center justify-center" style={{ perspective: '1100px', width: 220, height: 220 }}>
          
          {/* Main 3D Flipping Token */}
          <motion.div
            style={{
              transformStyle: 'preserve-3d',
              width: 170,
              height: 170,
              position: 'relative'
            }}
            animate={{
              rotateX: rotation,
              y: isFlipping ? [-0, -110, 0] : 0,
              scale: isFlipping ? [1, 1.08, 1] : 1
            }}
            transition={{
              duration: isFlipping ? 1.25 : 0.35,
              ease: isFlipping ? [0.25, 0.1, 0.25, 1] : 'easeOut'
            }}
          >
            {/* HEADS: Heavy High-Relief 24K Gold Coin */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 32% 28%, #fffbeb 0%, #fef08a 20%, #f59e0b 55%, #b45309 85%, #78350f 100%)',
                boxShadow: '0 0 35px rgba(245, 158, 11, 0.5), inset 0 3px 6px rgba(255, 255, 255, 0.7), inset 0 -4px 8px rgba(120, 53, 15, 0.8)',
                border: '6px double #d97706',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
            >
              {/* Inner Minted Beaded Rim */}
              <div className="w-[136px] h-[136px] rounded-full border border-dashed border-amber-300/70 flex flex-col items-center justify-center shadow-inner relative">
                {/* Specular Light Reflection Arc */}
                <div className="absolute top-1 left-3 right-3 h-8 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none" />
                
                {/* Crown Crest */}
                <div className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">👑</div>
                <span className="font-display font-black text-xs tracking-widest text-amber-950 mt-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                  HEADS
                </span>
                <span className="text-3xs font-mono font-bold text-amber-900/80 tracking-widest">AQUASPIN</span>
              </div>
            </div>

            {/* Extruded Rim Thickness Layer (Simulated 3D Cylinder Depth) */}
            <div
              style={{
                position: 'absolute',
                inset: -2,
                borderRadius: '50%',
                border: '4px solid #b45309',
                transform: 'translateZ(-4px)',
                backfaceVisibility: 'hidden',
                pointerEvents: 'none'
              }}
            />

            {/* TAILS: Heavy High-Relief Platinum Star Coin */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 32% 28%, #ffffff 0%, #f1f5f9 25%, #94a3b8 60%, #475569 85%, #1e293b 100%)',
                boxShadow: '0 0 35px rgba(0, 240, 255, 0.4), inset 0 3px 6px rgba(255, 255, 255, 0.8), inset 0 -4px 8px rgba(30, 41, 59, 0.9)',
                border: '6px double #64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
            >
              {/* Inner Minted Beaded Rim */}
              <div className="w-[136px] h-[136px] rounded-full border border-dashed border-cyan-300/60 flex flex-col items-center justify-center shadow-inner relative">
                {/* Specular Light Reflection Arc */}
                <div className="absolute top-1 left-3 right-3 h-8 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />
                
                {/* Star Crest */}
                <div className="text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">⭐</div>
                <span className="font-display font-black text-xs tracking-widest text-slate-900 mt-1 drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                  TAILS
                </span>
                <span className="text-3xs font-mono font-bold text-cyan-800 tracking-widest">REWARDS</span>
              </div>
            </div>
          </motion.div>

          {/* Dynamic Altitude-Responsive Ground Contact Shadow */}
          <motion.div
            className="rounded-full bg-black/80 blur-md pointer-events-none mt-4"
            style={{ width: 130, height: 22 }}
            animate={{
              scale: isFlipping ? [1, 0.38, 1] : 1,
              opacity: isFlipping ? [0.75, 0.18, 0.75] : 0.75,
              filter: isFlipping ? 'blur(14px)' : 'blur(5px)'
            }}
            transition={{
              duration: isFlipping ? 1.25 : 0.35,
              ease: isFlipping ? [0.25, 0.1, 0.25, 1] : 'easeOut'
            }}
          />
        </div>

        {/* Result Announcement HUD */}
        <div className="mt-4 text-center min-h-[64px] z-10">
          <AnimatePresence mode="wait">
            {result && !isFlipping && (
              <motion.div key={result} initial={{ y: 15, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -15, opacity: 0 }}>
                <p className={`text-4xl font-extrabold font-display uppercase tracking-widest ${isWin ? 'text-success drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]' : 'text-danger drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`}>
                  {result === 'heads' ? '👑 HEADS' : '⭐ TAILS'}
                </p>
                <p className="text-sm font-mono font-semibold text-text-secondary mt-1">
                  {isWin ? `🏆 Won +${wonAmount - betAmount} tokens!` : `Lost ${betAmount} tokens`}
                </p>
              </motion.div>
            )}
            {isFlipping && (
              <motion.div key="flipping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 text-sm text-cyan-400 font-mono animate-pulse">
                <Sparkles size={16} /> <span>Tossing Heavyweight Coin...</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Win Celebratory Coin Particles */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const dist = 100 + Math.random() * 85;
              const isGold = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full border flex items-center justify-center shadow-lg"
                  style={{
                    width: 14,
                    height: 14,
                    top: '45%',
                    left: '50%',
                    marginTop: -7,
                    marginLeft: -7,
                    background: isGold ? 'radial-gradient(circle, #fde047, #d97706)' : 'radial-gradient(circle, #e2e8f0, #00f0ff)',
                    borderColor: isGold ? '#fef08a' : '#ffffff',
                    boxShadow: isGold ? '0 0 10px #f59e0b' : '0 0 10px #00f0ff'
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist + 20,
                    opacity: 0,
                    scale: 1.2,
                    rotate: 360
                  }}
                  transition={{ duration: 0.95, ease: 'easeOut' }}
                />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
