import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DailyRewardsState {
  streak: number;
  lastClaimDate: string | null; // ISO Date String of the last claim
  canClaimToday: () => boolean;
  claimReward: () => number;
}

const REWARD_AMOUNTS = [100, 200, 300, 500, 750, 1000, 2500]; // 7 day streak amounts

export const useDailyRewardsStore = create<DailyRewardsState>()(
  persist(
    (set, get) => ({
      streak: 0,
      lastClaimDate: null,

      canClaimToday: () => {
        const { lastClaimDate } = get();
        if (!lastClaimDate) return true;

        const lastClaim = new Date(lastClaimDate);
        const today = new Date();
        
        // Check if last claim was on a different day
        return (
          lastClaim.getFullYear() !== today.getFullYear() ||
          lastClaim.getMonth() !== today.getMonth() ||
          lastClaim.getDate() !== today.getDate()
        );
      },

      claimReward: () => {
        if (!get().canClaimToday()) return 0;

        const { lastClaimDate, streak } = get();
        const today = new Date();
        
        let newStreak = streak;
        
        if (lastClaimDate) {
          const lastClaim = new Date(lastClaimDate);
          const diffTime = Math.abs(today.getTime() - lastClaim.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
             // Continue streak
             newStreak = Math.min(streak + 1, 6);
          } else if (diffDays > 1) {
             // Break streak
             newStreak = 0;
          }
        }

        const rewardAmount = REWARD_AMOUNTS[newStreak];

        set({
          streak: newStreak,
          lastClaimDate: today.toISOString()
        });

        return rewardAmount;
      }
    }),
    {
      name: 'daily-rewards-storage'
    }
  )
);
