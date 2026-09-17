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
  // Store overridden flags in memory to prevent rapid flipping
  _rollbacks: new Set<keyof FeatureFlags>(),

  /**
   * Evaluates feature flags for a specific user deterministically
   */
  getFlags(userId: string): FeatureFlags {
    const hash = this.simpleHash(userId);
    const flags = { ...DEFAULT_FLAGS };
    
    // Example: 50% rollout for new Crash UI
    if (hash % 100 < 50) {
      flags.enableNewCrashUI = true;
    }

    // A/B/C split
    const bucket = hash % 3;
    flags.onboardingVariation = bucket === 0 ? 'A' : bucket === 1 ? 'B' : 'C';

    // Apply automated rollbacks (e.g., if a feature caused massive errors)
    this._rollbacks.forEach(flag => {
      if (typeof flags[flag] === 'boolean') {
        (flags as any)[flag] = false; // Fallback to safe boolean
      } else if (flag === 'onboardingVariation') {
        flags.onboardingVariation = 'A'; // Fallback to safe control
      }
    });

    Tracking.identify(userId, { abTests: flags });
    return flags;
  },

  /**
   * Called by the LiveOps engine or ErrorBoundary to disable a failing feature
   */
  triggerRollback(flag: keyof FeatureFlags, reason: string) {
    if (this._rollbacks.has(flag)) return; // Already rolled back
    console.warn(`[LiveOps] Automated rollback triggered for feature flag: ${flag}. Reason: ${reason}`);
    this._rollbacks.add(flag);
    Tracking.track('feature_rollback', { flag, reason });
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
