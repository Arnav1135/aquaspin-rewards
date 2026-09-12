// src/pages/Dashboard.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu, User, Plus, Play, Calendar, Star,
  Gamepad2, Trophy, Wallet, ChevronRight, Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory } from '@/lib/supabase';
import { BannerAd } from '@/components/ads/BannerAd';
import { RewardsSummary } from '@/components/ui/RewardsSummary';
import { GameCard } from '@/components/ui/GameCard';
import gamesRegistry from "../../factory/games/registry/games.json";

const GAMES = gamesRegistry as any[];

const CARD_ANIM = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

export function Dashboard() {
  const { profile, isGuest } = useAuthStore();
  const { openCashoutModal } = useUIStore();
  const navigate = useNavigate();

  const { data: spinHistoryData, isLoading } = useQuery({
    queryKey: ['spin-history', profile?.id],
    queryFn: () => profile ? getSpinHistory(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 30_000,
  });

  const featuredGame = GAMES.find(g => g.key === 'carrom') || GAMES[0];
  const continueGame = GAMES.find(g => g.key === 'crash') || GAMES[1];

  const handleGameClick = (key: string) => {
    navigate(`/games`);
    // Ideally we pass state or just navigate to games, user can open it there
  };

  return (
    <div
      className="min-h-screen relative pb-20"
      style={{ background: 'var(--c-app-bg)' }}
    >
      <div className="max-w-2xl mx-auto flex flex-col min-h-screen relative overflow-hidden">
        
        {/* ── Top Glass Header ── */}
        <div className="px-6 py-6 flex justify-between items-center z-10 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-md overflow-hidden border-2 border-[#1e293b]">
               {profile?.avatar_url ? (
                 <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
               ) : (
                 <User size={20} className="text-slate-800" />
               )}
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium">Welcome back,</p>
              <p className="text-white font-bold text-sm">{profile?.username || 'Player'}</p>
            </div>
          </div>
          <button className="p-2 bg-white/10 rounded-full text-white backdrop-blur-sm border border-white/20 transition-colors">
            <Menu size={20} />
          </button>
        </div>

        <div className="px-6 flex-1 flex flex-col z-10 pb-10 space-y-8">
          
          {/* Rewards Summary */}
          <motion.div {...CARD_ANIM} transition={{ delay: 0.1 }}>
            <RewardsSummary 
              tokens={profile?.tokens ?? 0}
              usdValue={(profile?.tokens ?? 0) / 1000}
              onCashoutClick={openCashoutModal}
            />
          </motion.div>

          {/* Continue Playing */}
          <motion.div {...CARD_ANIM} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Play size={18} className="text-cyan-400" />
                Continue Playing
              </h2>
            </div>
            <div className="h-40">
              <GameCard game={continueGame} onClick={handleGameClick} />
            </div>
          </motion.div>

          {/* Daily Opportunity */}
          <motion.div {...CARD_ANIM} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-yellow-400" />
                Daily Opportunity
              </h2>
            </div>
            <Link to="/wheel">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-4 border border-white/10 shadow-lg flex items-center justify-between relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <h3 className="font-bold text-white text-lg">Daily Spin Wheel</h3>
                  <p className="text-white/60 text-xs mt-1">Spin to win up to 500 tokens!</p>
                  <div className="mt-3 inline-flex items-center gap-1 bg-yellow-400/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
                    <Zap size={12} /> Available Now
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <div className="text-3xl">🎡</div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Featured Game */}
          <motion.div {...CARD_ANIM} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Star size={18} className="text-blue-400" />
                Featured Game
              </h2>
              <Link to="/games" className="text-cyan-400 text-xs font-bold flex items-center">
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="h-40">
              <GameCard game={featuredGame} onClick={handleGameClick} />
            </div>
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
