// src/pages/Progress.tsx
// Daily missions and achievement tracking backed by player activity.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, CalendarCheck, Check, Coins, Lock, Sparkles, Target, Trophy } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/authStore';
import { claimMissionReward, getDailyRewardStatus, getGameStats, getMissionClaims, getSpinHistory } from '@/lib/supabase';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type Mission = { id: string; title: string; description: string; reward: number; progress: number; target: number };
type Achievement = { id: string; title: string; description: string; icon: string; progress: number; target: number };

export function Progress() {
  const { profile, isGuest, refreshProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const { data: activity, isLoading } = useQuery({
    queryKey: ['progress', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId || isGuest) return { spins: [], stats: null, daily: [], claims: [] };
      const [spins, stats, daily, claims] = await Promise.all([
        getSpinHistory(userId), getGameStats(userId), getDailyRewardStatus(userId), getMissionClaims(userId),
      ]);
      return { spins: spins.data ?? [], stats: stats.data, daily: daily.data ?? [], claims: claims.data ?? [] };
    },
    staleTime: 15_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const spinsToday = (activity?.spins ?? []).filter((spin: { created_at: string }) => spin.created_at.startsWith(today)).length;
  const claimed = new Set((activity?.claims ?? []).map((claim: { mission_id: string }) => claim.mission_id));

  const missions: Mission[] = [
    { id: 'daily_spin_1', title: 'First Splash', description: 'Spin the wheel once today', reward: 25, progress: spinsToday, target: 1 },
    { id: 'daily_spin_3', title: 'Triple Current', description: 'Spin the wheel 3 times today', reward: 75, progress: spinsToday, target: 3 },
    { id: 'daily_login', title: 'Daily Diver', description: 'Claim today’s streak reward', reward: 30, progress: (activity?.daily.length ?? 0) > 0 ? 1 : 0, target: 1 },
  ];

  const achievements: Achievement[] = useMemo(() => [
    { id: 'earned_1k', title: 'Treasure Hunter', description: 'Earn 1,000 tokens in total', icon: '💰', progress: profile?.total_earned ?? 0, target: 1000 },
    { id: 'level_5', title: 'Rising Tide', description: 'Reach level 5', icon: '🌊', progress: profile?.level ?? 1, target: 5 },
    { id: 'streak_7', title: 'On Fire', description: 'Build a 7-day streak', icon: '🔥', progress: profile?.streak ?? 0, target: 7 },
    { id: 'spin_25', title: 'Wheel Master', description: 'Complete 25 spins', icon: '🎡', progress: activity?.stats?.spins_total ?? activity?.spins.length ?? 0, target: 25 },
    { id: 'games_20', title: 'Arcade Regular', description: 'Play 20 mini-games', icon: '🎮', progress: activity?.stats?.games_played ?? 0, target: 20 },
    { id: 'wins_10', title: 'Champion', description: 'Win 10 mini-games', icon: '🏆', progress: activity?.stats?.games_won ?? 0, target: 10 },
  ], [activity, profile]);

  const handleClaim = async (mission: Mission) => {
    if (!userId || isGuest) return;
    const result = await claimMissionReward(userId, mission.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Mission complete! +${result.data?.tokens_awarded ?? mission.reward} tokens`);
    await Promise.all([refreshProfile(), queryClient.invalidateQueries({ queryKey: ['progress', userId] })]);
  };

  const completedAchievements = achievements.filter(item => item.progress >= item.target).length;

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div className="glass-card rounded-2xl p-5 overflow-hidden relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Sparkles className="absolute right-4 top-4 text-gold-neon/30" size={72} />
          <div className="relative">
            <Badge variant="gold">PLAYER PROGRESS</Badge>
            <h1 className="font-display text-2xl font-bold text-text-primary mt-3">Missions & Achievements</h1>
            <p className="text-sm text-text-secondary mt-1">Complete daily goals, collect bonus tokens, and unlock milestones.</p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1.5 text-cyan-neon"><Target size={16} /> {missions.filter(m => claimed.has(m.id)).length}/{missions.length} missions</span>
              <span className="flex items-center gap-1.5 text-gold-neon"><Trophy size={16} /> {completedAchievements}/{achievements.length} unlocked</span>
            </div>
          </div>
        </motion.div>

        {isGuest && <Card className="rounded-2xl border border-warn/30"><p className="text-sm text-text-secondary">Create an account to claim mission rewards. Achievement previews still use your guest progress.</p></Card>}

        <Card className="rounded-2xl">
          <CardHeader><CardTitle><span className="flex items-center gap-2"><CalendarCheck size={19} className="text-cyan-neon" /> Daily Missions</span></CardTitle><Badge variant="cyan">Resets daily</Badge></CardHeader>
          <div className="space-y-3">
            {missions.map(mission => {
              const done = mission.progress >= mission.target;
              const isClaimed = claimed.has(mission.id);
              return <div key={mission.id} className="p-4 rounded-xl bg-navy-800 border border-navy-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="font-semibold text-text-primary">{mission.title}</h3><p className="text-xs text-text-secondary mt-0.5">{mission.description}</p></div>
                  <span className="flex items-center gap-1 text-xs font-bold text-gold-neon whitespace-nowrap"><Coins size={13} /> +{mission.reward}</span>
                </div>
                <div className="mt-3"><ProgressBar value={Math.min(mission.progress / mission.target * 100, 100)} label={`${Math.min(mission.progress, mission.target)} / ${mission.target}`} height={6} color={done ? 'green' : 'cyan'} /></div>
                <Button className="mt-3" size="sm" variant={isClaimed ? 'ghost' : done ? 'success' : 'ghost'} disabled={!done || isClaimed || isGuest || isLoading} onClick={() => handleClaim(mission)}>
                  {isClaimed ? <><Check size={14} /> Claimed</> : done ? <><GiftIcon /> Claim reward</> : <><Lock size={13} /> In progress</>}
                </Button>
              </div>;
            })}
          </div>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle><span className="flex items-center gap-2"><Award size={19} className="text-gold-neon" /> Achievements</span></CardTitle><Badge variant="gold">{completedAchievements} unlocked</Badge></CardHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            {achievements.map(item => {
              const unlocked = item.progress >= item.target;
              return <motion.div key={item.id} className={`p-4 rounded-xl border ${unlocked ? 'bg-gold-neon/5 border-gold-neon/30' : 'bg-navy-800 border-navy-700'}`} whileHover={{ y: -2 }}>
                <div className="flex items-start gap-3"><span className={`text-2xl ${unlocked ? '' : 'grayscale opacity-50'}`}>{item.icon}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><h3 className="font-semibold text-sm text-text-primary">{item.title}</h3>{unlocked && <Check size={14} className="text-success" />}</div><p className="text-2xs text-text-secondary mt-0.5">{item.description}</p></div></div>
                <div className="mt-3"><ProgressBar value={Math.min(item.progress / item.target * 100, 100)} label={`${Math.min(item.progress, item.target).toLocaleString()} / ${item.target.toLocaleString()}`} height={5} color={unlocked ? 'gold' : 'cyan'} /></div>
              </motion.div>;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function GiftIcon() { return <Sparkles size={14} />; }
