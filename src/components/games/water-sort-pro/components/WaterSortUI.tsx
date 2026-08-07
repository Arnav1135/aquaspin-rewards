import React, { useState, useEffect } from 'react';
import { useGameState } from '../state/useGameState';
import { ThemeManager } from '../systems/ThemeManager';
import { Settings, Undo2, Redo2, Lightbulb, RotateCcw, X, Palette, Monitor, Eye, Volume2, Gamepad2, BarChart2, Trophy, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaterSortUIProps {
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onAddTube?: () => void;
  onRestart: () => void;
  onCloseGame: () => void;
}

export function WaterSortUI({ onUndo, onRedo, onHint, onAddTube, onRestart, onCloseGame }: WaterSortUIProps) {
  const { 
    level, score, moves, stats,
    theme, quality, colorBlindMode, showSettings, gameMode,
    volumeMaster, volumeMusic, volumeEffects,
    setTheme, setQuality, setColorBlindMode, setShowSettings, setGameMode,
    setVolumeMaster, setVolumeMusic, setVolumeEffects,
    isWon
  } = useGameState();

  const [showStats, setShowStats] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showChest, setShowChest] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);

  const qualities = ['Low', 'Medium', 'High', 'Ultra'];
  const modes = ['classic', 'zen', 'challenge', 'hardcore'];

  // Trigger achievement banner and reward chest on win
  useEffect(() => {
    if (isWon) {
      setTimeout(() => setShowAchievement(true), 500);
      setTimeout(() => setShowAchievement(false), 4500);
      
      // Show reward chest after a small delay
      setTimeout(() => {
        setShowChest(true);
        setChestOpened(false);
      }, 1500);
    } else {
      setShowChest(false);
    }
  }, [isWon]);

  return (
    <>
      {/* Reward Chest Opening */}
      <AnimatePresence>
        {showChest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex flex-col items-center gap-6">
              {!chestOpened ? (
                <motion.div
                  initial={{ scale: 0.5, y: 100 }}
                  animate={{ scale: 1, y: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setChestOpened(true)}
                  className="cursor-pointer relative"
                >
                  <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
                  <div className="text-8xl drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] filter hover:brightness-125 transition-all">
                    🧰
                  </div>
                  <p className="text-white text-center mt-4 font-bold animate-bounce tracking-widest">TAP TO OPEN</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-20 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.3)_360deg)] rounded-full mix-blend-overlay"
                    />
                    <div className="text-8xl drop-shadow-[0_0_30px_rgba(255,215,0,1)]">
                      💎
                    </div>
                  </div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 flex flex-col items-center"
                  >
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-400 drop-shadow-lg">
                      +100 XP
                    </h2>
                    <p className="text-white/80 font-semibold mt-2 tracking-widest uppercase">Level Cleared!</p>
                  </motion.div>
                  
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={onRestart}
                    className="mt-10 px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full font-bold text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:scale-105 active:scale-95 transition-all"
                  >
                    NEXT LEVEL
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievement Banner */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-yellow-500/80 via-amber-400/90 to-yellow-500/80 backdrop-blur-md border border-yellow-200/50 shadow-[0_0_30px_rgba(250,204,21,0.5)] rounded-2xl p-1 flex items-center overflow-hidden">
              <div className="bg-black/20 rounded-xl p-3 px-6 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="bg-yellow-100/20 p-2 rounded-full shadow-inner">
                  <Trophy className="text-yellow-100" size={32} />
                </div>
                <div>
                  <h3 className="text-yellow-50 font-bold text-sm tracking-widest uppercase opacity-80">Achievement Unlocked</h3>
                  <p className="text-white font-black text-xl drop-shadow-md">Level {level} Master!</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-1">
          <div className="text-white font-extrabold text-3xl tracking-widest uppercase drop-shadow-md flex items-center gap-2">
            Level {level}
            {isWon && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 1 }}
              >
                <Award className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" size={28} />
              </motion.div>
            )}
          </div>
          <div className="text-white/80 font-semibold text-sm uppercase tracking-wider">
            Rating: {stats.playerSkillRating || 1000} | Streak: 🔥{stats.winStreak || 0}
          </div>
          <div className="text-white/60 font-medium text-xs uppercase tracking-wider mb-2">
            Moves: {moves} | Score: {score} | Mode: {gameMode}
          </div>
          
          <AnimatePresence>
            {useGameState.getState().activeHint && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="bg-blue-500/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-blue-300/50 shadow-lg"
              >
                <div className="flex items-center gap-2 text-blue-50 text-xs font-bold uppercase tracking-widest">
                  <Lightbulb size={14} className="text-yellow-300" />
                  {useGameState.getState().activeHint?.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                    {ThemeManager.getAllThemes().map(t => (
                      <button 
                        key={t.id}
                        onClick={() => { if (t.isUnlocked) setTheme(t.id); }}
                        className={`py-2 px-3 rounded-xl border font-semibold transition-all relative ${theme === t.id ? 'bg-white/20 border-white text-white shadow-inner' : (t.isUnlocked ? 'bg-black/20 border-transparent text-white/60 hover:bg-black/40 hover:text-white/90' : 'bg-black/40 border-transparent text-white/30 cursor-not-allowed')}`}
                      >
                        {t.name}
                        {!t.isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-center px-1 leading-tight text-white/90 font-bold">{t.unlockCondition || 'Locked'}</span>
                          </div>
                        )}
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

