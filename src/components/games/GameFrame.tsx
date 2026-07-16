// src/components/games/GameFrame.tsx
// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL GAME VISIBILITY PROTECTION FRAME
//
// RULES (non-negotiable):
// 1. Every game canvas is wrapped in a 16px navy letterbox — no game pixels
//    ever touch app chrome directly.
// 2. All floating controls sit on a rgba(22,33,62,0.62) scrim strip — never
//    directly on raw game pixels, regardless of game's color palette.
// 3. Control buttons are ALWAYS identical: 36px circle, navy fill, white icon,
//    2px stroke line icons — no game can override their appearance.
// 4. Games are visually isolated (overflow:hidden + isolation:isolate) so
//    flashing effects never bleed into nav/cards.
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
}: GameFrameProps) {
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handlePause = () => setPaused(p => !p);

  return (
    <div
      className={cn(
        'game-frame relative w-full',
        fullscreen && 'fixed inset-0 z-[999] rounded-none p-3',
        className
      )}
    >
      {/* ── Top Scrim Bar ── */}
      {showTopScrim && (
        <div className="game-scrim-bar game-scrim-bar-top">
          {/* Left: Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-xs font-semibold tracking-wide truncate"
              style={{ color: 'rgba(245,248,252,0.90)' }}
            >
              {title}
            </span>
          </div>

          {/* Center: Score / Level / Lives */}
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'rgba(245,248,252,0.75)' }}>
            {score !== undefined && (
              <span className="flex items-center gap-1">
                <Trophy size={11} style={{ color: '#66bdf2' }} />
                <span style={{ color: '#66bdf2', fontWeight: 700 }}>{score}</span>
              </span>
            )}
            {level !== undefined && (
              <span className="opacity-80">Lv {level}</span>
            )}
            {lives !== undefined && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
                  <span key={i} style={{ color: '#7b8bc1', fontSize: '10px' }}>♥</span>
                ))}
              </span>
            )}
          </div>

          {/* Right: Control Buttons — ALWAYS identical navy/white */}
          <div className="flex items-center gap-1.5 ml-2">
            {onToggleSound && (
              <button
                className="game-control-btn"
                onClick={onToggleSound}
                aria-label={soundEnabled ? 'Mute' : 'Unmute'}
                title={soundEnabled ? 'Mute' : 'Unmute'}
              >
                {soundEnabled
                  ? <Volume2 size={14} strokeWidth={2} />
                  : <VolumeX size={14} strokeWidth={2} />
                }
              </button>
            )}

            {onRestart && (
              <button
                className="game-control-btn"
                onClick={onRestart}
                aria-label="Restart"
                title="Restart"
              >
                <RotateCcw size={14} strokeWidth={2} />
              </button>
            )}

            <button
              className="game-control-btn"
              onClick={handlePause}
              aria-label={paused ? 'Resume' : 'Pause'}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused
                ? <Play size={14} strokeWidth={2} />
                : <Pause size={14} strokeWidth={2} />
              }
            </button>

            <button
              className="game-control-btn"
              onClick={() => setFullscreen(f => !f)}
              aria-label={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {fullscreen
                ? <Minimize2 size={14} strokeWidth={2} />
                : <Maximize2 size={14} strokeWidth={2} />
              }
            </button>

            <button
              className="game-control-btn"
              onClick={onClose}
              aria-label="Close Game"
              title="Close Game"
              style={{ background: 'rgba(247,108,108,0.25)', borderColor: 'rgba(247,108,108,0.35)' }}
            >
              <X size={14} strokeWidth={2} style={{ color: '#7b8bc1' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Game Canvas Area — visually isolated ── */}
      <div
        className={cn(
          'game-canvas-area',
          showTopScrim && 'mt-[44px]',
          showBottomScrim && 'mb-[44px]',
          canvasClassName
        )}
      >
        {children}

        {/* ── Pause Overlay ── */}
        <AnimatePresence>
          {paused && (
            <motion.div
              className="game-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: 'rgba(245,248,252,0.12)', border: '2px solid rgba(245,248,252,0.25)' }}
                >
                  <Pause size={28} style={{ color: '#FFFFFF' }} />
                </div>
                <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                  Game Paused
                </p>
                <button
                  className="game-control-btn"
                  onClick={handlePause}
                  style={{ width: 44, height: 44, margin: '0 auto' }}
                >
                  <Play size={18} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Optional Bottom Scrim ── */}
      {showBottomScrim && (
        <div className="game-scrim-bar game-scrim-bar-bottom">
          <div className="flex items-center justify-center w-full gap-2 text-xs" style={{ color: 'rgba(245,248,252,0.60)' }}>
            <MoreHorizontal size={14} />
          </div>
        </div>
      )}
    </div>
  );
}
