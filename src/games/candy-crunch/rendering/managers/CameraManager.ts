import * as THREE from 'three';
import { AnimationEngine, Easing } from './AnimationEngine';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private animationEngine: AnimationEngine;

  constructor(camera: THREE.PerspectiveCamera, animationEngine: AnimationEngine) {
    this.camera = camera;
    this.animationEngine = animationEngine;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // Phase 11: Dynamic Camera Framing
  public frameBoard(rows: number, cols: number) {
    const maxDim = Math.max(rows, cols);
    // Base distance is 10.5 for an 8x8 board. Add 1.35 for each extra row/col.
    const targetZ = 10.5 + Math.max(0, maxDim - 8) * 1.35;
    
    this.animationEngine.to(
      this.camera.position,
      'z',
      targetZ,
      1.5,
      Easing.QuadraticOut
    );

    this.animationEngine.to(
      this.camera.position,
      'y',
      -1.2 - Math.max(0, maxDim - 8) * 0.1, // Slight tilt down for bigger boards
      1.5,
      Easing.QuadraticOut
    );
  }

  public performComboEmphasis() {
    const originalZ = this.camera.position.z;
    // Slight zoom in
    this.animationEngine.to(this.camera.position, 'z', originalZ - 1.5, 0.4, Easing.QuadraticOut, 0, () => {
      // Zoom back out
      this.animationEngine.to(this.camera.position, 'z', originalZ, 0.8, Easing.QuadraticInOut);
    });
  }
}
