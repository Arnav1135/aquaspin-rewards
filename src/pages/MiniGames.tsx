import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  X,
  Search,
  Maximize2,
  Minimize2,
  Cpu,
  Box,
} from "lucide-react";
import toast from "react-hot-toast";
const ClickerGame = lazy(() =>
  import("@/components/games/ClickerGame").then((m) => ({
    default: m.ClickerGame,
  })),
);
const MemoryGame = lazy(() =>
  import("@/components/games/MemoryGame").then((m) => ({
    default: m.MemoryGame,
  })),
);
const QuizGame = lazy(() =>
  import("@/components/games/QuizGame").then((m) => ({ default: m.QuizGame })),
);
const TapChallenge = lazy(() =>
  import("@/components/games/TapChallenge").then((m) => ({
    default: m.TapChallenge,
  })),
);
const TicTacToeGame = lazy(() =>
  import("@/components/games/TicTacToeGame").then((m) => ({
    default: m.TicTacToeGame,
  })),
);
const MathsQuizGame = lazy(() =>
  import("@/components/games/MathsQuizGame").then((m) => ({
    default: m.MathsQuizGame,
  })),
);
const SudokuGame = lazy(() =>
  import("@/components/games/SudokuGame").then((m) => ({
    default: m.SudokuGame,
  })),
);
const FlappyBirdGame = lazy(() =>
  import("@/components/games/FlappyBirdGame").then((m) => ({
    default: m.FlappyBirdGame,
  })),
);
const PoolGame = lazy(() =>
  import("@/components/games/PoolGame").then((m) => ({ default: m.PoolGame })),
);
const KnifeThrowerGame = lazy(() =>
  import("@/components/games/KnifeThrowerGame").then((m) => ({
    default: m.KnifeThrowerGame,
  })),
);
const ChickenJumpGame = lazy(() =>
  import("@/components/games/ChickenJumpGame").then((m) => ({
    default: m.ChickenJumpGame,
  })),
);
const DotsAndBoxesGame = lazy(() =>
  import("@/components/games/DotsAndBoxesGame").then((m) => ({
    default: m.DotsAndBoxesGame,
  })),
);
const DartsGame = lazy(() =>
  import("@/components/games/DartsGame").then((m) => ({
    default: m.DartsGame,
  })),
);
const ArcheryGame = lazy(() =>
  import("@/components/games/ArcheryGame").then((m) => ({
    default: m.ArcheryGame,
  })),
);
const ChessGame = lazy(() => import("@/components/games/Chess3D/App"));
const SolitaireGame = lazy(() =>
  import("@/components/games/SolitaireGame").then((m) => ({
    default: m.SolitaireGame,
  })),
);
const LudoGame = lazy(() =>
  import("@/components/games/LudoGame").then((m) => ({ default: m.LudoGame })),
);
const HextrisGame = lazy(() =>
  import("@/components/games/HextrisGame").then((m) => ({
    default: m.HextrisGame,
  })),
);
const WaterSortGame = lazy(() =>
  import("@/components/games/water-sort-pro/components/WaterSortPro").then(
    (m) => ({ default: m.WaterSortPro }),
  ),
);
const Game2048 = lazy(() =>
  import("@/components/games/Game2048").then((m) => ({ default: m.Game2048 })),
);
const CoinFlipGame = lazy(() =>
  import("@/components/games/CoinFlipGame").then((m) => ({
    default: m.CoinFlipGame,
  })),
);
const LimboGame = lazy(() =>
  import("@/components/games/LimboGame").then((m) => ({
    default: m.LimboGame,
  })),
);
const MinesGame = lazy(() =>
  import("@/components/games/MinesGame").then((m) => ({
    default: m.MinesGame,
  })),
);
const ChickenGame = lazy(() =>
  import("@/components/games/ChickenGame").then((m) => ({
    default: m.ChickenGame,
  })),
);
const DragonTigerGame = lazy(() =>
  import("@/components/games/DragonTigerGame").then((m) => ({
    default: m.DragonTigerGame,
  })),
);
const RouletteGame = lazy(() =>
  import("@/components/games/RouletteGame").then((m) => ({
    default: m.RouletteGame,
  })),
);
const CrashGame = lazy(() =>
  import("@/components/games/CrashGame").then((m) => ({
    default: m.CrashGame,
  })),
);
const PlinkoGame = lazy(() =>
  import("@/components/games/PlinkoGame").then((m) => ({
    default: m.PlinkoGame,
  })),
);
const CandyCrushGame = lazy(
  () => import("@/components/games/CandyCrushSagaMap"),
);
const AirHockey3DGame = lazy(() =>
  import("@/components/games/AirHockey3DGame").then((m) => ({
    default: m.AirHockey3DGame,
  })),
);
const Basketball3DGame = lazy(() =>
  import("@/components/games/Basketball3DGame").then((m) => ({
    default: m.Basketball3DGame,
  })),
);
const Bowling3DGame = lazy(() =>
  import("@/components/games/Bowling3DGame").then((m) => ({
    default: m.Bowling3DGame,
  })),
);
import { AGEA, GameGenre, VisualStyle } from "@/engine/AIGameEngineArchitect";
import { AIGameEnginePanel } from "@/components/AIGameEnginePanel";
import { useAuthStore } from "@/features/authStore";
import { GameSkeleton } from "@/components/ui/GameSkeleton";

type Category =
  "All" | "Casino" | "Arcade" | "3D Premium" | "Board" | "Quiz" | "Puzzle";
type Game = {
  key: string;
  title: string;
  emoji: string;
  category: Category;
  reward: string;
  difficulty: string;
  color: string;
  desc: string;
  thumbnail?: string;
  thumbnailFit?: string;
};
const GAMES: Game[] = [
  {
    key: "mines",
    title: "Mines",
    emoji: "💣",
    category: "Casino",
    reward: "Up to 1,000x+",
    difficulty: "Medium",
    color: "#FFD700",
    desc: "Click tiles to find gems. Avoid hidden mines and cash out early!",
    thumbnail: "/thumbnails/mines_premium.jpg",
  },
  {
    key: "plinko",
    title: "Plinko",
    emoji: "🔴",
    category: "Casino",
    reward: "Up to 170x",
    difficulty: "Easy",
    color: "#66bdf2",
    desc: "Drop a ball through pegs and score high outer multipliers!",
    thumbnail: "/thumbnails/plinko.jpg",
  },
  {
    key: "crash",
    title: "Crash",
    emoji: "📈",
    category: "Casino",
    reward: "Up to 10,000x+",
    difficulty: "Hard",
    color: "#66bdf2",
    desc: "Cash out before the rocket crashes to secure your multiplier!",
    thumbnail: "/thumbnails/crash_premium.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "limbo",
    title: "Limbo",
    emoji: "🚀",
    category: "Casino",
    reward: "Up to 100,000x",
    difficulty: "Medium",
    color: "#F97316",
    desc: "Set your target multiplier and roll. High multiplier wins!",
    thumbnail: "/thumbnails/limbo_premium.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "roulette",
    title: "Roulette",
    emoji: "🎡",
    category: "Casino",
    reward: "Up to 14x",
    difficulty: "Easy",
    color: "#7b8bc1",
    desc: "Bet Red, Black, or Green on the spin wheel.",
    thumbnail: "/thumbnails/roulette.jpg",
  },
  {
    key: "dragontiger",
    title: "Dragon Tiger",
    emoji: "🎴",
    category: "Casino",
    reward: "Up to 11x",
    difficulty: "Easy",
    color: "#A855F7",
    desc: "Bet on Dragon, Tiger, or Tie.",
    thumbnail: "/thumbnails/dragontiger_premium.jpg",
  },
  {
    key: "chicken",
    title: "Chicken",
    emoji: "🍗",
    category: "Casino",
    reward: "Up to 1,000x+",
    difficulty: "Medium",
    color: "#FFB800",
    desc: "Lift covers to find chicken. Avoid bones.",
    thumbnail: "/thumbnails/chicken.jpg",
  },
  {
    key: "flip",
    title: "Coin Flip",
    emoji: "🪙",
    category: "Casino",
    reward: "1.96x Bet",
    difficulty: "Easy",
    color: "#c2e7fa",
    desc: "Flip a coin and guess Heads or Tails.",
    thumbnail: "/thumbnails/flip.jpg",
  },
  {
    key: "airhockey3d",
    title: "3D Neon Air Hockey",
    emoji: "🏒",
    category: "3D Premium",
    reward: "High Score",
    difficulty: "Medium",
    color: "#3ddcff",
    desc: "Hyper-polished WebGL air hockey with glowing physics and responsive controls.",
  },
  {
    key: "basketball3d",
    title: "3D Basketball Arcade",
    emoji: "🏀",
    category: "3D Premium",
    reward: "High Score",
    difficulty: "Medium",
    color: "#ff8a3d",
    desc: "Time your power and sink shots in a cinematic 3D court.",
  },
  {
    key: "bowling3d",
    title: "3D Bowling",
    emoji: "🎳",
    category: "3D Premium",
    reward: "Strike Score",
    difficulty: "Medium",
    color: "#8b7cff",
    desc: "Control power and spin, then watch the ball and pins collide in 3D.",
  },
  {
    key: "flappy",
    title: "Flappy Bird",
    emoji: "🐦",
    category: "Arcade",
    reward: "High Score",
    difficulty: "Hard",
    color: "#FFD700",
    desc: "Fly through pipe gaps without crashing.",
    thumbnail: "/thumbnails/flappy.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "knife",
    title: "Knife Hit",
    emoji: "🗡️",
    category: "Arcade",
    reward: "Stage Clear",
    difficulty: "Medium",
    color: "#6366F1",
    desc: "Throw knives at a rotating log.",
    thumbnail: "/thumbnails/knife.jpg",
  },
  {
    key: "chickenjump",
    title: "Chicken Jump",
    emoji: "🐔",
    category: "Arcade",
    reward: "High Score",
    difficulty: "Easy",
    color: "#F97316",
    desc: "Jump over obstacles in an endless runner.",
    thumbnail: "/thumbnails/chickenjump_premium.jpg",
  },
  {
    key: "archery",
    title: "Archery",
    emoji: "🏹",
    category: "Arcade",
    reward: "High Score",
    difficulty: "Medium",
    color: "#66bdf2",
    desc: "Aim while accounting for wind and gravity.",
    thumbnail: "/thumbnails/archery.jpg",
  },
  {
    key: "darts",
    title: "Darts",
    emoji: "🎯",
    category: "Arcade",
    reward: "Best Score",
    difficulty: "Easy",
    color: "#7b8bc1",
    desc: "Throw darts and hit doubles and trebles.",
    thumbnail: "/thumbnails/darts.jpg",
  },
  {
    key: "pool",
    title: "Pool",
    emoji: "🎱",
    category: "Arcade",
    reward: "Table Clear",
    difficulty: "Medium",
    color: "#66bdf2",
    desc: "Aim and strike the cue ball.",
    thumbnail: "/thumbnails/pool.jpg",
  },
  {
    key: "clicker",
    title: "Clicker Rush",
    emoji: "👆",
    category: "Arcade",
    reward: "10–50 tokens",
    difficulty: "Easy",
    color: "#66bdf2",
    desc: "Click as fast as possible in 10 seconds.",
    thumbnail: "/thumbnails/clicker_premium.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "tap",
    title: "Tap Challenge",
    emoji: "✨",
    category: "Arcade",
    reward: "15–80 tokens",
    difficulty: "Hard",
    color: "#c2e7fa",
    desc: "Tap glowing targets before they vanish.",
    thumbnail: "/thumbnails/tap_premium.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "chess",
    title: "Chess 3D",
    emoji: "♟️",
    category: "Board",
    reward: "Victory",
    difficulty: "Hard",
    color: "#66bdf2",
    desc: "Play classical 3D chess.",
    thumbnail: "/thumbnails/chess.jpg",
  },
  {
    key: "ludo",
    title: "Ludo King",
    emoji: "🎲",
    category: "Board",
    reward: "Victory",
    difficulty: "Medium",
    color: "#66bdf2",
    desc: "Upgraded 3D tabletop Ludo.",
    thumbnail: "/thumbnails/ludo.jpg",
  },
  {
    key: "solitaire",
    title: "Solitaire",
    emoji: "🃏",
    category: "Board",
    reward: "Clear Board",
    difficulty: "Medium",
    color: "#66bdf2",
    desc: "Classic Klondike solitaire.",
    thumbnail: "/thumbnails/solitaire.jpg",
  },
  {
    key: "tictactoe",
    title: "Tic Tac Toe",
    emoji: "❌",
    category: "Board",
    reward: "Win Streak",
    difficulty: "Easy",
    color: "#66bdf2",
    desc: "Three in a row wins.",
    thumbnail: "/thumbnails/tictactoe.jpg",
  },
  {
    key: "dots",
    title: "Dots & Boxes",
    emoji: "⬜",
    category: "Board",
    reward: "Most Boxes",
    difficulty: "Medium",
    color: "#A855F7",
    desc: "Complete boxes by drawing lines.",
    thumbnail: "/thumbnails/dots.jpg",
  },
  {
    key: "memory",
    title: "Memory Match",
    emoji: "🎴",
    category: "Board",
    reward: "25–100 tokens",
    difficulty: "Medium",
    color: "#FFD700",
    desc: "Flip cards to find matching pairs.",
    thumbnail: "/thumbnails/memory.jpg",
  },
  {
    key: "mathsquiz",
    title: "Maths Blitz",
    emoji: "🔢",
    category: "Quiz",
    reward: "High Score",
    difficulty: "Medium",
    color: "#66bdf2",
    desc: "Rapid-fire maths challenges.",
    thumbnail: "/thumbnails/mathsquiz.jpg",
    thumbnailFit: "contain",
  },
  {
    key: "sudoku",
    title: "Sudoku",
    emoji: "🔢",
    category: "Quiz",
    reward: "Time Record",
    difficulty: "Hard",
    color: "#6366F1",
    desc: "Fill the 9×9 grid.",
    thumbnail: "/thumbnails/sudoku.jpg",
  },
  {
    key: "quiz",
    title: "Trivia Quiz",
    emoji: "🎯",
    category: "Quiz",
    reward: "5–150 tokens",
    difficulty: "Medium",
    color: "#A855F7",
    desc: "10 questions across topics.",
    thumbnail: "/thumbnails/quiz.jpg",
  },
  {
    key: "candycrush",
    title: "Candy Crunch",
    emoji: "🍭",
    category: "Puzzle",
    reward: "150 Levels",
    difficulty: "Hard",
    color: "#ff4081",
    desc: "Match 3+ candies.",
    thumbnail: "/thumbnails/candy.jpg",
  },
  {
    key: "hextris",
    title: "Hextris",
    emoji: "🛑",
    category: "Puzzle",
    reward: "High Score",
    difficulty: "Medium",
    color: "#ff4081",
    desc: "Rotate the hexagon to survive.",
    thumbnail: "/thumbnails/hextris.jpg",
  },
  {
    key: "watersort",
    title: "Water Sort",
    emoji: "🧪",
    category: "Puzzle",
    reward: "Level Clear",
    difficulty: "Medium",
    color: "#4d96ff",
    desc: "Sort colored water into glasses.",
    thumbnail: "/thumbnails/watersort.jpg",
  },
  {
    key: "2048",
    title: "2048",
    emoji: "🔢",
    category: "Puzzle",
    reward: "High Score",
    difficulty: "Hard",
    color: "#edc22e",
    desc: "Combine matching tiles.",
    thumbnail: "/thumbnails/2048.jpg",
  },
];
const CATEGORIES: Category[] = [
  "All",
  "3D Premium",
  "Casino",
  "Arcade",
  "Board",
  "Quiz",
  "Puzzle",
];
const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#66bdf2",
  Medium: "#66bdf2",
  Hard: "#7b8bc1",
};

export function MiniGames() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isOwner = useAuthStore((s) => s.isOwner);
  useEffect(() => {
    document.body.style.overflow = activeGame ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeGame]);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const activeMeta = GAMES.find((g) => g.key === activeGame);
  useEffect(() => {
    if (!activeMeta) return;
    let genre: GameGenre =
      activeMeta.category === "Puzzle"
        ? "puzzle"
        : activeMeta.category === "Board"
          ? "board"
          : "arcade";
    if (activeMeta.category === "Casino") genre = "simulation";
    const style: VisualStyle =
      activeMeta.category === "3D Premium"
        ? "3d-threejs"
        : activeMeta.key === "chess"
          ? "dom-css"
          : "2d-canvas";
    AGEA.onboardGame(activeMeta.key, activeMeta.title, genre, style);
  }, [activeMeta]);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement)
      overlayRef.current
        ?.requestFullscreen()
        .catch(() => toast.error("Fullscreen not supported or blocked"));
    else document.exitFullscreen().catch(() => {});
  };
  const close = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setActiveGame(null);
  };
  const filtered = GAMES.filter(
    (g) =>
      (category === "All" || g.category === category) &&
      g.title.toLowerCase().includes(search.toLowerCase()),
  );
  const renderGame = (key: string | null) => {
    if (!key) return null;
    const p = { onClose: close };
    switch (key) {
      case "airhockey3d":
        return <AirHockey3DGame {...p} />;
      case "basketball3d":
        return <Basketball3DGame {...p} />;
      case "bowling3d":
        return <Bowling3DGame {...p} />;
      case "flip":
        return <CoinFlipGame {...p} />;
      case "limbo":
        return <LimboGame {...p} />;
      case "mines":
        return <MinesGame {...p} />;
      case "chicken":
        return <ChickenGame {...p} />;
      case "dragontiger":
        return <DragonTigerGame {...p} />;
      case "roulette":
        return <RouletteGame {...p} />;
      case "crash":
        return <CrashGame {...p} />;
      case "plinko":
        return <PlinkoGame {...p} />;
      case "candycrush":
        return <CandyCrushGame onBack={close} balance={0} />;
      case "clicker":
        return <ClickerGame {...p} />;
      case "tap":
        return <TapChallenge {...p} />;
      case "flappy":
        return <FlappyBirdGame {...p} />;
      case "knife":
        return <KnifeThrowerGame {...p} />;
      case "chickenjump":
        return <ChickenJumpGame {...p} />;
      case "archery":
        return <ArcheryGame {...p} />;
      case "darts":
        return <DartsGame {...p} />;
      case "pool":
        return <PoolGame {...p} />;
      case "chess":
        return <ChessGame {...p} />;
      case "ludo":
        return <LudoGame {...p} />;
      case "solitaire":
        return <SolitaireGame {...p} />;
      case "tictactoe":
        return <TicTacToeGame {...p} />;
      case "dots":
        return <DotsAndBoxesGame {...p} />;
      case "memory":
        return <MemoryGame {...p} />;
      case "mathsquiz":
        return <MathsQuizGame {...p} />;
      case "sudoku":
        return <SudokuGame {...p} />;
      case "quiz":
        return <QuizGame {...p} />;
      case "hextris":
        return <HextrisGame {...p} />;
      case "watersort":
        return <WaterSortGame {...p} />;
      case "2048":
        return <Game2048 {...p} />;
      default:
        return null;
    }
  };
  return (
    <>
      <AnimatePresence mode="wait">
        {!activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen pt-20 pb-28 px-4"
            style={{
              background: "linear-gradient(160deg,#e1eff8 0%,#cfe5f5 100%)",
            }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Gamepad2 size={20} style={{ color: "#66bdf2" }} />
                    <h1
                      className="text-2xl font-bold"
                      style={{ color: "#7b8bc1" }}
                    >
                      Game Library
                    </h1>
                  </div>
                  <p className="text-sm text-slate-500">
                    {GAMES.length} games including a premium 3D arcade
                    collection
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isOwner && (
                    <button
                      onClick={() => setShowPanel(!showPanel)}
                      className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-400 bg-[#090b11]/80 border border-cyan-500/30"
                    >
                      <Cpu size={14} /> AGE Architect
                    </button>
                  )}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-[#a8cbea]/50 min-w-[200px]">
                    <Search size={14} className="text-slate-400" />
                    <input
                      className="bg-transparent text-sm outline-none flex-1 text-[#7b8bc1]"
                      placeholder="Search games..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="mb-8 rounded-3xl overflow-hidden border border-white/70 bg-slate-950 shadow-2xl">
                <div className="p-5 sm:p-7 bg-[radial-gradient(circle_at_15%_0%,#164e63,transparent_38%),radial-gradient(circle_at_90%_100%,#312e81,transparent_42%),#050912]">
                  <div className="flex items-center gap-2 text-cyan-300 text-sm font-black uppercase tracking-[.18em]">
                    <Box size={16} /> Premium 3D Arcade
                  </div>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">
                    Hyper-realistic WebGL mini games
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/65">
                    Three cinematic games built directly into Aqua Spin Rewards
                    with responsive controls, dynamic lighting, physics-inspired
                    motion and GPU-friendly post-processing.
                  </p>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {GAMES.filter((g) => g.category === "3D Premium").map(
                      (g) => (
                        <motion.button
                          key={g.key}
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveGame(g.key)}
                          className="text-left rounded-2xl border border-white/10 bg-white/[.06] hover:bg-white/[.1] p-4"
                        >
                          <div className="text-3xl">{g.emoji}</div>
                          <div className="mt-3 font-black text-white">
                            {g.title}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {g.desc}
                          </div>
                          <div className="mt-3 text-xs font-bold text-cyan-300">
                            PLAY 3D →
                          </div>
                        </motion.button>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mb-8 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold ${category === cat ? "bg-[#5AB8EA] text-white" : "bg-white/60 text-[#7682B9] border border-[#C7E9F7]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <motion.div
                key={category + search}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {filtered.map((game) => (
                  <motion.button
                    key={game.key}
                    onClick={() => setActiveGame(game.key)}
                    whileHover={{ y: -4, scale: 1.015 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-left group bg-white/75 backdrop-blur-xl rounded-2xl p-2 border border-[#C7E9F7]/60 shadow-sm flex flex-col h-full"
                  >
                    <div
                      className="rounded-xl h-28 sm:h-32 flex items-center justify-center relative overflow-hidden mb-3"
                      style={{
                        background: `radial-gradient(circle at 30% 20%,${game.color}55,transparent 60%),#e5f2f9`,
                      }}
                    >
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          className={`absolute inset-0 w-full h-full group-hover:scale-110 transition-transform duration-500 ${game.thumbnailFit === "contain" ? "object-contain p-2" : "object-cover"}`}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="text-5xl">{game.emoji}</div>
                      )}
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-bold text-[#7682B9]">
                        {game.category}
                      </span>
                      {game.category === "3D Premium" && (
                        <span className="absolute bottom-2 left-2 rounded-full bg-cyan-400 px-2 py-1 text-[9px] font-black text-slate-950">
                          WEBGL
                        </span>
                      )}
                    </div>
                    <div className="px-1 pb-1 flex-1 flex flex-col">
                      <h3 className="font-extrabold text-sm text-[#7682B9] group-hover:text-[#5AB8EA]">
                        {game.emoji} {game.title}
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                        {game.desc}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: DIFFICULTY_COLOR[game.difficulty],
                            background: `${DIFFICULTY_COLOR[game.difficulty]}15`,
                          }}
                        >
                          {game.difficulty}
                        </span>
                        <span className="text-[10px] font-bold text-[#5AB8EA]">
                          {game.reward}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
              {!filtered.length && (
                <div className="text-center py-16 text-[#7b8bc1]">
                  No games found. Try another search.
                </div>
              )}
            </div>
          </motion.div>
        )}
        {activeGame && (
          <motion.div
            key="active"
            ref={overlayRef}
            className="w-full h-[100dvh] flex flex-col bg-[#E5F2F9]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 flex-shrink-0 bg-white/60 backdrop-blur-2xl border-b border-white/60 z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeMeta?.emoji}</span>
                <div>
                  <p className="font-black text-[#7682B9]">
                    {activeMeta?.title}
                  </p>
                  <p className="text-xs font-semibold text-[#5AB8EA]">
                    {activeMeta?.category} · {activeMeta?.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  aria-label="Toggle fullscreen"
                  className="w-9 h-9 rounded-full bg-[#E5F2F9] text-[#5AB8EA] flex items-center justify-center"
                >
                  {isFullscreen ? (
                    <Minimize2 size={17} />
                  ) : (
                    <Maximize2 size={17} />
                  )}
                </button>
                <button
                  onClick={close}
                  aria-label="Close game"
                  className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-0 sm:p-4 flex items-center justify-center">
              <Suspense fallback={<GameSkeleton />}>
                {renderGame(activeGame)}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPanel && (
          <AIGameEnginePanel
            activeGameId={activeGame}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
