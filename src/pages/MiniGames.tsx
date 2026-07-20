// src/pages/MiniGames.tsx
// Complete gaming hub — 16 games, fintech UI, GameFrame visibility protection

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Search, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Free-play & classic games
import { ClickerGame } from '@/components/games/ClickerGame';
import { MemoryGame } from '@/components/games/MemoryGame';
import { QuizGame } from '@/components/games/QuizGame';
import { TapChallenge } from '@/components/games/TapChallenge';
import { TicTacToeGame } from '@/components/games/TicTacToeGame';
import { MathsQuizGame } from '@/components/games/MathsQuizGame';
import { SudokuGame } from '@/components/games/SudokuGame';
import { FlappyBirdGame } from '@/components/games/FlappyBirdGame';
import { KnifeThrowerGame } from '@/components/games/KnifeThrowerGame';
import { ChickenJumpGame } from '@/components/games/ChickenJumpGame';
import { DotsAndBoxesGame } from '@/components/games/DotsAndBoxesGame';
import { DartsGame } from '@/components/games/DartsGame';
import { ArcheryGame } from '@/components/games/ArcheryGame';
import { ChessGame } from '@/components/games/ChessGame';
import { SolitaireGame } from '@/components/games/SolitaireGame';
import { PoolGame } from '@/components/games/PoolGame';
import { Match3Game } from '@/games/match3';

// Betting / Casino games
import { CoinFlipScene } from '@/features/coinflip/CoinFlipScene';
import { LimboGame } from '@/components/games/LimboGame';
import { MinesGame } from '@/components/games/MinesGame';
import { ChickenGame } from '@/components/games/ChickenGame';
import { DragonTigerGame } from '@/components/games/DragonTigerGame';
import { RouletteGame } from '@/components/games/RouletteGame';
import { CrashGame } from '@/components/games/CrashGame';
import { PlinkoGame } from '@/components/games/PlinkoGame';
import CandyCrushGame from '@/components/games/CandyCrushGame';
import { AGEA, GameGenre, VisualStyle } from '@/engine/AIGameEngineArchitect';
import { AIGameEnginePanel } from '@/components/AIGameEnginePanel';
import { Cpu } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';

// ─────────────────────────────────────────────────────────────
// Game catalogue
// ─────────────────────────────────────────────────────────────
const GAMES = [
  // === BETTING / CASINO ===
  {
    key: 'mines',       title: 'Mines',       emoji: '💣',  category: 'Casino',
    reward: 'Up to 1,000x+', difficulty: 'Medium', color: '#FFD700',
    desc: 'Click tiles to find gems. Avoid hidden mines and cash out early!',
    thumbnail: '/thumbnails/mines.jpg',
  },
  {
    key: 'plinko',      title: 'Plinko',      emoji: '🔴',  category: 'Casino',
    reward: 'Up to 170x',    difficulty: 'Easy',   color: '#66bdf2',
    desc: 'Drop a ball through pegs and score high outer multipliers!',
    thumbnail: '/thumbnails/plinko.jpg',
  },
  {
    key: 'crash',       title: 'Crash',       emoji: '📈',  category: 'Casino',
    reward: 'Up to 10,000x+',difficulty: 'Hard',   color: '#66bdf2',
    desc: 'Cash out before the rocket crashes to secure your multiplier!',
    thumbnail: '/thumbnails/crash.jpg',
  },
  {
    key: 'limbo',       title: 'Limbo',       emoji: '🚀',  category: 'Casino',
    reward: 'Up to 100,000x', difficulty: 'Medium', color: '#F97316',
    desc: 'Set your target multiplier and roll. High multiplier wins!',
    thumbnail: '/thumbnails/limbo.jpg',
  },
  {
    key: 'roulette',    title: 'Roulette',    emoji: '🎡',  category: 'Casino',
    reward: 'Up to 14x',     difficulty: 'Easy',   color: '#7b8bc1',
    desc: 'Bet Red (2x), Black (2x), or Green (14x) on the spin wheel.',
    thumbnail: '/thumbnails/roulette.jpg',
  },
  {
    key: 'dragontiger', title: 'Dragon Tiger',emoji: '🎴',  category: 'Casino',
    reward: 'Up to 11x',     difficulty: 'Easy',   color: '#A855F7',
    desc: 'Bet on Dragon, Tiger, or Tie for the higher card.',
    thumbnail: '/thumbnails/dragontiger.jpg',
  },
  {
    key: 'chicken',     title: 'Chicken',     emoji: '🍗',  category: 'Casino',
    reward: 'Up to 1,000x+', difficulty: 'Medium', color: '#FFB800',
    desc: 'Lift covers to find chicken. Avoid bones. Cash out early!',
    thumbnail: '/thumbnails/chicken.jpg',
  },
  {
    key: 'flip',        title: 'Coin Flip',   emoji: '🪙',  category: 'Casino',
    reward: '1.96x Bet',     difficulty: 'Easy',   color: '#c2e7fa',
    desc: 'Flip a coin and guess Heads or Tails for 1.96x payout.',
    thumbnail: '/thumbnails/flip.jpg',
  },
  // === ARCADE / SKILL ===
  {
    key: 'flappy',      title: 'Flappy Bird', emoji: '🐦',  category: 'Arcade',
    reward: 'High Score',    difficulty: 'Hard',   color: '#FFD700',
    desc: 'Fly through pipe gaps without crashing. Classic endless runner!',
    thumbnail: '/thumbnails/flappy.jpg',
  },
  {
    key: 'knife',       title: 'Knife Hit',   emoji: '🗡️', category: 'Arcade',
    reward: 'Stage Clear',   difficulty: 'Medium', color: '#6366F1',
    desc: 'Throw knives at a rotating log. Hit apples for bonus points!',
    thumbnail: '/thumbnails/knife.jpg',
  },
  {
    key: 'chickenjump', title: 'Chicken Jump', emoji: '🐔', category: 'Arcade',
    reward: 'High Score',    difficulty: 'Easy',   color: '#F97316',
    desc: 'Jump over obstacles in this endless side-scrolling runner!',
    thumbnail: '/thumbnails/chicken.jpg', // fallback
  },
  {
    key: 'archery',     title: 'Archery',     emoji: '🏹',  category: 'Arcade',
    reward: 'High Score',    difficulty: 'Medium', color: '#66bdf2',
    desc: 'Aim your arrow accounting for wind and gravity. Hit the bullseye!',
    thumbnail: '/thumbnails/archery.jpg',
  },
  {
    key: 'darts',       title: 'Darts',       emoji: '🎯',  category: 'Arcade',
    reward: 'Best Score',    difficulty: 'Easy',   color: '#7b8bc1',
    desc: 'Swipe to throw darts. Hit doubles and trebles for big scores!',
    thumbnail: '/thumbnails/darts.jpg',
  },
  {
    key: 'pool',        title: 'Pool',        emoji: '🎱',  category: 'Arcade',
    reward: 'Table Clear',   difficulty: 'Medium', color: '#66bdf2',
    desc: 'Aim and strike the cue ball. Pocket all colored balls to win!',
    thumbnail: '/thumbnails/pool.jpg',
  },
  {
    key: 'clicker',     title: 'Clicker Rush',emoji: '👆',  category: 'Arcade',
    reward: '10–50 tokens',  difficulty: 'Easy',   color: '#66bdf2',
    desc: 'Click as fast as possible in 10 seconds! Earn tokens per click.',
    thumbnail: '/thumbnails/mathsquiz.jpg', // fallback
  },
  {
    key: 'tap',         title: 'Tap Challenge',emoji: '✨', category: 'Arcade',
    reward: '15–80 tokens',  difficulty: 'Hard',   color: '#c2e7fa',
    desc: 'Tap glowing targets before they vanish. Speed test!',
    thumbnail: '/thumbnails/mathsquiz.jpg', // fallback
  },
  // === BOARD / PUZZLE ===
  {
    key: 'chess',       title: 'Chess',       emoji: '♟️',  category: 'Board',
    reward: 'Victory',       difficulty: 'Hard',   color: '#66bdf2',
    desc: 'Play classical chess against AI or pass-and-play locally.',
    thumbnail: '/thumbnails/chess.jpg',
  },
  {
    key: 'solitaire',   title: 'Solitaire',   emoji: '🃏',  category: 'Board',
    reward: 'Clear Board',   difficulty: 'Medium', color: '#66bdf2',
    desc: 'Classic Klondike solitaire. Sort cards from Ace to King!',
    thumbnail: '/thumbnails/solitaire.jpg',
  },
  {
    key: 'tictactoe',   title: 'Tic Tac Toe', emoji: '❌',  category: 'Board',
    reward: 'Win Streak',    difficulty: 'Easy',   color: '#66bdf2',
    desc: 'Three in a row wins! Play against AI or a friend locally.',
    thumbnail: '/thumbnails/tictactoe.jpg',
  },
  {
    key: 'dots',        title: 'Dots & Boxes', emoji: '⬜', category: 'Board',
    reward: 'Most Boxes',    difficulty: 'Medium', color: '#A855F7',
    desc: 'Complete boxes by drawing lines to claim territory. Beats AI!',
    thumbnail: '/thumbnails/dots.jpg',
  },
  {
    key: 'memory',      title: 'Memory Match', emoji: '🧠', category: 'Board',
    reward: '25–100 tokens', difficulty: 'Medium', color: '#FFD700',
    desc: 'Flip cards to find matching pairs. Complete the board to win!',
    thumbnail: '/thumbnails/sudoku.jpg', // fallback
  },
  // === TRIVIA / QUIZ ===
  {
    key: 'mathsquiz',   title: 'Maths Blitz', emoji: '🔢',  category: 'Quiz',
    reward: 'High Score',    difficulty: 'Medium', color: '#66bdf2',
    desc: 'Rapid-fire maths challenges: Arithmetic, Algebra, Geometry!',
    thumbnail: '/thumbnails/mathsquiz.jpg',
  },
  {
    key: 'sudoku',      title: 'Sudoku',      emoji: '🔢',  category: 'Quiz',
    reward: 'Time Record',   difficulty: 'Hard',   color: '#6366F1',
    desc: 'Fill the 9×9 grid. Uses pencil marks, hints, and error limits.',
    thumbnail: '/thumbnails/sudoku.jpg',
  },
  {
    key: 'quiz',        title: 'Trivia Quiz',  emoji: '🎯', category: 'Quiz',
    reward: '5–150 tokens',  difficulty: 'Medium', color: '#A855F7',
    desc: '10 questions across topics. Each correct answer earns tokens!',
    thumbnail: '/thumbnails/mathsquiz.jpg', // fallback
  },
  // === PUZZLE / MATCH-3 ===
  {
    key: 'match3',      title: 'Sweet Match',  emoji: '🍬', category: 'Puzzle',
    reward: '60 Levels',     difficulty: 'Hard',   color: '#FF6B6B',
    desc: 'Match 3+ candies in this epic 60-level puzzle adventure!',
    thumbnail: '/thumbnails/candy.jpg',
  },
  {
    key: 'candycrush',  title: 'Candy Crunch',  emoji: '🍭', category: 'Puzzle',
    reward: '150 Levels',    difficulty: 'Hard',   color: '#ff4081',
    desc: 'Match 3+ candies in this massive 150-level puzzle adventure!',
    thumbnail: '/thumbnails/candy.jpg',
  },
] as const;

type GameKey = typeof GAMES[number]['key'] | null;
type Category = 'All' | 'Casino' | 'Arcade' | 'Board' | 'Quiz' | 'Puzzle';

const CATEGORIES: Category[] = ['All', 'Casino', 'Arcade', 'Board', 'Quiz', 'Puzzle'];

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:   '#66bdf2',
  Medium: '#66bdf2',
  Hard:   '#7b8bc1',
};

export function MiniGames() {
  const [activeGame, setActiveGame] = useState<GameKey>(null);
  const [category, setCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  const isOwner = useAuthStore(state => state.isOwner);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const activeGameMeta = GAMES.find(g => g.key === activeGame);

  // Autonomous onboarding effect on game selection
  useEffect(() => {
    if (activeGame && activeGameMeta) {
      let genre: GameGenre = 'arcade';
      if (activeGameMeta.category === 'Casino') genre = 'simulation';
      else if (activeGameMeta.category === 'Board') genre = 'board';
      else if (activeGameMeta.category === 'Puzzle') genre = 'puzzle';
      
      let style: VisualStyle = '2d-canvas';
      if (activeGame === 'chess' || activeGame === 'tictactoe' || activeGame === 'solitaire') style = 'dom-css';
      else if (activeGame === 'candycrush') style = 'svg-vector';

      AGEA.onboardGame(activeGame, activeGameMeta.title, genre, style);
    }
  }, [activeGame, activeGameMeta]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      overlayRef.current?.requestFullscreen().catch((err) => {
        toast.error("Fullscreen not supported or blocked");
        console.error(err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const filtered = GAMES.filter(g => {
    const matchCat = category === 'All' || g.category === category;
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });



  const renderGame = (key: GameKey, close: () => void) => {
    switch (key) {
      // Betting
      case 'flip':        return <CoinFlipScene onClose={close} />;
      case 'limbo':       return <LimboGame onClose={close} />;
      case 'mines':       return <MinesGame onClose={close} />;
      case 'chicken':     return <ChickenGame onClose={close} />;
      case 'dragontiger': return <DragonTigerGame onClose={close} />;
      case 'roulette':    return <RouletteGame onClose={close} />;
      case 'crash':       return <CrashGame onClose={close} />;
      case 'plinko':      return <PlinkoGame onClose={close} />;
      case 'candycrush':  return <CandyCrushGame onBack={close} balance={0} />;
      // Arcade
      case 'clicker':     return <ClickerGame onClose={close} />;
      case 'tap':         return <TapChallenge onClose={close} />;
      case 'flappy':      return <FlappyBirdGame onClose={close} />;
      case 'knife':       return <KnifeThrowerGame onClose={close} />;
      case 'chickenjump': return <ChickenJumpGame onClose={close} />;
      case 'archery':     return <ArcheryGame onClose={close} />;
      case 'darts':       return <DartsGame onClose={close} />;
      case 'pool':        return <PoolGame onClose={close} />;
      // Board
      case 'chess':       return <ChessGame onClose={close} />;
      case 'solitaire':   return <SolitaireGame onClose={close} />;
      case 'tictactoe':   return <TicTacToeGame onClose={close} />;
      case 'dots':        return <DotsAndBoxesGame onClose={close} />;
      case 'memory':      return <MemoryGame onClose={close} />;
      // Quiz
      case 'mathsquiz':   return <MathsQuizGame onClose={close} />;
      case 'sudoku':      return <SudokuGame onClose={close} />;
      case 'quiz':        return <QuizGame onClose={close} />;
      // Puzzle
      case 'match3':      return <Match3Game onClose={close} />;
      default:            return null;
    }
  };

  const close = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setActiveGame(null);
  };

  return (
    <div
      className="min-h-screen pt-20 pb-28 px-4"
      style={{ background: 'linear-gradient(160deg, #e1eff8 0%, #cfe5f5 100%)' }}
    >
      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gamepad2 size={20} style={{ color: '#66bdf2' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#7b8bc1' }}>Game Library</h1>
            </div>
            <p className="text-sm" style={{ color: 'rgba(22,33,62,0.55)' }}>
              {GAMES.length} games across Casino, Arcade, Board & Quiz
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Control Panel Toggle Button */}
            {isOwner && (
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-400 bg-[#090b11]/80 hover:bg-[#090b11] border border-cyan-500/30 hover:border-cyan-500/60 shadow-lg shadow-cyan-500/5 transition-all"
              >
                <Cpu size={14} className="animate-pulse" />
                AGE Architect Panel
              </button>
            )}

            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.82)',
                border: '1.5px solid rgba(168,203,234,0.45)',
                minWidth: 200,
              }}
            >
              <Search size={14} style={{ color: 'rgba(22,33,62,0.40)' }} />
              <input
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: '#7b8bc1' }}
                placeholder="Search games..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Category Filters (pill style) ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Game Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((game, i) => (
            <motion.button
              key={game.key}
              onClick={() => setActiveGame(game.key)}
              className="text-left group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              {/* Fixed navy frame — no game art ever touches app chrome */}
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: '#7b8bc1',
                  padding: 10,
                  boxShadow: '0 6px 20px rgba(22,33,62,0.14)',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(22,33,62,0.22)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(22,33,62,0.14)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {/* Art area */}
                <div
                  className="rounded-2xl h-28 flex items-center justify-center relative overflow-hidden mb-0"
                  style={{
                    background: `radial-gradient(circle at 50% 110%, ${game.color}35, rgba(22,33,62,0.95))`,
                  }}
                >
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* Glow orb */}
                  <div
                    className="absolute w-16 h-16 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"
                    style={{ background: game.color }}
                  />
                  <span className="text-4xl z-10 transition-transform duration-300 group-hover:scale-110 pointer-events-none">
                    {game.emoji}
                  </span>
                  {/* Category badge — smart contrast: always white-on-navy */}
                  <span
                    className="absolute top-2 right-2 badge-chip badge-chip-dark z-10"
                    style={{ fontSize: '0.55rem' }}
                  >
                    {game.category}
                  </span>
                </div>
              </div>

              {/* Info strip below frame */}
              <div className="px-1 pt-2.5 pb-1">
                <div className="flex items-start justify-between gap-1">
                  <h3
                    className="font-semibold text-sm leading-tight group-hover:opacity-80 transition-opacity"
                    style={{ color: '#7b8bc1' }}
                  >
                    {game.title}
                  </h3>
                  <span
                    className="badge-chip flex-shrink-0 mt-0.5"
                    style={{
                      fontSize: '0.55rem',
                      color: DIFFICULTY_COLOR[game.difficulty],
                      background: `${DIFFICULTY_COLOR[game.difficulty]}18`,
                      border: `1px solid ${DIFFICULTY_COLOR[game.difficulty]}30`,
                    }}
                  >
                    {game.difficulty}
                  </span>
                </div>
                <p className="text-2xs mt-0.5 leading-snug" style={{ color: 'rgba(22,33,62,0.50)' }}>
                  {game.reward}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-semibold" style={{ color: '#7b8bc1' }}>No games found</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(22,33,62,0.45)' }}>Try a different search or category.</p>
          </div>
        )}
      </div>

      {/* ── Active Game Overlay ── */}
      <AnimatePresence>
        {activeGame && (
          <motion.div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'linear-gradient(160deg, #e1eff8 0%, #cfe5f5 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Overlay Header bar ── */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{
                background: '#7b8bc1',
                borderBottom: '1px solid rgba(74,144,217,0.18)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{activeGameMeta?.emoji}</span>
                <div>
                  <p className="font-semibold text-sm leading-none" style={{ color: '#FFFFFF' }}>
                    {activeGameMeta?.title}
                  </p>
                  <p className="text-2xs mt-0.5" style={{ color: 'rgba(245,248,252,0.45)' }}>
                    {activeGameMeta?.category} · {activeGameMeta?.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="game-control-btn"
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                  style={{ background: 'rgba(74,144,217,0.20)', borderColor: 'rgba(74,144,217,0.35)' }}
                >
                  {isFullscreen ? (
                    <Minimize2 size={16} strokeWidth={2} style={{ color: '#66bdf2' }} />
                  ) : (
                    <Maximize2 size={16} strokeWidth={2} style={{ color: '#66bdf2' }} />
                  )}
                </button>
                <button
                  className="game-control-btn"
                  onClick={close}
                  aria-label="Close game"
                  style={{ background: 'rgba(247,108,108,0.20)', borderColor: 'rgba(247,108,108,0.35)' }}
                >
                  <X size={16} strokeWidth={2} style={{ color: '#7b8bc1' }} />
                </button>
              </div>
            </div>

            {/* ── Game Content inside protection frame ── */}
            <div className="flex-1 overflow-auto p-4">
              {/*
                Each game renders inside a GameFrame which provides:
                - 16px navy letterbox buffer
                - Scrim bar with standardized controls
                - Visual isolation (overflow:hidden + isolation:isolate)
                The game's own onClose passes through to parent's close()
              */}
              {renderGame(activeGame, close)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Engine Architect Control Panel Dashboard */}
      <AnimatePresence>
        {showPanel && (
          <AIGameEnginePanel
            activeGameId={activeGame}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
