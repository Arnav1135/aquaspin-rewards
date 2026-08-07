import React from 'react';
import { useGameState } from '../state/useGameState';
import { Settings, Undo2, RotateCcw, X, Palette, Monitor, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaterSortUIProps {
  onUndo: () => void;
  onRestart: () => void;
  onCloseGame: () => void;
}

export function WaterSortUI({ onUndo, onRestart, onCloseGame }: WaterSortUIProps) {
  const { 
    level, score, moves, 
    theme, quality, colorBlindMode, showSettings,
    setTheme, setQuality, setColorBlindMode, setShowSettings 
  } = useGameState();

  const themes = ['Ocean', 'Neon', 'Crystal', 'Sunset', 'Minimal Dark'];
  const qualities = ['Low', 'Medium', 'High', 'Ultra'];

  return (
    <>
      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-1">
          <div className="text-white font-extrabold text-3xl tracking-widest uppercase drop-shadow-md">
            Level {level}
          </div>
          <div className="text-white/80 font-semibold text-sm uppercase tracking-wider">
            Moves: {moves} | Score: {score}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          <button 
            onClick={onUndo}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
          >
            <Undo2 size={22} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={onRestart}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
          >
            <RotateCcw size={22} strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
          >
            <Settings size={22} strokeWidth={2.5} />
          </button>

          <button 
            onClick={onCloseGame}
            className="w-12 h-12 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 backdrop-blur-md flex items-center justify-center text-red-100 transition-all shadow-lg active:scale-95 ml-2"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Settings Modal (Glassmorphism) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-3xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
            >
              <div className="p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white tracking-wide">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {/* Theme Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Palette size={16} /> Theme
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map(t => (
                      <button 
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`py-2 px-3 rounded-xl border font-semibold transition-all ${theme === t ? 'bg-white/20 border-white text-white shadow-inner' : 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Monitor size={16} /> Graphics Quality
                  </div>
                  <div className="flex gap-2">
                    {qualities.map(q => (
                      <button 
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${quality === q ? 'bg-white/20 border-white text-white shadow-inner' : 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessibility */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Eye size={16} /> Accessibility
                  </div>
                  <button 
                    onClick={() => setColorBlindMode(!colorBlindMode)}
                    className={`w-full py-3 px-4 rounded-xl border flex items-center justify-between font-semibold transition-all ${colorBlindMode ? 'bg-green-500/20 border-green-500/50 text-green-100' : 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90'}`}
                  >
                    <span>Color Blind Mode (Patterns)</span>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${colorBlindMode ? 'bg-green-500' : 'bg-white/20'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${colorBlindMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
