// src/lib/opportunityEngine.ts
import { Tracking } from './tracking';
import toast from 'react-hot-toast';

interface PlayerSession {
  lossesInARow: number;
  winsInARow: number;
  totalWagered: number;
  lastActionTime: number;
}

const activeSessions = new Map<string, PlayerSession>();

export const OpportunityEngine = {
  /**
   * Called when a player completes a game round.
   */
  registerGameOutcome(userId: string, gameName: string, wager: number, won: boolean, payout: number) {
    let session = activeSessions.get(userId);
    if (!session) {
      session = { lossesInARow: 0, winsInARow: 0, totalWagered: 0, lastActionTime: Date.now() };
    }

    session.totalWagered += wager;
    session.lastActionTime = Date.now();

    if (won) {
      session.winsInARow++;
      session.lossesInARow = 0;
    } else {
      session.lossesInARow++;
      session.winsInARow = 0;
    }

    activeSessions.set(userId, session);

    Tracking.track('Game Played', { gameName, wager, won, payout, streak: won ? session.winsInARow : -session.lossesInARow });

    this.analyzeOpportunities(userId, session);
  },

  /**
   * Analyzes the session to trigger interventions
   */
  analyzeOpportunities(userId: string, session: PlayerSession) {
    // Intervene on bad beats / rage quit mitigation
    if (session.lossesInARow === 4) {
      Tracking.track('Opportunity Triggered', { type: 'Loss Mitigation', userId });
      setTimeout(() => {
        toast.success("Rough streak! Here's a 25% Deposit Match to get back in the game! 🎁", { duration: 5000, icon: '🛡️' });
      }, 1500);
    }

    // Upsell on hot streaks
    if (session.winsInARow === 3) {
      Tracking.track('Opportunity Triggered', { type: 'Hot Streak Upsell', userId });
      setTimeout(() => {
        toast("You're on fire! 🔥 Upgrade to VIP to unlock higher max bets!", { duration: 5000 });
      }, 1500);
    }
  }
};
