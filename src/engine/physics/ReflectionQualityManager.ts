import * as THREE from 'three';
import { QualityPreset } from '../../games/candy-crunch/rendering/managers/QualityManager';

export class ReflectionQualityManager {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Phase 21 & 22: Reflection Strategy & Refraction Fallbacks
  public applyReflectionTier(preset: QualityPreset) {
    if (preset === 'LOW') {
      this.scene.environment = null; // Basic diffuse ambient
    } else {
      // Re-enable equirectangular environment texture
      const canvas = document.createElement('canvas');
      canvas.width = preset === 'MEDIUM' ? 128 : 256;
      canvas.height = preset === 'MEDIUM' ? 128 : 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#1a2b4c');
        grad.addColorStop(1, '#050a12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const tex = new THREE.CanvasTexture(canvas);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = tex;
      }
    }
  }
}
