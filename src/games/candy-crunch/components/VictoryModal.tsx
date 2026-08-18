import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, Sparkles, Trophy, ArrowRight, RotateCcw } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface VictoryModalProps {
  levelNumber: number;
  score: number;
  stars: number;
  onNextLevel: () => void;
  onReplay: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  levelNumber,
  score,
  stars,
  onNextLevel,
  onReplay,
}) => {
  useEffect(() => {
    soundEngine.playFanfare();

    // Trigger colorful confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 border-4 border-amber-400 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white flex flex-col items-center text-center gap-4 relative overflow-hidden">
        {/* Glow header */}
        <div className="p-4 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-glow animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-amber-300 tracking-wide uppercase">SWEET VICTORY!</h2>
          <p className="text-xs text-slate-300 mt-1">Level {levelNumber} Cleared!</p>
        </div>

        {/* Animated Stars */}
        <div className="flex items-center gap-2 my-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`p-2 rounded-full transition-all duration-500 ${
                stars >= s ? 'bg-amber-400/20 border border-amber-400 scale-110 shadow-lg' : 'bg-slate-800 border border-slate-700 opacity-40'
              }`}
            >
              <Star
                className={`w-8 h-8 ${stars >= s ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-600'}`}
              />
            </div>
          ))}
        </div>

        {/* Score tally */}
        <div className="bg-slate-900/90 w-full p-3 rounded-2xl border border-amber-400/30">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Final Score</span>
          <span className="text-2xl font-black text-amber-400">{score.toLocaleString()}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full mt-2">
          <button
            onClick={onReplay}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>

          <button
            onClick={onNextLevel}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <span>Next Level</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
