// src/lib/abTesting.ts
import { Tracking } from './tracking';

type FeatureFlags = {
  enableNewCrashUI: boolean;
  enableDynamicHouseEdge: boolean;
  onboardingVariation: 'A' | 'B' | 'C';
};

const DEFAULT_FLAGS: FeatureFlags = {
  enableNewCrashUI: false,
  enableDynamicHouseEdge: false,
  onboardingVariation: 'A'
};

export const ABTesting = {
  /**
   * Evaluates feature flags for a specific user deterministically
   */
  getFlags(userId: string): FeatureFlags {
    // In a real app, this would use an LD/LaunchDarkly client or fetch from DB
    // Here we do a deterministic pseudo-random hash to assign buckets
    const hash = this.simpleHash(userId);
    
    const flags = { ...DEFAULT_FLAGS };
    
    // Example: 50% rollout for new Crash UI
    if (hash % 100 < 50) {
      flags.enableNewCrashUI = true;
    }

    // A/B/C split
    const bucket = hash % 3;
    flags.onboardingVariation = bucket === 0 ? 'A' : bucket === 1 ? 'B' : 'C';

    Tracking.identify(userId, { abTests: flags });
    return flags;
  },

  simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
};
