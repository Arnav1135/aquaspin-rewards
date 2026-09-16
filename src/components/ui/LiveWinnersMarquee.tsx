import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Trophy } from "lucide-react";

const NAMES = ["Arnav", "Luna", "Zoe", "Kai", "Raj", "Mia", "Leo", "Priya", "Max", "Dev", "Sara", "Ali"];
const GAMES = ["Crash", "Plinko", "Mines", "Slots", "Roulette", "Video Poker", "Dragon Tiger", "Blackjack"];

export function LiveWinnersMarquee() {
  const [wins, setWins] = useState<{ id: number; text: string; amount: number; game: string }[]>([]);

  useEffect(() => {
    // Generate initial static list to scroll smoothly
    const generateWin = (id: number) => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const game = GAMES[Math.floor(Math.random() * GAMES.length)];
      const amount = Math.floor(Math.random() * 50) * 1000 + (Math.floor(Math.random() * 9) * 100);
      return { id, text: `${name} just won`, amount, game };
    };

    const initialWins = Array.from({ length: 15 }).map((_, i) => generateWin(i));
    setWins(initialWins);
  }, []);

  if (wins.length === 0) return null;

  return (
    <div className="w-full bg-[#0a0f1d] border-y border-white/5 overflow-hidden flex items-center h-10 fixed bottom-0 lg:bottom-0 max-lg:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0f1d] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0f1d] to-transparent z-10" />
      
      <div className="flex items-center px-2 text-[10px] font-black text-white/40 uppercase tracking-widest bg-[#0a0f1d] z-20 h-full border-r border-white/5 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        <TrendingUp size={14} className="mr-2 text-emerald-500" />
        Live Payouts
      </div>

      <div className="flex flex-1 overflow-hidden">
        <motion.div
          animate={{ x: [0, -2000] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
          className="flex whitespace-nowrap items-center h-full"
        >
          {/* Double map for seamless looping */}
          {[...wins, ...wins].map((win, i) => (
            <div key={i} className="flex items-center mx-6 gap-2">
              <Trophy size={12} className="text-yellow-500" />
              <span className="text-white/60 text-xs font-semibold">{win.text}</span>
              <span className="text-emerald-400 text-xs font-black bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                +${win.amount.toLocaleString()} Tokens
              </span>
              <span className="text-white/40 text-xs font-medium border border-white/10 px-2 py-0.5 rounded-sm">
                in {win.game}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}