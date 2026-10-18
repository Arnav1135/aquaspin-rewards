// src/pages/Leaderboard.tsx
// Realtime leaderboard with Supabase subscription

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Flame, RefreshCw, Info, ChevronDown, Crown, Sparkles, Medal, Award } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
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

        {/* Holographic Champions Stadium Podium */}
        {leaderboard && leaderboard.length >= 3 && (
          <ChampionsStadium topThree={[leaderboard[0], leaderboard[1], leaderboard[2]]} />
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

function ChampionsStadium({ topThree }: { topThree: any[] }) {
  const champion = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  const triggerCelebration = () => {
    confetti({
      particleCount: 60,
      spread: 75,
      origin: { y: 0.55 },
      colors: ['#FFD700', '#F59E0B', '#00F0FF', '#E2E8F0', '#FFFFFF'],
    });
  };

  return (
    <motion.div
      className="relative rounded-3xl p-5 sm:p-6 overflow-hidden border border-cyan-neon/30 bg-gradient-to-b from-navy-900/95 via-navy-950/98 to-navy-900/95 backdrop-blur-2xl shadow-2xl"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Volumetric Stadium Light Beams & Laser Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central golden volumetric spotlight cone */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full blur-[80px] opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.45) 0%, rgba(0, 240, 255, 0.25) 45%, transparent 70%)',
          }}
        />
        {/* Neon floor grid perspective */}
        <div
          className="absolute bottom-0 inset-x-0 h-24 opacity-15"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(0, 240, 255, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            transform: 'perspective(180px) rotateX(60deg)',
            transformOrigin: 'bottom center',
          }}
        />
        {/* Floating arena dust sparkles */}
        <div className="absolute top-4 left-6 flex items-center gap-1.5 opacity-40 text-amber-300">
          <Sparkles size={14} className="animate-pulse" />
        </div>
        <div className="absolute top-6 right-8 flex items-center gap-1.5 opacity-40 text-cyan-neon">
          <Sparkles size={16} className="animate-pulse" />
        </div>
      </div>

      {/* Stadium Header */}
      <div className="relative z-10 flex items-center justify-between mb-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-sm">
            <Trophy size={16} />
          </div>
          <div>
            <h2 className="font-display text-sm sm:text-base font-bold text-gradient-cyan tracking-wide">
              CHAMPIONS STADIUM
            </h2>
            <p className="text-3xs uppercase tracking-widest text-muted">Tiered VIP Podium • Top Titans</p>
          </div>
        </div>

        <button
          onClick={triggerCelebration}
          className="flex items-center gap-1.5 text-2xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-text-secondary hover:text-cyan-neon transition-all cursor-pointer shadow-sm"
          title="Celebrate Champions"
        >
          <Sparkles size={12} className="text-amber-400" />
          <span className="font-medium">Celebrate</span>
        </button>
      </div>

      {/* 3D Tiered Pillars: Order 2nd (Left), 1st (Center), 3rd (Right) */}
      <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-5 pt-8 pb-1">
        <MetallicPodiumPillar entry={second} position={2} />
        <MetallicPodiumPillar entry={champion} position={1} onCelebrate={triggerCelebration} />
        <MetallicPodiumPillar entry={third} position={3} />
      </div>
    </motion.div>
  );
}

interface MetallicPodiumPillarProps {
  entry: any;
  position: 1 | 2 | 3;
  onCelebrate?: () => void;
}

function MetallicPodiumPillar({ entry, position, onCelebrate }: MetallicPodiumPillarProps) {
  const configs = {
    1: {
      title: 'Champion',
      height: 'h-40 sm:h-44',
      primaryColor: '#FFD700',
      borderColor: 'rgba(255, 215, 0, 0.75)',
      glowColor: 'rgba(255, 215, 0, 0.4)',
      pillarBg:
        'linear-gradient(180deg, rgba(255, 215, 0, 0.28) 0%, rgba(212, 175, 55, 0.16) 40%, rgba(10, 16, 30, 0.96) 100%)',
      capBg: 'radial-gradient(ellipse at 50% 30%, #FFFBEA 0%, #FFD700 50%, #B45309 100%)',
      badgeBg: 'linear-gradient(135deg, #FFE873 0%, #FFD700 50%, #D97706 100%)',
      badgeText: '#1A1303',
      icon: <Crown size={14} className="text-amber-300" />,
      delay: 0.1,
    },
    2: {
      title: 'Runner Up',
      height: 'h-32 sm:h-36',
      primaryColor: '#E2E8F0',
      borderColor: 'rgba(226, 232, 240, 0.65)',
      glowColor: 'rgba(148, 163, 184, 0.35)',
      pillarBg:
        'linear-gradient(180deg, rgba(226, 232, 240, 0.22) 0%, rgba(148, 163, 184, 0.14) 40%, rgba(10, 16, 30, 0.96) 100%)',
      capBg: 'radial-gradient(ellipse at 50% 30%, #FFFFFF 0%, #CBD5E1 50%, #475569 100%)',
      badgeBg: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 50%, #64748B 100%)',
      badgeText: '#0F172A',
      icon: <Medal size={14} className="text-slate-200" />,
      delay: 0.2,
    },
    3: {
      title: '3rd Place',
      height: 'h-28 sm:h-30',
      primaryColor: '#F97316',
      borderColor: 'rgba(249, 115, 22, 0.65)',
      glowColor: 'rgba(249, 115, 22, 0.35)',
      pillarBg:
        'linear-gradient(180deg, rgba(249, 115, 22, 0.22) 0%, rgba(180, 83, 9, 0.14) 40%, rgba(10, 16, 30, 0.96) 100%)',
      capBg: 'radial-gradient(ellipse at 50% 30%, #FFEDD5 0%, #EA580C 50%, #7C2D12 100%)',
      badgeBg: 'linear-gradient(135deg, #FFEDD5 0%, #EA580C 50%, #7C2D12 100%)',
      badgeText: '#1F0B03',
      icon: <Award size={14} className="text-amber-500" />,
      delay: 0.3,
    },
  };

  const config = configs[position];

  return (
    <motion.div
      className="flex flex-col items-center flex-1 max-w-[130px] sm:max-w-[160px] cursor-pointer group"
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: config.delay, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => {
        if (position === 1 && onCelebrate) {
          onCelebrate();
        }
      }}
    >
      {/* Avatar Container with Pulsing Energy Rings */}
      <div className="relative flex flex-col items-center mb-2.5">
        {/* Floating Crown for 1st Place Champion */}
        {position === 1 && (
          <motion.div
            className="absolute -top-7 sm:-top-8 flex items-center justify-center pointer-events-none z-20"
            animate={{
              y: [0, -5, 0],
              rotate: [-2, 2, -2],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="relative">
              <Crown className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300 drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]" />
              <Sparkles className="w-3.5 h-3.5 text-white absolute -top-1 -right-1.5 animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* Concentric Pulsing Energy Rings */}
        <div className="relative">
          <motion.div
            className="absolute -inset-2 rounded-2xl pointer-events-none"
            style={{
              border: `2px solid ${config.borderColor}`,
              boxShadow: `0 0 20px ${config.glowColor}`,
            }}
            animate={{
              scale: [1, 1.14, 1],
              opacity: [0.8, 0.25, 0.8],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -inset-1 rounded-2xl pointer-events-none"
            style={{
              border: `1px dashed ${config.primaryColor}`,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <div
            className="relative w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-navy-900 text-sm sm:text-base shadow-xl"
            style={{
              backgroundColor: getAvatarColor(entry?.id ?? 'anon'),
              boxShadow: `0 0 20px ${config.glowColor}, inset 0 2px 4px rgba(255,255,255,0.4)`,
              border: `2px solid ${config.borderColor}`,
            }}
          >
            {getInitials(entry?.username)}
          </div>
        </div>

        {/* Username */}
        <p className="text-xs font-semibold text-text-primary truncate max-w-[85px] sm:max-w-[110px] text-center mt-2.5">
          {entry?.username ?? 'Player'}
        </p>

        {/* Level and streak */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-3xs text-muted font-medium">Lv.{entry?.level ?? 1}</span>
          {entry?.streak > 1 && (
            <span className="flex items-center text-3xs text-warn font-semibold">
              <Flame size={10} className="mr-0.5" />
              {entry.streak}d
            </span>
          )}
        </div>
      </div>

      {/* 3D Tiered Pillar Body */}
      <div
        className={`w-full ${config.height} rounded-t-2xl relative flex flex-col items-center justify-between p-2.5 sm:p-3 overflow-hidden backdrop-blur-md transition-all duration-300`}
        style={{
          background: config.pillarBg,
          borderTop: `2px solid ${config.borderColor}`,
          borderLeft: `1px solid ${config.borderColor}`,
          borderRight: `1px solid ${config.borderColor}`,
          boxShadow: `0 12px 35px -8px ${config.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -4px 15px rgba(0, 0, 0, 0.6)`,
        }}
      >
        {/* Metallic Beveled Top Cap */}
        <div
          className="w-4/5 h-1.5 sm:h-2 rounded-full mb-1 opacity-90 shadow-sm"
          style={{ background: config.capBg }}
        />

        {/* 3D Embossed Medal Emblem */}
        <div className="flex flex-col items-center my-auto">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-display font-black text-xs sm:text-sm shadow-md"
            style={{
              background: config.badgeBg,
              color: config.badgeText,
              boxShadow: `0 4px 12px ${config.glowColor}, inset 0 2px 2px rgba(255, 255, 255, 0.6)`,
              border: `1.5px solid ${config.borderColor}`,
            }}
          >
            #{position}
          </div>
          <div className="flex items-center gap-1 mt-1">
            {config.icon}
            <span
              className="font-display text-3xs sm:text-2xs uppercase tracking-wider font-bold"
              style={{ color: config.primaryColor }}
            >
              {config.title}
            </span>
          </div>
        </div>

        {/* Token Metric Capsule */}
        <div className="w-full bg-navy-950/80 border border-white/10 rounded-xl py-1 px-1.5 sm:px-2 text-center backdrop-blur-sm">
          <p className="font-mono font-bold text-xs sm:text-sm text-cyan-neon tracking-tight">
            {formatTokens(entry?.total_earned ?? 0)}
          </p>
          <p className="text-3xs uppercase tracking-wider text-muted font-medium">tokens</p>
        </div>
      </div>
    </motion.div>
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
