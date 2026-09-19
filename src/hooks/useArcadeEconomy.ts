import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/authStore';
import { secureRecordGameResult } from '@/lib/secureEconomy';

export function useArcadeEconomy(gameState: string | boolean, winCondition: string | boolean) {
  const { profile, updateProfile } = useAuthStore();
  const rewarded = useRef(false);

  useEffect(() => {
    if (gameState === winCondition && !rewarded.current && profile && !profile.id.startsWith('guest')) {
      rewarded.current = true;
      secureRecordGameResult({
        userId: profile.id,
        betAmount: 0,
        earnedAmount: 50, // Small arcade win token reward
        xpEarned: 100 // XP reward for playing
      }).then((res) => {
        if (res.data) {
          updateProfile({ tokens: res.data });
        }
      }).catch(console.error);
    }
    
    // Reset if game goes out of win condition (e.g. restart)
    if (gameState !== winCondition) {
      rewarded.current = false;
    }
  }, [gameState, winCondition, profile, updateProfile]);
}
