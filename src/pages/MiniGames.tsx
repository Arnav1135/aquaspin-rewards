// src/pages/MiniGames.tsx
// Mini-games hub with game selection cards including Stake-style betting games

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Coins } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClickerGame } from '@/components/games/ClickerGame';
import { MemoryGame } from '@/components/games/MemoryGame';
import { QuizGame } from '@/components/games/QuizGame';
import { TapChallenge } from '@/components/games/TapChallenge';

// Import Stake-style games
import { CoinFlipScene } from '@/features/coinflip/CoinFlipScene';
import { LimboGame } from '@/components/games/LimboGame';
import { MinesGame } from '@/components/games/MinesGame';
import { ChickenGame } from '@/components/games/ChickenGame';
import { DragonTigerGame } from '@/components/games/DragonTigerGame';
import { RouletteGame } from '@/components/games/RouletteGame';
import { CrashGame } from '@/components/games/CrashGame';
import { PlinkoGame } from '@/components/games/PlinkoGame';

type GameKey =
  | 'clicker'
  | 'memory'
  | 'quiz'
  | 'tap'
  | 'flip'
  | 'limbo'
  | 'mines'
  | 'chicken'
  | 'dragontiger'
  | 'roulette'
  | 'crash'
  | 'plinko'
  | null;

const GAMES = [
  {
    key: 'mines' as const,
    title: 'Mines',
    description: 'Stake classic. Click tiles to find gems. Avoid hidden mines and cash out early!',
    emoji: '💣',
    reward: 'Up to 1,000x+',
    difficulty: 'Medium',
    color: '#FFD700',
    category: 'Betting',
    image: '/images/mines.jpg',
  },
  {
    key: 'plinko' as const,
    title: 'Plinko',
    description: 'Drop ball down peg triangle and score high outer multipliers! Bouncing action.',
    emoji: '🔴',
    reward: 'Up to 170x',
    difficulty: 'Easy',
    color: '#00F0FF',
    category: 'Betting',
    image: '/images/plinko.jpg',
  },
  {
    key: 'crash' as const,
    title: 'Crash',
    description: 'Watch the rocket climb. Cash out before it crashes to secure your multiplier!',
    emoji: '📈',
    reward: 'Up to 10,000x+',
    difficulty: 'Hard',
    color: '#00FF87',
    category: 'Betting',
    image: '/images/crash.jpg',
  },
  {
    key: 'limbo' as const,
    title: 'Limbo',
    description: 'Set your target multiplier and roll the digital slot. High multiplier wins!',
    emoji: '🚀',
    reward: 'Up to 100,000x',
    difficulty: 'Medium',
    color: '#FF7700',
    category: 'Betting',
    image: '/images/limbo.jpg',
  },
  {
    key: 'roulette' as const,
    title: 'Roulette',
    description: 'Color betting. Roll Red (2x), Black (2x), or Green (14x) on horizontal slide wheel.',
    emoji: '🎡',
    reward: 'Up to 14x',
    difficulty: 'Easy',
    color: '#FF3366',
    category: 'Betting',
    image: '/images/roulette.jpg',
  },
  {
    key: 'dragontiger' as const,
    title: 'Dragon Tiger',
    description: 'Simplified baccarat. Bet on which side deals the higher card: Dragon, Tiger, or Tie.',
    emoji: '🎴',
    reward: 'Up to 11x',
    difficulty: 'Easy',
    color: '#A855F7',
    category: 'Betting',
    image: '/images/dragontiger.jpg',
  },
  {
    key: 'chicken' as const,
    title: 'Chicken',
    description: 'Lift covers to find delicious roasted chicken. Avoid bones. Cash out early!',
    emoji: '🍗',
    reward: 'Up to 1,000x+',
    difficulty: 'Medium',
    color: '#FFB800',
    category: 'Betting',
    image: '/images/chicken.jpg',
  },
  {
    key: 'flip' as const,
    title: 'Coin Flip',
    description: 'Flip a neon coin and guess Heads or Tails for a 1.96x return payout.',
    emoji: '🪙',
    reward: '1.96x Bet',
    difficulty: 'Easy',
    color: '#E0E0E0',
    category: 'Betting',
    image: '/images/flip.jpg',
  },
  {
    key: 'clicker' as const,
    title: 'Clicker Rush',
    description: 'Click as fast as you can in 10 seconds! Earn tokens based on click speed.',
    emoji: '👆',
    reward: '10–50 tokens',
    difficulty: 'Easy',
    color: '#00F0FF',
    category: 'Free Play',
  },
  {
    key: 'memory' as const,
    title: 'Memory Match',
    description: 'Flip cards to find matching pairs. Complete the board to win big!',
    emoji: '🧠',
    reward: '25–100 tokens',
    difficulty: 'Medium',
    color: '#FFD700',
    category: 'Free Play',
  },
  {
    key: 'quiz' as const,
    title: 'Trivia Quiz',
    description: '10 questions across topics. Each correct answer earns you tokens!',
    emoji: '🎯',
    reward: '5–150 tokens',
    difficulty: 'Medium',
    color: '#A855F7',
    category: 'Free Play',
  },
  {
    key: 'tap' as const,
    title: 'Tap Challenge',
    description: 'Tap the glowing targets as fast as possible! Mobile-first speed test.',
    emoji: '✨',
    reward: '15–80 tokens',
    difficulty: 'Hard',
    color: '#00FF87',
    category: 'Free Play',
  },
];

const difficultyColors: Record<string, string> = {
  Easy: '#00FF87',
  Medium: '#FFD700',
  Hard: '#FF3366',
};

export function MiniGames() {
  const [activeGame, setActiveGame] = useState<GameKey>(null);
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Betting' | 'Free Play'>('All');

  const filteredGames = GAMES.filter(
    (game) => categoryFilter === 'All' || game.category === categoryFilter
  );

  const renderGame = () => {
    switch (activeGame) {
      case 'clicker': return <ClickerGame onClose={() => setActiveGame(null)} />;
      case 'memory': return <MemoryGame onClose={() => setActiveGame(null)} />;
      case 'quiz': return <QuizGame onClose={() => setActiveGame(null)} />;
      case 'tap': return <TapChallenge onClose={() => setActiveGame(null)} />;
      case 'flip': return <CoinFlipScene onClose={() => setActiveGame(null)} />;
      case 'limbo': return <LimboGame onClose={() => setActiveGame(null)} />;
      case 'mines': return <MinesGame onClose={() => setActiveGame(null)} />;
      case 'chicken': return <ChickenGame onClose={() => setActiveGame(null)} />;
      case 'dragontiger': return <DragonTigerGame onClose={() => setActiveGame(null)} />;
      case 'roulette': return <RouletteGame onClose={() => setActiveGame(null)} />;
      case 'crash': return <CrashGame onClose={() => setActiveGame(null)} />;
      case 'plinko': return <PlinkoGame onClose={() => setActiveGame(null)} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-cyan">Mini Games</h1>
            <p className="text-sm text-text-secondary mt-1">Play free games or bet tokens on Stake originals!</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 bg-navy-950 p-1 rounded-xl border border-navy-800 self-start">
            {(['All', 'Betting', 'Free Play'] as const).map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'primary' : 'ghost'}
                onClick={() => setCategoryFilter(cat)}
                size="sm"
                className="py-1 px-3 text-xs rounded-lg"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredGames.map((game, i) => (
            <motion.div
              key={game.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                hover
                glow="cyan"
                className="cursor-pointer group h-full flex flex-col justify-between overflow-hidden p-0 bg-navy-950/40 border-navy-800/80"
                onClick={() => setActiveGame(game.key)}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    {game.image ? (
                      <div className="relative h-40 w-full overflow-hidden mb-3 border-b border-navy-800">
                        <img
                          src={game.image}
                          alt={game.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 text-xl bg-navy-950/80 p-1.5 rounded-lg backdrop-blur-sm border border-white/5">
                          {game.emoji}
                        </div>
                        <span className="absolute top-2 right-2 text-3xs uppercase tracking-wider font-semibold text-muted bg-navy-950/85 px-2 py-0.5 rounded-md border border-white/5 backdrop-blur-sm">
                          {game.category}
                        </span>
                      </div>
                    ) : (
                      <div 
                        className="relative h-40 w-full mb-3 border-b border-navy-800 flex items-center justify-center overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at 50% 120%, ${game.color}25, rgba(10, 20, 40, 0.9))`,
                        }}
                      >
                        <div 
                          className="absolute w-24 h-24 rounded-full blur-[35px] opacity-30 transition-transform duration-500 group-hover:scale-125"
                          style={{ backgroundColor: game.color }}
                        />
                        <span className="text-5xl z-10 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-300">
                          {game.emoji}
                        </span>
                        <span className="absolute top-2 right-2 text-3xs uppercase tracking-wider font-semibold text-muted bg-navy-950/85 px-2 py-0.5 rounded-md border border-white/5 backdrop-blur-sm">
                          {game.category}
                        </span>
                      </div>
                    )}
                    
                    <div className="px-4 pb-2">
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
                      <p className="text-xs text-text-secondary mb-4 leading-relaxed">{game.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-4 pb-4" style={{ color: game.color }}>
                    <Coins size={12} className="text-current" />
                    <span>{game.category === 'Betting' ? `Payout: ${game.reward}` : `Win: ${game.reward}`}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
 
      {/* ── Active game overlay ── */}
      <AnimatePresence>
        {activeGame && (
          <motion.div
            className="fixed inset-0 z-50 bg-navy-950/98 backdrop-blur-md flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Game header */}
            <div className="flex items-center justify-between p-4 border-b border-navy-800 bg-navy-900/80 backdrop-blur-md sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <Gamepad2 size={20} className="text-cyan-neon animate-pulse" />
                <span className="font-display font-semibold text-text-primary">
                  {GAMES.find(g => g.key === activeGame)?.title}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveGame(null)} className="hover:bg-white/10 rounded-xl">
                <X size={18} />
              </Button>
            </div>
 
            {/* Game content */}
            <div className="flex-1 overflow-auto bg-navy-950/40">
              {renderGame()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
