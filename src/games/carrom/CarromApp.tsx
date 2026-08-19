import React, { useState } from 'react';
import { CarromGame3D } from './components/CarromGame3D';
import { useCarromStore } from './state/CarromState';
import { motion, AnimatePresence } from 'framer-motion';

export default function CarromApp() {
  const [started, setStarted] = useState(false);
  const gameMode = useCarromStore(state => state.gameMode);

  const startGame = (mode: 'FREESTYLE' | 'VS_AI' | 'MULTIPLAYER') => {
    useCarromStore.setState({ gameMode: mode });
    setStarted(true);
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
      <AnimatePresence>
        {!started && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute z-10 flex flex-col items-center p-8 bg-[#1a1a1a]/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl"
          >
            <h1 className="text-4xl font-black text-white mb-2 tracking-wider">CARROM <span className="text-[#00bcd4]">3D</span></h1>
            <p className="text-white/60 mb-8">Select Game Mode</p>
            
            <div className="flex flex-col gap-4 w-64">
              <button 
                onClick={() => startGame('FREESTYLE')}
                className="py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all hover:scale-105 active:scale-95"
              >
                FREESTYLE
              </button>
              <button 
                onClick={() => startGame('VS_AI')}
                className="py-4 px-6 rounded-xl bg-[#00bcd4]/20 hover:bg-[#00bcd4]/30 border border-[#00bcd4]/50 text-[#00bcd4] font-bold transition-all hover:scale-105 active:scale-95"
              >
                VS AI
              </button>
              <button 
                onClick={() => startGame('MULTIPLAYER')}
                className="py-4 px-6 rounded-xl bg-[#E91E63]/20 hover:bg-[#E91E63]/30 border border-[#E91E63]/50 text-[#E91E63] font-bold transition-all hover:scale-105 active:scale-95 opacity-50 cursor-not-allowed"
                disabled
              >
                MULTIPLAYER (Coming Soon)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The 3D Game Canvas is always mounted but we could delay it */}
      {started && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="absolute inset-0"
        >
          <CarromGame3D />
        </motion.div>
      )}
    </div>
  );
}
