// src/engine/core/PerspectiveController.ts
export class PerspectiveController {
  private rotX = 0;
  private rotY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private isMobile = false;

  constructor() {
    this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
    this.init();
  }

  private init() {
    if (this.isMobile && typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });
    } else {
      window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    }
  }

  private handleMouseMove = (e: MouseEvent) => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    
    // Max rotation is 10 degrees for subtlety
    this.targetRotY = x * 20; 
    this.targetRotX = -y * 20;
  };

  private handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    
    // Gamma is left-to-right (-90 to 90)
    // Beta is front-to-back (-180 to 180)
    const gamma = Math.max(-45, Math.min(45, e.gamma));
    const beta = Math.max(-45, Math.min(45, e.beta - 45)); // Offset assuming user holds phone at 45deg

    this.targetRotY = (gamma / 45) * 15;
    this.targetRotX = -(beta / 45) * 15;
  };

  public update(deltaTime: number): { rotX: number, rotY: number } {
    // Lerp towards target for smooth 4D tilt effect. 
    // Normalized by deltaTime for consistent speed across refresh rates.
    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    
    this.rotX += (this.targetRotX - this.rotX) * lerpFactor;
    this.rotY += (this.targetRotY - this.rotY) * lerpFactor;

    return { rotX: this.rotX, rotY: this.rotY };
  }
}
