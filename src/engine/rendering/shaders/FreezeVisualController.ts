import * as THREE from 'three';

export type FreezeState = 'NORMAL' | 'COOLING' | 'FROZEN' | 'CRACKING' | 'SHATTERING';

export class FreezeVisualController {
  // Phase 10: Freeze System
  public static applyFreeze(material: THREE.MeshPhysicalMaterial, state: FreezeState) {
    switch (state) {
      case 'NORMAL':
        material.roughness = Math.max(0.0, material.roughness - 0.2);
        material.transmission = Math.min(1.0, material.transmission + 0.2);
        break;
      case 'COOLING':
        material.roughness = Math.min(1.0, material.roughness + 0.2);
        material.color.lerp(new THREE.Color(0xaaddff), 0.3);
        break;
      case 'FROZEN':
        material.roughness = 0.8; // Frosty
        material.transmission = 0.1; // opaque frost
        material.clearcoat = 0.5; // Ice shine
        material.color.lerp(new THREE.Color(0xaaddff), 0.8);
        break;
      case 'CRACKING':
        material.bumpScale = 0.1;
        // Trigger crack system
        break;
      case 'SHATTERING':
        material.opacity = 0.0;
        break;
    }
  }
}
