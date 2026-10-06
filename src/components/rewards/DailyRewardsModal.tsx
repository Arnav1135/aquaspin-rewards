import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Gift, Calendar, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const REWARD_AMOUNTS = [50, 75, 100, 100, 150, 200, 500];

export function DailyRewardsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoShown, setHasAutoShown] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
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

  useEffect(() => {
    if (canClaimToday && profile && !hasAutoShown && profile.id !== 'guest') {
      const timer = setTimeout(() => { setIsOpen(true); setHasAutoShown(true); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [canClaimToday, profile, hasAutoShown]);

  const handleClaim = async () => {
    if (!profile || profile.id === 'guest') {
      toast.error('Sign in to claim daily rewards!');
      return;
    }
    
    setIsClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-reward');
      if (error) throw error;
      if (data && data.success) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        toast.success(`Claimed ${data.reward} tokens and ${data.xp} XP!`);
        updateProfile({
          tokens: data.newTokens,
          login_streak: data.newStreak,
          last_login_date: new Date().toISOString(),
          xp: data.newXP,
          level: data.newLevel
        });
        setTimeout(() => setIsOpen(false), 2000);
      } else {
        toast.error(data?.error || 'Could not claim reward.');
      }
    } catch (e: any) {
      toast.error('Error claiming reward.');
      console.error(e);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  const displayStreak = canClaimToday ? streak + 1 : streak;
  const dayNumber = ((displayStreak - 1) % 7);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border-2 border-blue-500/30 p-8 rounded-3xl shadow-2xl shadow-blue-500/20 max-w-md w-full relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <Gift className="text-blue-400" size={32} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Daily Reward</h2>
            <p className="text-slate-400 font-medium flex items-center justify-center gap-2">
              <Calendar size={16} /> Current Streak: <span className="text-blue-400 font-bold">{streak} Days</span>
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-8 relative z-10">
            {REWARD_AMOUNTS.map((amt, idx) => {
              const isPast = idx < dayNumber && streak > 0;
              const isCurrent = idx === dayNumber;
              const isFuture = idx > dayNumber;
              
              return (
                <div 
                  key={idx}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                    isCurrent ? 'border-blue-500 bg-blue-500/20 scale-110 shadow-lg shadow-blue-500/20' : 
                    isPast ? 'border-emerald-500/50 bg-emerald-500/10 opacity-70' : 
                    'border-slate-800 bg-slate-800/50 opacity-50'
                  } ${idx === 6 ? 'col-span-2' : ''}`}
                >
                  <div className="text-xs font-bold text-slate-400 mb-1">Day {idx + 1}</div>
                  <div className={`font-black ${isCurrent ? 'text-blue-400 text-lg' : isPast ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {amt}
                  </div>
                  {isPast && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-0.5">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 relative z-10">
            <Button
              variant="ghost"
              className="flex-1 py-4 text-slate-400 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Later
            </Button>
            <Button
              variant="primary"
              className="flex-[2] py-4 font-bold text-lg shadow-lg shadow-blue-500/20 disabled:opacity-50"
              onClick={handleClaim}
              disabled={!canClaimToday || isClaiming}
            >
              {isClaiming ? 'Claiming...' : canClaimToday ? 'Claim Reward' : 'Come Back Tomorrow'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
