import { Tracking } from './tracking';

export interface SecurityEvent {
  type: 'RATE_LIMIT' | 'ANOMALY_DETECTED';
  userId: string;
  game: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  details: Record<string, any>;
}

export const SecurityEngine = {
  // In-memory buckets for token-bucket rate limiting
  _buckets: new Map<string, { tokens: number; lastRefill: number }>(),
  
  // Track last bet amount to detect massive spikes
  _lastBetSizes: new Map<string, number>(),

  // Token bucket config
  RATE_LIMIT_CAPACITY: 10, // Max requests burst
  RATE_LIMIT_REFILL_RATE: 2, // Requests per second

  /**
   * Check if a user action is allowed under rate limits
   * Returns true if allowed, false if blocked
   */
  checkRateLimit(userId: string, actionType: string): boolean {
    const key = `${userId}:${actionType}`;
    const now = Date.now();
    let bucket = this._buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.RATE_LIMIT_CAPACITY, lastRefill: now };
      this._buckets.set(key, bucket);
    }

    // Refill bucket based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const addedTokens = elapsedSeconds * this.RATE_LIMIT_REFILL_RATE;
    
    bucket.tokens = Math.min(this.RATE_LIMIT_CAPACITY, bucket.tokens + addedTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true; // Allowed
    }

    // Blocked
    this.logSecurityEvent({
      type: 'RATE_LIMIT',
      userId,
      game: actionType,
      severity: 'LOW',
      details: {
        message: 'Action blocked by rate limiter'
      }
    });

    return false;
  },

  /**
   * Detects unusual betting patterns, e.g. massive sudden spikes in wager amounts
   * Returns true if anomalous, false if normal
   */
  detectAnomaly(userId: string, game: string, wager: number): boolean {
    const key = `${userId}:${game}`;
    const lastWager = this._lastBetSizes.get(key);

    // Update last wager history
    this._lastBetSizes.set(key, wager);

    // Check for 10x spikes (if previous wager was > 100 tokens to ignore micro-bets)
    if (lastWager && lastWager > 100 && wager > lastWager * 10) {
      this.logSecurityEvent({
        type: 'ANOMALY_DETECTED',
        userId,
        game,
        severity: 'MEDIUM',
        details: {
          message: 'Anomalous bet size spike detected',
          lastWager,
          currentWager: wager,
          multiplier: wager / lastWager
        }
      });
      return true; // Anomalous (could flag for manual review, but still process it)
    }

    // Prevent negative or NaN wagers
    if (wager < 0 || isNaN(wager)) {
      this.logSecurityEvent({
        type: 'ANOMALY_DETECTED',
        userId,
        game,
        severity: 'HIGH',
        details: {
          message: 'Invalid wager format detected (negative or NaN)',
          wager
        }
      });
      return true; // Anomalous and should be blocked
    }

    return false; // Normal
  },

  logSecurityEvent(event: SecurityEvent) {
    console.warn(`[SecurityEngine] ${event.type} (${event.severity}) - User: ${event.userId}`, event.details);
    Tracking.track('Security Event', event);
  }
};
