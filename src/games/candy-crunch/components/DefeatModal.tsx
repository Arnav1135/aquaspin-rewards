import React from 'react';
import { Frown, RotateCcw, PlusCircle, X } from 'lucide-react';

interface DefeatModalProps {
  levelNumber: number;
  score: number;
  targetScore: number;
  onReplay: () => void;
  onAddExtraMoves: () => void;
  onClose: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  levelNumber,
  score,
  targetScore,
  onReplay,
  onAddExtraMoves,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white flex flex-col items-center text-center gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 rounded-full bg-rose-500/20 border-2 border-rose-400 text-rose-400">
          <Frown className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-xl font-black text-rose-400 uppercase tracking-wide">OUT OF MOVES!</h2>
          <p className="text-xs text-slate-300 mt-1">Level {levelNumber} Failed</p>
        </div>

        <div className="bg-slate-950 w-full p-3 rounded-2xl border border-slate-800 text-xs flex justify-around">
          <div>
            <span className="text-slate-400 block">Score</span>
            <strong className="text-white text-sm">{score.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Target Goal</span>
            <strong className="text-amber-400 text-sm">{targetScore.toLocaleString()}</strong>
          </div>
        </div>

        <button
          onClick={onAddExtraMoves}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Get +5 Extra Moves & Continue</span>
        </button>

        <button
          onClick={onReplay}
          className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
};
