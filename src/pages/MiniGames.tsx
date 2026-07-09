// src/pages/MiniGames.tsx
// Mini-games hub with game selection cards

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Coins } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClickerGame } from '@/components/games/ClickerGame';
import { MemoryGame } from '@/components/games/MemoryGame';
import { QuizGame } from '@/components/games/QuizGame';
import { TapChallenge } from '@/components/games/TapChallenge';

type GameKey = 'clicker' | 'memory' | 'quiz' | 'tap' | null;

const GAMES = [
  {
    key: 'clicker' as const,
    title: 'Clicker Rush',
    description: 'Click as fast as you can in 10 seconds! Earn tokens based on your click speed.',
    emoji: '👆',
    reward: '10–50 tokens',
    difficulty: 'Easy',
    color: '#00F0FF',
  },
  {
    key: 'memory' as const,
    title: 'Memory Match',
    description: 'Flip cards to find matching pairs. Complete the board to win big!',
    emoji: '🧠',
    reward: '25–100 tokens',
    difficulty: 'Medium',
    color: '#FFD700',
  },
  {
    key: 'quiz' as const,
    title: 'Trivia Quiz',
    description: '10 questions across topics. Each correct answer earns you tokens!',
    emoji: '🎯',
    reward: '5–150 tokens',
    difficulty: 'Medium',
    color: '#A855F7',
  },
  {
    key: 'tap' as const,
    title: 'Tap Challenge',
    description: 'Tap the glowing targets as fast as possible! Mobile-first fun.',
    emoji: '✨',
    reward: '15–80 tokens',
    difficulty: 'Hard',
    color: '#00FF87',
  },
];

const difficultyColors: Record<string, string> = {
  Easy: '#00FF87',
  Medium: '#FFD700',
  Hard: '#FF3366',
};

export function MiniGames() {
  const [activeGame, setActiveGame] = useState<GameKey>(null);

  const renderGame = () => {
    switch (activeGame) {
      case 'clicker': return <ClickerGame onClose={() => setActiveGame(null)} />;
      case 'memory': return <MemoryGame onClose={() => setActiveGame(null)} />;
      case 'quiz': return <QuizGame onClose={() => setActiveGame(null)} />;
      case 'tap': return <TapChallenge onClose={() => setActiveGame(null)} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="font-display text-2xl font-bold text-gradient-cyan">Mini Games</h1>
          <p className="text-sm text-text-secondary mt-1">Play games to earn tokens. New games added regularly!</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                hover
                glow="cyan"
                className="cursor-pointer group"
                onClick={() => setActiveGame(game.key)}
              >
                <div className="text-4xl mb-3">{game.emoji}</div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-text-primary group-hover:text-cyan-neon transition-colors">
                    {game.title}
                  </h3>
                  <span
                    className="text-2xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: difficultyColors[game.difficulty],
                      backgroundColor: `${difficultyColors[game.difficulty]}20`,
                      border: `1px solid ${difficultyColors[game.difficulty]}30`,
                    }}
                  >
                    {game.difficulty}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-3">{game.description}</p>
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: game.color }}>
                  <Coins size={12} />
                  <span>Win: {game.reward}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Coming soon */}
        <Card className="opacity-60 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎰</span>
            <div>
              <p className="font-semibold text-text-secondary">More Games Coming Soon</p>
              <p className="text-sm text-muted">Slots, Scratch Cards, Word Puzzle, and more!</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Active game overlay ── */}
      <AnimatePresence>
        {activeGame && (
          <motion.div
            className="fixed inset-0 z-50 bg-navy-950/95 backdrop-blur-sm flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Game header */}
            <div className="flex items-center justify-between p-4 border-b border-navy-700">
              <div className="flex items-center gap-2">
                <Gamepad2 size={20} className="text-cyan-neon" />
                <span className="font-display font-semibold text-text-primary">
                  {GAMES.find(g => g.key === activeGame)?.title}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)}>
                <X size={18} />
              </Button>
            </div>

            {/* Game content */}
            <div className="flex-1 overflow-auto">
              {renderGame()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
