import React from 'react';
import { Sparkles, Pause, Volume2, VolumeX, Map, BrainCircuit } from 'lucide-react';

interface HeaderHUDProps {
  levelNumber: number;
  levelTitle: string;
  score: number;
  targetScore: number;
  movesLeft: number;
  stars: number;
  objectiveType: string;
  jellyCount: number;
  ingredientCount: number;
  isMuted: boolean;
  onToggleSound: () => void;
  onOpenMap: () => void;
  onOpenAIAdvisor: () => void;
  onPause: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  levelNumber,
  levelTitle,
  score,
  targetScore,
  movesLeft,
  stars,
  objectiveType,
  jellyCount,
  ingredientCount,
  isMuted,
  onToggleSound,
  onOpenMap,
  onOpenAIAdvisor,
  onPause,
}) => {
  const scorePercent = Math.min(100, Math.round((score / targetScore) * 100));

  return (
    <div className="w-full max-w-[540px] bg-slate-900/80 border border-amber-300/30 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl text-white flex flex-col gap-2.5">
      {/* Top Bar Navigation & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMap}
            className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/40 transition-all text-amber-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="World Level Map"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">LVL {levelNumber}</span>
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wide text-amber-300 uppercase">
              {levelTitle}
            </span>
            <span className="text-[10px] text-slate-300 font-medium">
              Goal: {objectiveType === 'jelly' ? `${jellyCount} Jelly Left` : objectiveType === 'ingredients' ? `${ingredientCount} Ingredients` : `${targetScore} PTS`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenAIAdvisor}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/50 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 animate-pulse hover:scale-105 active:scale-95"
            title="Ask AI Strategic Move Advisor"
          >
            <BrainCircuit className="w-4 h-4 text-purple-200" />
            <span>AI Advisor</span>
          </button>

          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 hover:scale-105 active:scale-95"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onPause}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-200 hover:scale-105 active:scale-95"
            title="Pause Game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Gameplay Counters */}
      <div className="grid grid-cols-3 gap-2 items-center">
        {/* Moves Left */}
        <div className="bg-gradient-to-br from-rose-600 to-amber-600 rounded-xl p-2 flex flex-col items-center justify-center border border-rose-400/40 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">Moves</span>
          <span className={`text-2xl font-black ${movesLeft <= 5 ? 'text-yellow-300 animate-bounce' : 'text-white'}`}>
            {movesLeft}
          </span>
        </div>

        {/* Score & Star Progress */}
        <div className="col-span-2 bg-slate-800/90 rounded-xl p-2 border border-slate-700 flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold">Score: <strong className="text-amber-400 text-sm">{score.toLocaleString()}</strong></span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3].map((starIndex) => (
                <Sparkles
                  key={starIndex}
                  className={`w-3.5 h-3.5 ${stars >= starIndex ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                />
              ))}
            </div>
          </div>

          {/* Star Milestone Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 overflow-hidden border border-slate-700 relative">
            <div
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-glow"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
