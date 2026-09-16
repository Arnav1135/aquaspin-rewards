// src/components/ui/AchievementsPanel.tsx
// Auto-unlocking achievements panel wired to real profile stats

import { motion } from 'framer-motion';
import { CheckCircle, Lock } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  check: (p: any) => boolean;
  progress?: (p: any) => { current: number; max: number } | null;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_spin',
    title: 'First Spin',
    desc: 'Complete your first game',
    icon: '🎰',
    check: (p) => (p.total_games_played ?? 0) >= 1,
    progress: (p) => ({ current: Math.min(p.total_games_played ?? 0, 1), max: 1 }),
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    desc: 'Earn 10,000 tokens total',
    icon: '💎',
    check: (p) => (p.total_earned ?? 0) >= 10000,
    progress: (p) => ({ current: Math.min(p.total_earned ?? 0, 10000), max: 10000 }),
  },
  {
    id: 'centurion',
    title: 'Centurion',
    desc: 'Play 100 games',
    icon: '⚔️',
    check: (p) => (p.total_games_played ?? 0) >= 100,
    progress: (p) => ({ current: Math.min(p.total_games_played ?? 0, 100), max: 100 }),
  },
  {
    id: 'winner',
    title: 'On a Roll',
    desc: 'Win 10 games',
    icon: '🔥',
    check: (p) => (p.total_wins ?? 0) >= 10,
    progress: (p) => ({ current: Math.min(p.total_wins ?? 0, 10), max: 10 }),
  },
  {
    id: 'veteran',
    title: 'Veteran',
    desc: 'Play 500 games',
    icon: '🏆',
    check: (p) => (p.total_games_played ?? 0) >= 500,
    progress: (p) => ({ current: Math.min(p.total_games_played ?? 0, 500), max: 500 }),
  },
  {
    id: 'whale',
    title: 'Whale',
    desc: 'Hold 100,000 tokens',
    icon: '🐋',
    check: (p) => (p.tokens ?? 0) >= 100000,
    progress: (p) => ({ current: Math.min(p.tokens ?? 0, 100000), max: 100000 }),
  },
  {
    id: 'vip_bronze',
    title: 'VIP Bronze',
    desc: 'Reach Level 10',
    icon: '🥉',
    check: (p) => (p.level ?? 0) >= 10,
    progress: (p) => ({ current: Math.min(p.level ?? 0, 10), max: 10 }),
  },
  {
    id: 'vip_gold',
    title: 'VIP Gold',
    desc: 'Reach Level 30',
    icon: '🥇',
    check: (p) => (p.level ?? 0) >= 30,
    progress: (p) => ({ current: Math.min(p.level ?? 0, 30), max: 30 }),
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    desc: 'Claim 7 daily rewards in a row',
    icon: '📅',
    check: (p) => (p.login_streak ?? 0) >= 7,
    progress: (p) => ({ current: Math.min(p.login_streak ?? 0, 7), max: 7 }),
  },
  {
    id: 'xp_grinder',
    title: 'XP Grinder',
    desc: 'Earn 5,000 total XP',
    icon: '⭐',
    check: (p) => (p.xp ?? 0) >= 5000,
    progress: (p) => ({ current: Math.min(p.xp ?? 0, 5000), max: 5000 }),
  },
];

export function AchievementsPanel() {
  const { profile } = useAuthStore();

  const unlocked = ACHIEVEMENTS.filter((a) => profile && a.check(profile)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Achievements</h2>
        <span className="text-sm text-white/50">
          {unlocked} / {ACHIEVEMENTS.length} unlocked
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #66bdf2, #a855f7)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((achievement, i) => {
          const isUnlocked = profile ? achievement.check(profile) : false;
          const prog = profile && achievement.progress ? achievement.progress(profile) : null;
          const pct = prog ? (prog.current / prog.max) * 100 : 0;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`relative rounded-2xl p-4 border transition-all ${
                isUnlocked
                  ? 'border-yellow-400/40 bg-yellow-400/8 shadow-[0_0_16px_rgba(250,204,21,0.12)]'
                  : 'border-white/8 bg-white/3'
              }`}
            >
              {/* Unlocked glow */}
              {isUnlocked && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/5 to-transparent pointer-events-none" />
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    isUnlocked ? 'bg-yellow-400/15' : 'bg-white/5 grayscale opacity-50'
                  }`}
                >
                  {achievement.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`font-semibold text-sm ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                      {achievement.title}
                    </span>
                    {isUnlocked ? (
                      <CheckCircle size={13} className="text-yellow-400 flex-shrink-0" />
                    ) : (
                      <Lock size={11} className="text-white/20 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs leading-snug ${isUnlocked ? 'text-white/60' : 'text-white/25'}`}>
                    {achievement.desc}
                  </p>

                  {/* Progress bar */}
                  {!isUnlocked && prog && (
                    <div className="mt-2">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-white/30"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.05 + 0.3, duration: 0.6 }}
                        />
                      </div>
                      <p className="text-2xs text-white/20 mt-0.5">
                        {prog.current.toLocaleString()} / {prog.max.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
