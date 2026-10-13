// src/components/ui/GameCard.tsx
import { motion } from "framer-motion";

interface GameCardProps {
  game: {
    key: string;
    title: string;
    emoji: string;
    category: string;
    reward: string;
    difficulty: string;
    color: string;
    desc: string;
    thumbnail?: string;
    thumbnailFit?: string;
  };
  onClick: (key: string) => void;
  fullBlock?: boolean;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#66bdf2",
  Medium: "#66bdf2",
  Hard: "#7b8bc1",
};

export function GameCard({ game, onClick, fullBlock = false }: GameCardProps) {
  // If fullBlock is requested or cards with full block background:
  if (fullBlock) {
    return (
      <motion.button
        onClick={() => onClick(game.key)}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="text-left group rounded-3xl p-4 border border-white/25 shadow-2xl flex flex-col justify-between h-full w-full relative overflow-hidden transition-all"
        style={{
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
        }}
      >
        {/* Full Block Background Image */}
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-6xl"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${game.color}66, #0f172a)`,
            }}
          >
            {game.emoji}
          </div>
        )}

        {/* Cinematic Multi-stop Dark Gradient Overlay for Maximum Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30 transition-opacity duration-300 group-hover:via-slate-950/60" />

        {/* Top Badges (Category & 3D Tag) */}
        <div className="relative z-10 flex items-center justify-between w-full">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-black tracking-wider uppercase text-cyan-300 border border-cyan-400/30 shadow-md">
            {game.category}
          </span>
          {game.title.includes("3D") && (
            <span className="rounded-full bg-cyan-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white border border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              3D
            </span>
          )}
        </div>

        {/* Bottom Details Section (High contrast crisp typography) */}
        <div className="relative z-10 w-full pt-4">
          <h3 className="font-black text-lg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors truncate tracking-wide">
            {game.title}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] line-clamp-2 leading-snug">
            {game.desc}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <span
              className="text-[10px] font-black px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-md bg-black/40 shadow-sm"
              style={{
                color: DIFFICULTY_COLOR[game.difficulty] || "#fff",
              }}
            >
              {game.difficulty}
            </span>
            <span className="text-xs font-black text-amber-300 bg-amber-400/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.25)]">
              {game.reward}
            </span>
          </div>
        </div>
      </motion.button>
    );
  }

  // Standard Compact / Grid Card (With Expanded Proportions & Auto-scaling Thumbnail)
  return (
    <motion.button
      onClick={() => onClick(game.key)}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      className="text-left group bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-white/15 shadow-xl flex flex-col h-full w-full relative overflow-hidden"
    >
      <div
        className="rounded-xl h-36 flex items-center justify-center relative overflow-hidden mb-3 w-full bg-slate-950"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${game.color}44, transparent 70%), #090d16`,
        }}
      >
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="text-5xl drop-shadow-md">{game.emoji}</div>
        )}

        {/* Soft Vignette Overlay to enhance badge clarity */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
          {game.category}
        </span>
        {game.title.includes("3D") && (
          <span className="absolute bottom-2 left-2 rounded-full bg-cyan-500/90 backdrop-blur-md px-2 py-0.5 text-[9px] font-black text-white border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            3D PREMIUM
          </span>
        )}
      </div>

      <div className="px-1 pb-1 flex-1 flex flex-col z-10 w-full">
        <h3 className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors truncate tracking-wide">
          {game.title}
        </h3>
        <p className="mt-1 text-[11px] text-slate-300 font-medium line-clamp-2 leading-relaxed">
          {game.desc}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 bg-black/30"
            style={{
              color: DIFFICULTY_COLOR[game.difficulty] || "#fff",
            }}
          >
            {game.difficulty}
          </span>
          <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
            {game.reward}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
