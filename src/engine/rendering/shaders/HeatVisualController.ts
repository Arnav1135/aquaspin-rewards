import * as THREE from 'three';

export type HeatState = 'COLD' | 'NORMAL' | 'WARM' | 'HOT' | 'OVERHEATED';

export class HeatVisualController {
  // Phase 9: Heat System
  public static applyHeat(material: THREE.MeshPhysicalMaterial, state: HeatState) {
    switch (state) {
      case 'COLD':
        material.emissiveIntensity = 0.0;
        break;
      case 'NORMAL':
        material.emissiveIntensity = 0.1;
        break;
      case 'WARM':
        material.emissive.setHex(0xffaa00);
        material.emissiveIntensity = 0.5;
        break;
      case 'HOT':
        material.emissive.setHex(0xff4400);
        material.emissiveIntensity = 1.0;
        // In full implementation, we'd enable a vertex shader wobble here
        break;
      case 'OVERHEATED':
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 2.0;
        break;
    }
  }
}
