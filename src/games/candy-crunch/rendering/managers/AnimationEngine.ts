export type EasingFunction = (t: number) => number;

export const Easing = {
  Linear: (t: number) => t,
  QuadraticIn: (t: number) => t * t,
  QuadraticOut: (t: number) => t * (2 - t),
  QuadraticInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  CubicOut: (t: number) => --t * t * t + 1,
  BounceOut: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  ElasticOut: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  BackOut: (t: number) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  }
};

export type AnimationProfile = 
  | 'SWAP' 
  | 'FALL' 
  | 'LAND' 
  | 'MATCH' 
  | 'SPECIAL_CREATE' 
  | 'SPECIAL_ACTIVATE' 
  | 'BOOSTER' 
  | 'VICTORY';

interface Tween {
  id: string;
  target: any;
  property: string;
  startValue: number;
  endValue: number;
  duration: number; // in seconds
  elapsed: number;
  delay: number;
  easing: EasingFunction;
  onComplete?: () => void;
  onUpdate?: (val: number) => void;
}

export class AnimationEngine {
  private tweens: Map<string, Tween> = new Map();
  private idCounter = 0;

  // Phase 8: Animation Profile Orchestration
  public animateProfile(
    group: { position: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } },
    profile: AnimationProfile,
    targetPos?: { x: number; y: number },
    onComplete?: () => void
  ) {
    switch (profile) {
      case 'SWAP':
        if (targetPos) {
          const dx = Math.abs(group.position.x - targetPos.x);
          const dy = Math.abs(group.position.y - targetPos.y);

          if (dx > 0.1) {
            this.to(group.scale, 'x', 1.3, 0.12, Easing.QuadraticOut, 0, () => {
              this.to(group.scale, 'x', 1.0, 0.12, Easing.ElasticOut);
            });
            this.to(group.scale, 'y', 0.75, 0.12, Easing.QuadraticOut, 0, () => {
              this.to(group.scale, 'y', 1.0, 0.12, Easing.ElasticOut);
            });
          } else if (dy > 0.1) {
            this.to(group.scale, 'y', 1.3, 0.12, Easing.QuadraticOut, 0, () => {
              this.to(group.scale, 'y', 1.0, 0.12, Easing.ElasticOut);
            });
            this.to(group.scale, 'x', 0.75, 0.12, Easing.QuadraticOut, 0, () => {
              this.to(group.scale, 'x', 1.0, 0.12, Easing.ElasticOut);
            });
          }

          this.to(group.position, 'x', targetPos.x, 0.25, Easing.CubicOut);
          this.to(group.position, 'y', targetPos.y, 0.25, Easing.CubicOut, 0, onComplete);
        }
        break;

      case 'FALL':
        if (targetPos) {
          // Anticipation stretch
          this.to(group.scale, 'y', 1.25, 0.15, Easing.QuadraticOut);
          this.to(group.scale, 'x', 0.8, 0.15, Easing.QuadraticOut);

          this.to(group.position, 'x', targetPos.x, 0.35, Easing.Linear);
          this.to(group.position, 'y', targetPos.y, 0.35, Easing.BounceOut, 0, () => {
            // Settle / Impact compression
            this.animateProfile(group, 'LAND', undefined, onComplete);
          });
        }
        break;

      case 'LAND':
        this.to(group.scale, 'y', 0.7, 0.1, Easing.QuadraticOut, 0, () => {
          this.to(group.scale, 'y', 1.0, 0.15, Easing.ElasticOut, 0, onComplete);
        });
        this.to(group.scale, 'x', 1.3, 0.1, Easing.QuadraticOut, 0, () => {
          this.to(group.scale, 'x', 1.0, 0.15, Easing.ElasticOut);
        });
        break;

      case 'MATCH':
        // Anticipation shrink -> Burst pop
        this.to(group.scale, 'x', 1.4, 0.15, Easing.BackOut);
        this.to(group.scale, 'y', 1.4, 0.15, Easing.BackOut);
        this.to(group.scale, 'z', 1.4, 0.15, Easing.BackOut, 0, () => {
          this.to(group.scale, 'x', 0, 0.12, Easing.QuadraticIn);
          this.to(group.scale, 'y', 0, 0.12, Easing.QuadraticIn);
          this.to(group.scale, 'z', 0, 0.12, Easing.QuadraticIn, 0, onComplete);
        });
        break;

      case 'SPECIAL_CREATE':
        group.scale.x = 0.1;
        group.scale.y = 0.1;
        group.scale.z = 0.1;
        this.to(group.scale, 'x', 1.3, 0.25, Easing.ElasticOut);
        this.to(group.scale, 'y', 1.3, 0.25, Easing.ElasticOut);
        this.to(group.scale, 'z', 1.3, 0.25, Easing.ElasticOut, 0, () => {
          this.to(group.scale, 'x', 1.0, 0.15, Easing.QuadraticOut, 0, onComplete);
          this.to(group.scale, 'y', 1.0, 0.15, Easing.QuadraticOut);
          this.to(group.scale, 'z', 1.0, 0.15, Easing.QuadraticOut);
        });
        break;

      case 'VICTORY':
        this.to(group.position, 'z', 2.0, 0.3, Easing.BackOut);
        this.to(group.scale, 'x', 1.2, 0.3, Easing.ElasticOut, 0, onComplete);
        this.to(group.scale, 'y', 1.2, 0.3, Easing.ElasticOut);
        break;

      default:
        if (targetPos) {
          this.to(group.position, 'x', targetPos.x, 0.25);
          this.to(group.position, 'y', targetPos.y, 0.25, Easing.QuadraticOut, 0, onComplete);
        }
        break;
    }
  }

  public to(
    target: any,
    property: string,
    endValue: number,
    duration: number,
    easing: EasingFunction = Easing.QuadraticOut,
    delay: number = 0,
    onComplete?: () => void,
    onUpdate?: (val: number) => void
  ): string {
    const id = `tween_${this.idCounter++}`;
    this.cancelTweensOn(target, property);

    const tween: Tween = {
      id,
      target,
      property,
      startValue: target[property],
      endValue,
      duration,
      elapsed: 0,
      delay,
      easing,
      onComplete,
      onUpdate
    };

    this.tweens.set(id, tween);
    return id;
  }

  public cancelTweensOn(target: any, property: string) {
    for (const [id, tween] of this.tweens.entries()) {
      if (tween.target === target && tween.property === property) {
        this.tweens.delete(id);
      }
    }
  }

  public update(deltaSeconds: number) {
    for (const [id, tween] of this.tweens.entries()) {
      if (tween.delay > 0) {
        tween.delay -= deltaSeconds;
        continue;
      }

      tween.elapsed += deltaSeconds;
      let t = tween.elapsed / tween.duration;
      
      if (t >= 1) {
        t = 1;
        tween.target[tween.property] = tween.endValue;
        if (tween.onUpdate) tween.onUpdate(tween.endValue);
        if (tween.onComplete) tween.onComplete();
        this.tweens.delete(id);
      } else {
        const easedT = tween.easing(t);
        const value = tween.startValue + (tween.endValue - tween.startValue) * easedT;
        tween.target[tween.property] = value;
        if (tween.onUpdate) tween.onUpdate(value);
      }
    }
  }

  public clearAll() {
    this.tweens.clear();
  }
}
