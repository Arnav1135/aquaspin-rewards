// src/pages/Dashboard.tsx
// Main user dashboard with stats, streak, quick spin, and daily reward

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Disc3, Zap, Trophy, Flame, Gamepad2, TrendingUp,
  Gift, ChevronRight, Coins, Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory, getDailyRewardStatus, claimDailyReward } from '@/lib/supabase';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { ProgressBar, LevelBadge } from '@/components/ui/ProgressBar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BannerAd } from '@/components/ads/BannerAd';
import { DAILY_REWARD_SCHEDULE, formatRelativeTime } from '@/types/database';
import { formatTokens } from '@/lib/utils';
import toast from 'react-hot-toast';

export function Dashboard() {
  const { profile, isGuest, refreshProfile } = useAuthStore();
  const { openCashoutModal } = useUIStore();
  const [claimingReward, setClaimingReward] = useState(false);

  const cashoutProgress = profile ? Math.min((profile.tokens / 1000) * 100, 100) : 0;
  const dayInCycle = ((profile?.streak ?? 0) % 7) || 7;

  // Fetch spin history
  const { data: spinHistoryData } = useQuery({
    queryKey: ['spin-history', profile?.id],
    queryFn: () => profile ? getSpinHistory(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 30_000,
  });

  // Fetch daily reward status
  const { data: dailyRewardData, refetch: refetchDailyReward } = useQuery({
    queryKey: ['daily-reward', profile?.id],
    queryFn: () => profile ? getDailyRewardStatus(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 60_000,
  });

  const hasClaimedDailyReward = dailyRewardData && dailyRewardData.length > 0;
  const todayReward = DAILY_REWARD_SCHEDULE.find(d => d.day === dayInCycle);

  const handleClaimDailyReward = async () => {
    if (!profile || hasClaimedDailyReward || claimingReward) return;
    setClaimingReward(true);

    const tokensToAward = todayReward?.tokens ?? 50;
    const { error } = await claimDailyReward(profile.id, profile.streak, tokensToAward);

    if (error) {
      toast.error('Failed to claim reward. Please try again.');
    } else {
      toast.success(`Daily reward claimed! +${tokensToAward} tokens! 🎉`);
      await refreshProfile();
      await refetchDailyReward();
    }
    setClaimingReward(false);
  };

  const statsCards = [
    { label: 'Streak', value: `${profile?.streak ?? 0} days`, icon: Flame, color: '#FF9900' },
    { label: 'Level', value: `#${profile?.level ?? 1}`, icon: Zap, color: '#00F0FF' },
    { label: 'Total Earned', value: formatTokens(profile?.total_earned ?? 0), icon: Trophy, color: '#FFD700' },
    { label: 'USD Value', value: `$${((profile?.tokens ?? 0) / 1000).toFixed(2)}`, icon: TrendingUp, color: '#00FF87' },
  ];

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Welcome banner ── */}
        <motion.div
          className="glass-card rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-xl font-bold text-text-primary">
                {isGuest ? 'Welcome, Guest!' : `Hey, ${profile?.username ?? 'Player'}! 👋`}
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                {isGuest ? '200 guest tokens loaded. Sign up to save progress!' : 'Ready to spin today?'}
              </p>
            </div>
            {profile?.streak && profile.streak > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-warn/15 border border-warn/30">
                <Flame size={16} className="text-warn" />
                <span className="font-bold text-sm text-warn">{profile.streak}</span>
              </div>
            )}
          </div>

          {/* Token balance */}
          <div className="flex items-center justify-between mb-3">
            <TokenCounter value={profile?.tokens ?? 0} size="lg" />
            {profile && profile.tokens >= 1000 && (
              <Button variant="gold" size="sm" onClick={openCashoutModal} id="cashout-btn">
                <TrendingUp size={14} /> Cash Out
              </Button>
            )}
          </div>

          {/* Cashout progress */}
          <ProgressBar
            value={cashoutProgress}
            label={`${formatTokens(profile?.tokens ?? 0)} / 1,000 tokens for cashout`}
            showPercent
            color={cashoutProgress >= 100 ? 'green' : 'cyan'}
          />

          {profile && !isGuest && (
            <div className="mt-3">
              <LevelBadge level={profile.level} xp={profile.xp} />
            </div>
          )}
        </motion.div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {statsCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xs text-muted">{stat.label}</p>
                    <p className="font-display font-bold text-sm text-text-primary">{stat.value}</p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Daily reward streak calendar ── */}
        {!isGuest && (
          <Card animated className="rounded-2xl">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gold-neon" />
                  Daily Streak Rewards
                </div>
              </CardTitle>
              <Badge variant="gold">{profile?.streak ?? 0} day streak</Badge>
            </CardHeader>

            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {DAILY_REWARD_SCHEDULE.map((day) => {
                const isCurrent = day.day === dayInCycle;
                const isPast = (profile?.streak ?? 0) >= day.day;
                return (
                  <div
                    key={day.day}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center ${
                      isCurrent
                        ? 'border-gold-neon/50 bg-gold-neon/10'
                        : isPast
                        ? 'border-success/30 bg-success/5'
                        : 'border-navy-600 bg-navy-800'
                    }`}
                  >
                    <span className="text-2xs font-semibold text-muted">D{day.day}</span>
                    <Coins
                      size={12}
                      className={isCurrent ? 'text-gold-neon' : isPast ? 'text-success' : 'text-muted'}
                    />
                    <span className={`text-2xs font-bold ${isCurrent ? 'text-gold-neon' : isPast ? 'text-success' : 'text-muted'}`}>
                      {day.tokens}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              variant={hasClaimedDailyReward ? 'ghost' : 'gold'}
              fullWidth
              disabled={!!hasClaimedDailyReward}
              loading={claimingReward}
              onClick={handleClaimDailyReward}
              id="daily-reward-btn"
            >
              {hasClaimedDailyReward ? (
                '✓ Today\'s reward claimed!'
              ) : (
                <>
                  <Gift size={16} />
                  Claim Day {dayInCycle} Reward (+{todayReward?.tokens ?? 50} tokens)
                </>
              )}
            </Button>
          </Card>
        )}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 gap-3">
          <Link to="/wheel">
            <Card hover glow="cyan" className="flex items-center justify-between p-4 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-neon/15 flex items-center justify-center">
                  <Disc3 size={24} className="text-cyan-neon" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Spin the Wheel</h3>
                  <p className="text-sm text-text-secondary">Win 10–500 tokens per spin</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="cyan">SPIN NOW</Badge>
                <ChevronRight size={18} className="text-muted" />
              </div>
            </Card>
          </Link>

          <Link to="/games">
            <Card hover glow="gold" className="flex items-center justify-between p-4 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-neon/15 flex items-center justify-center">
                  <Gamepad2 size={24} className="text-gold-neon" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Mini Games</h3>
                  <p className="text-sm text-text-secondary">4 games • 15–200 tokens each</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Card>
          </Link>
        </div>

        {/* ── Recent spins ── */}
        {spinHistoryData && spinHistoryData.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Recent Spins</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {(spinHistoryData as any[]).slice(0, 5).map((spin: any) => (
                <div key={spin.id} className="flex items-center justify-between py-2 border-b border-navy-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <Disc3 size={14} className="text-cyan-neon" />
                    <span className="text-sm text-text-secondary">{spin.segment}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-sm text-cyan-neon">+{spin.reward}</span>
                    <span className="text-2xs text-muted">{formatRelativeTime(spin.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Guest upgrade prompt ── */}
        {isGuest && (
          <motion.div
            className="glass-card rounded-2xl p-5 border border-warn/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">Guest Mode — Limited Access</h3>
                <p className="text-sm text-text-secondary mb-3">
                  Create a free account to save progress, join leaderboards, and cash out your earnings.
                </p>
                <Link to="/auth">
                  <Button variant="primary" size="sm" id="upgrade-account-btn">
                    Sign Up Free — Get 500 Bonus Tokens
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Bottom banner ad ── */}
        <BannerAd />
      </div>
    </div>
  );
}
