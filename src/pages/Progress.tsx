// src/pages/Progress.tsx
// Holographic Mission Terminal, Tiered 3D Metallic Trophy Vault & Energy Pulse Gauges
// Part of the Autonomous Graphics Evolution (REC-PROGRESS-ACHIEVEMENT-VAULT)

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck, Check, Coins, Lock, Sparkles,
  Target, Trophy, Zap, Shield,
  CheckCircle2, Activity, Terminal,
  RefreshCw, Cpu, Radio
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/authStore';
import {
  claimMissionReward,
  getDailyRewardStatus,
  getGameStats,
  getMissionClaims,
  getSpinHistory
} from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatTokens } from '@/lib/utils';

type Mission = {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  category: 'DAILY' | 'ARCADE' | 'FORTUNE';
  badgeCode: string;
};

type TrophyTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  tier: TrophyTier;
  lore: string;
};

// Procedural synthesizer for arcade harvest chimes
function playHarvestChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.18, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.32);
    });
  } catch {
    // AudioContext blocked or unsupported
  }
}

// Dual-cannon celebratory token fountain
function triggerTokenFountain() {
  const count = 120;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#FFD700', '#FFA500', '#00F0FF', '#00FF87', '#FFFFFF'],
    ticks: 240,
    gravity: 1.1,
    scalar: 1.1,
  };

  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.6),
    angle: 60,
    spread: 65,
    origin: { x: 0.25, y: 0.7 },
  });

  confetti({
    ...defaults,
    particleCount: Math.floor(count * 0.6),
    angle: 120,
    spread: 65,
    origin: { x: 0.75, y: 0.7 },
  });
}

const TIER_CONFIG: Record<TrophyTier, {
  label: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  metalShine: string;
  rimColor: string;
  textBadge: string;
}> = {
  PLATINUM: {
    label: 'PLATINUM',
    bgGradient: 'from-cyan-400/20 via-blue-500/10 to-indigo-900/40',
    borderColor: 'border-cyan-400/50',
    glowColor: 'rgba(0, 240, 255, 0.45)',
    metalShine: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 50%, #0284c7 100%)',
    rimColor: '#38bdf8',
    textBadge: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60',
  },
  GOLD: {
    label: 'GOLD',
    bgGradient: 'from-amber-400/20 via-yellow-500/10 to-amber-950/40',
    borderColor: 'border-amber-400/50',
    glowColor: 'rgba(255, 215, 0, 0.45)',
    metalShine: 'linear-gradient(135deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)',
    rimColor: '#eab308',
    textBadge: 'text-amber-300 border-amber-400/40 bg-amber-950/60',
  },
  SILVER: {
    label: 'SILVER',
    bgGradient: 'from-slate-300/20 via-slate-400/10 to-slate-900/40',
    borderColor: 'border-slate-300/50',
    glowColor: 'rgba(203, 213, 225, 0.35)',
    metalShine: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #64748b 100%)',
    rimColor: '#cbd5e1',
    textBadge: 'text-slate-200 border-slate-300/40 bg-slate-900/60',
  },
  BRONZE: {
    label: 'BRONZE',
    bgGradient: 'from-orange-500/20 via-amber-700/10 to-stone-900/40',
    borderColor: 'border-orange-500/40',
    glowColor: 'rgba(217, 119, 6, 0.3)',
    metalShine: 'linear-gradient(135deg, #fed7aa 0%, #d97706 50%, #78350f 100%)',
    rimColor: '#d97706',
    textBadge: 'text-orange-300 border-orange-500/40 bg-orange-950/60',
  },
};

export function Progress() {
  const { profile, isGuest, refreshProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSIONS' | 'TROPHIES' | 'CLAIMABLE'>('ALL');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { data: activity, isLoading, isFetching } = useQuery({
    queryKey: ['progress', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId || isGuest) return { spins: [], stats: null, daily: [], claims: [] };
      const [spins, stats, daily, claims] = await Promise.all([
        getSpinHistory(userId),
        getGameStats(userId),
        getDailyRewardStatus(userId),
        getMissionClaims(userId),
      ]);
      return {
        spins: spins.data ?? [],
        stats: stats.data,
        daily: daily.data ?? [],
        claims: claims.data ?? []
      };
    },
    staleTime: 15_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const spinsToday = (activity?.spins ?? []).filter((spin: { created_at: string }) =>
    spin.created_at.startsWith(today)
  ).length;
  const claimed = useMemo(() =>
    new Set((activity?.claims ?? []).map((claim: { mission_id: string }) => claim.mission_id)),
    [activity?.claims]
  );

  const missions: Mission[] = useMemo(() => [
    {
      id: 'daily_spin_1',
      title: 'First Splash',
      description: 'Spin the fortune wheel at least once today',
      reward: 25,
      progress: spinsToday,
      target: 1,
      category: 'DAILY',
      badgeCode: 'DIR-01',
    },
    {
      id: 'daily_spin_3',
      title: 'Triple Current',
      description: 'Spin the wheel 3 times today to charge the vortex',
      reward: 75,
      progress: spinsToday,
      target: 3,
      category: 'DAILY',
      badgeCode: 'DIR-02',
    },
    {
      id: 'daily_login',
      title: 'Daily Diver',
      description: 'Claim today’s streak reactor power cell',
      reward: 30,
      progress: (activity?.daily.length ?? 0) > 0 ? 1 : 0,
      target: 1,
      category: 'DAILY',
      badgeCode: 'DIR-03',
    },
  ], [spinsToday, activity?.daily]);

  const achievements: Achievement[] = useMemo(() => [
    {
      id: 'earned_1k',
      title: 'Treasure Hunter',
      description: 'Earn 1,000 tokens across all games & spins',
      icon: '💰',
      progress: profile?.total_earned ?? 0,
      target: 1000,
      tier: 'PLATINUM',
      lore: 'The deep ocean yields riches to those with the courage to dive deepest.',
    },
    {
      id: 'wins_10',
      title: 'Grand Champion',
      description: 'Claim 10 arcade game victories against the odds',
      icon: '🏆',
      progress: activity?.stats?.games_won ?? 0,
      target: 10,
      tier: 'PLATINUM',
      lore: 'A proven master of tactical reflex, strategy, and precision.',
    },
    {
      id: 'streak_7',
      title: 'Inferno Streak',
      description: 'Maintain a 7-day login streak without breaking the chain',
      icon: '🔥',
      progress: profile?.streak ?? 0,
      target: 7,
      tier: 'GOLD',
      lore: 'Unbroken dedication ignites a perpetual vortex of bonus energy.',
    },
    {
      id: 'spin_25',
      title: 'Wheel Sovereign',
      description: 'Complete 25 spins on the flagship Aqua-Wheel',
      icon: '🎡',
      progress: activity?.stats?.spins_total ?? activity?.spins.length ?? 0,
      target: 25,
      tier: 'GOLD',
      lore: 'The wheel has yielded its ancient secrets to your continuous spins.',
    },
    {
      id: 'level_5',
      title: 'Rising Tide',
      description: 'Attain Player Rank Level 5',
      icon: '🌊',
      progress: profile?.level ?? 1,
      target: 5,
      tier: 'SILVER',
      lore: 'From shallow ripples to tidal waves, your status surges forward.',
    },
    {
      id: 'games_20',
      title: 'Arcade Regular',
      description: 'Play 20 mini-games in the cyber arcade lobby',
      icon: '🎮',
      progress: activity?.stats?.games_played ?? 0,
      target: 20,
      tier: 'BRONZE',
      lore: 'A veteran patron of the interactive entertainment suites.',
    },
  ], [activity, profile]);

  const handleClaim = async (mission: Mission) => {
    if (!userId || isGuest || claimingId) return;
    setClaimingId(mission.id);

    try {
      const result = await claimMissionReward(userId, mission.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Trigger multi-sensory celebratory fireworks
      triggerTokenFountain();
      playHarvestChime();

      toast.success(
        `Mission accomplished! +${result.data?.tokens_awarded ?? mission.reward} tokens harvested! 🚀`,
        { icon: '✨' }
      );

      await Promise.all([
        refreshProfile(),
        queryClient.invalidateQueries({ queryKey: ['progress', userId] })
      ]);
    } catch {
      toast.error('Could not claim reward. Please retry.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleHarvestAll = async () => {
    const claimableMissions = missions.filter(m => m.progress >= m.target && !claimed.has(m.id));
    if (!claimableMissions.length || isGuest || !userId) return;

    for (const mission of claimableMissions) {
      await handleClaim(mission);
    }
  };

  const completedAchievements = achievements.filter(item => item.progress >= item.target).length;
  const readyMissions = missions.filter(m => m.progress >= m.target && !claimed.has(m.id));
  const claimedCount = missions.filter(m => claimed.has(m.id)).length;
  const totalBountyAvailable = readyMissions.reduce((acc, m) => acc + m.reward, 0);

  // Filtered views
  const showMissions = activeTab === 'ALL' || activeTab === 'MISSIONS' || activeTab === 'CLAIMABLE';
  const showAchievements = activeTab === 'ALL' || activeTab === 'TROPHIES';
  const filteredMissions = activeTab === 'CLAIMABLE' ? readyMissions : missions;

  return (
    <div className="min-h-screen bg-[#070b14] text-text-primary pt-20 pb-28 px-4 sm:px-6 relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── Holographic Ambient Lighting & Circuit Mesh ──────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px]" />
        
        {/* Subtle Cyber Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* ── Holographic Mission Terminal Master HUD ───────────────────────── */}
        <motion.div
          className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-navy-900/90 via-[#0a1224]/95 to-[#050914]/90 backdrop-blur-2xl shadow-[0_12px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(0,240,255,0.3)]"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Decorative Corner Sci-Fi Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

          {/* Holographic Scanline Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none animate-pulse" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono tracking-wider font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
                  <Terminal size={13} className="text-cyan-400 animate-pulse" />
                  HOLOGRAPHIC TERMINAL // v2.5
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <Radio size={11} className="animate-spin text-emerald-400" />
                  QUANTUM SYNC LIVE
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight mt-3">
                Mission Directives & Trophy Vault
              </h1>

              <p className="text-sm text-slate-300/80 max-w-xl mt-1.5 leading-relaxed">
                Execute daily directives, channel quantum token bounties, and enshrine your achievements within the 3D metallic trophy vault.
              </p>

              {/* Status Telemetry Monitors */}
              <div className="flex items-center gap-4 sm:gap-6 mt-5 text-xs font-mono flex-wrap">
                <div className="flex items-center gap-2 bg-navy-800/60 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                  <Target size={15} className="text-cyan-400" />
                  <span className="text-slate-400">Directives:</span>
                  <span className="font-bold text-cyan-300">{claimedCount} / {missions.length} Claimed</span>
                </div>
                <div className="flex items-center gap-2 bg-navy-800/60 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <Trophy size={15} className="text-amber-400" />
                  <span className="text-slate-400">Trophies:</span>
                  <span className="font-bold text-amber-300">{completedAchievements} / {achievements.length} Unlocked</span>
                </div>
                {totalBountyAvailable > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-300 animate-pulse">
                    <Sparkles size={15} className="text-emerald-400" />
                    <span>Harvest Ready: +{totalBountyAvailable} Tokens</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Matrix / Trophy Radar */}
            <div className="flex flex-col sm:flex-row md:flex-col items-end gap-3 shrink-0">
              {readyMissions.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleHarvestAll}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-display text-xs font-bold uppercase tracking-wider text-navy-950 bg-gradient-to-r from-emerald-400 via-cyan-300 to-emerald-400 bg-[length:200%_auto] hover:bg-right transition-all duration-300 shadow-[0_0_20px_rgba(0,255,135,0.4)] flex items-center justify-center gap-2 border border-emerald-200"
                >
                  <Sparkles size={15} className="text-navy-950 animate-spin" />
                  Harvest All Ready ({readyMissions.length})
                </motion.button>
              )}

              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 p-3 rounded-2xl bg-navy-950/80 border border-slate-700/60 shadow-inner">
                <div className="text-left">
                  <p className="text-2xs font-mono uppercase text-slate-400">Total Tokens Stored</p>
                  <p className="font-display text-lg font-bold text-amber-300 flex items-center gap-1.5">
                    <Coins size={16} className="text-amber-400" />
                    {formatTokens(profile?.tokens ?? 0)}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-700" />
                <div className="text-left">
                  <p className="text-2xs font-mono uppercase text-slate-400">Player Rank</p>
                  <p className="font-display text-lg font-bold text-cyan-300 flex items-center gap-1">
                    <Zap size={16} className="text-cyan-400" />
                    LVL {profile?.level ?? 1}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Guest Warning Terminal ─────────────────────────────────────────── */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-md flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex items-center gap-3">
              <Shield className="text-amber-400 shrink-0" size={20} />
              <p className="text-slate-300 text-xs sm:text-sm">
                <strong className="text-amber-300">Guest Terminal Active:</strong> Sign in or register to harvest token rewards into your personal treasury. Achievement progress continues tracking locally.
              </p>
            </div>
            <Badge variant="gold">GUEST MODE</Badge>
          </motion.div>
        )}

        {/* ── Interactive Terminal Navigation Tabs ───────────────────────────── */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 bg-navy-950/70 p-1.5 rounded-2xl border border-slate-800">
            {(['ALL', 'MISSIONS', 'TROPHIES', 'CLAIMABLE'] as const).map(tab => {
              const active = activeTab === tab;
              const count =
                tab === 'MISSIONS' ? missions.length :
                tab === 'TROPHIES' ? achievements.length :
                tab === 'CLAIMABLE' ? readyMissions.length : null;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-xl text-xs font-mono font-semibold tracking-wider transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? 'text-cyan-200 bg-cyan-950/80 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 border border-transparent'
                  }`}
                >
                  {tab === 'ALL' && <Activity size={14} />}
                  {tab === 'MISSIONS' && <CalendarCheck size={14} />}
                  {tab === 'TROPHIES' && <Trophy size={14} />}
                  {tab === 'CLAIMABLE' && <Sparkles size={14} className={readyMissions.length ? 'text-emerald-400 animate-pulse' : ''} />}
                  
                  <span>{tab === 'ALL' ? 'ALL DIRECTIVES' : tab}</span>

                  {count !== null && (
                    <span className={`px-1.5 py-0.2 rounded-full text-2xs font-bold ${
                      tab === 'CLAIMABLE' && readyMissions.length > 0
                        ? 'bg-emerald-500 text-navy-950 animate-pulse'
                        : active
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-2xs font-mono text-slate-400">
            <Cpu size={14} className="text-cyan-400" />
            <span>PBR SHADING: AAA HOLOGRAPHIC</span>
          </div>
        </div>

        {/* ── Daily Directives Section ──────────────────────────────────────── */}
        {showMissions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                <h2 className="font-display text-lg font-bold text-text-primary tracking-wide flex items-center gap-2">
                  <CalendarCheck size={18} className="text-cyan-400" />
                  Daily Protocol Directives
                </h2>
              </div>
              <span className="text-2xs font-mono uppercase text-slate-400 flex items-center gap-1.5 bg-navy-900 px-3 py-1 rounded-full border border-slate-800">
                <RefreshCw size={11} className={isFetching ? 'animate-spin text-cyan-400' : ''} />
                Cycles Every 24h
              </span>
            </div>

            <div className="grid gap-3.5">
              {filteredMissions.map(mission => {
                const isCompleted = mission.progress >= mission.target;
                const isClaimed = claimed.has(mission.id);
                const progressPct = Math.min((mission.progress / mission.target) * 100, 100);

                return (
                  <motion.div
                    key={mission.id}
                    layout
                    whileHover={{ y: -2 }}
                    className={`relative p-5 rounded-2xl border transition-all duration-300 backdrop-blur-xl overflow-hidden ${
                      isClaimed
                        ? 'bg-navy-900/50 border-slate-800 opacity-75'
                        : isCompleted
                        ? 'bg-gradient-to-r from-emerald-950/40 via-navy-900/90 to-cyan-950/40 border-emerald-500/40 shadow-[0_8px_24px_rgba(0,255,135,0.12)]'
                        : 'bg-navy-900/80 border-slate-800/80 hover:border-cyan-500/30'
                    }`}
                  >
                    {/* Glowing circuit line background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-navy-950 text-cyan-400 border border-cyan-500/30">
                            {mission.badgeCode}
                          </span>
                          <h3 className="font-display text-base font-bold text-text-primary tracking-wide">
                            {mission.title}
                          </h3>
                          {isClaimed && (
                            <span className="inline-flex items-center gap-1 text-2xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                              <CheckCircle2 size={12} /> PROTOCOL EXECUTED
                            </span>
                          )}
                          {!isClaimed && isCompleted && (
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 animate-pulse">
                              <Sparkles size={12} /> READY TO HARVEST
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300/80 leading-relaxed">
                          {mission.description}
                        </p>
                      </div>

                      {/* Reward Capsule & Claim Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        {/* 3D Holographic Token Capsule */}
                        <div className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border border-amber-500/40 flex items-center gap-2 shadow-[0_0_12px_rgba(255,215,0,0.15)]">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 p-0.5 flex items-center justify-center shadow-md">
                            <Coins size={14} className="text-navy-950" />
                          </div>
                          <div className="text-left">
                            <span className="block text-2xs font-mono text-amber-300/80 leading-none">BOUNTY</span>
                            <span className="font-display text-sm font-black text-amber-300">+{mission.reward}</span>
                          </div>
                        </div>

                        {/* Interactive Harvest Button */}
                        <Button
                          size="sm"
                          disabled={!isCompleted || isClaimed || isGuest || isLoading || claimingId === mission.id}
                          onClick={() => handleClaim(mission)}
                          className={`min-w-[130px] font-display text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                            isClaimed
                              ? 'bg-navy-950/70 text-slate-500 border border-slate-800'
                              : isCompleted
                              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-navy-950 border border-emerald-300 shadow-[0_0_16px_rgba(0,255,135,0.4)]'
                              : 'bg-navy-800/80 text-slate-400 border border-slate-700/60 hover:bg-navy-700/80'
                          }`}
                        >
                          {claimingId === mission.id ? (
                            <span className="flex items-center gap-1.5">
                              <RefreshCw size={13} className="animate-spin" /> HARVESTING...
                            </span>
                          ) : isClaimed ? (
                            <span className="flex items-center gap-1.5">
                              <Check size={14} /> HARVESTED
                            </span>
                          ) : isCompleted ? (
                            <span className="flex items-center gap-1.5">
                              <Sparkles size={14} /> HARVEST REWARD
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Lock size={13} /> IN PROGRESS
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* High-Voltage Energy Pulse Progress Track */}
                    <div className="mt-4 pt-3 border-t border-slate-800/60">
                      <div className="flex items-center justify-between text-2xs font-mono mb-1.5">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Activity size={12} className="text-cyan-400" />
                          CAPACITOR CHARGE
                        </span>
                        <span className="font-bold text-cyan-300">
                          {Math.min(mission.progress, mission.target)} / {mission.target} ({Math.round(progressPct)}%)
                        </span>
                      </div>

                      {/* Animated Circuit Energy Bar */}
                      <div className="h-2.5 w-full bg-navy-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                        <motion.div
                          className={`h-full rounded-full relative transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-300 shadow-[0_0_10px_#00ff87]'
                              : 'bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_8px_#00f0ff]'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                          {/* Pulsing energy spark on leading edge */}
                          {progressPct > 0 && progressPct < 100 && (
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full blur-[1px] animate-ping" />
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Tiered 3D Metallic Trophy Vault ───────────────────────────────── */}
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 pt-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#ffd700]" />
                <h2 className="font-display text-lg font-bold text-text-primary tracking-wide flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  3D Metallic Trophy Vault
                </h2>
              </div>
              <span className="text-2xs font-mono uppercase text-amber-300/80 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
                {completedAchievements} of {achievements.length} Enshrined
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((item, idx) => {
                const unlocked = item.progress >= item.target;
                const progressPct = Math.min((item.progress / item.target) * 100, 100);
                const tierCfg = TIER_CONFIG[item.tier];

                return (
                  <motion.div
                    key={item.id}
                    layout
                    whileHover={{ y: -4, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`relative p-5 rounded-3xl border transition-all duration-300 backdrop-blur-2xl overflow-hidden flex flex-col justify-between ${
                      unlocked
                        ? `bg-gradient-to-br ${tierCfg.bgGradient} ${tierCfg.borderColor}`
                        : 'bg-navy-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                    style={{
                      boxShadow: unlocked
                        ? `0 12px 32px rgba(0,0,0,0.5), 0 0 24px ${tierCfg.glowColor}`
                        : undefined,
                    }}
                  >
                    {/* Top Tier Badge & Pedestal Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className={`text-2xs font-mono font-extrabold px-2.5 py-0.5 rounded-md border uppercase tracking-wider ${tierCfg.textBadge}`}>
                          {tierCfg.label} TIER
                        </span>

                        {unlocked ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                            <CheckCircle2 size={12} /> ENSHRINED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-2xs font-mono text-slate-400 bg-navy-950 px-2 py-0.5 rounded-full border border-slate-800">
                            <Lock size={11} /> FROZEN
                          </span>
                        )}
                      </div>

                      {/* 3D Tiered Pedestal Emblem */}
                      <div className="flex items-center gap-4 mb-3.5">
                        <div className="relative shrink-0">
                          {/* Radial Aura Glow behind unlocked trophy */}
                          {unlocked && (
                            <div
                              className="absolute -inset-2 rounded-2xl blur-lg opacity-70 animate-pulse pointer-events-none"
                              style={{ backgroundColor: tierCfg.rimColor }}
                            />
                          )}

                          {/* Metallic Extruded Trophy Coin / Badge */}
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl relative shadow-[0_8px_16px_rgba(0,0,0,0.6)] border-2 ${
                              unlocked
                                ? 'border-white/80'
                                : 'border-slate-700/80 grayscale opacity-45'
                            }`}
                            style={{
                              background: unlocked ? tierCfg.metalShine : 'linear-gradient(135deg, #1e293b, #0f172a)',
                            }}
                          >
                            {/* Inner Specular Glint Ring */}
                            {unlocked && (
                              <div className="absolute inset-0.5 rounded-xl border border-white/50 pointer-events-none" />
                            )}
                            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                              {item.icon}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-sm font-bold text-text-primary tracking-wide truncate">
                            {item.title}
                          </h3>
                          <p className="text-2xs text-slate-300/80 mt-0.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Lore Snippet */}
                      <p className="text-3xs italic text-slate-400/80 border-l border-slate-700/60 pl-2.5 my-2">
                        "{item.lore}"
                      </p>
                    </div>

                    {/* Progress Gauge & Stats */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-2xs font-mono mb-1.5">
                        <span className="text-slate-400 uppercase tracking-wider">Calibration</span>
                        <span className={unlocked ? 'font-bold text-amber-300' : 'text-slate-400 font-medium'}>
                          {Math.min(item.progress, item.target).toLocaleString()} / {item.target.toLocaleString()}
                        </span>
                      </div>

                      {/* High-Voltage Charge Track */}
                      <div className="h-2 w-full bg-navy-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <motion.div
                          className={`h-full rounded-full ${
                            unlocked
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_#ffd700]'
                              : 'bg-gradient-to-r from-cyan-600 to-blue-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
