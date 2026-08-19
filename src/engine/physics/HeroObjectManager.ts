import * as THREE from 'three';

export class HeroObjectManager {
  private heroObjects: Set<THREE.Object3D> = new Set();

  // Phase 23: Hero Object Quality Boost
  public registerHeroObject(object: THREE.Object3D) {
    this.heroObjects.add(object);

    object.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshPhysicalMaterial;
        if (mat) {
          mat.envMapIntensity = 2.0;
          mat.clearcoat = 1.0;
          mat.clearcoatRoughness = 0.05;
        }
      }
    });
  }

  public unregisterHeroObject(object: THREE.Object3D) {
    this.heroObjects.delete(object);
  }
}
