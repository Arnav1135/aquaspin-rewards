// src/components/ui/Card.tsx
// Fintech-grade card component with navy/sky/white variants

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type CardVariant = 'navy' | 'sky' | 'white' | 'glass' | 'stat-win' | 'stat-loss';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  hover?: boolean;
  glow?: 'sky' | 'teal' | 'coral' | 'none' | 'cyan' | 'gold'; // cyan/gold = legacy aliases
  onClick?: () => void;
  animated?: boolean;
  style?: React.CSSProperties;
}

const variantBase: Record<CardVariant, string> = {
  navy:      'card-navy on-navy',
  sky:       'card-sky',
  white:     'card-white',
  glass:     'glass-card',
  'stat-win':  'stat-card-win p-4',
  'stat-loss': 'stat-card-loss p-4',
};

const glowMap: Record<string, string> = {
  sky:   'hover:shadow-sky-glow hover:border-sky-500/50',
  teal:  'hover:shadow-teal-glow hover:border-success-teal/50',
  coral: 'hover:border-coral-loss/50',
  none:  '',
  // legacy
  cyan:  'hover:shadow-sky-glow hover:border-sky-500/50',
  gold:  'hover:shadow-teal-glow hover:border-success-teal/50',
};

export function Card({
  children,
  className,
  variant = 'white',
  hover,
  glow = 'none',
  onClick,
  animated = false,
  style,
}: CardProps) {
  const Component = animated ? motion.div : 'div';

  return (
    <Component
      onClick={onClick}
      style={style}
      className={cn(
        'p-5',
        variantBase[variant],
        hover && 'cursor-pointer transition-all duration-300',
        hover && glowMap[glow],
        onClick && 'cursor-pointer',
        className
      )}
      {...(animated
        ? { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }
        : {})}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('section-header mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('section-title', className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}
