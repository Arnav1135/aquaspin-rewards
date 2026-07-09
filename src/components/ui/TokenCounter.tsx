// src/components/ui/TokenCounter.tsx
// Animated token counter with neon glow

import { useEffect, useRef, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { Coins } from 'lucide-react';
import { cn, formatTokens } from '@/lib/utils';

interface TokenCounterProps {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  animate?: boolean;
}

export function TokenCounter({ value, className, size = 'md', showIcon = true, animate: shouldAnimate = true }: TokenCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (!shouldAnimate || value === prevValueRef.current) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const diff = value - prevValueRef.current;
    if (diff !== 0) setIsPulsing(true);

    const controls = animate(prevValueRef.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(Math.round(v)),
    });

    prevValueRef.current = value;

    const pulseTimer = setTimeout(() => setIsPulsing(false), 600);
    return () => {
      controls.stop();
      clearTimeout(pulseTimer);
    };
  }, [value, shouldAnimate]);

  const sizeClasses = {
    sm: 'text-lg gap-1.5',
    md: 'text-2xl gap-2',
    lg: 'text-4xl gap-3',
    xl: 'text-6xl gap-4',
  };

  const iconSizes = { sm: 16, md: 20, lg: 28, xl: 40 };

  return (
    <motion.div
      className={cn(
        'flex items-center font-display font-bold',
        sizeClasses[size],
        isPulsing && 'animate-token-pop',
        className
      )}
      animate={isPulsing ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      {showIcon && (
        <motion.div
          animate={isPulsing ? { rotate: [0, 20, -20, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Coins
            size={iconSizes[size]}
            className="text-cyan-neon drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
          />
        </motion.div>
      )}
      <span className="text-neon-cyan tabular-nums">
        {formatTokens(displayValue)}
      </span>
    </motion.div>
  );
}

// ── Floating token popup (shows +X when earning tokens) ─────────────────────
interface FloatingRewardProps {
  amount: number;
  x?: number;
  y?: number;
  onComplete?: () => void;
}

export function FloatingReward({ amount, x = 50, y = 50, onComplete }: FloatingRewardProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[100] font-display font-bold text-xl text-neon-cyan"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -80, scale: 1.2 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      +{formatTokens(amount)} 🪙
    </motion.div>
  );
}
