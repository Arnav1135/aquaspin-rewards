import React from 'react';
import { Volume2, VolumeX, Sparkles, X, RotateCcw, BookOpen, BrainCircuit } from 'lucide-react';

interface SettingsModalProps {
  isMuted: boolean;
  onToggleSound: () => void;
  onResetLevel: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isMuted,
  onToggleSound,
  onResetLevel,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white flex flex-col gap-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-amber-300 border-b border-slate-800 pb-3">Game Settings</h3>

        <div className="flex flex-col gap-3">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-sm font-bold text-slate-200">Audio & Sound FX</span>
            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>

          {/* AI Engine Status */}
          <div className="flex items-center justify-between bg-purple-950/50 p-3 rounded-2xl border border-purple-500/30">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <div>
                <span className="text-xs font-bold text-white block">Gemini AI Engine</span>
                <span className="text-[10px] text-purple-300">Server-Side Enabled</span>
              </div>
            </div>
            <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">Active</span>
          </div>

          {/* Restart Level */}
          <button
            onClick={() => {
              onResetLevel();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/50 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Current Level</span>
          </button>
        </div>
      </div>
    </div>
  );
};
