import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Zap, Target, Flame } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';

interface Stats {
  total_wins?: number;
  total_earned?: number;
  total_games_played?: number;
}

interface Profile {
  level?: number;
  login_streak?: number;
}

const ACHIEVEMENTS = [
  { id: 'first_win', title: 'First Blood', description: 'Win your first game', icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/20', req: (stats: Stats) => (stats?.total_wins ?? 0) >= 1 },
  { id: 'high_roller', title: 'High Roller', description: 'Earn over 10,000 tokens', icon: Medal, color: 'text-purple-400', bg: 'bg-purple-400/20', req: (stats: Stats) => (stats?.total_earned ?? 0) >= 10000 },
  { id: 'veteran', title: 'Veteran', description: 'Play 100 games', icon: Star, color: 'text-blue-400', bg: 'bg-blue-400/20', req: (stats: Stats) => (stats?.total_games_played ?? 0) >= 100 },
  { id: 'sharpshooter', title: 'Sharpshooter', description: 'Achieve a 50% win rate (min 20 games)', icon: Target, color: 'text-red-400', bg: 'bg-red-400/20', req: (stats: Stats) => (stats?.total_games_played ?? 0) >= 20 && ((stats?.total_wins ?? 0) / (stats?.total_games_played ?? 1)) >= 0.5 },
  { id: 'on_fire', title: 'On Fire', description: 'Reach Level 10', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/20', req: (stats: Stats, profile: Profile) => (profile?.level ?? 0) >= 10 },
  { id: 'dedicated', title: 'Dedicated', description: 'Reach a 7-day login streak', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/20', req: (stats: Stats, profile: Profile) => (profile?.login_streak ?? 0) >= 7 },
];

export function Achievements({ stats }: { stats?: Stats }) {
  const { profile } = useAuthStore();
  
  const derivedStats = useMemo(() => {
    return stats || {
      total_wins: 0,
      total_games_played: 0,
      total_earned: profile?.total_earned || 0
    };
  }, [profile, stats]);

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
      <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
        <Trophy className="text-yellow-400" />
        Achievements
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = ach.req(derivedStats, profile);
          const Icon = ach.icon;
          return (
            <motion.div
              key={ach.id}
              whileHover={{ scale: 1.02 }}
              className={'p-4 rounded-2xl border ' + (unlocked ? 'bg-white/20 border-white/30' : 'bg-black/20 border-white/5 opacity-50 grayscale')}
            >
              <div className="flex items-center gap-4">
                <div className={'p-3 rounded-xl ' + (unlocked ? ach.bg : 'bg-gray-800')}>
                  <Icon size={24} className={unlocked ? ach.color : 'text-gray-500'} />
                </div>
                <div>
                  <h3 className="text-white font-bold">{ach.title}</h3>
                  <p className="text-white/60 text-sm leading-tight">{ach.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
