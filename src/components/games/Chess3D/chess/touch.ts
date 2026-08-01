import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function triggerHaptic(type: 'pickup' | 'move' | 'capture' | 'check' | 'click') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (type) {
        case 'click':
          navigator.vibrate(5);
          break;
        case 'pickup':
          navigator.vibrate(10);
          break;
        case 'move':
          navigator.vibrate(15);
          break;
        case 'capture':
          navigator.vibrate(25);
          break;
        case 'check':
          navigator.vibrate([30, 40, 30]);
          break;
      }
    } catch {
      // Ignore if blocked or unsupported
    }
  }
}

export class TouchController {
  private element: HTMLElement;
  private controls: OrbitControls;
  private isMultiTouch: boolean = false;
  private initialPinchDist: number = 0;
  private initialAngle: number = 0;
  private lastPinchDist: number = 0;
  private lastAngle: number = 0;

  constructor(element: HTMLElement, controls: OrbitControls) {
    this.element = element;
    this.controls = controls;

    this.element.style.touchAction = 'none';
    this.bindEvents();
  }

  private bindEvents() {
    this.element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  }

  private getTouchAngle(t1: Touch, t2: Touch): number {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.atan2(dy, dx);
  }

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      this.isMultiTouch = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      this.initialPinchDist = this.getTouchDistance(t1, t2);
      this.lastPinchDist = this.initialPinchDist;

      this.initialAngle = this.getTouchAngle(t1, t2);
      this.lastAngle = this.initialAngle;
    } else {
      this.isMultiTouch = false;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && this.isMultiTouch) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const currentDist = this.getTouchDistance(t1, t2);
      const currentAngle = this.getTouchAngle(t1, t2);

      // Pinch to Zoom
      if (this.lastPinchDist > 0) {
        const factor = currentDist / this.lastPinchDist;
        if (factor > 1) {
          this.controls.dollyIn(factor);
        } else if (factor < 1) {
          this.controls.dollyOut(1 / factor);
        }
      }

      // Two-Finger Rotate
      let deltaAngle = currentAngle - this.lastAngle;
      while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

      this.controls.rotateLeft(deltaAngle);

      this.lastPinchDist = currentDist;
      this.lastAngle = currentAngle;

      this.controls.update();
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.isMultiTouch = false;
    }
  };

  public dispose() {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchEnd);
  }
}
