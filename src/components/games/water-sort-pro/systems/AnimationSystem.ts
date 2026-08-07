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
    const distance = Math.abs(target.x - source.x);
    
    // Calculate arc apex
    const startX = source.x;
    const startY = source.y;
    
    const pourX = target.x - (dir * 25);
    const pourY = target.y - 70;

    const tl = gsap.timeline({ onComplete });
    
    // 1. LIFT & MOVE TO POSITION (Anticipation)
    tl.to(source, {
      x: pourX,
      y: pourY,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 0.35,
      ease: 'power2.out'
    });

    // 2. ROTATE (Pour Prepare)
    tl.to(source, {
      rotation: dir * 1.5,
      duration: 0.3,
      ease: 'power1.inOut'
    });

    // 3. STREAM & IMPACT (Hold pour state while liquid transfers)
    // We would fire particle effects here via ParticleSystem
    tl.add(() => {
      // Simulate splash at target
      ParticleSystem.emitSplash(target.x, target.y - 50);
    });
    
    tl.to(source, {
      rotation: dir * 1.6, // Slight drift during pour
      duration: 0.4,
      ease: 'sine.inOut'
    });

    // 4. SETTLE & RETURN
    tl.to(source, {
      rotation: 0,
      duration: 0.3,
      ease: 'power2.in'
    });
    
    tl.to(source, {
      x: startX,
      y: startY,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.4,
      ease: 'bounce.out'
    }, "-=0.1"); // Overlap the movement with the un-rotation
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
