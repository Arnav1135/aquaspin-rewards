// src/pages/Dashboard.tsx
// Cyber Command Center HUD, Volumetric Streak Reactor & Prismatic Token Vault

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Disc3, Zap, Trophy, Flame, Gamepad2, TrendingUp,
  Gift, ChevronRight, Coins, Calendar, Target,
  Sparkles, CheckCircle2, Shield, Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory, getDailyRewardStatus, claimDailyReward } from '@/lib/supabase';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { LevelBadge } from '@/components/ui/ProgressBar';
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
      // Trigger festive golden particle burst
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#FFD700', '#00F0FF', '#00FF87', '#FFFFFF'],
        ticks: 200,
      });

      toast.success(`Daily reward claimed! +${tokensToAward} tokens! 🎉`);
      await refreshProfile();
      await refetchDailyReward();
    }
    setClaimingReward(false);
  };

  const statsCards = [
    {
      label: 'Streak Surge',
      value: `${profile?.streak ?? 0} Days`,
      icon: Flame,
      color: '#FF9900',
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-orange-500/30'
    },
    {
      label: 'Player Rank',
      value: `Level #${profile?.level ?? 1}`,
      icon: Zap,
      color: '#00F0FF',
      gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-cyan-500/30'
    },
    {
      label: 'Total Earned',
      value: formatTokens(profile?.total_earned ?? 0),
      icon: Trophy,
      color: '#FFD700',
      gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',
      borderColor: 'border-yellow-500/30'
    },
    {
      label: 'USD Value',
      value: `$${((profile?.tokens ?? 0) / 1000).toFixed(2)}`,
      icon: TrendingUp,
      color: '#00FF87',
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/30'
    },
  ];

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4 relative overflow-hidden">
      {/* ── Volumetric Cyber Ambient Lighting ── */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-72 right-[-100px] w-96 h-96 bg-gold-neon/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">

        {/* ── Cyber Command Center: Welcome & Token Vault HUD ── */}
        <motion.div
          className="relative rounded-3xl p-6 overflow-hidden border border-cyan-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.4)]"
          style={{
            background: 'linear-gradient(135deg, rgba(13, 26, 48, 0.95) 0%, rgba(8, 16, 32, 0.98) 100%)',
            backdropFilter: 'blur(16px)'
          }}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Futuristic HUD Scanline & Grid Overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(rgba(0, 240, 255, 0.8) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* HUD Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

          {/* User Welcome Row */}
          <div className="flex items-start justify-between mb-5 relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] uppercase tracking-wider">
                  <Activity size={10} className="animate-pulse" /> Cyber Command
                </span>
                {profile?.level && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-neon/15 border border-gold-neon/30 text-amber-300 font-mono text-[10px] font-bold">
                    LVL {profile.level}
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl font-black text-text-primary tracking-tight">
                {isGuest ? 'Welcome, Commander!' : `Hey, ${profile?.username ?? 'Player'}!`}
              </h1>
              <p className="text-xs text-text-secondary mt-0.5">
                {isGuest
                  ? 'Guest balance active. Upgrade profile to unlock permanent cashouts.'
                  : 'Ready for today’s orbital spins & mission bounties?'}
              </p>
            </div>

            {profile?.streak && profile.streak > 0 && (
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 shadow-[0_0_15px_rgba(255,153,0,0.25)]"
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative">
                  <Flame size={18} className="text-amber-400" />
                  <Sparkles size={10} className="text-yellow-200 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-mono font-black text-sm text-amber-300">{profile.streak}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">Streak</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Prismatic Token Vault & Quick Cashout */}
          <div className="relative p-4 rounded-2xl bg-navy-950/70 border border-white/10 mb-4 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 mb-0.5 flex items-center gap-1">
                  <Shield size={10} /> Liquid Vault Balance
                </p>
                <TokenCounter value={profile?.tokens ?? 0} size="lg" />
              </div>

              {profile && profile.tokens >= 1000 ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={openCashoutModal}
                    id="cashout-btn"
                    className="shadow-[0_0_20px_rgba(255,215,0,0.4)] font-bold"
                  >
                    <TrendingUp size={14} className="mr-1" /> Cash Out $1+
                  </Button>
                </motion.div>
              ) : (
                <div className="text-right">
                  <span className="text-[10px] font-mono text-muted block">Min Cashout: 1,000</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    ${((profile?.tokens ?? 0) / 1000).toFixed(2)} USD value
                  </span>
                </div>
              )}
            </div>

            {/* Volumetric Cashout Charge Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-text-secondary">
                  {formatTokens(profile?.tokens ?? 0)} / 1,000 to Cashout
                </span>
                <span className={cashoutProgress >= 100 ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
                  {cashoutProgress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-navy-900 rounded-full overflow-hidden p-[1px] border border-cyan-500/20 relative">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: cashoutProgress >= 100
                      ? 'linear-gradient(90deg, #00FF87 0%, #00F0FF 100%)'
                      : 'linear-gradient(90deg, #00B4D8 0%, #00F0FF 100%)',
                    boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${cashoutProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-white/70 rounded-full animate-ping" />
                </motion.div>
              </div>
            </div>
          </div>

          {profile && !isGuest && (
            <div className="mt-2">
              <LevelBadge level={profile.level} xp={profile.xp} />
            </div>
          )}
        </motion.div>

        {/* ── 3D Holographic Cyber Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3.5">
          {statsCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group cursor-pointer"
              >
                <div
                  className={`p-4 rounded-2xl border ${stat.borderColor} bg-gradient-to-b ${stat.gradient} bg-navy-900/90 backdrop-blur-md relative overflow-hidden transition-all duration-300 shadow-md group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                      style={{
                        backgroundColor: `${stat.color}25`,
                        border: `1px solid ${stat.color}50`
                      }}
                    >
                      <Icon size={20} style={{ color: stat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted truncate">
                        {stat.label}
                      </p>
                      <p className="font-display font-extrabold text-base text-text-primary tracking-tight truncate">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-10 blur-xl pointer-events-none" style={{ backgroundColor: stat.color }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Volumetric Daily Streak Reactor Calendar ── */}
        {!isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-3xl p-5 border border-gold-neon/30 bg-navy-950/90 backdrop-blur-lg relative overflow-hidden shadow-[0_8px_30px_rgba(255,215,0,0.12)]"
          >
            {/* Header with Reactor Pulse */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold-neon/15 border border-gold-neon/30 flex items-center justify-center shadow-sm">
                  <Calendar size={18} className="text-gold-neon" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-text-primary flex items-center gap-1.5">
                    Daily Streak Reactor
                    <Sparkles size={12} className="text-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-text-secondary">Claim daily energy charges to amplify spin tokens</p>
                </div>
              </div>
              <Badge variant="gold" className="font-mono text-[11px]">
                {profile?.streak ?? 0} DAY STREAK
              </Badge>
            </div>

            {/* 7-Day Gemstone Circuit Nodes */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {DAILY_REWARD_SCHEDULE.map((day) => {
                const isCurrent = day.day === dayInCycle;
                const isPast = (profile?.streak ?? 0) >= day.day;

                return (
                  <motion.div
                    key={day.day}
                    whileHover={{ scale: 1.05 }}
                    className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all duration-300 text-center ${
                      isCurrent
                        ? 'border-gold-neon bg-gradient-to-b from-gold-neon/25 to-amber-950/60 shadow-[0_0_15px_rgba(255,215,0,0.35)]'
                        : isPast
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : 'border-white/5 bg-navy-900/60 opacity-60'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gold-neon rounded-full animate-ping" />
                    )}

                    <span className="text-[10px] font-mono font-bold text-muted">
                      D{day.day}
                    </span>

                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-inner ${
                        isCurrent
                          ? 'bg-amber-400 text-navy-950'
                          : isPast
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 text-muted'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <Coins size={14} className={isCurrent ? 'text-navy-950 font-bold' : ''} />
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isCurrent
                          ? 'text-gold-neon font-black drop-shadow-[0_0_6px_rgba(255,215,0,0.8)]'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-muted'
                      }`}
                    >
                      +{day.tokens}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Claim Action Button */}
            <Button
              variant={hasClaimedDailyReward ? 'ghost' : 'gold'}
              fullWidth
              disabled={!!hasClaimedDailyReward}
              loading={claimingReward}
              onClick={handleClaimDailyReward}
              id="daily-reward-btn"
              className={`rounded-2xl font-bold py-3 transition-all ${
                !hasClaimedDailyReward
                  ? 'shadow-[0_0_25px_rgba(255,215,0,0.35)] hover:shadow-[0_0_35px_rgba(255,215,0,0.5)]'
                  : ''
              }`}
            >
              {hasClaimedDailyReward ? (
                <span className="flex items-center gap-2 text-emerald-400 font-mono text-sm">
                  <CheckCircle2 size={16} /> Day {dayInCycle} Reactor Surge Claimed
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-navy-950 font-extrabold text-sm">
                  <Gift size={16} className="animate-bounce" />
                  Claim Day {dayInCycle} Surge (+{todayReward?.tokens ?? 50} Tokens)
                </span>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── Daily Missions Radar Callout ── */}
        <Link to="/progress" className="block">
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-gold-neon/25 backdrop-blur-md shadow-sm hover:shadow-[0_6px_25px_rgba(255,215,0,0.15)] transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gold-neon/15 border border-gold-neon/30 flex items-center justify-center shadow-inner">
                <Target size={24} className="text-gold-neon" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-text-primary">Daily Orbital Missions</h3>
                  <Badge variant="gold" className="text-[10px]">NEW</Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">Complete combat milestones & earn bonus bounty crates</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gold-neon text-xs font-mono font-semibold">
              <span>View Quests</span>
              <ChevronRight size={16} />
            </div>
          </motion.div>
        </Link>

        {/* ── Cyber Arcade Quick Action Portals ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Link to="/wheel">
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="p-4 rounded-3xl bg-gradient-to-br from-cyan-500/15 via-blue-900/30 to-navy-900/80 border border-cyan-400/30 backdrop-blur-md relative overflow-hidden shadow-md hover:shadow-[0_8px_30px_rgba(0,240,255,0.2)] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shadow-inner">
                  <Disc3 size={24} className="text-cyan-neon animate-spin" style={{ animationDuration: '10s' }} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-text-primary">Spin the Wheel</h3>
                  <p className="text-xs text-text-secondary">Win 10–500 tokens</p>
                </div>
              </div>
              <Badge variant="cyan" className="font-mono text-[10px]">SPIN NOW</Badge>
            </motion.div>
          </Link>

          <Link to="/games">
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              className="p-4 rounded-3xl bg-gradient-to-br from-purple-500/15 via-pink-900/30 to-navy-900/80 border border-purple-400/30 backdrop-blur-md relative overflow-hidden shadow-md hover:shadow-[0_8px_30px_rgba(168,85,247,0.2)] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shadow-inner">
                  <Gamepad2 size={24} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-text-primary">Cyber Arcade</h3>
                  <p className="text-xs text-text-secondary">4 mini games ready</p>
                </div>
              </div>
              <Badge variant="purple" className="font-mono text-[10px]">PLAY</Badge>
            </motion.div>
          </Link>
        </div>

        {/* ── Recent Orbital Spins Terminal ── */}
        {spinHistoryData && spinHistoryData.length > 0 && (
          <Card className="rounded-3xl border border-white/10 bg-navy-950/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-2">
                <Disc3 size={14} className="text-cyan-neon" /> Orbital Telemetry (Recent Spins)
              </CardTitle>
            </CardHeader>
            <div className="p-3 space-y-1.5">
              {(spinHistoryData as any[]).slice(0, 5).map((spin: any) => (
                <div
                  key={spin.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-navy-900/50 hover:bg-navy-900/90 border border-white/5 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-medium text-text-primary">{spin.segment}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-cyan-neon">+{spin.reward}</span>
                    <span className="text-[11px] text-muted">{formatRelativeTime(spin.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Guest Security Clearance Upgrade Banner ── */}
        {isGuest && (
          <motion.div
            className="rounded-3xl p-5 border border-warn/40 bg-gradient-to-r from-amber-500/10 via-navy-900 to-navy-950 backdrop-blur-md relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-warn/20 border border-warn/40 flex items-center justify-center text-xl flex-shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-text-primary mb-1">
                  Guest Protocol Active — Save Your Tokens
                </h3>
                <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                  Authenticate your player identity to claim 500 bonus tokens, participate in realtime leaderboards, and cash out rewards.
                </p>
                <Link to="/auth">
                  <Button variant="primary" size="sm" id="upgrade-account-btn" className="font-bold">
                    Sign Up Free — Claim 500 Bonus Tokens
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Banner Sponsor ── */}
        <BannerAd />
      </div>
    </div>
  );
}
