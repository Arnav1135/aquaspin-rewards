import gsap from 'gsap';
import { Container } from 'pixi.js';

export class AnimationSystem {
  static bounceSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    gsap.to(target, { 
      y: originalY - 20, 
      duration: 0.3, 
      ease: 'back.out(1.5)' 
    });
  }

  static resetSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    gsap.to(target, { 
      y: originalY, 
      duration: 0.3, 
      ease: 'power2.out' 
    });
  }

  static animatePour(source: Container, target: Container, onComplete: () => void) {
    // A simplified pour animation simulating tilt
    const tl = gsap.timeline({ onComplete });
    
    // Lift up and move slightly towards target
    tl.to(source, {
      y: source.y - 40,
      x: source.x + (target.x > source.x ? 20 : -20),
      rotation: target.x > source.x ? 0.5 : -0.5,
      duration: 0.2,
      ease: 'power1.inOut'
    });

    // Hold pour
    tl.to(source, {
      duration: 0.3
    });

    // Reset
    tl.to(source, {
      y: source.y,
      x: source.x,
      rotation: 0,
      duration: 0.3,
      ease: 'bounce.out'
    });
  }

  static animateLiquidFill(liquidNode: Container, fromY: number, toY: number, duration = 0.4) {
    liquidNode.y = fromY;
    gsap.to(liquidNode, {
      y: toY,
      duration,
      ease: 'bounce.out'
    });
  }
}
