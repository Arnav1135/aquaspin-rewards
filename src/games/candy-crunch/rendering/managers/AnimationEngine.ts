export type EasingFunction = (t: number) => number;

export const Easing = {
  Linear: (t: number) => t,
  QuadraticIn: (t: number) => t * t,
  QuadraticOut: (t: number) => t * (2 - t),
  QuadraticInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  BounceOut: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  ElasticOut: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  }
};

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

  // Phase 12: Advanced Animation System
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
    
    // Auto-cancel conflicting tweens on the same property
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
