// src/pages/Profile.tsx
// User profile with stats, transaction history, and cashout modal

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Coins, Flame, TrendingUp,
  History, Share2, Shield, LogOut
} from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getTransactionHistory, getGameStats } from '@/lib/supabase';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { LevelBadge } from '@/components/ui/ProgressBar';
import { CashoutModal } from './CashoutModal';
import { getAvatarColor, getInitials, formatTokens, copyToClipboard, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Profile() {
  const { profile, isGuest, logout } = useAuthStore();
  const { openCashoutModal, cashoutModalOpen, closeCashoutModal } = useUIStore();

  const { data: transactions } = useQuery({
    queryKey: ['transactions', profile?.id],
    queryFn: () => profile ? getTransactionHistory(profile.id).then(r => r.data ?? []) : [],
    enabled: !!profile && !isGuest,
  });

  const { data: gameStats } = useQuery({
    queryKey: ['game-stats', profile?.id],
    queryFn: () => profile ? getGameStats(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
  });

  const handleCopyReferral = async () => {
    if (profile?.referral_code) {
      const url = `${window.location.origin}/auth?ref=${profile.referral_code}`;
      const success = await copyToClipboard(url);
      if (success) toast.success('Referral link copied! Share to earn bonus tokens.');
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Profile card ── */}
        <motion.div
          className="glass-card rounded-2xl p-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Avatar */}
          <div className="relative inline-flex mb-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-2xl text-navy-900"
              style={{
                backgroundColor: getAvatarColor(profile.id),
                boxShadow: `0 0 30px ${getAvatarColor(profile.id)}60`,
              }}
            >
              {getInitials(profile.username)}
            </div>
            {profile.streak > 6 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warn flex items-center justify-center">
                <Flame size={12} className="text-white" />
              </div>
            )}
          </div>

          <h1 className="font-display text-xl font-bold text-text-primary">{profile.username ?? 'Player'}</h1>
          <p className="text-sm text-muted mb-1">{profile.email}</p>
          {isGuest && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-warn/20 text-warn border border-warn/30">
              Guest Account
            </span>
          )}

          {/* Token & XP */}
          <div className="flex items-center justify-center gap-4 mt-4 mb-4">
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-neon-cyan">{formatTokens(profile.tokens)}</p>
              <p className="text-xs text-muted">Tokens Balance</p>
            </div>
            <div className="w-px h-10 bg-navy-700" />
            <div className="text-center">
              <p className="font-display font-bold text-2xl text-neon-gold">{formatTokens(profile.total_earned)}</p>
              <p className="text-xs text-muted">Total Earned</p>
            </div>
          </div>

          {!isGuest && <LevelBadge level={profile.level} xp={profile.xp} className="mb-4" />}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {profile.tokens >= 1000 && (
              <Button variant="gold" fullWidth onClick={openCashoutModal} id="profile-cashout-btn">
                <TrendingUp size={16} />
                Cash Out ${(profile.tokens / 1000).toFixed(2)} USD
              </Button>
            )}
            {profile.tokens < 1000 && (
              <div className="p-3 rounded-xl bg-navy-800 border border-navy-600">
                <p className="text-sm text-text-secondary">
                  Need {formatTokens(1000 - profile.tokens)} more tokens to cash out.
                </p>
              </div>
            )}
            {profile.referral_code && !isGuest && (
              <Button variant="neon" fullWidth onClick={handleCopyReferral}>
                <Share2 size={16} />
                Share Referral (+100 tokens per signup)
              </Button>
            )}
          </div>
        </motion.div>

        {/* ── Game stats ── */}
        {gameStats && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Game Statistics</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: 'Total Spins',  value: (gameStats as any).spins_total,   icon: '🎡' },
                { label: 'Games Played', value: (gameStats as any).games_played,  icon: '🎮' },
                { label: 'Games Won',    value: (gameStats as any).games_won,     icon: '🏆' },
                { label: 'Win Rate',
                  value: (gameStats as any).games_played > 0
                    ? `${Math.round(((gameStats as any).games_won / (gameStats as any).games_played) * 100)}%`
                    : 'N/A',
                  icon: '📊' },
                { label: 'Best Clicker', value: (gameStats as any).clicker_best, icon: '👆' },
                { label: 'Best Quiz',    value: (gameStats as any).quiz_best,    icon: '🧠' },
              ] as { label: string; value: unknown; icon: string }[]).map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 p-3 rounded-xl bg-navy-800">
                  <span className="text-lg">{stat.icon}</span>
                  <div>
                    <p className="text-2xs text-muted">{stat.label}</p>
                    <p className="font-semibold text-sm text-text-primary">{String(stat.value ?? 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Streak info ── */}
        <Card className="rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-warn/15 flex items-center justify-center">
              <Flame size={24} className="text-warn" />
            </div>
            <div>
              <p className="font-semibold text-text-primary">{profile.streak} Day Streak</p>
              <p className="text-sm text-muted">Log in daily to keep your streak alive!</p>
            </div>
          </div>
        </Card>

        {/* ── Transaction history ── */}
        {!isGuest && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <History size={18} className="text-text-secondary" />
                  Cashout History
                </div>
              </CardTitle>
            </CardHeader>

            {!transactions || transactions.length === 0 ? (
              <div className="text-center py-6">
                <Coins size={32} className="text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">No cashouts yet.</p>
                <p className="text-xs text-muted">Reach 1000 tokens to cash out.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-navy-800">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm text-text-primary">
                          {(tx as any).method === 'upi' ? '💳 UPI' : '💰 PayPal'}
                        </p>
                        <StatusBadge status={(tx as any).status} />
                      </div>
                      <p className="text-2xs text-muted">{formatRelativeTime((tx as any).created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-gold-neon">${(tx as any).amount_usd}</p>
                      <p className="text-2xs text-muted">{formatTokens((tx as any).amount_tokens)} tokens</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── Account actions ── */}
        <Card className="rounded-2xl space-y-2">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-navy-700 transition-colors text-left">
            <Shield size={16} className="text-muted" />
            <span className="text-sm text-text-secondary">Privacy & Data Export</span>
          </button>
          <button
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-danger/10 transition-colors text-left"
            onClick={logout}
          >
            <LogOut size={16} className="text-danger" />
            <span className="text-sm text-danger">Sign Out</span>
          </button>
        </Card>
      </div>

      {/* Cashout modal */}
      <CashoutModal isOpen={cashoutModalOpen} onClose={closeCashoutModal} />
    </div>
  );
}
