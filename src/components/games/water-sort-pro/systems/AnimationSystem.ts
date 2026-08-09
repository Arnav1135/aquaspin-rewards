import gsap from 'gsap';
import { Container, Graphics } from 'pixi.js';
import { ParticleSystem } from './ParticleSystem';

export class AnimationSystem {
  static bounceSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    gsap.to(target, { y: originalY - 25, scaleX: 1.05, scaleY: 1.05, duration: 0.4, ease: 'back.out(1.2)' });
  }

  static resetSelection(target: Container, originalY: number) {
    gsap.killTweensOf(target);
    gsap.to(target, { y: originalY, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'bounce.out' });
  }

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
    startX: number,
    startY: number,
    onComplete: () => void,
    onDrop?: () => void
  ) {
    gsap.killTweensOf(source);

    const isRight = target.x > startX;
    const dir = isRight ? 1 : -1;
    const destTubeW = destLiquid.tubeWidth || 60;
    const destTubeH = destLiquid.tubeHeight || 220;
    const srcTubeW = srcLiquid.tubeWidth || 60;

    const board = source.parent as Container;
    const originalScale = board?.scale.x ?? 1;
    const originalBoardX = board?.x ?? 0;

    // Use global-to-local transform to find exact destination lip position
    const targetLipLocal = { x: destTubeW / 2, y: -20 };
    const targetLipGlobal = target.toGlobal(targetLipLocal);
    const targetLipBoard = board ? board.toLocal(targetLipGlobal) : { x: target.x, y: target.y - 80 };

    // Calculate source lip offset after tilt
    const rot = dir * 1.8;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const scaleFactor = 1.12;
    const pourLipX = dir === 1 ? srcTubeW - 4 : 4;
    const lipLocalX = pourLipX;
    const lipLocalY = 0;
    const scaledLipX = lipLocalX * scaleFactor;
    const scaledLipY = lipLocalY * scaleFactor;
    
    const lipOffsetX = scaledLipX * cosR - scaledLipY * sinR;
    const lipOffsetY = scaledLipX * sinR + scaledLipY * cosR;

    const pourX = targetLipBoard.x - lipOffsetX;
    const pourY = targetLipBoard.y - lipOffsetY;

    const stream = new Graphics();
    let streamMask: Graphics | null = null;
    if (source.parent) {
      source.parent.addChild(stream);
      
      streamMask = new Graphics();
      streamMask.position.copyFrom(target.position);
      streamMask.rotation = target.rotation;
      streamMask.scale.copyFrom(target.scale);
      streamMask.pivot.copyFrom(target.pivot);
      
      // Allow area above the tube (y < 0 in target's local space)
      streamMask.rect(-10000, -10000, 20000, 10000);
      
      // Allow interior of the target tube
      if (destLiquid.vesselDef && destLiquid.vesselDef.drawMask) {
        destLiquid.vesselDef.drawMask(streamMask, destTubeW, destTubeH);
      } else {
        streamMask.roundRect(2, 2, destTubeW - 4, destTubeH - 4, (destTubeW / 2) - 2);
      }
      
      streamMask.fill({ color: 0xFFFFFF });
      
      source.parent.addChild(streamMask);
      stream.mask = streamMask;
    }

    const T = {
      move: 0.50,
      tilt: 0.45,
      anticipation: 0.12,
      transfer: Math.min(1.15, Math.max(0.70, 0.70 + (amount - 1) * 0.14)),
      drain: 0.20,
      settle: 0.16,
      returnTilt: 0.40,
      returnPosition: 0.55,
    };

    const tl = gsap.timeline({ onComplete });

    tl.to(source, {
      x: pourX,
      y: pourY,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: T.move,
      ease: 'power3.out',
    });

    tl.to(source, {
      rotation: dir * 1.8,
      duration: T.tilt,
      ease: 'sine.inOut',
    });

    if (board) {
      tl.to(board, {
        scaleX: originalScale * 1.04,
        scaleY: originalScale * 1.04,
        x: originalBoardX - target.x * 0.04 * originalScale,
        duration: T.move + T.tilt,
        ease: 'power2.out',
      }, 0);
    }

    tl.to({}, { duration: T.anticipation });

    const state = { progress: 0 };
    let splashFired = false;

    tl.to(state, {
      progress: 1,
      duration: T.transfer + T.drain,
      ease: 'none',
      onUpdate: () => {
        const total = T.transfer + T.drain;
        const elapsed = state.progress * total;
        const transferP = Math.min(1, elapsed / T.transfer);
        const drainP = Math.max(0, Math.min(1, (elapsed - T.transfer) / T.drain));

        // Conservation of logical volume: every unit leaving the source is
        // simultaneously added to the receiving tube.
        const currentSrcLen = Math.max(0, srcLen - amount * transferP);
        const currentDestLen = Math.min(destLen + amount * transferP, destLen + amount);
        srcLiquid.setAnimatedVolume(currentSrcLen, srcColors);

        // One damped, deterministic surface response. It is never accumulated
        // into the liquid transform, so it cannot drift from frame to frame.
        const rippleTime = Math.max(0, elapsed - 0.12);
        const ripple = 2.5 * Math.exp(-5.5 * rippleTime) * Math.sin(18 * rippleTime);
        destLiquid.setAnimatedVolume(currentDestLen, destColors, ripple);

        // Use a stable parabolic stream path. Its endpoints track the actual
        // source and receiving surface instead of moving independently.
        const destTubeW = destLiquid.tubeWidth || 60;
        const destTubeH = destLiquid.tubeHeight || 220;
        const destCapacity = destLiquid.capacity || 4;
        const srcTubeW = srcLiquid.tubeWidth || 60;

        // 1. Calculate actual global exit point from source lip
        const pourLipX = dir === 1 ? srcTubeW - 4 : 4;
        const srcExitLocal = { x: pourLipX, y: 0 }; 
        const globalExit = source.toGlobal(srcExitLocal);
        const boardExit = board ? board.toLocal(globalExit) : globalExit;
        const exitX = boardExit.x;
        const exitY = boardExit.y;

        // 2. Calculate dynamic target surface point
        const segmentHeight = (destTubeH - destTubeW) / destCapacity;
        const destSurfaceLocalY = destTubeH - destTubeW / 2 - currentDestLen * segmentHeight;
        
        const targetSurfaceLocal = { x: destTubeW / 2, y: destSurfaceLocalY };
        const globalTargetSurface = target.toGlobal(targetSurfaceLocal);
        const boardTargetSurface = board ? board.toLocal(globalTargetSurface) : globalTargetSurface;
        const targetSurfaceX = boardTargetSurface.x;
        const targetSurfaceY = boardTargetSurface.y;

        // 3. Trajectory physics
        const dx = targetSurfaceX - exitX;
        const dy = targetSurfaceY - exitY;
        const fallDistance = Math.max(10, dy);
        const gravity = 700;
        const fallTime = Math.sqrt((2 * fallDistance) / gravity);
        const horizontalVelocity = dx / Math.max(0.001, fallTime);

        stream.clear();

        // The stream appears shortly after the tube reaches its pour angle and
        // tapers naturally as the source empties.
        const streamIn = Math.min(1, Math.max(0, (elapsed - 0.05) / 0.18));
        const streamOut = drainP;
        if (streamIn > 0 && streamOut < 1) {
          const visibleEnd = Math.min(fallTime, fallTime * (0.82 + 0.18 * transferP));
          const visibleStart = fallTime * streamOut * 0.9;
          if (visibleEnd > visibleStart) {
            const segments = 16;
            let first = true;
            for (let i = 0; i <= segments; i++) {
              const t = visibleStart + (i / segments) * (visibleEnd - visibleStart);
              const px = exitX + horizontalVelocity * t;
              const py = exitY + 0.5 * gravity * t * t;
              if (first) {
                stream.moveTo(px, py);
                first = false;
              } else {
                stream.lineTo(px, py);
              }
            }
            const taper = 1 - 0.55 * drainP;
            stream.stroke({ width: 11 * taper, color: streamColor, alpha: 0.88, cap: 'round', join: 'round' });

            first = true;
            for (let i = 0; i <= segments; i++) {
              const t = visibleStart + (i / segments) * (visibleEnd - visibleStart);
              const px = exitX + horizontalVelocity * t;
              const py = exitY + 0.5 * gravity * t * t;
              if (first) {
                stream.moveTo(px, py);
                first = false;
              } else {
                stream.lineTo(px, py);
              }
            }
            stream.stroke({ width: 4.5 * taper, color: 0xFFFFFF, alpha: 0.42, cap: 'round', join: 'round' });
          }
        }

        if (!splashFired && transferP >= 0.18) {
          splashFired = true;
          if (onDrop) onDrop();
        }
        
        // Phase 8: Premium Fluid Sim Continuous Particles
        if (transferP >= 0.18 && drainP < 1.0) {
          // Emit surface splash repeatedly
          if (Math.random() > 0.5) {
            ParticleSystem.emitSplash(target.x, targetSurfaceY);
          }
          // Mid-air droplets falling from the stream arc
          if (Math.random() > 0.7) {
             const t = Math.random() * fallTime;
             const px = exitX + horizontalVelocity * t;
             const py = exitY + 0.5 * gravity * t * t;
             ParticleSystem.emitSplash(px, py); // Using same visual for droplets
          }
        }
      },
    });

    tl.to({}, { duration: T.settle });

    tl.to(source, {
      rotation: 0,
      duration: T.returnTilt,
      ease: 'power2.inOut',
      onComplete: () => {
        if (stream.parent) {
          stream.parent.removeChild(stream);
          if (streamMask && streamMask.parent) {
            streamMask.parent.removeChild(streamMask);
            streamMask.destroy({ children: true });
          }
        }
        stream.destroy({ children: true });
      },
    });

    if (board) {
      tl.to(board, {
        scaleX: originalScale,
        scaleY: originalScale,
        x: originalBoardX,
        duration: T.returnTilt + T.returnPosition,
        ease: 'power2.inOut',
      }, '<');
    }

    tl.to(source, {
      x: startX,
      y: startY,
      scaleX: 1,
      scaleY: 1,
      duration: T.returnPosition,
      ease: 'power2.inOut',
    });
  }

  static animateShake(target: Container, originalX: number, originalY: number, onComplete?: () => void) {
    gsap.killTweensOf(target);
    const tl = gsap.timeline({ onComplete });
    tl.to(target, { rotation: 0.1, x: originalX + 5, duration: 0.05 })
      .to(target, { rotation: -0.1, x: originalX - 5, duration: 0.05 })
      .to(target, { rotation: 0.1, x: originalX + 5, duration: 0.05 })
      .to(target, { rotation: -0.1, x: originalX - 5, duration: 0.05 })
      .to(target, { rotation: 0, x: originalX, y: originalY, scaleX: 1, scaleY: 1, duration: 0.1, ease: 'bounce.out' });
  }

  static triggerLevelComplete(tubes: Container[]) {
    const tl = gsap.timeline();
    tubes.forEach((tube, i) => {
      const baseY = tube.y;
      tl.to(tube, { y: baseY - 30, scaleX: 1.1, scaleY: 1.1, duration: 0.2, ease: 'back.out' }, i * 0.1);
      tl.to(tube, { y: baseY, scaleX: 1, scaleY: 1, duration: 0.4, ease: 'bounce.out' }, i * 0.1 + 0.2);
    });
  }
}
