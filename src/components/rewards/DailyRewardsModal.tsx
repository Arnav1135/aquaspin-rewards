import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDailyRewardsStore } from '@/features/dailyRewardsStore';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';
import { Gift, Calendar, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

const REWARD_AMOUNTS = [100, 200, 300, 500, 750, 1000, 2500];

export function DailyRewardsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const canClaimToday = useDailyRewardsStore(s => s.canClaimToday());
  const claimReward = useDailyRewardsStore(s => s.claimReward);
  const streak = useDailyRewardsStore(s => s.streak);
  const updateProfile = useAuthStore(s => s.updateProfile);
  const profile = useAuthStore(s => s.profile);

  useEffect(() => {
    // Show modal automatically if they can claim today
    if (canClaimToday && profile) {
      const timer = setTimeout(() => setIsOpen(true), 1500); // Slight delay after login
      return () => clearTimeout(timer);
    }
  }, [canClaimToday, profile]);

  const handleClaim = () => {
    const amount = claimReward();
    
    // Fire confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#facc15', '#60a5fa']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#facc15', '#60a5fa']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    if (profile) {
      (updateProfile as any)({ tokens: profile.tokens + amount });
    }
    
    toast.success(`Claimed ${amount} tokens! Day ${streak + 1} streak!`);
    
    setTimeout(() => {
      setIsOpen(false);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-navy-900 border border-navy-600 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 border border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                <Gift className="w-10 h-10 text-yellow-500" />
              </div>
              
              <h2 className="text-3xl font-black text-white mb-2">Daily Login Bonus</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                Come back every day to claim your tokens. Build your streak for massive weekend multipliers!
              </p>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 w-full mb-8">
                {REWARD_AMOUNTS.map((amt, idx) => {
                  const isPast = idx < streak;
                  const isToday = idx === streak;
                  const isFuture = idx > streak;
                  
                  return (
                    <div 
                      key={idx}
                      className={`
                        flex flex-col items-center justify-center p-3 rounded-xl border relative
                        ${isPast ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : ''}
                        ${isToday ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : ''}
                        ${isFuture ? 'bg-navy-800 border-navy-700 text-slate-500' : ''}
                      `}
                    >
                      <div className="text-xs font-bold mb-1 uppercase tracking-wider">Day {idx + 1}</div>
                      <div className="font-black text-lg">{amt}</div>
                      
                      {isPast && (
                        <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-black">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {canClaimToday ? (
                <Button 
                  variant="neon" 
                  size="lg" 
                  className="w-full sm:w-auto px-16 py-6 text-xl font-black shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                  onClick={handleClaim}
                >
                  CLAIM {REWARD_AMOUNTS[streak]} TOKENS
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="w-full sm:w-auto px-16 py-6 text-xl font-bold bg-navy-800 text-slate-400 cursor-not-allowed"
                  disabled
                >
                  COME BACK TOMORROW
                </Button>
              )}

              {!canClaimToday && (
                 <Button variant="ghost" className="mt-4 text-slate-500" onClick={() => setIsOpen(false)}>Close</Button>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
