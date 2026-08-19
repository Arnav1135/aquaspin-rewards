import * as THREE from 'three';
import { AnimationEngine, Easing } from './AnimationEngine';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private animationEngine: AnimationEngine;

  private basePosition = new THREE.Vector3(0, -1.2, 10.5);
  private shakeOffset = new THREE.Vector3(0, 0, 0);

  private shakeDuration = 0;
  private shakeIntensity = 0;

  constructor(camera: THREE.PerspectiveCamera, animationEngine: AnimationEngine) {
    this.camera = camera;
    this.animationEngine = animationEngine;
    this.basePosition.copy(camera.position);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // Phase 17 & 21: Dynamic Camera Framing for Dynamic Boards
  public frameBoard(rows: number, cols: number) {
    const maxDim = Math.max(rows, cols);
    const targetZ = 10.5 + Math.max(0, maxDim - 8) * 1.35;
    const targetY = -1.2 - Math.max(0, maxDim - 8) * 0.1;

    this.basePosition.set(0, targetY, targetZ);

    this.animationEngine.to(this.camera.position, 'z', targetZ, 1.2, Easing.QuadraticOut);
    this.animationEngine.to(this.camera.position, 'y', targetY, 1.2, Easing.QuadraticOut);
  }

  // Phase 17: Camera Punch on Matches
  public punchCamera(intensity: number = 0.4) {
    const currentZ = this.basePosition.z;
    this.animationEngine.to(this.camera.position, 'z', currentZ - intensity * 1.2, 0.12, Easing.QuadraticOut, 0, () => {
      this.animationEngine.to(this.camera.position, 'z', currentZ, 0.25, Easing.ElasticOut);
    });
  }

  // Phase 17: Screen Shake on Explosion / Special Combo
  public shakeCamera(duration: number = 0.5, intensity: number = 0.6) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  // Phase 17: Victory Camera Transition
  public triggerVictoryCamera() {
    this.animationEngine.to(this.camera.position, 'z', 8.0, 1.5, Easing.QuadraticOut);
    this.animationEngine.to(this.camera.position, 'y', 0.5, 1.5, Easing.QuadraticOut);
  }

  public update(delta: number) {
    // Process Screen Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        0
      );

      this.camera.position.x = this.basePosition.x + this.shakeOffset.x;
      this.camera.position.y = this.basePosition.y + this.shakeOffset.y;

      if (this.shakeDuration <= 0) {
        this.camera.position.x = this.basePosition.x;
        this.camera.position.y = this.basePosition.y;
      }
    } else {
      // Subtle Idle Drift
      const time = Date.now() * 0.001;
      this.camera.position.x = this.basePosition.x + Math.sin(time * 0.8) * 0.08;
      this.camera.position.y = this.basePosition.y + Math.cos(time * 0.6) * 0.05;
    }
  }
}
