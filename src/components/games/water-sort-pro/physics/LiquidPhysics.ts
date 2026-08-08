import { Container, Ticker } from 'pixi.js';

/**
 * Visual liquid-motion helper.
 *
 * The previous implementation accumulated a sine-wave offset directly into
 * Graphics.y on every frame. That caused the liquid mask/segments to drift
 * over time and produced a visibly unstable fluidity pattern.
 *
 * Pouring is already driven by AnimationSystem. Keep this helper deterministic
 * and non-destructive: no cumulative transforms, no random motion, and no
 * mutation of liquid geometry every frame.
 */
export class LiquidPhysics {
  static applyWaveEffect(_container: Container, _ticker: Ticker) {
    // Intentionally no-op. Liquid volume and pour motion are authoritative.
  }
}
