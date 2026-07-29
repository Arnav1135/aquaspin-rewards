// src/lib/reliability/animationGuard.ts
import { reliabilityCore } from './reliabilityCore';

export interface AnimationState {
  id: string;
  gameId: string;
  expectedDurationMs: number;
  startTime: number;
  resolved: boolean;
  onSoftCorrect: () => void;
}

class AnimationGuard {
  private activeAnimations: Map<string, AnimationState> = new Map();
  constructor() {
    if (typeof window !== 'undefined') {
      window.setInterval(() => this.checkStalled(), 500);
    }
  }

  public register(id: string, gameId: string, expectedDurationMs: number, onSoftCorrect: () => void) {
    this.activeAnimations.set(id, {
      id,
      gameId,
      expectedDurationMs,
      startTime: performance.now(),
      resolved: false,
      onSoftCorrect
    });
  }

  public resolve(id: string) {
    const anim = this.activeAnimations.get(id);
    if (anim) {
      anim.resolved = true;
      this.activeAnimations.delete(id);
    }
  }

  private checkStalled() {
    const now = performance.now();
    this.activeAnimations.forEach((anim, id) => {
      // 500ms grace period for lag/dropped frames
      if (!anim.resolved && (now - anim.startTime > anim.expectedDurationMs + 500)) {
        
        // Soft correct the animation to end state
        anim.onSoftCorrect();
        this.activeAnimations.delete(id);

        reliabilityCore.logEvent({
          gameId: anim.gameId,
          category: 'animation_desync',
          severity: 'low',
          details: `Animation ${id} stalled (expected ${anim.expectedDurationMs}ms, took >${Math.round(now - anim.startTime)}ms). Soft-corrected.`,
          autoCorrected: true,
          correctionApplied: `Snapped to logical end state`
        });
      }
    });
  }
}

export const animationGuard = new AnimationGuard();
