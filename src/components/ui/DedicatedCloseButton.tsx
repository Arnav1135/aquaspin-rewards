import React, { useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface DedicatedCloseButtonProps {
  onClose: () => void;
  label?: string;
  variant?: 'floating' | 'header' | 'minimal';
  className?: string;
  position?: 'top-right' | 'top-left';
}

/**
 * Universal, high-contrast dedicated close button designed specifically for mini-games and the spin wheel.
 * Uses z-index 999999 to guarantee it never gets hidden behind 3D WebGL canvases, headers, or modal overlays.
 */
export const DedicatedCloseButton: React.FC<DedicatedCloseButtonProps> = ({
  onClose,
  label = 'Exit Game',
  variant = 'floating',
  className = '',
  position = 'top-right',
}) => {
  const isTopLeft = position === 'top-left';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close Game"
        className={`inline-flex items-center justify-center p-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white shadow-lg border border-red-400/40 backdrop-blur-md transition-all active:scale-95 cursor-pointer ${className}`}
        style={{ zIndex: 999999 }}
      >
        <X size={20} strokeWidth={2.5} />
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={onClose}
        aria-label="Exit Game"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg border border-red-400/30 backdrop-blur-md transition-all active:scale-95 cursor-pointer ${className}`}
        style={{ zIndex: 999999 }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed ${isTopLeft ? 'left-3 sm:left-6' : 'right-3 sm:right-6'} top-3 sm:top-5 flex items-center gap-2 pointer-events-auto select-none`}
      style={{
        zIndex: 999999,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingRight: isTopLeft ? undefined : 'env(safe-area-inset-right, 0px)',
        paddingLeft: isTopLeft ? 'env(safe-area-inset-left, 0px)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close Game"
        className={`group relative flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(225,29,72,0.45)] border border-red-400/40 backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${className}`}
      >
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
          <X size={14} strokeWidth={3} className="text-white" />
        </div>
        <span className="drop-shadow-sm font-black">{label}</span>
      </button>
    </div>
  );
};
