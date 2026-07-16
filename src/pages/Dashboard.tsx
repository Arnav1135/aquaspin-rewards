// src/pages/Dashboard.tsx
// Fintech-grade gaming dashboard — navy/sky/teal palette, reference layout

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Disc3, Zap, Trophy, Flame, Gamepad2, TrendingUp,
  Gift, Coins, Calendar, ArrowUpRight,
  ArrowDownRight, Wallet, MoreHorizontal
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory, getDailyRewardStatus, claimDailyReward } from '@/lib/supabase';
import { LevelBadge } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { BannerAd } from '@/components/ads/BannerAd';
import { DAILY_REWARD_SCHEDULE, formatRelativeTime } from '@/types/database';
import { formatTokens } from '@/lib/utils';
import toast from 'react-hot-toast';

const CARD_ANIM = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

export function Dashboard() {
  const { profile, isGuest, refreshProfile } = useAuthStore();
  const { openCashoutModal } = useUIStore();
  const [claimingReward, setClaimingReward] = useState(false);

  const cashoutProgress = profile ? Math.min((profile.tokens / 1000) * 100, 100) : 0;
  const dayInCycle = ((profile?.streak ?? 0) % 7) || 7;

  const { data: spinHistoryData } = useQuery({
    queryKey: ['spin-history', profile?.id],
    queryFn: () => profile ? getSpinHistory(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 30_000,
  });

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

  return (
    <div
      className="min-h-screen pt-20 pb-28 px-4"
      style={{ background: 'linear-gradient(160deg, #F4F8FC 0%, #E4EEF9 100%)' }}
    >
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Welcome + Wallet Card (Primary Navy) ── */}
        <motion.div
          className="card-navy on-navy p-6 rounded-3xl"
          {...CARD_ANIM}
          transition={{ delay: 0 }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'rgba(245,248,252,0.55)' }}>
                {isGuest ? 'Guest Wallet' : 'My Wallet'}
              </p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#F5F8FC' }}>
                {isGuest ? 'Welcome! 👋' : `Hey, ${profile?.username?.split(' ')[0] ?? 'Player'}! 👋`}
              </h1>
            </div>
            {profile?.streak && profile.streak > 0 ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(247,108,108,0.20)', border: '1px solid rgba(247,108,108,0.30)' }}
              >
                <Flame size={14} style={{ color: '#F76C6C' }} />
                <span className="font-bold text-sm" style={{ color: '#F76C6C' }}>
                  {profile.streak}d
                </span>
              </div>
            ) : null}
          </div>

          {/* Balance + Cashout */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs mb-1" style={{ color: 'rgba(245,248,252,0.45)' }}>Token Balance</p>
              <div className="flex items-center gap-2">
                <Coins size={20} style={{ color: '#3DDC97' }} />
                <span className="text-3xl font-bold font-mono" style={{ color: '#F5F8FC' }}>
                  {formatTokens(profile?.tokens ?? 0)}
                </span>
              </div>
            </div>
            {profile && profile.tokens >= 1000 && (
              <Button
                variant="success"
                size="sm"
                onClick={openCashoutModal}
                id="cashout-btn"
              >
                <TrendingUp size={14} /> Cash Out
              </Button>
            )}
          </div>

          {/* Cashout progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-2xs" style={{ color: 'rgba(245,248,252,0.45)' }}>
              <span>{formatTokens(profile?.tokens ?? 0)} / 1,000 for cashout</span>
              <span>{Math.round(cashoutProgress)}%</span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(245,248,252,0.12)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: cashoutProgress >= 100
                    ? 'linear-gradient(90deg, #3DDC97, #2bc47e)'
                    : 'linear-gradient(90deg, #4A90D9, #3DDC97)',
                  boxShadow: '0 0 8px rgba(61,220,151,0.35)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${cashoutProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Level badge */}
          {profile && !isGuest && (
            <div className="mt-4">
              <LevelBadge level={profile.level} xp={profile.xp} />
            </div>
          )}
        </motion.div>

        {/* ── Win / Loss Stats (Income / Expense style) ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Total Won',
              value: formatTokens(profile?.total_earned ?? 0),
              icon: ArrowUpRight,
              color: '#3DDC97',
              bg: 'rgba(61,220,151,0.10)',
              border: 'rgba(61,220,151,0.22)',
            },
            {
              label: 'USD Value',
              value: `$${((profile?.tokens ?? 0) / 1000).toFixed(2)}`,
              icon: ArrowDownRight,
              color: '#F76C6C',
              bg: 'rgba(247,108,108,0.10)',
              border: 'rgba(247,108,108,0.22)',
            },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="p-4 rounded-2xl"
                style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
                {...CARD_ANIM}
                transition={{ delay: 0.08 * (i + 1) }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
                >
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <p className="text-2xs font-medium mb-0.5" style={{ color: 'rgba(22,33,62,0.55)' }}>
                  {stat.label}
                </p>
                <p className="font-bold text-lg font-mono" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Streak',  value: `${profile?.streak ?? 0} days`, icon: Flame, color: '#F76C6C' },
            { label: 'Level',   value: `Lv ${profile?.level ?? 1}`,    icon: Zap,   color: '#4A90D9' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="card-white p-4 flex items-center gap-3"
                {...CARD_ANIM}
                transition={{ delay: 0.12 * (i + 1) }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}15` }}
                >
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xs font-medium" style={{ color: 'rgba(22,33,62,0.50)' }}>{stat.label}</p>
                  <p className="font-bold text-sm" style={{ color: '#16213E' }}>{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Quick Actions Row (circular icon-btn style) ── */}
        <motion.div
          className="card-white p-5"
          {...CARD_ANIM}
          transition={{ delay: 0.15 }}
        >
          <div className="section-header">
            <h3 className="section-title">Quick Actions</h3>
            <MoreHorizontal size={16} style={{ color: 'rgba(22,33,62,0.35)' }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { to: '/wheel', icon: Disc3,    label: 'Spin' },
              { to: '/games', icon: Gamepad2, label: 'Games' },
              { to: '/profile', icon: Trophy, label: 'Ranks' },
              { to: '/shop',  icon: Wallet,   label: 'Shop' },
            ].map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="flex flex-col items-center gap-2">
                <div className="icon-btn" style={{ background: '#16213E' }}>
                  <Icon size={20} strokeWidth={2} style={{ color: '#F5F8FC' }} />
                </div>
                <span className="text-2xs font-semibold" style={{ color: '#16213E' }}>{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Featured Game Banner (large navy card) ── */}
        <motion.div
          className="card-navy on-navy relative overflow-hidden"
          style={{ borderRadius: 28, padding: '1.5rem' }}
          {...CARD_ANIM}
          transition={{ delay: 0.18 }}
        >
          {/* Decorative glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(74,144,217,0.25)', transform: 'translate(30%, -30%)' }}
          />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#3DDC97' }}
                />
                <span className="text-2xs font-semibold" style={{ color: '#3DDC97' }}>LIVE</span>
              </div>
              <h2 className="text-lg font-bold" style={{ color: '#F5F8FC' }}>Mini Games Hub</h2>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(245,248,252,0.55)' }}>
                16 premium games available
              </p>
            </div>
            <Gamepad2 size={32} style={{ color: 'rgba(74,144,217,0.6)' }} />
          </div>
          <Link to="/games">
            <Button variant="sky" size="sm" className="font-semibold">
              Play Now <ArrowUpRight size={14} />
            </Button>
          </Link>
        </motion.div>

        {/* ── Daily Streak Calendar ── */}
        {!isGuest && (
          <motion.div
            className="card-white p-5"
            {...CARD_ANIM}
            transition={{ delay: 0.20 }}
          >
            <div className="section-header">
              <div className="flex items-center gap-2">
                <Calendar size={16} style={{ color: '#4A90D9' }} />
                <h3 className="section-title">Daily Streak</h3>
              </div>
              <span
                className="badge-chip badge-sky"
              >
                {profile?.streak ?? 0}d streak
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {DAILY_REWARD_SCHEDULE.map((day) => {
                const isCurrent = day.day === dayInCycle;
                const isPast = (profile?.streak ?? 0) >= day.day;
                return (
                  <div
                    key={day.day}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-center"
                    style={{
                      background: isCurrent
                        ? 'rgba(74,144,217,0.12)'
                        : isPast
                        ? 'rgba(61,220,151,0.08)'
                        : 'rgba(22,33,62,0.04)',
                      border: `1px solid ${isCurrent ? 'rgba(74,144,217,0.30)' : isPast ? 'rgba(61,220,151,0.20)' : 'rgba(22,33,62,0.08)'}`,
                    }}
                  >
                    <span className="text-2xs font-semibold" style={{ color: 'rgba(22,33,62,0.45)' }}>
                      D{day.day}
                    </span>
                    <Coins
                      size={12}
                      style={{ color: isCurrent ? '#4A90D9' : isPast ? '#3DDC97' : 'rgba(22,33,62,0.25)' }}
                    />
                    <span
                      className="text-2xs font-bold"
                      style={{ color: isCurrent ? '#4A90D9' : isPast ? '#3DDC97' : 'rgba(22,33,62,0.30)' }}
                    >
                      {day.tokens}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              variant={hasClaimedDailyReward ? 'ghost' : 'primary'}
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
          </motion.div>
        )}

        {/* ── Recent Activity (Transactions panel style) ── */}
        {spinHistoryData && spinHistoryData.length > 0 && (
          <motion.div
            className="card-white p-5"
            {...CARD_ANIM}
            transition={{ delay: 0.22 }}
          >
            <div className="section-header">
              <h3 className="section-title">Recent Spins</h3>
              <MoreHorizontal size={16} style={{ color: 'rgba(22,33,62,0.35)' }} />
            </div>
            <div>
              {(spinHistoryData as any[]).slice(0, 5).map((spin: any) => (
                <div key={spin.id} className="history-row">
                  <div
                    className="history-icon"
                    style={{ background: 'rgba(74,144,217,0.12)', border: '1px solid rgba(74,144,217,0.20)' }}
                  >
                    <Disc3 size={18} style={{ color: '#4A90D9' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#16213E' }}>
                      {spin.segment}
                    </p>
                    <p className="text-2xs" style={{ color: 'rgba(22,33,62,0.45)' }}>
                      {formatRelativeTime(spin.created_at)}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: '#3DDC97' }}>
                    +{spin.reward}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Guest Upgrade Prompt ── */}
        {isGuest && (
          <motion.div
            className="card-sky p-5"
            {...CARD_ANIM}
            transition={{ delay: 0.24 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🎮</span>
              <div>
                <h3 className="font-bold mb-1" style={{ color: '#16213E' }}>
                  Save Your Progress
                </h3>
                <p className="text-sm mb-3" style={{ color: 'rgba(22,33,62,0.65)' }}>
                  Create a free account to join leaderboards and cash out your earnings.
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

        <BannerAd />
      </div>
    </div>
  );
}
