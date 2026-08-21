// Phase 14: Dynamic Camera
import * as THREE from 'three';

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  
  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public punchCamera(intensity: number) {
    // Screen shake
    this.camera.position.x += (Math.random() - 0.5) * intensity * 0.1;
    this.camera.position.y += (Math.random() - 0.5) * intensity * 0.1;
  }

  public zoomToAction(x: number, y: number, zoomLevel: number) {
    // Action zoom for mega combos
    this.camera.position.z -= zoomLevel;
  }
}
