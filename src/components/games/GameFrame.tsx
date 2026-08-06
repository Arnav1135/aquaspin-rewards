// src/components/games/GameFrame.tsx
// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL GAME VISIBILITY PROTECTION FRAME - RESPONSIVE 2D CONTAINER
// ═══════════════════════════════════════════════════════════════════════════

import { type ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Pause, Play, Volume2, VolumeX, RotateCcw,
  Maximize2, Minimize2, Trophy, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameFrameProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  score?: number | string;
  lives?: number;
  level?: number | string;
  onRestart?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  showTopScrim?: boolean;
  showBottomScrim?: boolean;
  className?: string;
  canvasClassName?: string;
  isWarping?: boolean;
}

export function GameFrame({
  children,
  title,
  onClose,
  score,
  lives,
  level,
  onRestart,
  soundEnabled = true,
  onToggleSound,
  showTopScrim = true,
  showBottomScrim = false,
  className,
  canvasClassName,
  isWarping = false,
}: GameFrameProps) {
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handlePause = () => setPaused(p => !p);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={cn(
        'w-full h-full flex flex-col relative overflow-hidden bg-[#0D1B36] sm:rounded-3xl shadow-2xl shadow-[#7682B9]/20 sm:border border-[#C7E9F7] max-w-[1400px] mx-auto',
        fullscreen ? 'fixed inset-0 h-[100dvh] z-[9999] rounded-none border-none max-w-none' : '',
        isWarping && 'level-warp-active warp-lines',
        className
      )}
    >
      {/* ── Top Scrim Bar ── */}
      {showTopScrim && (
        <div className="z-50 absolute top-0 left-0 right-0 h-[50px] flex items-center justify-between px-4 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-extrabold tracking-wide truncate text-white drop-shadow-md">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-white/80">
            {score !== undefined && (
              <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                <Trophy size={14} className="text-[#5AB8EA]" />
                <span className="text-white drop-shadow-sm">{score}</span>
              </span>
            )}
            {level !== undefined && (
              <span className="bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm text-[#C7E9F7]">Lv {level}</span>
            )}
            {lives !== undefined && (
              <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-md backdrop-blur-sm">
                {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
                  <span key={i} className="text-[#5AB8EA] text-xs">♥</span>
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            {onToggleSound && (
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#5AB8EA] flex items-center justify-center text-white transition-colors" onClick={onToggleSound}>
                {soundEnabled ? <Volume2 size={16} strokeWidth={2.5} /> : <VolumeX size={16} strokeWidth={2.5} />}
              </button>
            )}
            {onRestart && (
              <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#5AB8EA] flex items-center justify-center text-white transition-colors" onClick={onRestart}>
                <RotateCcw size={16} strokeWidth={2.5} />
              </button>
            )}
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#5AB8EA] flex items-center justify-center text-white transition-colors" onClick={handlePause}>
              {paused ? <Play size={16} strokeWidth={2.5} /> : <Pause size={16} strokeWidth={2.5} />}
            </button>
            <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#5AB8EA] flex items-center justify-center text-white transition-colors" onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 size={16} strokeWidth={2.5} /> : <Maximize2 size={16} strokeWidth={2.5} />}
            </button>
            <button className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 flex items-center justify-center text-white transition-colors ml-1" onClick={onClose}>
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Game Canvas Area ── */}
      <div
        className={cn(
          'flex-1 relative w-full h-full',
          showTopScrim && 'pt-[50px]',
          showBottomScrim && 'pb-[44px]',
          canvasClassName
        )}
      >
        {children}

        {/* ── Pause Overlay ── */}
        <AnimatePresence>
          {paused && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }} 
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="text-center space-y-4 bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-[#5AB8EA] to-[#7682B9] shadow-lg shadow-[#5AB8EA]/30">
                  <Pause size={36} className="text-white" />
                </div>
                <p className="text-white font-extrabold text-2xl tracking-tight">Game Paused</p>
                <button 
                  className="mx-auto flex items-center justify-center gap-2 bg-white text-[#7682B9] px-6 py-3 rounded-xl font-bold hover:bg-[#E5F2F9] transition-colors active:scale-95" 
                  onClick={handlePause}
                >
                  <Play size={18} strokeWidth={2.5} /> Resume
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* ── Optional Bottom Scrim ── */}
      {showBottomScrim && (
        <div className="absolute bottom-0 left-0 right-0 z-50 h-[44px] flex items-center justify-center bg-white/5 backdrop-blur-md border-t border-white/10">
          <div className="flex items-center justify-center w-full gap-2 text-white/50">
            <MoreHorizontal size={16} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
