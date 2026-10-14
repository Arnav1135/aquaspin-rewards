import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { useUIStore } from '@/features/uiStore';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Gift, Calendar, CheckCircle, X, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const REWARD_AMOUNTS = [100, 150, 200, 250, 350, 500, 1000];

export function DailyRewardsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const { dailyRewardModalOpen, closeDailyRewardModal } = useUIStore();
  const updateProfile = useAuthStore(s => s.updateProfile);
  const profile = useAuthStore(s => s.profile);
  
  const streak = profile?.login_streak || 0;
  const lastLogin = profile?.last_login_date ? new Date(profile.last_login_date) : null;
  const today = new Date();
  
  const canClaimToday = !lastLogin || (
    lastLogin.getFullYear() !== today.getFullYear() ||
    lastLogin.getMonth() !== today.getMonth() ||
    lastLogin.getDate() !== today.getDate()
  );

  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const todayShownKey = `daily_reward_shown_${todayStr}`;

  useEffect(() => {
    const alreadyShownToday = localStorage.getItem(todayShownKey) === 'true';
    if (canClaimToday && profile && !alreadyShownToday && profile.id !== 'guest') {
      const timer = setTimeout(() => { 
        setIsOpen(true); 
        localStorage.setItem(todayShownKey, 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [canClaimToday, profile, todayShownKey]);

  const isModalVisible = isOpen || dailyRewardModalOpen;

  const handleClose = () => {
    setIsOpen(false);
    closeDailyRewardModal();
  };

  const handleClaim = async () => {
    // If user already claimed today, immediately notify with the exact specified text
    if (!canClaimToday) {
      toast.error('You have already claimed the reward.');
      return;
    }

    setIsClaiming(true);
    try {
      const isGuestUser = !profile || profile.id === 'guest' || profile.id.startsWith('guest');

      // Guest user bonus flow (once per day)
      if (isGuestUser) {
        const guestReward = 100;
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        toast.success(`🎁 Guest Bonus Claimed: +${guestReward} tokens!`);
        updateProfile({
          tokens: ((profile?.tokens || 0) + guestReward),
          login_streak: 1,
          last_login_date: new Date().toISOString(),
        });
        setTimeout(handleClose, 1500);
        return;
      }

      // 1. Primary: Try remote Supabase Edge Function
      let claimedViaEdge = false;
      let rewardTokens = 100;
      let rewardXP = 100;
      let newStreak = 1;
      let newTokens = (profile.tokens || 0) + 100;
      let newXP = (profile.xp || 0) + 100;
      let newLevel = profile.level || 1;

      try {
        const { data, error } = await supabase.functions.invoke('daily-reward');
        if (!error && data && data.success) {
          claimedViaEdge = true;
          rewardTokens = data.reward;
          rewardXP = data.xp || 100;
          newStreak = data.newStreak;
          newTokens = data.newTokens;
          newXP = data.newXP;
          newLevel = data.newLevel;
        } else if (data?.error && (data.error.includes('Already claimed') || data.error.includes('Conflict'))) {
          toast.error('You have already claimed the reward.');
          updateProfile({
            last_login_date: new Date().toISOString(),
          });
          handleClose();
          return;
        }
      } catch (edgeErr) {
        console.warn('[DailyRewards] Edge function invoke unavailable, switching to resilient server fallback:', edgeErr);
      }

      // 2. Resilient Server Fallback: If Edge function failed or is unconfigured
      if (!claimedViaEdge) {
        // Double check on server table if already claimed today
        try {
          const todayDateOnly = new Date().toISOString().split('T')[0];
          const { data: existingClaim } = await (supabase.from('daily_rewards') as any)
            .select('id, claimed_at')
            .eq('user_id', profile.id)
            .gte('claimed_at', `${todayDateOnly}T00:00:00.000Z`)
            .limit(1);

          if (existingClaim && existingClaim.length > 0) {
            toast.error('You have already claimed the reward.');
            updateProfile({
              last_login_date: new Date().toISOString(),
            });
            handleClose();
            return;
          }
        } catch (checkErr) {
          console.warn('[DailyRewards] Server check note:', checkErr);
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const isConsecutive = lastLogin && 
          lastLogin.getFullYear() === yesterday.getFullYear() &&
          lastLogin.getMonth() === yesterday.getMonth() &&
          lastLogin.getDate() === yesterday.getDate();

        newStreak = isConsecutive ? (streak + 1) : 1;
        const dayIdx = ((newStreak - 1) % REWARD_AMOUNTS.length);
        rewardTokens = REWARD_AMOUNTS[dayIdx] || 100;
        rewardXP = 100;
        newTokens = (profile.tokens || 0) + rewardTokens;
        newXP = (profile.xp || 0) + rewardXP;
        newLevel = Math.min(Math.floor(newXP / 500) + 1, 100);

        // Store login and claim info on the server
        try {
          await (supabase.from('users') as any).update({
            login_streak: newStreak,
            last_login_date: today.toISOString(),
            last_login: today.toISOString(),
            tokens: newTokens,
            xp: newXP,
            level: newLevel
          }).eq('id', profile.id);

          await (supabase.from('daily_rewards') as any).insert({
            user_id: profile.id,
            day_number: dayIdx + 1,
            tokens: rewardTokens,
            claimed_at: today.toISOString()
          });
        } catch (dbErr) {
          console.warn('[DailyRewards] Fallback database record note:', dbErr);
        }
      }

      // Update local profile state and celebrate
      updateProfile({
        tokens: newTokens,
        login_streak: newStreak,
        last_login_date: new Date().toISOString(),
        last_login: new Date().toISOString(),
        xp: newXP,
        level: newLevel
      });

      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      const dayDisplay = ((newStreak - 1) % REWARD_AMOUNTS.length) + 1;
      toast.success(`🎉 Day ${dayDisplay} Claimed! +${rewardTokens} Tokens & +${rewardXP} XP!`);
      setTimeout(handleClose, 1800);
    } catch (e: any) {
      console.error('[DailyRewards] Claim error:', e);
      toast.error('Could not complete reward claim. Please retry.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isModalVisible) return null;

  const displayStreak = canClaimToday ? streak + 1 : Math.max(streak, 1);
  const currentDayIndex = ((displayStreak - 1) % REWARD_AMOUNTS.length);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#0b1329] border-2 border-cyan-500/40 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-cyan-500/20 max-w-md w-full relative overflow-hidden"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />

          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all z-20 border border-white/10"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          
          <div className="text-center mb-6 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
              <Gift className="text-cyan-400" size={32} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide flex items-center justify-center gap-2">
                Daily Rewards <Sparkles size={20} className="text-amber-400" />
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">v2.5 AAA</span>
            </div>
            <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-2 mt-1">
              <Calendar size={15} className="text-cyan-400" /> Current Streak: <span className="text-cyan-300 font-bold">{streak} Days</span>
            </p>
          </div>

          {/* Reward Grid */}
          <div className="grid grid-cols-4 gap-2.5 mb-6 relative z-10">
            {REWARD_AMOUNTS.map((amt, idx) => {
              const isPast = idx < currentDayIndex && streak > 0 && !canClaimToday;
              const isCurrent = idx === currentDayIndex;
              
              return (
                <div 
                  key={idx}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    isCurrent ? 'border-cyan-400 bg-cyan-500/25 scale-105 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/50' : 
                    isPast ? 'border-emerald-500/50 bg-emerald-500/15 opacity-80' : 
                    'border-slate-800 bg-slate-900/60 opacity-60'
                  } ${idx === 6 ? 'col-span-2' : ''}`}
                >
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Day {idx + 1}
                  </div>
                  <div className={`font-black flex items-center gap-1 ${
                    isCurrent ? 'text-cyan-300 text-lg' : isPast ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {idx === 6 && <Trophy size={14} className="text-amber-400" />}
                    +{amt}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">Tokens</span>
                  {isPast && (
                    <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 rounded-full p-0.5 shadow-md shadow-emerald-500/40">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 relative z-10">
            <Button
              variant="ghost"
              className="flex-1 py-3 text-slate-400 hover:text-white rounded-xl border border-white/5"
              onClick={handleClose}
            >
              Later
            </Button>
            <Button
              variant="primary"
              className="flex-[2] py-3.5 font-black text-base shadow-lg shadow-cyan-500/30 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white cursor-pointer disabled:opacity-50"
              onClick={handleClaim}
              disabled={isClaiming}
            >
              {isClaiming ? 'Claiming Reward...' : canClaimToday ? 'Claim Daily Reward' : 'Already Claimed Today'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
