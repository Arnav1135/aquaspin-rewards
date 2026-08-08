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
    onComplete: () => void
  ) {
    gsap.killTweensOf(source);

    const isRight = target.x > source.x;
    const dir = isRight ? 1 : -1;
    const startX = source.x;
    const startY = source.y;
    const pourX = target.x - dir * 30;
    const pourY = target.y - 80;
    const board = source.parent as Container;
    const originalScale = board?.scale.x ?? 1;
    const originalBoardX = board?.x ?? 0;

    const stream = new Graphics();
    if (source.parent) source.parent.addChild(stream);

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
        const cos = Math.cos(source.rotation);
        const sin = Math.sin(source.rotation);
        const exitX = source.x - sin * 95;
        const exitY = source.y - cos * 95 + 15;
        const tubeHeight = 100;
        const targetSurfaceY = target.y + tubeHeight / 2 - currentDestLen * 20;
        const fallDistance = Math.max(24, targetSurfaceY - exitY);
        const gravity = 700;
        const fallTime = Math.sqrt((2 * fallDistance) / gravity);
        const horizontalVelocity = dir * 26;

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
          ParticleSystem.emitSplash(target.x, targetSurfaceY);
        }
      },
    });

    tl.to({}, { duration: T.settle });

    tl.to(source, {
      rotation: 0,
      duration: T.returnTilt,
      ease: 'power2.inOut',
      onComplete: () => {
        if (stream.parent) stream.parent.removeChild(stream);
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

  static animateShake(target: Container, originalX: number, originalY: number) {
    gsap.killTweensOf(target);
    const tl = gsap.timeline();
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
