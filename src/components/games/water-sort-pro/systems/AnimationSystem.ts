import gsap from 'gsap';
import { Container, Graphics } from 'pixi.js';
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
  static animatePour(
    source: Container, 
    target: Container, 
    streamColor: number,
    srcLiquid: any, 
    destLiquid: any, 
    amount: number, 
    srcLen: number, 
    destLen: number,
    srcColors: number[],
    destColors: number[],
    onComplete: () => void
  ) {
    gsap.killTweensOf(source);
    
    const isRight = target.x > source.x;
    const dir = isRight ? 1 : -1;
    
    // Calculate arc apex
    const startX = source.x;
    const startY = source.y;
    
    // Move tighter towards the destination tube to simulate aiming
    const pourX = target.x - (dir * 30);
    const pourY = target.y - 80;

    const board = source.parent as Container;
    const originalScale = board.scale.x;
    const originalBoardX = board.x;

    const tl = gsap.timeline();
    
    // Stream graphics
    const stream = new Graphics();
    if (source.parent) {
      source.parent.addChild(stream);
    }
    
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

    // 2. STEEP POUR ANGLE & CINEMATIC CAMERA
    tl.to(source, {
      rotation: dir * 1.8, // Steeper pour angle
      duration: 0.2,
      ease: 'power2.inOut'
    }, "<"); // Run alongside lift

    // AAA Cinematic Camera: Micro-zoom and pan board towards destination tube
    if (source.parent) {
      const board = source.parent as Container;
      // Calculate target pan. If tube is on the right, pan board left.
      const originalScale = board.scale.x;
      const zoomScale = originalScale * 1.05;
      const panX = board.x - (target.x * (zoomScale - originalScale));

      tl.to(board, {
        scaleX: zoomScale,
        scaleY: zoomScale,
        x: panX,
        duration: 0.4,
        ease: 'power2.out'
      }, "<");
    }

    // 3. STREAM & IMPACT (Hold pour state while liquid transfers)
    const pourDuration = 0.15 + (amount * 0.15); // Scale pour time by amount
    const transferState = { progress: 0 };
    
    tl.to(transferState, {
      progress: 1,
      duration: pourDuration,
      ease: 'none',
      onStart: () => {
        // Subtle splash start
        ParticleSystem.emitSplash(target.x, target.y - 50);
      },
      onUpdate: () => {
        const p = transferState.progress;
        
        // A) Update Tube Liquids (drain source, fill dest)
        srcLiquid.setAnimatedVolume(srcLen - (p * amount), srcColors);
        
        // Dest volume starts at destLen and ends at destLen + amount
        destLiquid.setAnimatedVolume(destLen + (p * amount), destColors);
        
        // B) Draw Realistic Stream
        stream.clear();
        
        // Calculate stream start and end points dynamically
        // Source tube opening is rotated
        const cos = Math.cos(source.rotation);
        const sin = Math.sin(source.rotation);
        // Tube opening offset from pivot (approx -100 in Y when upright)
        const openX = source.x - sin * 100;
        const openY = source.y - cos * 100 + 20; // +20 to come slightly inside tube
        
        const endX = target.x;
        const endY = target.y - 90; // Top of target tube
        
        // Stream flows from openX,openY to endX,endY
        // At start of pour, stream shoots out. At end, stream recedes.
        const startP = Math.max(0, (p - 0.8) * 5); // Stream detaches from source at end
        const endP = Math.min(1, p * 5); // Stream reaches destination quickly
        
        const currentStartX = openX + (endX - openX) * startP;
        const currentStartY = openY + (endY - openY) * startP;
        
        const currentEndX = openX + (endX - openX) * endP;
        const currentEndY = openY + (endY - openY) * endP;
        
        if (endP > startP) {
           stream.moveTo(currentStartX, currentStartY);
           // Add a slight bezier curve so gravity looks real
           stream.quadraticCurveTo(currentStartX, currentEndY, currentEndX, currentEndY);
           stream.stroke({ width: 14, color: streamColor, alpha: 0.8, cap: 'round' });
           
           // Inner highlight for 3D liquid look
           stream.moveTo(currentStartX, currentStartY);
           stream.quadraticCurveTo(currentStartX, currentEndY, currentEndX, currentEndY);
           stream.stroke({ width: 6, color: 0xFFFFFF, alpha: 0.4, cap: 'round' });
        }
        
        // Splash continuously while pouring
        if (p > 0.1 && p < 0.9 && Math.random() > 0.5) {
          ParticleSystem.emitSplash(endX, endY);
        }
      }
    });
    
    // Add subtle gravity drift concurrently with the pour
    tl.to(source, {
      rotation: dir * 1.85, 
      duration: pourDuration,
      ease: 'sine.inOut'
    }, "-=" + pourDuration);

    // 4. FAST RECOVERY & RETURN
    tl.to(source, {
      rotation: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        if (stream.parent) stream.parent.removeChild(stream);
        stream.destroy();
      }
    });
    
    tl.to(source, {
      x: startX,
      y: startY,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 0.35,
      ease: 'back.out(1.5)',
      onComplete: onComplete
    }, "-=0.1"); // Overlap movement with un-rotation

    // Reset cinematic camera
    tl.to(board, {
      scaleX: originalScale,
      scaleY: originalScale,
      x: originalBoardX,
      duration: 0.4,
      ease: 'power2.out'
    }, "-=0.4");
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
