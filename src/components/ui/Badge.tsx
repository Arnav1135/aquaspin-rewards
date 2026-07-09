// src/components/ui/Badge.tsx
// Status and rank badge components

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant = 'cyan' | 'gold' | 'success' | 'danger' | 'warn' | 'muted' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  cyan: 'bg-cyan-neon/15 text-cyan-neon border-cyan-neon/30',
  gold: 'bg-gold-neon/15 text-gold-neon border-gold-neon/30',
  success: 'bg-success/15 text-success border-success/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  muted: 'bg-navy-700 text-text-secondary border-navy-600',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const sizeClasses = {
  sm: 'text-2xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({ children, variant = 'cyan', className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium leading-none',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Status badge for transaction status ──────────────────────────────────────
type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'processing';

const statusConfig: Record<TransactionStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warn' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  processing: { label: 'Processing', variant: 'cyan' },
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ── Rank badge for leaderboard ───────────────────────────────────────────────
export function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl" title="1st Place">🥇</span>;
  if (rank === 2) return <span className="text-xl" title="2nd Place">🥈</span>;
  if (rank === 3) return <span className="text-xl" title="3rd Place">🥉</span>;
  return (
    <span className="font-mono text-sm font-semibold text-text-secondary w-6 text-center">
      #{rank}
    </span>
  );
}
