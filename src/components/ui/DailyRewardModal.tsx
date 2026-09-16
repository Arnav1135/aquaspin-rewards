import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Zap, Calendar, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export function DailyRewardModal() {
  const { profile, updateProfile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [rewardData, setRewardData] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;
    
    // Check if we already claimed today
    const now = new Date();
    const lastLogin = profile.last_login_date ? new Date(profile.last_login_date) : null;
    
    if (!lastLogin || lastLogin.toDateString() !== now.toDateString()) {
      // Don't show immediately on very first render to allow intro animations
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [profile?.last_login_date]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-reward');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRewardData(data);
      updateProfile({ 
        tokens: data.newTokens,
        xp: data.newXP,
        level: data.newLevel,
        login_streak: data.newStreak,
        last_login_date: new Date().toISOString()
      });
      toast.success('Daily Reward Claimed!');
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Already claimed today') {
        setIsOpen(false);
      } else {
        toast.error('Failed to claim daily reward.');
      }
    } finally {
      setClaiming(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setRewardData(null);
  };

  const currentStreak = profile?.login_streak || 0;
  const dayNumber = rewardData ? ((rewardData.newStreak - 1) % 7) + 1 : ((currentStreak) % 7) + 1;

  const DAILY_REWARD_SCHEDULE = [
    { day: 1, tokens: 50 },
    { day: 2, tokens: 75 },
    { day: 3, tokens: 100 },
    { day: 4, tokens: 100 },
    { day: 5, tokens: 150 },
    { day: 6, tokens: 200 },
    { day: 7, tokens: 500 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, rotateX: 10 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.9, y: 20, rotateX: 10 }}
            className="w-full max-w-lg glass-card rounded-3xl overflow-hidden shadow-2xl border border-white/20 relative"
          >
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-end z-20">
              {rewardData && (
                <button onClick={close} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="p-8 pb-4 text-center relative z-10 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/30 rounded-full blur-[80px] -z-10" />
              
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl shadow-[0_0_40px_rgba(34,211,238,0.5)] flex items-center justify-center mb-6 border border-white/20 transform rotate-12"
              >
                <Gift size={48} className="text-white -rotate-12" />
              </motion.div>

              <h2 className="text-3xl font-display font-bold text-white mb-2">
                {rewardData ? 'Reward Claimed!' : 'Daily Login Reward'}
              </h2>
              <p className="text-cyan-200/80 mb-6 font-medium">
                {rewardData 
                  ? `You received ${rewardData.reward} tokens and ${rewardData.xp} XP!` 
                  : `Claim your day ${dayNumber} reward to keep your streak alive!`}
              </p>

              {/* Streak Tracker */}
              <div className="flex items-center justify-between gap-2 mb-8 bg-black/40 p-4 rounded-2xl border border-white/5">
                {DAILY_REWARD_SCHEDULE.map((reward, i) => {
                  const isPast = rewardData ? i + 1 < dayNumber : i + 1 < dayNumber;
                  const isCurrent = i + 1 === dayNumber;
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 relative">
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500 z-10 relative
                          ${isPast ? 'bg-cyan-500 text-white border-cyan-400' : 
                            isCurrent && !rewardData ? 'bg-gradient-to-b from-yellow-400 to-amber-600 text-white border-yellow-300 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 
                            isCurrent && rewardData ? 'bg-cyan-500 text-white scale-110 shadow-[0_0_20px_rgba(6,182,212,0.8)]' : 
                            'bg-navy-800 text-white/40 border-white/10'}
                          border-2
                        `}
                      >
                        {isPast || (isCurrent && rewardData) ? <Zap size={16} fill="currentColor" /> : `Day ${i + 1}`}
                      </div>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-yellow-400' : 'text-white/40'}`}>
                        {reward.tokens}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!rewardData ? (
                <Button 
                  variant="primary" 
                  size="lg" 
                  fullWidth 
                  onClick={handleClaim} 
                  disabled={claiming}
                  className="h-14 text-lg font-bold shadow-[0_0_30px_rgba(74,144,217,0.4)]"
                >
                  {claiming ? <Loader2 className="animate-spin mx-auto" /> : 'Claim Reward'}
                </Button>
              ) : (
                <Button 
                  variant="gold" 
                  size="lg" 
                  fullWidth 
                  onClick={close}
                  className="h-14 text-lg font-bold"
                >
                  Awesome!
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
