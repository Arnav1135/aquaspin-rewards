// src/pages/MiniGames.tsx
// Complete gaming hub — 16 games, fintech UI, GameFrame visibility protection

import { useState, useEffect, useRef, lazy, Suspense } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, X, Search, Maximize2, Minimize2, Cpu, Sparkles, Play } from 'lucide-react';
import toast from 'react-hot-toast';

// Free-play & classic games
const ClickerGame = lazy(() => import('@/components/games/ClickerGame').then(m => ({ default: m.ClickerGame })));
const MemoryGame = lazy(() => import('@/components/games/MemoryGame').then(m => ({ default: m.MemoryGame })));
const QuizGame = lazy(() => import('@/components/games/QuizGame').then(m => ({ default: m.QuizGame })));
const TapChallenge = lazy(() => import('@/components/games/TapChallenge').then(m => ({ default: m.TapChallenge })));
const TicTacToeGame = lazy(() => import('@/components/games/TicTacToeGame').then(m => ({ default: m.TicTacToeGame })));
const MathsQuizGame = lazy(() => import('@/components/games/MathsQuizGame').then(m => ({ default: m.MathsQuizGame })));
const SudokuGame = lazy(() => import('@/components/games/SudokuGame').then(m => ({ default: m.SudokuGame })));
const FlappyBirdGame = lazy(() => import('@/components/games/FlappyBirdGame').then(m => ({ default: m.FlappyBirdGame })));
const PoolGame = lazy(() => import('@/components/games/PoolGame').then(m => ({ default: m.PoolGame })));
const KnifeThrowerGame = lazy(() => import('@/components/games/KnifeThrowerGame').then(m => ({ default: m.KnifeThrowerGame })));
const ChickenJumpGame = lazy(() => import('@/components/games/ChickenJumpGame').then(m => ({ default: m.ChickenJumpGame })));
const DotsAndBoxesGame = lazy(() => import('@/components/games/DotsAndBoxesGame').then(m => ({ default: m.DotsAndBoxesGame })));
const DartsGame = lazy(() => import('@/components/games/DartsGame').then(m => ({ default: m.DartsGame })));
const ArcheryGame = lazy(() => import('@/components/games/ArcheryGame').then(m => ({ default: m.ArcheryGame })));
const ChessGame = lazy(() => import('@/components/games/Chess3D/App'));
const SolitaireGame = lazy(() => import('@/components/games/SolitaireGame').then(m => ({ default: m.SolitaireGame })));
const LudoGame = lazy(() => import('@/components/games/LudoGame').then(m => ({ default: m.LudoGame })));
const HextrisGame = lazy(() => import('@/components/games/HextrisGame').then(m => ({ default: m.HextrisGame })));
const WaterSortGame = lazy(() => import('@/components/games/WaterSortGame').then(m => ({ default: m.WaterSortGame })));
const Game2048 = lazy(() => import('@/components/games/Game2048').then(m => ({ default: m.Game2048 })));

// Betting / Casino games
const CoinFlipScene = lazy(() => import('@/features/coinflip/CoinFlipScene').then(m => ({ default: m.CoinFlipScene })));
const LimboGame = lazy(() => import('@/components/games/LimboGame').then(m => ({ default: m.LimboGame })));
const MinesGame = lazy(() => import('@/components/games/MinesGame').then(m => ({ default: m.MinesGame })));
const ChickenGame = lazy(() => import('@/components/games/ChickenGame').then(m => ({ default: m.ChickenGame })));
const DragonTigerGame = lazy(() => import('@/components/games/DragonTigerGame').then(m => ({ default: m.DragonTigerGame })));
const RouletteGame = lazy(() => import('@/components/games/RouletteGame').then(m => ({ default: m.RouletteGame })));
const CrashGame = lazy(() => import('@/components/games/CrashGame').then(m => ({ default: m.CrashGame })));
const PlinkoGame = lazy(() => import('@/components/games/PlinkoGame').then(m => ({ default: m.PlinkoGame })));
const CandyCrushGame = lazy(() => import('@/components/games/CandyCrushSagaMap')); // Using Saga Map as entry point
import { AGEA, GameGenre, VisualStyle } from '@/engine/AIGameEngineArchitect';
import { AIGameEnginePanel } from '@/components/AIGameEnginePanel';
import { useAuthStore } from '@/features/authStore';
import { GameErrorBoundary } from '@/lib/reliability/autoRecovery';
import { GameSkeleton } from '@/components/ui/GameSkeleton';

// ─────────────────────────────────────────────────────────────
// Game catalogue
// ─────────────────────────────────────────────────────────────
const GAMES = [
  // === BETTING / CASINO ===
  {
    key: 'mines',       title: 'Mines',       emoji: '💣',  category: 'Casino',
    reward: 'Up to 1,000x+', difficulty: 'Medium', color: '#FFD700',
    desc: 'Click tiles to find gems. Avoid hidden mines and cash out early!',
    thumbnail: '/thumbnails/mines_premium.jpg',
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
    thumbnail: '/thumbnails/crash_premium.jpg',
    thumbnailFit: 'contain',
  },
  {
    key: 'limbo',       title: 'Limbo',       emoji: '🚀',  category: 'Casino',
    reward: 'Up to 100,000x', difficulty: 'Medium', color: '#F97316',
    desc: 'Set your target multiplier and roll. High multiplier wins!',
    thumbnail: '/thumbnails/limbo_premium.jpg',
    thumbnailFit: 'contain',
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
    thumbnail: '/thumbnails/dragontiger_premium.jpg',
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
    thumbnailFit: 'contain',
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
    thumbnail: '/thumbnails/chickenjump_premium.jpg',
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
    thumbnail: '/thumbnails/clicker_premium.jpg',
    thumbnailFit: 'contain',
  },
  {
    key: 'tap',         title: 'Tap Challenge',emoji: '✨', category: 'Arcade',
    reward: '15–80 tokens',  difficulty: 'Hard',   color: '#c2e7fa',
    desc: 'Tap glowing targets before they vanish. Speed test!',
    thumbnail: '/thumbnails/tap_premium.jpg',
    thumbnailFit: 'contain',
  },
  // === BOARD / PUZZLE ===
  {
    key: 'chess',       title: 'Chess 3D',       emoji: '♟️',  category: 'Board',
    reward: 'Victory',       difficulty: 'Hard',   color: '#66bdf2',
    desc: 'Play classical 3D chess against AI or pass-and-play locally.',
    thumbnail: '/thumbnails/chess.jpg',
  },
  {
    key: 'ludo',        title: 'Ludo King',   emoji: '🎲',  category: 'Board',
    reward: 'Victory',       difficulty: 'Medium', color: '#66bdf2',
    desc: 'Upgraded 3D tabletop Ludo game. Play vs AI or pass-and-play!',
    thumbnail: '/thumbnails/ludo.jpg',
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
    key: 'memory',      title: 'Memory Match', emoji: '🎴', category: 'Board',
    reward: '25–100 tokens', difficulty: 'Medium', color: '#FFD700',
    desc: 'Flip cards to find matching pairs. Complete the board to win!',
    thumbnail: '/thumbnails/memory.jpg',
  },
  // === TRIVIA / QUIZ ===
  {
    key: 'mathsquiz',   title: 'Maths Blitz', emoji: '🔢',  category: 'Quiz',
    reward: 'High Score',    difficulty: 'Medium', color: '#66bdf2',
    desc: 'Rapid-fire maths challenges: Arithmetic, Algebra, Geometry!',
    thumbnail: '/thumbnails/mathsquiz.jpg',
    thumbnailFit: 'contain',
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
    thumbnail: '/thumbnails/quiz.jpg',
  },
  // === PUZZLE / MATCH-3 ===

  {
    key: 'candycrush',  title: 'Candy Crunch',  emoji: '🍭', category: 'Puzzle',
    reward: '150 Levels',    difficulty: 'Hard',   color: '#ff4081',
    desc: 'Match 3+ candies in this massive 150-level puzzle adventure!',
    thumbnail: '/thumbnails/candy.jpg',
  },
  {
    key: 'hextris',     title: 'Hextris',     emoji: '🛑',  category: 'Puzzle',
    reward: 'High Score',    difficulty: 'Medium', color: '#ff4081',
    desc: 'Rotate the hexagon to prevent blocks from stacking outside!',
    thumbnail: '/thumbnails/hextris.jpg', // Ensure this exists or fallback
  },
  {
    key: 'watersort',   title: 'Water Sort',  emoji: '🧪',  category: 'Puzzle',
    reward: 'Level Clear',   difficulty: 'Medium', color: '#4d96ff',
    desc: 'Sort colored water into glasses until each glass holds one color!',
    thumbnail: '/thumbnails/watersort.jpg', // Ensure this exists or fallback
  },
  {
    key: '2048',        title: '2048',        emoji: '🔢',  category: 'Puzzle',
    reward: 'High Score',    difficulty: 'Hard',   color: '#edc22e',
    desc: 'Slide tiles to combine matching numbers and reach the 2048 tile!',
    thumbnail: '/thumbnails/2048.jpg', // Ensure this exists or fallback
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
      case 'ludo':        return <LudoGame onClose={close} />;
      case 'solitaire':   return <SolitaireGame onClose={close} />;
      case 'tictactoe':   return <TicTacToeGame onClose={close} />;
      case 'dots':        return <DotsAndBoxesGame onClose={close} />;
      case 'memory':      return <MemoryGame onClose={close} />;
      // Quiz
      case 'mathsquiz':   return <MathsQuizGame onClose={close} />;
      case 'sudoku':      return <SudokuGame onClose={close} />;
      case 'quiz':        return <QuizGame onClose={close} />;
      // Puzzle
      case 'hextris':     return <HextrisGame onClose={close} />;
      case 'watersort':   return <WaterSortGame onClose={close} />;
      case '2048':        return <Game2048 onClose={close} />;

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
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                category === cat 
                  ? 'bg-[#5AB8EA] text-white shadow-lg shadow-[#5AB8EA]/30' 
                  : 'bg-white/50 text-[#7682B9] hover:bg-white border border-[#C7E9F7]'
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Featured Games Carousel (Netflix Style) ── */}
        {category === 'All' && search === '' && (
          <div className="mb-12">
            <h2 className="text-xl font-extrabold text-[#7682B9] mb-4 flex items-center gap-2">
              <Sparkles className="text-[#5AB8EA]" size={20} />
              Featured Premium Games
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {GAMES.slice(0, 5).map((game, i) => (
                <motion.button
                  key={`featured-${game.key}`}
                  onClick={() => setActiveGame(game.key)}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] snap-center group relative text-left rounded-3xl overflow-hidden bg-white border border-[#C7E9F7] shadow-lg shadow-[#7682B9]/10"
                  initial={{ opacity: 0, scale: 0.9, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="h-40 relative overflow-hidden" style={{ background: `radial-gradient(circle at top right, ${game.color}40, transparent)` }}>
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className={`absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1 ${
                        (game as any).thumbnailFit === 'contain' ? 'object-contain p-2' : 'object-cover'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-xs font-bold border border-white/20">
                      {game.category}
                    </span>
                  </div>
                  <div className="p-4 relative bg-white">
                    <div className="absolute -top-6 right-4 w-12 h-12 rounded-xl bg-white shadow-xl flex items-center justify-center text-2xl border border-[#C7E9F7] group-hover:-translate-y-2 transition-transform duration-300">
                      {game.emoji}
                    </div>
                    <h3 className="font-extrabold text-lg text-[#7682B9] mb-1">{game.title}</h3>
                    <p className="text-xs text-[#7682B9]/70 font-medium mb-3 line-clamp-2 pr-10">{game.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ color: DIFFICULTY_COLOR[game.difficulty], background: `${DIFFICULTY_COLOR[game.difficulty]}20` }}>
                        {game.difficulty}
                      </span>
                      <span className="text-xs font-extrabold text-[#5AB8EA]">{game.reward}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── All Games Grid ── */}
        <h2 className="text-lg font-bold text-[#7682B9]/80 mb-4">
          {category === 'All' && search === '' ? 'All Games' : 'Search Results'}
        </h2>
        
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={category + search}
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filtered.map((game, i) => (
              <motion.button
                layout
                key={game.key}
                onClick={() => setActiveGame(game.key)}
                className="text-left group relative bg-white/70 backdrop-blur-xl rounded-2xl p-2 border border-[#C7E9F7]/50 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col h-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 350, damping: 25 }}
                whileHover={{ y: -4, scale: 1.02, boxShadow: '0 20px 40px -10px rgba(90,184,234,0.3)' }}
                whileTap={{ scale: 0.95 }}
              >
              {/* Art area */}
              <div className="rounded-xl h-28 sm:h-32 flex items-center justify-center relative overflow-hidden mb-3 bg-[#E5F2F9]">
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className={`absolute inset-0 w-full h-full transition-all duration-500 group-hover:scale-110 ${
                    (game as any).thumbnailFit === 'contain' ? 'object-contain p-2' : 'object-cover'
                  }`}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#7682B9]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/90 text-[#7682B9] backdrop-blur-sm shadow-sm">
                  {game.category}
                </span>
                <div className="absolute bottom-2 left-2 translate-y-8 group-hover:translate-y-0 transition-transform duration-300 text-white font-bold text-xs flex items-center gap-1">
                  <Play size={12} fill="currentColor" /> Play Now
                </div>
              </div>

              {/* Info strip */}
              <div className="px-1 pb-1 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3 className="font-extrabold text-sm text-[#7682B9] leading-tight group-hover:text-[#5AB8EA] transition-colors">
                    {game.emoji} {game.title}
                  </h3>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: DIFFICULTY_COLOR[game.difficulty], background: `${DIFFICULTY_COLOR[game.difficulty]}15` }}>
                    {game.difficulty}
                  </span>
                  <span className="text-[10px] font-bold text-[#5AB8EA]">{game.reward}</span>
                </div>
              </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

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
            className="fixed inset-0 z-[100] flex flex-col bg-[#E5F2F9]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* ── Overlay Header bar ── */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0 bg-white/40 backdrop-blur-3xl border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-10"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl drop-shadow-md">{activeGameMeta?.emoji}</span>
                <div>
                  <p className="font-extrabold text-base leading-none text-[#7682B9]">
                    {activeGameMeta?.title}
                  </p>
                  <p className="text-xs font-semibold mt-1 text-[#5AB8EA]">
                    {activeGameMeta?.category} · {activeGameMeta?.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="w-10 h-10 rounded-full bg-[#E5F2F9] text-[#5AB8EA] hover:bg-[#5AB8EA] hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={18} strokeWidth={2.5} /> : <Maximize2 size={18} strokeWidth={2.5} />}
                </button>
                <button
                  className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                  onClick={close}
                  aria-label="Close game"
                >
                  <X size={18} strokeWidth={2.5} />
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
              <GameErrorBoundary gameId={activeGame}>
                <Suspense fallback={<GameSkeleton />}>
                  {renderGame(activeGame, close)}
                </Suspense>
              </GameErrorBoundary>
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
