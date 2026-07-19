// src/components/games/MemoryGame.tsx
// Card-flip memory matching game

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

const EMOJIS = ['🎡', '💎', '🌟', '🎯', '🔥', '⚡', '🎊', '🏆'];
type CardState = { id: number; emoji: string; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function createDeck(): CardState[] {
  return shuffle([...EMOJIS, ...EMOJIS]).map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
}

interface MemoryGameProps {
  onClose: () => void;
}

export function MemoryGame({ onClose }: MemoryGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [cards, setCards] = useState<CardState[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [locked, setLocked] = useState(false);

  const totalPairs = EMOJIS.length;

  const calculateTokens = (moveCount: number, timeSeconds: number) => {
    // Fewer moves + faster = more tokens
    const moveBonus = Math.max(0, 100 - moveCount * 2);
    const timeBonus = Math.max(0, 60 - timeSeconds);
    return Math.min(100, Math.max(25, Math.floor((moveBonus + timeBonus) / 2)));
  };

  const startGame = () => {
    setCards(createDeck());
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setLocked(false);
    setPhase('playing');
    setStartTime(Date.now());
  };

  const handleCardClick = useCallback((id: number) => {
    if (locked) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newFlipped = [...flipped, id];
    const newCards = cards.map((c, i) => i === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    setFlipped(newFlipped);
    playTone(660, 0.1, 'sine', 0.2);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);

      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        // Match!
        setTimeout(() => {
          setCards(c => c.map((card, i) => i === a || i === b ? { ...card, matched: true } : card));
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === totalPairs) {
              // Game won
              const timeTaken = Math.floor((Date.now() - startTime) / 1000);
              const earned = calculateTokens(moves + 1, timeTaken);
              setTokensEarned(earned);
              setPhase('result');
              vibrate([100, 50, 100]);
              playTone(784, 0.3, 'sine', 0.3);
              // Award tokens
              if (profile && !profile.id.startsWith('guest')) {
                 
                (supabase.from('users') as any).update({
                  tokens: profile.tokens + earned,
                  total_earned: profile.total_earned + earned,
                }).eq('id', profile.id);
                updateProfile({ tokens: profile.tokens + earned });
              } else if (profile) {
                updateProfile({ tokens: profile.tokens + earned });
              }
              toast.success(`Memory master! +${earned} tokens! 🧠`);
            }
            return newMatches;
          });
          setFlipped([]);
          setLocked(false);
        }, 500);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(c => c.map((card, i) => i === a || i === b ? { ...card, flipped: false } : card));
          setFlipped([]);
          setLocked(false);
          playTone(220, 0.1, 'sawtooth', 0.15);
        }, 1000);
      }
    }
  }, [cards, flipped, locked, moves, startTime, totalPairs, profile, updateProfile]);

  return (
    <div className="flex flex-col items-center p-6 gap-4 min-h-[calc(100vh-64px)]">

      {phase === 'ready' && (
        <motion.div
          className="text-center space-y-6 mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-7xl">🧠</div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">Memory Match</h2>
            <p className="text-text-secondary">Flip cards to find all {totalPairs} matching pairs.</p>
            <p className="text-text-secondary mt-1">Fewer moves = more tokens (25–100)</p>
          </div>
          <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
            <Button variant="neon" size="lg" onClick={startGame} id="start-memory-btn" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">Start Game</Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted text-xs">
              Close Game
            </Button>
          </div>
        </motion.div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-sm space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between glass-card rounded-xl p-3 text-center">
            <div>
              <p className="font-display font-bold text-2xl text-cyan-neon">{moves}</p>
              <p className="text-2xs text-muted">Moves</p>
            </div>
            <div>
              <p className="font-display font-bold text-2xl text-gold-neon">{matches}/{totalPairs}</p>
              <p className="text-2xs text-muted">Matched</p>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card, i) => (
              <motion.button
                key={i}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl border-2 transition-all
                  ${card.matched ? 'border-success/40 bg-success/10' : card.flipped ? 'border-cyan-neon/60 bg-cyan-neon/10' : 'border-navy-600 bg-navy-800 hover:border-navy-500'}`}
                onClick={() => handleCardClick(i)}
                animate={{ rotateY: card.flipped || card.matched ? 0 : 180 }}
                transition={{ duration: 0.3 }}
                whileTap={{ scale: 0.92 }}
              >
                {(card.flipped || card.matched) ? card.emoji : (
                  <span className="text-navy-600">?</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {phase === 'result' && (
        <motion.div
          className="text-center space-y-6 mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trophy size={56} className="text-gold-neon mx-auto" />
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-2">You Won!</h2>
            <p className="text-text-secondary mb-2">Completed in <strong className="text-cyan-neon">{moves} moves</strong></p>
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold-neon/15 border border-gold-neon/30">
              <span className="font-display font-bold text-2xl text-gold-neon">+{tokensEarned}</span>
              <span className="text-text-secondary">tokens earned!</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="neon" onClick={startGame} size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20">Play Again</Button>
            <Button variant="ghost" onClick={onClose}>Done</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
