// src/lib/tracking.ts
// Mock implementations for Mixpanel / Sentry to fulfill Phase 4

export const Tracking = {
  /**
   * Identifies the user in the analytics system
   */
  identify(userId: string, traits?: Record<string, any>) {
    console.log(`[Mixpanel Stub] Identify user: ${userId}`, traits);
  },

  /**
   * Tracks a specific event
   */
  track(eventName: string, properties?: Record<string, any>) {
    console.log(`[Mixpanel Stub] Track Event: ${eventName}`, properties);
  },

  /**
   * Captures an error and sends it to Sentry
   */
  captureException(error: Error, extra?: Record<string, any>) {
    console.error(`[Sentry Stub] Exception captured:`, error, extra);
  }
};
