import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Coins, Flame } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuthStore } from '@/features/authStore';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function DailyRewardModal() {
  const { profile, updateProfile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    // Check if we need to show the daily reward modal
    // i.e., last_login_date is not today
    const checkDailyReward = () => {
      const now = new Date();
      const lastLogin = profile.last_login_date ? new Date(profile.last_login_date) : null;
      
      if (!lastLogin || lastLogin.toDateString() !== now.toDateString()) {
        setIsOpen(true);
      }
    };
    
    // Small delay so it doesn't pop up instantly on load
    const timer = setTimeout(checkDailyReward, 1500);
    return () => clearTimeout(timer);
  }, [profile?.last_login_date]);

  const claimReward = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/daily-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim reward');
      }

      toast.success(`Claimed ${data.reward} tokens and ${data.xp} XP!`);
      
      // Update local profile state
      if (profile) {
        updateProfile({
          tokens: data.newTokens,
          xp: data.newXP,
          level: data.newLevel,
          login_streak: data.newStreak,
          last_login_date: new Date().toISOString()
        });
      }
      
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error claiming daily reward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            className="relative w-full max-w-sm glass-card rounded-2xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="p-6 text-center space-y-4">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-navy-700/50 transition-colors text-text-muted hover:text-text-primary"
              >
                <X size={20} />
              </button>

              <div className="mx-auto w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mb-2">
                <Gift className="text-neon-cyan w-8 h-8" />
              </div>

              <h2 className="font-display text-2xl font-bold text-text-primary">
                Daily Reward!
              </h2>
              
              <p className="text-sm text-text-secondary">
                Log in every day to earn bonus tokens and XP. Don't break your streak!
              </p>

              <div className="flex items-center justify-center gap-3 text-sm py-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-800">
                  <Flame size={16} className="text-warn" />
                  <span className="font-medium">Day {(profile?.login_streak || 0) + 1}</span>
                </div>
              </div>

              <Button
                variant="neon"
                fullWidth
                size="lg"
                onClick={claimReward}
                loading={loading}
                className="mt-4"
              >
                <Coins size={18} className="mr-2" />
                Claim Reward
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
