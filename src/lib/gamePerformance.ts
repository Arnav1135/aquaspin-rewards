/** Shared browser-safe performance helpers for high-fidelity mini-games. */

export type QualityTier = 'ultra' | 'high' | 'medium' | 'low';

export interface QualityConfig {
  tier: QualityTier;
  pixelRatio: number;
  shadows: boolean;
  postProcessing: boolean;
  particles: number;
}

export function getInitialGameQuality(): QualityConfig {
  if (typeof window === 'undefined') {
    return { tier: 'high', pixelRatio: 1.5, shadows: true, postProcessing: true, particles: 1 };
  }

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  if (reducedMotion || cores <= 2 || memory <= 2) {
    return { tier: 'low', pixelRatio: 1, shadows: false, postProcessing: false, particles: 0.35 };
  }
  if (cores <= 4 || memory <= 4) {
    return { tier: 'medium', pixelRatio: Math.min(dpr, 1.5), shadows: true, postProcessing: false, particles: 0.65 };
  }
  if (cores >= 8 && memory >= 8) {
    return { tier: 'ultra', pixelRatio: Math.min(dpr, 2), shadows: true, postProcessing: true, particles: 1 };
  }
  return { tier: 'high', pixelRatio: Math.min(dpr, 1.75), shadows: true, postProcessing: true, particles: 0.85 };
}

/**
 * Smoothly chooses a quality tier from measured frame time.
 * Hysteresis prevents visible quality oscillation around the threshold.
 */
export function adaptQuality(current: QualityConfig, frameTimeMs: number): QualityConfig {
  const slow = frameTimeMs > 24;
  const verySlow = frameTimeMs > 34;
  const fast = frameTimeMs < 14;

  if (verySlow || (slow && current.tier === 'ultra')) return downgrade(current);
  if (fast && current.tier !== 'ultra') return upgrade(current);
  return current;
}

function downgrade(c: QualityConfig): QualityConfig {
  if (c.tier === 'ultra') return { tier: 'high', pixelRatio: Math.min(c.pixelRatio, 1.5), shadows: true, postProcessing: false, particles: 0.75 };
  if (c.tier === 'high') return { tier: 'medium', pixelRatio: Math.min(c.pixelRatio, 1.25), shadows: true, postProcessing: false, particles: 0.55 };
  if (c.tier === 'medium') return { tier: 'low', pixelRatio: 1, shadows: false, postProcessing: false, particles: 0.3 };
  return c;
}

function upgrade(c: QualityConfig): QualityConfig {
  if (c.tier === 'low') return { tier: 'medium', pixelRatio: 1.25, shadows: true, postProcessing: false, particles: 0.55 };
  if (c.tier === 'medium') return { tier: 'high', pixelRatio: 1.5, shadows: true, postProcessing: true, particles: 0.85 };
  if (c.tier === 'high') return { tier: 'ultra', pixelRatio: 2, shadows: true, postProcessing: true, particles: 1 };
  return c;
}

export function createFrameTimeSampler(windowSize = 30) {
  const samples: number[] = [];
  return {
    push(ms: number) {
      if (!Number.isFinite(ms) || ms <= 0 || ms > 250) return;
      samples.push(ms);
      if (samples.length > windowSize) samples.shift();
    },
    average() {
      if (!samples.length) return 16.67;
      return samples.reduce((sum, value) => sum + value, 0) / samples.length;
    },
    reset() { samples.length = 0; },
  };
}
