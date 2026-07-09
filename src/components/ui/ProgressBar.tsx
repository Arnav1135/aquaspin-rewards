// src/components/ui/ProgressBar.tsx
// Level/XP progress bar with neon glow animation

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;       // 0 to 100
  className?: string;
  label?: string;
  showPercent?: boolean;
  color?: 'cyan' | 'gold' | 'green';
  height?: number;
  animated?: boolean;
}

const colorClasses = {
  cyan: 'bg-gradient-to-r from-cyan-neon to-cyan-glow shadow-[0_0_10px_rgba(0,240,255,0.5)]',
  gold: 'bg-gradient-to-r from-gold-neon to-gold-warm shadow-[0_0_10px_rgba(255,215,0,0.5)]',
  green: 'bg-gradient-to-r from-success to-emerald-400 shadow-[0_0_10px_rgba(0,255,135,0.5)]',
};

export function ProgressBar({
  value,
  className,
  label,
  showPercent,
  color = 'cyan',
  height = 8,
  animated = true,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-text-secondary font-medium">{label}</span>}
          {showPercent && <span className="text-xs text-text-secondary font-mono">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden bg-navy-700"
        style={{ height }}
      >
        <motion.div
          className={cn('h-full rounded-full', colorClasses[color])}
          initial={animated ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ── Level badge with progress ─────────────────────────────────────────────────
interface LevelBadgeProps {
  level: number;
  xp: number;
  className?: string;
}

export function LevelBadge({ level, xp, className }: LevelBadgeProps) {
  const xpForCurrentLevel = (level - 1) * 500;
  const xpForNextLevel = level * 500;
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-navy-700 border border-cyan-neon/30 flex items-center justify-center">
        <span className="font-display font-bold text-sm text-cyan-neon">{level}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-secondary">Level {level}</span>
          <span className="text-xs text-text-secondary font-mono">{xp} / {xpForNextLevel} XP</span>
        </div>
        <ProgressBar value={progress} height={4} />
      </div>
    </div>
  );
}
