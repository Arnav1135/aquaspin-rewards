import * as THREE from 'three';
import { SurfaceDetailShader } from './SurfaceDetailShader';

export type WetnessState = 'DRY' | 'DAMP' | 'WET' | 'VERY_WET' | 'DRYING';

export interface WetnessProfile {
  targetWetness: number;
  transitionSpeed: number; // Units per second
}

export class WetnessController {
  private materials: Map<THREE.MeshPhysicalMaterial, number> = new Map();
  private states: Map<THREE.MeshPhysicalMaterial, WetnessProfile> = new Map();

  // Phase 8: Dynamic Wetness Controller
  public registerMaterial(material: THREE.MeshPhysicalMaterial) {
    if (!this.materials.has(material)) {
      this.materials.set(material, 0.0);
      SurfaceDetailShader.applyToMaterial(material, { wetness: 0, wear: 0, dust: 0 });
    }
  }

  public setWetnessState(material: THREE.MeshPhysicalMaterial, state: WetnessState) {
    if (!this.materials.has(material)) this.registerMaterial(material);

    let profile: WetnessProfile;
    switch (state) {
      case 'DRY': profile = { targetWetness: 0.0, transitionSpeed: 0.5 }; break;
      case 'DAMP': profile = { targetWetness: 0.3, transitionSpeed: 2.0 }; break;
      case 'WET': profile = { targetWetness: 0.7, transitionSpeed: 5.0 }; break;
      case 'VERY_WET': profile = { targetWetness: 1.0, transitionSpeed: 10.0 }; break;
      case 'DRYING': profile = { targetWetness: 0.0, transitionSpeed: 0.1 }; break; // Slow drying
    }
    
    this.states.set(material, profile);
  }

  public update(delta: number) {
    this.states.forEach((profile, material) => {
      let current = this.materials.get(material) || 0;
      
      if (current < profile.targetWetness) {
        current = Math.min(profile.targetWetness, current + profile.transitionSpeed * delta);
      } else if (current > profile.targetWetness) {
        current = Math.max(profile.targetWetness, current - profile.transitionSpeed * delta);
      }

      this.materials.set(material, current);

      // Update shader uniform if injected
      if ((material as any).userData?.shader) {
        (material as any).userData.shader.uniforms.uWetness.value = current;
      }
    });
  }
}
