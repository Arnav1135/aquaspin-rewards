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
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "#66bdf2",
  Medium: "#66bdf2",
  Hard: "#7b8bc1",
};

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <motion.button
      onClick={() => onClick(game.key)}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      className="text-left group bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-lg flex flex-col h-full w-full relative overflow-hidden"
    >
      <div
        className="rounded-xl h-32 flex items-center justify-center relative overflow-hidden mb-3 w-full"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${game.color}55, transparent 60%), rgba(255, 255, 255, 0.05)`,
        }}
      >
        {game.thumbnail ? (
          <img
            src={game.thumbnail}
            alt={game.title}
            className={`absolute inset-0 w-full h-full group-hover:scale-110 transition-transform duration-500 ${
              game.thumbnailFit === "contain" ? "object-contain p-2" : "object-cover"
            }`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="text-5xl drop-shadow-md">{game.emoji}</div>
        )}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
          {game.category}
        </span>
        {game.title.includes("3D") && (
          <span className="absolute bottom-2 left-2 rounded-full bg-cyan-500/80 backdrop-blur-sm px-2 py-1 text-[9px] font-black text-white border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            3D PREMIUM
          </span>
        )}
      </div>
      
      <div className="px-1 pb-1 flex-1 flex flex-col z-10 w-full">
        <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
          {game.title}
        </h3>
        <p className="mt-1 text-[11px] text-white/60 line-clamp-2 leading-tight">
          {game.desc}
        </p>
        
        <div className="mt-auto flex items-center justify-between pt-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10"
            style={{
              color: DIFFICULTY_COLOR[game.difficulty] || "#fff",
              background: `${DIFFICULTY_COLOR[game.difficulty] || "#fff"}15`,
            }}
          >
            {game.difficulty}
          </span>
          <span className="text-[11px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
            {game.reward}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
