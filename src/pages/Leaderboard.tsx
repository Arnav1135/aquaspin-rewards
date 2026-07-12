// src/pages/Leaderboard.tsx
// Realtime leaderboard with Supabase subscription

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Flame, RefreshCw, Info, ChevronDown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { getLeaderboard, subscribeToLeaderboard } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge, RankBadge } from '@/components/ui/Badge';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { getAvatarColor, getInitials, formatTokens } from '@/lib/utils';

export function Leaderboard() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  void lastUpdated; // suppress unused warning — shown in future feature

  const { data: leaderboard, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => getLeaderboard().then(r => r.data ?? []),
    staleTime: 30_000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = subscribeToLeaderboard(() => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      setLastUpdated(new Date());
    });

    return () => { channel.unsubscribe(); };
  }, [queryClient]);

  const myRank = leaderboard?.find((e: any) => e.id === profile?.id);

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leaderboard Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-cyan">Leaderboard</h1>
            <p className="text-sm text-muted mt-1">
              Top earners • Updates in realtime
            </p>
          </div>
          <button
            className="btn-ghost p-2 rounded-xl"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* My rank card */}
        {myRank && (
          <motion.div
            className="glass-card rounded-2xl p-4 border border-cyan-neon/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-muted mb-2">Your Rank</p>
            <div className="flex items-center gap-3">
              <RankBadge rank={Number(myRank.rank)} />
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-navy-900 text-sm"
                style={{ backgroundColor: getAvatarColor(myRank.id) }}
              >
                {getInitials(myRank.username)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text-primary text-sm">{myRank.username ?? 'You'}</p>
                <p className="text-2xs text-muted">Level {myRank.level}</p>
              </div>
              <TokenCounter value={myRank.total_earned} size="sm" />
            </div>
          </motion.div>
        )}

        {/* Top 3 podium */}
        {leaderboard && leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {/* 2nd */}
            <PodiumCard entry={leaderboard[1]} position={2} />
            {/* 1st */}
            <PodiumCard entry={leaderboard[0]} position={1} />
            {/* 3rd */}
            <PodiumCard entry={leaderboard[2]} position={3} />
          </div>
        )}

        {/* Full list */}
        <Card className="rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-navy-700">
              {leaderboard?.map((entry: any, i: number) => {
                const isMe = entry.id === profile?.id;
                return (
                  <motion.div
                    key={entry.id}
                    className={`flex items-center gap-3 p-4 transition-colors ${
                      isMe ? 'bg-cyan-neon/5' : 'hover:bg-navy-800/50'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <div className="w-8 flex justify-center">
                      <RankBadge rank={Number(entry.rank)} />
                    </div>

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-navy-900 text-xs flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(entry.id) }}
                    >
                      {getInitials(entry.username)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isMe ? 'text-cyan-neon' : 'text-text-primary'}`}>
                          {entry.username ?? 'Anonymous'}
                        </p>
                        {isMe && <Badge variant="cyan" size="sm">You</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Zap size={10} className="text-muted" />
                        <span className="text-2xs text-muted">Lv.{entry.level}</span>
                        {entry.streak > 2 && (
                          <>
                            <Flame size={10} className="text-warn" />
                            <span className="text-2xs text-warn">{entry.streak}d</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-cyan-neon">
                        {formatTokens(entry.total_earned)}
                      </p>
                      <p className="text-2xs text-muted">tokens earned</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

          <p className="text-center text-2xs text-muted">
            Rankings based on total tokens earned • Updated live • Top 100 shown
          </p>
        </div>

        {/* How to Play Column */}
        <div className="lg:col-span-1 space-y-6">
          <HowToPlaySection />
        </div>

      </div>
    </div>
  );
}

function PodiumCard({ entry, position }: { entry: any; position: 1 | 2 | 3 }) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
  const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-navy-900 text-sm"
        style={{ backgroundColor: getAvatarColor(entry.id), boxShadow: `0 0 15px ${colors[position]}50` }}
      >
        {getInitials(entry.username)}
      </div>
      <p className="text-xs font-medium text-text-primary truncate max-w-[70px] text-center">
        {entry.username ?? 'Player'}
      </p>
      <div
        className={`w-full ${heights[position]} rounded-t-xl flex flex-col items-center justify-center gap-1`}
        style={{
          background: `linear-gradient(to top, ${colors[position]}20, ${colors[position]}10)`,
          border: `1px solid ${colors[position]}40`,
        }}
      >
        <Trophy size={16} style={{ color: colors[position] }} />
        <span className="font-display font-bold" style={{ color: colors[position], fontSize: '11px' }}>
          #{position}
        </span>
        <span className="text-2xs text-text-secondary font-mono">{formatTokens(entry.total_earned)}</span>
      </div>
    </div>
  );
}

function HowToPlaySection() {
  const games = [
    { name: 'Crash', desc: 'Place a bet and watch the multiplier rise. Cash out before the rocket crashes to win! If it crashes before you cash out, you lose.' },
    { name: 'Limbo', desc: 'Set a target multiplier. If the randomly rolled number is higher than your target, you win the payout! Otherwise, you lose the bet.' },
    { name: 'Plinko', desc: 'Drop the ball into the peg maze. It will bounce down into a bucket with a multiplier. Your payout is Bet × Bucket Multiplier.' },
    { name: 'Mines', desc: 'Select tiles to uncover gems and increase your multiplier. Avoid the hidden mines! Cash out anytime to secure your current multiplier.' },
    { name: 'Roulette', desc: 'Bet on colors (Red/Black) or Green (Jackpot). If the wheel lands on your color, you win!' },
    { name: 'Dragon Tiger', desc: 'Bet on which side (Dragon or Tiger) will draw the higher card. Aces are low. A Tie pays extra.' },
    { name: 'Flip', desc: 'A classic coin toss. Guess Heads (Gold) or Tails (Silver). If you guess right, you double your bet!' },
    { name: 'Chicken', desc: 'Lift the cloches. Finding a chicken increases your multiplier. Finding a bone ends the game and you lose your bet. Cash out anytime!' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-gradient-cyan flex items-center gap-2">
          <Info size={20} /> How to Play
        </h2>
        <p className="text-sm text-muted mt-1">
          Master the games & stack tokens!
        </p>
      </div>

      <div className="space-y-3">
        {games.map(game => (
          <HowToPlayAccordion key={game.name} title={game.name} content={game.desc} />
        ))}
      </div>
    </div>
  );
}

function HowToPlayAccordion({ title, content }: { title: string, content: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="glass-card border border-white/5 rounded-xl overflow-hidden">
      <button 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-text-primary text-sm">{title}</span>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-sm text-muted">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
