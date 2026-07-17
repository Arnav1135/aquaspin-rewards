// src/pages/Dashboard.tsx
// Fintech-grade gaming dashboard matching the visual structural layout of the reference image.

// import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Menu, User, Plus, Disc3, Trophy, Gamepad2,
  Wallet, MoreHorizontal, Plane, ShoppingBag, Gift
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { getSpinHistory } from '@/lib/supabase';
import { BannerAd } from '@/components/ads/BannerAd';
import { formatRelativeTime } from '@/types/database';
import { formatTokens } from '@/lib/utils';
import { useParallax } from '@/engine/core/useParallax';
// toast removed

const CARD_ANIM = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

export function Dashboard() {
  const { profile, isGuest } = useAuthStore();
  const { openCashoutModal } = useUIStore();

  const tokenCardRef = useParallax<HTMLDivElement>(0.8);
  const usdCardRef = useParallax<HTMLDivElement>(0.5);

  // dayInCycle removed

  const { data: spinHistoryData } = useQuery({
    queryKey: ['spin-history', profile?.id],
    queryFn: () => profile ? getSpinHistory(profile.id).then(r => r.data) : null,
    enabled: !!profile && !isGuest,
    staleTime: 30_000,
  });

  // Removed daily reward query and handleClaimDailyReward as it was removed from the UI

  return (
    <div
      className="min-h-screen relative pb-0"
      style={{ background: 'var(--c-app-bg)' }}
    >
      <div className="max-w-2xl mx-auto flex flex-col min-h-screen relative overflow-hidden">
        
        {/* ── Top Glass Header ── */}
        <div className="px-6 py-6 flex justify-between items-center z-10 sticky top-0 backdrop-blur-md">
          <button className="p-2 -ml-2 rounded-full text-[var(--c-navy-dark)]">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-md overflow-hidden border-2 border-white">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
             ) : (
               <User size={20} className="text-[var(--c-navy-dark)]" />
             )}
          </div>
        </div>

        <div className="px-6 flex-1 flex flex-col z-10 pb-10">
          
          {/* ── Visa-Style Cards Row ── */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar -mx-6 px-6">
            
            {/* Add Button */}
            <div className="flex flex-col justify-center snap-center">
              <button 
                onClick={openCashoutModal}
                className="w-[45px] h-[80px] rounded-[24px] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border border-white/10"
                style={{ background: 'var(--c-navy)', color: 'white' }}
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Main Token Balance Card (Slate Blue) */}
            <motion.div
              ref={tokenCardRef as any}
              className="parallax-layer relative w-[200px] h-[240px] rounded-[40px] p-6 flex flex-col justify-between overflow-hidden flex-shrink-0 snap-center"
              style={{ background: 'var(--c-navy)', boxShadow: '0 10px 25px rgba(132, 146, 196, 0.4)' }}
              {...CARD_ANIM}
              transition={{ delay: 0.1 }}
            >
              {/* Overlapping Circle Pattern */}
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full border border-white/10 -translate-y-12 translate-x-12 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-44 h-44 rounded-full border border-white/10 translate-y-12 -translate-x-12 pointer-events-none" />
              
              <div className="flex justify-between items-center z-10">
                <div className="w-9 h-6 bg-white/20 rounded-[6px] backdrop-blur-sm border border-white/30 flex items-center justify-center">
                   <div className="w-4 h-[2px] bg-white rounded-full opacity-50" />
                </div>
              </div>
              
              <div className="z-10 mt-auto pb-2">
                <h3 className="text-white text-2xl font-bold font-mono tracking-tight">
                  {formatTokens(profile?.tokens ?? 0)}
                </h3>
                <p className="text-white/60 text-xs mt-1 font-medium tracking-widest uppercase">
                  Tokens
                </p>
              </div>
            </motion.div>

            {/* Secondary USD Value Card (Cyan Blue) */}
            <motion.div
              ref={usdCardRef as any}
              className="parallax-layer relative w-[200px] h-[240px] rounded-[40px] p-6 flex flex-col justify-between overflow-hidden flex-shrink-0 snap-center"
              style={{ background: 'var(--c-sky)', boxShadow: '0 10px 25px rgba(98, 193, 229, 0.4)' }}
              {...CARD_ANIM}
              transition={{ delay: 0.2 }}
            >
              {/* Overlapping Circle Pattern */}
              <div className="absolute top-10 -right-10 w-36 h-36 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute -bottom-12 left-5 w-44 h-44 rounded-full border border-white/20 pointer-events-none" />
              
              <div className="flex justify-end items-center z-10">
                 <div className="flex -space-x-3">
                    <div className="w-7 h-7 rounded-full bg-white/40" />
                    <div className="w-7 h-7 rounded-full bg-white/80" />
                 </div>
              </div>
              
              <div className="z-10 mt-auto pb-2">
                <h3 className="text-white text-2xl font-bold font-mono tracking-tight">
                  ${((profile?.tokens ?? 0) / 1000).toFixed(2)}
                </h3>
                <p className="text-white/70 text-xs mt-1 font-medium tracking-widest uppercase">
                  USD Value
                </p>
              </div>
            </motion.div>
            
            {/* Spacer for overflow */}
            <div className="w-2 flex-shrink-0" />
          </div>

          {/* ── Activities / Quick Actions ── */}
          <div className="mt-8 mb-6 flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--c-navy-dark)]">Activities</h2>
            <MoreHorizontal size={20} className="text-[var(--c-navy-dark)] opacity-40" />
          </div>

          <div className="flex justify-between items-start px-2">
            {[
              { to: '/wheel', icon: Disc3,    label: 'Spin' },
              { to: '/games', icon: Gamepad2, label: 'Games' },
              { to: '/profile', icon: Trophy, label: 'Ranks' },
              { to: '/shop',  icon: Wallet,   label: 'Shop' },
            ].map(({ to, icon: Icon, label }, i) => (
              <motion.div
                key={label}
                {...CARD_ANIM}
                transition={{ delay: 0.3 + (i * 0.1) }}
              >
                <Link to={to} className="flex flex-col items-center gap-3 group">
                  <div 
                    className="w-[64px] h-[64px] rounded-[24px] flex items-center justify-center transition-all group-hover:scale-105"
                    style={{ 
                      background: 'var(--c-navy)', 
                      boxShadow: '0 8px 20px rgba(132, 146, 196, 0.25)',
                    }}
                  >
                    <div className="p-[10px] rounded-full border-[1.5px] border-white/40">
                      <Icon size={20} strokeWidth={2} style={{ color: '#FFFFFF' }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--c-navy-dark)] opacity-80">{label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Bottom Drawer (Transactions / Recent Games) ── */}
        <motion.div 
          className="w-full bg-[var(--c-navy)] mt-auto pt-6 px-6 pb-28 relative z-20 flex-1 min-h-[300px]"
          style={{ borderRadius: '40px 40px 0 0', boxShadow: '0 -10px 40px rgba(132, 146, 196, 0.3)' }}
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 120, delay: 0.5 }}
        >
          {/* Drag Handle */}
          <div className="w-12 h-[3px] bg-white/20 rounded-full mx-auto mb-8" />

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-white">Transactions</h2>
            <MoreHorizontal size={20} className="text-white/50" />
          </div>

          <div className="space-y-6">
             {/* Map over recent spin history to show transactions */}
             {spinHistoryData && spinHistoryData.length > 0 ? (
                (spinHistoryData as any[]).slice(0, 4).map((spin: any, index: number) => {
                  const icons = [Plane, ShoppingBag, Gamepad2, Gift];
                  const Icon = icons[index % icons.length];
                  
                  return (
                    <div key={spin.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-[18px] flex items-center justify-center border border-white/20"
                          style={{ background: 'rgba(255,255,255,0.1)' }}
                        >
                          <Icon size={20} className="text-[var(--c-sky)]" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">Game Reward</p>
                          <p className="text-white/50 text-xs mt-1">{formatRelativeTime(spin.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-white font-mono text-sm">
                        +{spin.reward}
                      </span>
                    </div>
                  );
                })
             ) : (
                <div className="text-center py-4">
                  <p className="text-white/50 text-sm">No recent transactions</p>
                </div>
             )}
          </div>
          
          <div className="mt-8">
             <BannerAd />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
