import gsap from 'gsap';
import { Container } from 'pixi.js';
import { ParticleSystem } from './ParticleSystem';

export class AnimationSystem {
  
  // Phase 1: SELECT & LIFT
  static bounceSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    // Smooth elevation with anticipation
    gsap.to(target, { 
      y: originalY - 25, 
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 0.4, 
      ease: 'back.out(1.2)' 
    });
  }

  // Phase: RETURN / DESELECT
  static resetSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    gsap.to(target, { 
      y: originalY, 
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.5, 
      ease: 'bounce.out' 
    });
  }

  // Phase C: CINEMATIC POUR
  static animatePour(source: Container, target: Container, onComplete: () => void) {
    gsap.killTweensOf(source);
    
    const isRight = target.x > source.x;
    const dir = isRight ? 1 : -1;
    
    // Calculate arc apex
    const startX = source.x;
    const startY = source.y;
    
    // Move tighter towards the destination tube to simulate aiming
    const pourX = target.x - (dir * 30);
    const pourY = target.y - 80;

    const tl = gsap.timeline({ onComplete });
    
    // 1. FAST LIFT & AIM (Anticipation)
    tl.to(source, {
      x: pourX,
      y: pourY,
      scaleX: 1.15,
      scaleY: 1.15,
      rotation: dir * 0.5, // Start tipping early
      duration: 0.25,
      ease: 'power2.out'
    });

    // 2. STEEP POUR ANGLE (Cinematic)
    tl.to(source, {
      rotation: dir * 1.8, // Steeper pour angle
      duration: 0.2,
      ease: 'power2.inOut'
    });

    // 3. STREAM & IMPACT (Hold pour state while liquid transfers)
    tl.add(() => {
      // Simulate splash at target
      ParticleSystem.emitSplash(target.x, target.y - 50);
    });
    
    tl.to(source, {
      rotation: dir * 1.85, // Subtle gravity drift
      duration: 0.35,
      ease: 'sine.inOut'
    });

    // 4. FAST RECOVERY & RETURN
    tl.to(source, {
      rotation: 0,
      duration: 0.2,
      ease: 'power2.in'
    });
    
    tl.to(source, {
      x: startX,
      y: startY,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.35,
      ease: 'back.out(1.5)'
    }, "-=0.1"); // Overlap movement with un-rotation
  }

  // Phase ERROR: SHAKE ON INVALID MOVE
  static animateShake(target: Container, originalX: number, originalY: number) {
    gsap.killTweensOf(target);
    const tl = gsap.timeline();
    
    tl.to(target, { rotation: 0.1, x: originalX + 5, duration: 0.05 })
      .to(target, { rotation: -0.1, x: originalX - 5, duration: 0.05 })
      .to(target, { rotation: 0.1, x: originalX + 5, duration: 0.05 })
      .to(target, { rotation: -0.1, x: originalX - 5, duration: 0.05 })
      .to(target, { rotation: 0, x: originalX, y: originalY, scaleX: 1.0, scaleY: 1.0, duration: 0.1, ease: 'bounce.out' });
  }

  // Layered Completion Celebration
  static triggerLevelComplete(tubes: Container[]) {
    const tl = gsap.timeline();
    
    // Sequence pop each tube
    tubes.forEach((tube, i) => {
      tl.to(tube, {
        y: tube.y - 30,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 0.2,
        ease: 'back.out'
      }, i * 0.1);
      
      tl.to(tube, {
        y: tube.y,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 0.4,
        ease: 'bounce.out'
      }, (i * 0.1) + 0.2);
    });
  }
}
