import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Trophy } from 'lucide-react';

interface WaterDropUIProps {
  score: number;
  isPlaying: boolean;
  onRestart: () => void;
}

export function WaterDropUI({ score, isPlaying, onRestart }: WaterDropUIProps) {
  // Try to load high score
  const highScore = parseInt(localStorage.getItem('waterDropHighScore') || '0', 10);
  
  if (score > highScore) {
    localStorage.setItem('waterDropHighScore', score.toString());
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      <div className="flex justify-between items-start">
        <div className="bg-[#1A2642]/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl">
          <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">Score</p>
          <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {score}
          </p>
        </div>
        
        <div className="bg-[#1A2642]/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-xl flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">Best</p>
            <p className="text-lg font-bold text-white">{Math.max(score, highScore)}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-[#1A2642] p-8 rounded-3xl border border-white/10 shadow-2xl text-center max-w-sm w-full mx-4">
              <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
              <p className="text-white/70 mb-8">You scored {score} points!</p>
              
              <button
                onClick={onRestart}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <RefreshCw className="w-5 h-5" />
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
