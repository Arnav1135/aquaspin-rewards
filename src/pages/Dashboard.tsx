import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, User, Plus, Play, Calendar, Star,
  Gamepad2, Trophy, Wallet, ChevronRight, Zap,
  Globe2, Users, Search, Loader2, Target, Flame, TrendingUp, Sparkles, Award
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory } from '@/lib/supabase';
import { BannerAd } from '@/components/ads/BannerAd';
import { RewardsSummary } from '@/components/ui/RewardsSummary';
import { GameCard } from '@/components/ui/GameCard';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { DailyRewardsModal } from '@/components/rewards/DailyRewardsModal';
import gamesRegistry from "../../factory/games/registry/games.json";
import { MatchmakingService, MatchState } from '@/features/multiplayer/MatchmakingService';

const GAMES = gamesRegistry as any[];

const CARD_ANIM = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const STAGGER = { animate: { transition: { staggerChildren: 0.1 } } };

export function Dashboard() {
  const { profile, isGuest } = useAuthStore();
  const { openCashoutModal } = useUIStore();
  const navigate = useNavigate();
  
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchFound, setMatchFound] = useState<MatchState | null>(null);
  const matchmakingService = useRef(new MatchmakingService());

  const { data: spinHistoryData } = useQuery({
    queryKey: ['spin-history', profile?.id],
    queryFn: () => profile ? getSpinHistory(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 30_000,
  });

  const featuredGame = GAMES.find(g => g.key === 'blackjack') || GAMES[0];
  const continueGame = GAMES.find(g => g.key === 'crash') || GAMES[1];
  const trendingGames = GAMES.filter(g => ['plinko', 'limbo', 'roulette'].includes(g.key));

  const handleGameClick = (key: string) => {
    navigate(`/games?game=${key}`);
  };

  const toggleMatchmaking = () => {
    if (isMatchmaking) {
      matchmakingService.current.leaveQueue();
      setIsMatchmaking(false);
    } else {
      setIsMatchmaking(true);
      matchmakingService.current.onMatchFound = (match) => {
        setMatchFound(match);
        setTimeout(() => {
          navigate(`/games?game=${match.gameKey}&matchId=${match.matchId}`);
        }, 2500);
      };
      
      const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)].key;
      matchmakingService.current.joinQueue({
        id: profile?.id || 'guest',
        username: profile?.username || 'Player',
        level: 1
      }, randomGame);
    }
  };

  useEffect(() => {
    return () => {
      matchmakingService.current.leaveQueue();
    };
  }, []);

  return (
    <>
      <DailyRewardsModal />
      
      <main
        className="min-h-screen relative pb-24 overflow-hidden"
        style={{ background: 'var(--c-app-bg)' }}
      >
        {/* Animated Cinematic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-cyan-900/30 to-transparent pointer-events-none" />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" 
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, -10, 10, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] left-[-15%] w-[500px] h-[500px] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none" 
        />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

        <div className="max-w-3xl mx-auto flex flex-col min-h-screen relative z-10">
          
          {/* Glass Header */}
          <header className="px-6 py-6 flex justify-between items-center z-50 sticky top-0 backdrop-blur-2xl border-b border-white/5 bg-[#0a0f1d]/60">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-[#0a0f1d] overflow-hidden border-2 border-[#1e293b]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-cyan-400" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-amber-600 w-5 h-5 rounded-full border-2 border-[#0a0f1d] flex items-center justify-center shadow-lg">
                  <Star size={10} className="text-white fill-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-cyan-400/90 text-[10px] font-black tracking-[0.2em] uppercase">VIP Player</p>
                <p className="text-white font-black tracking-wide text-base shadow-black/50 drop-shadow-md">{profile?.username || 'Guest Player'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white backdrop-blur-md border border-white/10 transition-all shadow-xl shadow-black/40">
                <Menu size={20} />
              </button>
            </div>
          </header>

          <motion.section 
            initial="initial"
            animate="animate"
            variants={STAGGER}
            className="px-6 flex-1 flex flex-col z-10 pb-10 space-y-8 mt-6"
          >
            
            {/* Ultra-Premium Rewards Summary */}
            <motion.div variants={CARD_ANIM}>
              <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/20 to-white/0 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-2xl" />
                <div className="relative bg-[#0d1428]/80 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/5">
                  <RewardsSummary 
                    tokens={profile?.tokens ?? 0}
                    usdValue={(profile?.tokens ?? 0) / 1000}
                    onCashoutClick={openCashoutModal}
                  />
                  {/* VIP Progress Bar */}
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5"><Award size={14} className="text-yellow-400"/> VIP Progress</span>
                      <span className="text-xs font-bold text-cyan-400">Level 4</span>
                    </div>
                    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '68%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 relative"
                      >
                        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                      </motion.div>
                    </div>
                    <p className="text-[10px] text-white/40 mt-2 font-mono">3,420 / 5,000 XP to VIP 5</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Global Matchmaking Hub - Cinematic Edition */}
            <motion.div variants={CARD_ANIM}>
              <div className="bg-gradient-to-br from-indigo-900/60 to-[#0a0f1d]/80 rounded-[2rem] p-6 border border-indigo-500/20 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-[-50px] right-[-50px] p-4 opacity-10 rotate-12">
                  <Globe2 size={200} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                        <Globe2 size={18} className="text-indigo-400" />
                      </div>
                      <h2 className="text-base font-black text-white tracking-widest">GLOBAL ARENA</h2>
                    </div>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/60 mb-6 font-medium leading-relaxed max-w-[280px]">Compete in real-time against 10,000+ players worldwide in any supported AAA game.</p>
                  
                  <AnimatePresence mode="wait">
                    {!isMatchmaking && !matchFound ? (
                      <motion.button 
                        key="join"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={toggleMatchmaking}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-2xl font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 transition-all border border-indigo-400/50 uppercase tracking-widest text-sm"
                      >
                        <Users size={18} /> ENTER MATCHMAKING
                      </motion.button>
                    ) : matchFound ? (
                      <motion.div 
                        key="found"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center backdrop-blur-md"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                          <Target size={24} className="text-emerald-400" />
                        </div>
                        <h3 className="text-emerald-400 font-black text-lg tracking-wide uppercase">Match Found!</h3>
                        <p className="text-emerald-200/80 text-xs mt-1 font-mono">Launching {matchFound.gameKey.toUpperCase()} Arena...</p>
                      </motion.div>
                    ) : (
                      <motion.button 
                        key="searching"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={toggleMatchmaking}
                        className="w-full py-4 bg-[#0a0f1d]/50 rounded-2xl font-bold text-indigo-300 border border-indigo-500/30 flex items-center justify-center gap-3 transition-all relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        <Loader2 size={18} className="animate-spin text-indigo-400" /> 
                        <span className="tracking-wide">SEARCHING FOR OPPONENT...</span>
                        <span className="absolute right-4 text-xs text-rose-400/80 font-bold opacity-0 group-hover:opacity-100 transition-opacity">CANCEL</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Trending Games Row (Horizontal Scroll) */}
            <motion.section variants={CARD_ANIM}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-base font-black text-white flex items-center gap-2 tracking-widest uppercase">
                  <TrendingUp size={16} className="text-rose-400" />
                  Trending Now
                </h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                {trendingGames.map(game => (
                  <div key={game.key} className="w-[280px] h-40 flex-shrink-0 snap-center">
                    <GameCard game={game} onClick={handleGameClick} />
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Jump Back In */}
            <motion.section variants={CARD_ANIM}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-base font-black text-white flex items-center gap-2 tracking-widest uppercase">
                  <Play size={16} className="text-cyan-400" />
                  Jump Back In
                </h2>
              </div>
              <div className="h-48 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                <GameCard game={continueGame} onClick={handleGameClick} />
              </div>
            </motion.section>

            {/* Daily Spin Wheel (Hyper-Vibrant) */}
            <motion.section variants={CARD_ANIM}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-base font-black text-white flex items-center gap-2 tracking-widest uppercase">
                  <Flame size={16} className="text-amber-500" />
                  Daily Quests
                </h2>
              </div>
              <Link to="/wheel">
                <div className="bg-gradient-to-br from-amber-900/60 to-orange-900/40 rounded-[2rem] p-6 border border-amber-500/30 shadow-2xl flex items-center justify-between relative overflow-hidden group hover:border-amber-400/60 transition-all backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full mix-blend-screen pointer-events-none group-hover:bg-amber-400/20 transition-all duration-700"></div>
                  <div className="relative z-10">
                    <h3 className="font-black text-white text-xl tracking-wide">Daily Spin Wheel</h3>
                    <p className="text-amber-200/80 text-sm mt-1 font-medium">Spin to win up to 500 tokens!</p>
                    <div className="mt-5 inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-400 text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-xl border border-amber-400/30 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                      <Sparkles size={12} className="fill-amber-400" /> Available Now
                    </div>
                  </div>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(245,158,11,0.3)] border border-amber-400/30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                    <span className="text-5xl">🎡</span>
                  </div>
                </div>
              </Link>
            </motion.section>
            
          </motion.section>
        </div>
      </main>
    </>
  );
}
