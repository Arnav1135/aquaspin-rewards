import React, { useState } from 'react';
import { useGameState } from '../state/useGameState';
import { Settings, Undo2, Redo2, Lightbulb, RotateCcw, X, Palette, Monitor, Eye, Volume2, Gamepad2, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaterSortUIProps {
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onRestart: () => void;
  onCloseGame: () => void;
}

export function WaterSortUI({ onUndo, onRedo, onHint, onRestart, onCloseGame }: WaterSortUIProps) {
  const { 
    level, score, moves, stats,
    theme, quality, colorBlindMode, showSettings, gameMode,
    volumeMaster, volumeMusic, volumeEffects,
    setTheme, setQuality, setColorBlindMode, setShowSettings, setGameMode,
    setVolumeMaster, setVolumeMusic, setVolumeEffects
  } = useGameState();

  const [showStats, setShowStats] = useState(false);

  const themes = [
    'Ocean', 'Neon', 'Crystal', 'Sunset', 'Minimal Dark', 'Minimal Light', 
    'Snow', 'Winter', 'Autumn', 'Forest', 'Aurora', 'Galaxy', 'Candy', 
    'Spring', 'Summer'
  ];
  const qualities = ['Low', 'Medium', 'High', 'Ultra'];
  const modes = ['classic', 'zen', 'challenge', 'hardcore'];

  return (
    <>
      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-1">
          <div className="text-white font-extrabold text-3xl tracking-widest uppercase drop-shadow-md">
            Level {level}
          </div>
          <div className="text-white/80 font-semibold text-sm uppercase tracking-wider">
            Moves: {moves} | Score: {score} | Mode: {gameMode}
          </div>
          <button 
            onClick={() => setShowStats(true)}
            className="mt-2 flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors uppercase font-bold"
          >
            <BarChart2 size={14} /> View Stats
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-end max-w-[60%]">
          <button 
            onClick={onHint}
            className="w-11 h-11 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/30 backdrop-blur-md flex items-center justify-center text-yellow-200 transition-all shadow-lg active:scale-95"
            title="Hint"
          >
            <Lightbulb size={20} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={onUndo}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
            title="Undo"
          >
            <Undo2 size={20} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={onRedo}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
            title="Redo"
          >
            <Redo2 size={20} strokeWidth={2.5} />
          </button>
          
          <button 
            onClick={onRestart}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
            title="Restart"
          >
            <RotateCcw size={20} strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
            title="Settings"
          >
            <Settings size={20} strokeWidth={2.5} />
          </button>

          <button 
            onClick={onCloseGame}
            className="w-11 h-11 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 backdrop-blur-md flex items-center justify-center text-red-100 transition-all shadow-lg active:scale-95 ml-2"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStats && (
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
              className="w-full max-w-sm rounded-3xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 flex flex-col gap-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                  <BarChart2 /> Statistics
                </h2>
                <button onClick={() => setShowStats(false)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="bg-black/20 rounded-xl p-4 flex flex-col gap-3 text-white/90 font-semibold">
                <div className="flex justify-between">
                  <span>Puzzles Solved:</span>
                  <span className="text-[#5AB8EA]">{stats.totalSolved}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Score:</span>
                  <span className="text-[#5AB8EA]">{score}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="w-full max-w-md rounded-3xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-6 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white tracking-wide">Settings</h2>
                  <button onClick={() => setShowSettings(false)} className="text-white/60 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                {/* Game Mode Selector */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Gamepad2 size={16} /> Game Mode
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {modes.map(m => (
                      <button 
                        key={m}
                        onClick={() => setGameMode(m)}
                        className={`py-2 px-3 rounded-xl border font-semibold transition-all capitalize ${gameMode === m ? 'bg-white/20 border-white text-white shadow-inner' : 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90'}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Mixer */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-semibold uppercase tracking-wider">
                    <Volume2 size={16} /> Audio Mixer
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-white/70 font-semibold">
                      <span>Master</span>
                      <span>{Math.round(volumeMaster * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={volumeMaster} onChange={(e) => setVolumeMaster(parseFloat(e.target.value))} className="w-full accent-white" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-white/70 font-semibold">
                      <span>Music</span>
                      <span>{Math.round(volumeMusic * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={volumeMusic} onChange={(e) => setVolumeMusic(parseFloat(e.target.value))} className="w-full accent-[#5AB8EA]" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-white/70 font-semibold">
                      <span>Effects</span>
                      <span>{Math.round(volumeEffects * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={volumeEffects} onChange={(e) => setVolumeEffects(parseFloat(e.target.value))} className="w-full accent-yellow-400" />
                  </div>
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
                  <div className="flex gap-2 flex-wrap">
                    {qualities.map(q => (
                      <button 
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`flex-1 min-w-[70px] py-2 rounded-xl border text-sm font-semibold transition-all ${quality === q ? 'bg-white/20 border-white text-white shadow-inner' : 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90'}`}
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

