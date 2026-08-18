import React, { useState } from 'react';
import { BrainCircuit, Sparkles, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { AiMoveAdvice, TileData } from '../types';
import { Match3Engine } from '../engine/Match3Engine';

interface AIAdvisorModalProps {
  board: TileData[][];
  movesLeft: number;
  score: number;
  targetScore: number;
  onApplyAdvice: (advice: AiMoveAdvice) => void;
  onClose: () => void;
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  board,
  movesLeft,
  score,
  targetScore,
  onApplyAdvice,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<AiMoveAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAIMoveAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const boardState = board.map((row) =>
        row.map((t) => `${t.color[0].toUpperCase()}${t.special !== 'none' ? `(${t.special})` : ''}`)
      );

      const res = await fetch('/api/ai/move-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardState,
          movesLeft,
          score,
          targetScore,
        }),
      });

      const data = await res.json();
      if (data.success && data.advice) {
        setAdvice(data.advice);
      } else {
        const fallback = Match3Engine.getBestMoveAdvice(board);
        setAdvice(fallback);
      }
    } catch (e: any) {
      const fallback = Match3Engine.getBestMoveAdvice(board);
      setAdvice(fallback);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAIMoveAdvice();
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white flex flex-col gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-purple-500/30 pb-3">
          <div className="p-3 rounded-2xl bg-purple-600/30 border border-purple-400/50 text-purple-300">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-300">Stitch AI Tactical Engine</h3>
            <p className="text-xs text-purple-200">Powered by Gemini 3.6 Pro Reasoning</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-semibold text-purple-200">Analyzing 3D Board & Cascades...</p>
          </div>
        ) : advice ? (
          <div className="flex flex-col gap-3">
            {/* Rating badge */}
            <div className="flex items-center justify-between bg-purple-950/60 p-3 rounded-xl border border-purple-500/40">
              <span className="text-xs font-bold text-slate-300">Tactical Move Value:</span>
              <div className="flex items-center gap-1 font-black text-amber-400 text-sm">
                <Zap className="w-4 h-4 fill-amber-400" />
                <span>{advice.strategicRating} / 100</span>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 text-sm leading-relaxed text-slate-200">
              <strong className="text-amber-300 block mb-1">Recommended Strategy:</strong>
              {advice.explanation}
            </div>

            {/* Forecast */}
            <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-500/40 text-xs text-indigo-200">
              <strong className="text-indigo-300 block mb-0.5">Forecast Combo:</strong>
              {advice.comboForecast}
            </div>

            {/* Apply move button */}
            <button
              onClick={() => {
                onApplyAdvice(advice);
                onClose();
              }}
              className="mt-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Highlight Swap on 3D Board</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-rose-300">
            {error || 'Unable to analyze board.'}
          </div>
        )}
      </div>
    </div>
  );
};
