// src/components/ui/Button.tsx
// Fintech-grade button system — fixed navy/white color system across all contexts

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'sky' | 'neon' | 'gold' | 'ghost' | 'ghost-dark' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:      'btn-primary',
  sky:          'btn-sky',
  neon:         'btn-primary',   // legacy alias → navy primary
  gold:         'btn-success',   // legacy alias → success/teal
  ghost:        'btn-ghost',
  'ghost-dark': 'btn-ghost-dark',
  danger:       'btn-danger',
  success:      'btn-success',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
  xl: 'px-9 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, icon, iconRight, fullWidth, className, children, disabled, ...props },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          variantClasses[variant],
          size !== 'md' && sizeClasses[size],
          fullWidth && 'w-full',
          (disabled || loading) && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        disabled={disabled || loading}
        whileTap={{ scale: 0.97 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading ? (
          /* Loading: soft blue pulse animation — NEVER game-specific colors */
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: 'currentColor' }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
