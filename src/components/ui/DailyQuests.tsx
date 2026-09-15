import { motion } from 'framer-motion';
import { Gamepad2, Coins, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';

interface DailyQuestsProps {
  totalGamesPlayed: number;
  totalEarned: number;
  totalWins: number;
}

export function DailyQuests({ totalGamesPlayed, totalEarned, totalWins }: DailyQuestsProps) {
  const quests = [
    {
      id: 'play_100',
      title: 'Play 100 Games',
      current: totalGamesPlayed,
      target: 100,
      icon: <Gamepad2 size={18} className="text-neon-cyan" />,
      color: 'bg-cyan-500',
    },
    {
      id: 'earn_50k',
      title: 'Earn 50,000 Tokens',
      current: totalEarned,
      target: 50000,
      icon: <Coins size={18} className="text-neon-gold" />,
      color: 'bg-yellow-500',
    },
    {
      id: 'win_50',
      title: 'Win 50 Games',
      current: totalWins,
      target: 50,
      icon: <Trophy size={18} className="text-fuchsia-500" />,
      color: 'bg-fuchsia-500',
    },
  ];

  return (
    <Card className="rounded-2xl mt-6">
      <CardHeader>
        <CardTitle>Daily Quests</CardTitle>
      </CardHeader>
      <div className="space-y-4 px-1">
        {quests.map((quest, i) => {
          const progress = Math.min(100, Math.max(0, (quest.current / quest.target) * 100));
          const isComplete = quest.current >= quest.target;

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-navy-800 p-3 rounded-xl border border-navy-700"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-navy-900 rounded-lg">
                  {quest.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-text-primary">{quest.title}</h4>
                  <p className="text-xs text-muted">
                    {quest.current.toLocaleString()} / {quest.target.toLocaleString()}
                  </p>
                </div>
                {isComplete && (
                  <span className="text-xs font-bold text-success px-2 py-1 bg-success/10 rounded-full">
                    DONE
                  </span>
                )}
              </div>
              
              <div className="h-2 w-full bg-navy-900 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${quest.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
