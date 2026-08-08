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
    
    const startX = source.x;
    const startY = source.y;
    
    const pourX = target.x - (dir * 30);
    const pourY = target.y - 80;

    const board = source.parent as Container;
    const originalScale = board.scale.x;
    const originalBoardX = board.x;

    const tl = gsap.timeline({ onComplete });
    
    const stream = new Graphics();
    if (source.parent) {
      source.parent.addChild(stream);
    }
    
    // TIMING CONSTANTS (As requested)
    const T = {
      move: 0.50,
      tilt: 0.45,
      anticipation: 0.15,
      // pourDuration scales with volume based on constant flow rate
      baseTransfer: 0.75,
      drain: 0.25,
      settle: 0.12,
      returnTilt: 0.40,
      returnPosition: 0.55
    };

    // Derived duration based on constant flow rate
    const perUnitDuration = 0.15;
    const transferDuration = Math.min(1.10, Math.max(0.65, T.baseTransfer + (amount - 1) * perUnitDuration));

    // 1. LIFT & MOVE INTO POSITION
    tl.to(source, {
      x: pourX,
      y: pourY,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: T.move,
      ease: 'power3.out'
    });

    // 2. ROTATION / POUR PREPARATION
    tl.to(source, {
      rotation: dir * 1.8, 
      duration: T.tilt,
      ease: 'sine.inOut'
    });

    // AAA Cinematic Camera: Pan board
    if (board) {
      const zoomScale = originalScale * 1.05;
      const panX = originalBoardX - (target.x * (zoomScale - originalScale));
      tl.to(board, {
        scaleX: zoomScale,
        scaleY: zoomScale,
        x: panX,
        duration: T.move + T.tilt,
        ease: 'power2.out'
      }, 0);
    }

    // 3. ANTICIPATION PAUSE
    tl.to({}, { duration: T.anticipation });

    // 4. FLUID MECHANICS MAIN TRANSFER (Projectile stream + Surface mass conservation)
    const pourState = { t: 0, splashFired: false };
    const totalPourTime = transferDuration + T.drain;
    
    tl.to(pourState, {
      t: 1,
      duration: totalPourTime,
      ease: 'none',
      onUpdate: () => {
        const p = pourState.t;
        
        // Fluid flow phases (0 to 1 during transfer, drain continues rendering stream detach)
        const flowP = Math.min(1, p * (totalPourTime / transferDuration)); 
        const drainP = Math.max(0, (p * totalPourTime - transferDuration) / T.drain);

        // Mass Conservation Fill
        const currentSrcLen = srcLen - (flowP * amount);
        const currentDestLen = destLen + (flowP * amount);
        
        srcLiquid.setAnimatedVolume(currentSrcLen, srcColors);
        
        // Add decayed ripple/oscillation to destination surface
        let rippleOffset = 0;
        if (flowP > 0) {
           const timeSinceHit = flowP * transferDuration;
           const amplitude = 3.0; // pixels
           const decayRate = 5.0;
           const frequency = 25.0;
           rippleOffset = amplitude * Math.exp(-decayRate * timeSinceHit) * Math.sin(frequency * timeSinceHit);
        }
        destLiquid.setAnimatedVolume(currentDestLen, destColors, rippleOffset);
        
        // Recompute dynamic stream endpoints
        const cos = Math.cos(source.rotation);
        const sin = Math.sin(source.rotation);
        const exitX = source.x - sin * 95;
        const exitY = source.y - cos * 95 + 15;
        
        // Target surface tracks the rising fluid perfectly
        // Assuming dest tube is ~100px tall. Y=0 is bottom, Y=100 is top.
        const targetSurfaceY = target.y - (currentDestLen * 20); // Scale depends on logical volume rendering
        const targetSurfaceX = target.x;

        // Projectile Stream Calculation
        stream.clear();
        if (drainP < 1) {
          // Initial horizontal velocity from tilt
          const vx = dir * 30; 
          const gravity = 800; // px/s^2
          
          // Time to fall from exitY to targetSurfaceY
          // y = 0.5 * g * t^2 -> t = sqrt(2y/g)
          const fallDistance = Math.max(10, targetSurfaceY - exitY);
          const fallTime = Math.sqrt((2 * fallDistance) / gravity);
          
          // Draw stream via segmented path
          const segments = 12;
          
          // Start cutting stream from top during drain
          const startT = drainP * fallTime;
          // Extend stream down during start
          const endT = Math.min(fallTime, flowP * transferDuration * 4);
          
          if (endT > startT) {
            let firstPoint = true;
            for (let i = 0; i <= segments; i++) {
              const segT = startT + (i / segments) * (endT - startT);
              const px = exitX + vx * segT;
              const py = exitY + 0.5 * gravity * segT * segT;
              
              if (firstPoint) {
                stream.moveTo(px, py);
                firstPoint = false;
              } else {
                stream.lineTo(px, py);
              }
            }
            
            // Conservation of mass widening/thinning
            // width = baseWidth * sqrt(initialVelocity / currentVelocity)
            stream.stroke({ width: 12 - (drainP * 10), color: streamColor, alpha: 0.85, cap: 'round', join: 'round' });
            
            // Highlight
            let firstH = true;
            for (let i = 0; i <= segments; i++) {
              const segT = startT + (i / segments) * (endT - startT);
              const px = exitX + vx * segT;
              const py = exitY + 0.5 * gravity * segT * segT;
              if (firstH) { stream.moveTo(px, py); firstH = false; }
              else { stream.lineTo(px, py); }
            }
            stream.stroke({ width: 5 - (drainP * 4), color: 0xFFFFFF, alpha: 0.5, cap: 'round', join: 'round' });
          }
          
          // Splash exactly when stream reaches target
          if (endT >= fallTime && flowP < 0.95 && !pourState.splashFired) {
             pourState.splashFired = true;
          }
          if (pourState.splashFired && drainP === 0 && Math.floor(p * 100) % 6 === 0) {
             ParticleSystem.emitSplash(targetSurfaceX, targetSurfaceY);
          }
        }
      }
    });

    // 5. SETTLE PAUSE
    tl.to({}, { duration: T.settle });

    // 6. ROTATE BACK UPRIGHT & CAMERA RESTORE
    tl.to(source, {
      rotation: 0,
      duration: T.returnTilt,
      ease: 'power2.inOut',
      onComplete: () => {
        if (stream.parent) stream.parent.removeChild(stream);
        stream.destroy();
      }
    });

    if (board) {
      tl.to(board, {
        scaleX: originalScale,
        scaleY: originalScale,
        x: originalBoardX,
        duration: T.returnTilt + T.returnPosition,
        ease: 'power2.inOut'
      }, "<");
    }

    // 7. RETURN TO ORIGINAL POSITION
    tl.to(source, {
      x: startX,
      y: startY,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: T.returnPosition,
      ease: 'power2.inOut',
      onComplete
    });
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
