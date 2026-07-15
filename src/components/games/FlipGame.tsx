// src/components/games/FlipGame.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
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


    setIsFlipping(true); setResult(null); setIsWin(null); setShowParticles(false);

    // Deduct bet
    const nb = balance - actualBetAmount;
    if (profile && !profile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    // Determine result — 4% house edge
    const flipResult: 'heads' | 'tails' = Math.random() < 0.48 ? selection : (selection === 'heads' ? 'tails' : 'heads');
    const won = flipResult === selection;

    // Spin sounds
    [0, 90, 180, 270, 400, 520, 650, 780, 900, 1000].forEach((d, i) => {
      setTimeout(() => playTone(260 + i * 30, 0.025, 'sine', 0.05), d);
    });

    // Set rotation: 4 full spins + face correction
    setRotation(prev => prev + 1440 + (flipResult === 'heads' ? 0 : 180));

    setTimeout(async () => {
      setIsFlipping(false);
      setResult(flipResult);
      setIsWin(won);

      const payout = Math.floor(betAmount * 1.96);
      setWonAmount(payout);

      if (won) {
        toast.success(`${flipResult.toUpperCase()}! +${payout - betAmount} tokens 🎉`);
        playTone(523, 0.15, 'sine', 0.3); setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 120);
        vibrate([50, 50, 100]); setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1000);
        setWinStreak(prev => prev + 1); setLossStreak(0);
      } else {
        toast.error(`${flipResult.toUpperCase()}. Lost ${betAmount} tokens.`);
        playTone(180, 0.3, 'sawtooth', 0.2); vibrate(150);
        setLossStreak(prev => prev + 1); setWinStreak(0);
      }

      setStreakHistory(prev => [...prev.slice(-9), flipResult === 'heads' ? 'H' : 'T']);
      const fb = nb + (won ? payout : 0);
      if (profile && !profile.id.startsWith('guest')) {
        try {
          await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (won ? payout - betAmount : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
          await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: won ? 1 : 0 });
        } catch (e) {
          console.error('Failed to update user after flip:', e);
        }
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
                className={`py-5 rounded-2xl border-2 font-bold transition-all ${selection === 'heads' ? 'border-yellow-500 bg-yellow-950/30 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.35)]' : 'border-navy-700 text-text-secondary hover:border-navy-500'}`}>
                <div className="text-3xl mb-1">👑</div>
                <div className="text-sm">Heads</div>
                <div className="text-xs text-muted">1.96x</div>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={isFlipping}
                onClick={() => setSelection('tails')}
                className={`py-5 rounded-2xl border-2 font-bold transition-all ${selection === 'tails' ? 'border-slate-400 bg-slate-950/30 text-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.3)]' : 'border-navy-700 text-text-secondary hover:border-navy-500'}`}>
                <div className="text-3xl mb-1">⭐</div>
                <div className="text-sm">Tails</div>
                <div className="text-xs text-muted">1.96x</div>
              </motion.button>
            </div>
          </div>

          {/* Streak */}
          {streakHistory.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>Streak</span>
                <span>{winStreak >= 3 ? '🔥' : lossStreak >= 3 ? '❄️' : ''} {winStreak > 0 ? `${winStreak}W` : lossStreak > 0 ? `${lossStreak}L` : ''}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {streakHistory.map((h, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full border text-3xs flex items-center justify-center font-bold ${h === 'H' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-slate-500/20 border-slate-500/50 text-slate-400'}`}>{h}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-4 rounded-xl" disabled={isFlipping || !selection || betAmount <= 0 || betAmount > balance} onClick={handleFlip}>
            {isFlipping ? 'Flipping...' : 'Flip!'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>Close Game</Button>
        </div>
      </Card>

      <Card className="flex-1 flex flex-col items-center justify-center relative min-h-[380px] bg-navy-900/40 border border-navy-800/80 rounded-2xl overflow-hidden">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted"><HelpCircle size={10} /><span>4% edge</span></div>

        {/* Coin */}
        <div style={{ perspective: '800px', width: 160, height: 160 }}>
          <motion.div style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
            animate={{ rotateX: rotation }}
            transition={{ duration: isFlipping ? 1.2 : 0.3, ease: isFlipping ? [0.4, 0, 0.6, 1] : 'easeOut' }}>
            {/* Heads */}
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b, #92400e)',
              boxShadow: '0 0 40px rgba(245,158,11,0.45), inset 0 2px 8px rgba(255,255,255,0.4)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3.5rem', border: '5px solid #d97706'
            }}>👑</div>
            {/* Tails */}
            <div style={{
              position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
              background: 'radial-gradient(circle at 35% 30%, #f1f5f9, #94a3b8, #334155)',
              boxShadow: '0 0 30px rgba(148,163,184,0.35), inset 0 2px 5px rgba(255,255,255,0.3)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3.5rem', border: '5px solid #64748b'
            }}>⭐</div>
          </motion.div>
        </div>

        {/* Result */}
        <div className="mt-8 text-center min-h-[56px]">
          <AnimatePresence mode="wait">
            {result && !isFlipping && (
              <motion.div key={result} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
                <p className={`text-3xl font-bold font-display uppercase tracking-widest ${isWin ? 'text-success' : 'text-danger'}`}>{result}</p>
                <p className="text-sm text-muted mt-1">{isWin ? `+${wonAmount - betAmount} tokens` : `Lost ${betAmount}`}</p>
              </motion.div>
            )}
            {isFlipping && <motion.p key="flipping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted animate-pulse">Flipping...</motion.p>}
          </AnimatePresence>
        </div>

        {/* Win particles */}
        {showParticles && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 18 }).map((_, i) => {
              const angle = (i / 18) * Math.PI * 2;
              const dist = 90 + Math.random() * 70;
              return (
                <motion.div key={i} className="absolute rounded-full"
                  style={{ width: 8, height: 8, top: '45%', left: '50%', marginTop: -4, marginLeft: -4, background: result === 'heads' ? '#f59e0b' : '#94a3b8' }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.85, ease: 'easeOut' }} />
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
