// src/components/ui/Card.tsx
// Glassmorphism card component

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'cyan' | 'gold' | 'none';
  onClick?: () => void;
  animated?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className, hover, glow = 'none', onClick, animated = false, style }: CardProps) {
  const glowClasses = {
    cyan: 'hover:shadow-cyan-glow hover:border-cyan-neon/50',
    gold: 'hover:shadow-gold-glow hover:border-gold-neon/50',
    none: '',
  };

  const Component = animated ? motion.div : 'div';

  return (
    <Component
      onClick={onClick}
      style={style}
      className={cn(
        'glass-card p-5',
        hover && 'cursor-pointer transition-all duration-300',
        hover && glowClasses[glow],
        onClick && 'cursor-pointer',
        className
      )}
      {...(animated ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      } : {})}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('font-display font-semibold text-lg text-text-primary', className)}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('', className)}>{children}</div>;
}
