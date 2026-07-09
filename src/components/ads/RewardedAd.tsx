// src/components/ads/RewardedAd.tsx
// Rewarded video ad modal — earn tokens for watching

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gift, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/authStore';
import { invokeEdgeFunction } from '@/lib/supabase';
import { isMockAds, showMockAd } from './adConfig';
import type { AdRewardResult } from '@/types/database';
import toast from 'react-hot-toast';

interface RewardedAdProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (tokens: number) => void;
  triggerReason?: string;  // e.g., "free spin", "bonus tokens"
}

export function RewardedAd({ isOpen, onClose, onRewardEarned, triggerReason = 'bonus tokens' }: RewardedAdProps) {
  const { supabaseUser, refreshProfile } = useAuthStore();
  const [phase, setPhase] = useState<'prompt' | 'watching' | 'complete' | 'error'>('prompt');
  const [countdown, setCountdown] = useState(5);
  const [tokensEarned, setTokensEarned] = useState(0);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('prompt');
      setCountdown(5);
      setTokensEarned(0);
    }
  }, [isOpen]);

  // Countdown timer during ad
  useEffect(() => {
    if (phase !== 'watching') return;
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleWatchAd = async () => {
    setPhase('watching');
    setCountdown(5);

    try {
      // Show ad (mock or real)
      const success = await showMockAd({
        adType: 'rewarded',
        network: isMockAds ? 'mock' : 'applovin',
        onComplete: (ok) => {
          if (!ok) setPhase('error');
        },
      });

      if (!success) {
        setPhase('error');
        return;
      }

      // Award tokens via Edge Function (server-side anti-cheat)
      if (supabaseUser) {
        const { data, error } = await invokeEdgeFunction<AdRewardResult>('ad-reward', {
          ad_type: 'rewarded',
          network: isMockAds ? 'mock' : 'applovin',
          completed: true,
        });

        if (error || !data?.success) {
          if (data?.limit_reached) {
            toast.error('Daily ad limit reached! Come back tomorrow.');
          }
          setPhase('error');
          return;
        }

        setTokensEarned(data.tokens_awarded);
        onRewardEarned(data.tokens_awarded);
        await refreshProfile();
      } else {
        // Guest mode — local token award only
        setTokensEarned(50);
        onRewardEarned(50);
      }

      setPhase('complete');
    } catch {
      setPhase('error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={phase !== 'watching'}>
      <AnimatePresence mode="wait">
        {phase === 'prompt' && (
          <motion.div
            key="prompt"
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gold-neon/15 border border-gold-neon/30 flex items-center justify-center mx-auto">
              <Gift size={28} className="text-gold-neon" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-1">
                Watch & Earn
              </h3>
              <p className="text-text-secondary text-sm">
                Watch a short video to earn <span className="text-cyan-neon font-semibold">50 bonus tokens</span> for {triggerReason}!
              </p>
            </div>

            {/* Ad duration indicator */}
            <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2">
              <Clock size={16} className="text-muted" />
              <span className="text-sm text-text-secondary">~5 second video ad</span>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="gold" fullWidth onClick={handleWatchAd} id="watch-ad-btn">
                <Play size={16} /> Watch Ad (+50 Tokens)
              </Button>
              <Button variant="ghost" fullWidth onClick={onClose}>
                No thanks
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'watching' && (
          <motion.div
            key="watching"
            className="text-center space-y-4 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Simulated ad screen */}
            <div className="aspect-video rounded-xl bg-navy-800 border border-navy-600 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Simulated ad content */}
              <div className="absolute inset-0 bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-2">📺</div>
                  <p className="text-text-secondary text-sm">Advertisement</p>
                  {/* Progress bar */}
                  <div className="mt-3 w-32 h-1 bg-navy-600 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-neon rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 5, ease: 'linear' }}
                    />
                  </div>
                </div>
              </div>

              {/* Countdown */}
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-navy-900/80 flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-text-primary">{countdown}</span>
              </div>
            </div>
            <p className="text-text-secondary text-sm">Please watch the full ad to earn your reward...</p>
          </motion.div>
        )}

        {phase === 'complete' && (
          <motion.div
            key="complete"
            className="text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="text-6xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, times: [0, 0.7, 1] }}
            >
              🎉
            </motion.div>
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-1">Reward Earned!</h3>
              <p className="text-3xl font-display font-bold text-neon-cyan">+{tokensEarned}</p>
              <p className="text-text-secondary text-sm mt-1">tokens added to your wallet</p>
            </div>
            <Button variant="primary" fullWidth onClick={onClose} id="claim-reward-btn">
              Awesome! Collect
            </Button>
          </motion.div>
        )}

        {phase === 'error' && (
          <motion.div
            key="error"
            className="text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-4xl">😔</div>
            <div>
              <h3 className="font-display text-lg font-bold text-text-primary mb-1">Ad Failed</h3>
              <p className="text-text-secondary text-sm">The ad couldn't load. Please try again later.</p>
            </div>
            <Button variant="ghost" fullWidth onClick={onClose}>Close</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
