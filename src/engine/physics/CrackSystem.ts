import * as THREE from 'three';

export type CrackMaterialKind = 'GLASS' | 'ICE' | 'CRYSTAL' | 'STONE' | 'CHOCOLATE';

export class CrackSystem {
  // Phase 6 & 7: Progressive Crack System & Fracture System
  public static getCrackStage(healthPercent: number): 'CLEAN' | 'MINOR' | 'VISIBLE' | 'MAJOR' | 'DESTROYED' {
    if (healthPercent >= 1.0) return 'CLEAN';
    if (healthPercent >= 0.75) return 'MINOR';
    if (healthPercent >= 0.50) return 'VISIBLE';
    if (healthPercent >= 0.25) return 'MAJOR';
    return 'DESTROYED';
  }

  public static applyCrackOverlay(mesh: THREE.Mesh, healthPercent: number, materialKind: CrackMaterialKind) {
    const stage = this.getCrackStage(healthPercent);
    if (stage === 'CLEAN') return;

    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    if (!mat) return;

    // In a fully featured implementation, we would apply a secondary crack texture mask
    // For now, we simulate progressive cracking with roughness, bump, and opacity
    switch (stage) {
      case 'MINOR':
        mat.roughness = Math.min(1.0, mat.roughness + 0.15);
        break;
      case 'VISIBLE':
        mat.roughness = Math.min(1.0, mat.roughness + 0.3);
        mat.bumpScale = 0.02;
        // Apply procedural crack shader uniform if available
        if ((mat as any).userData?.shader) {
           (mat as any).userData.shader.uniforms.crackIntensity = { value: 0.3 };
        }
        break;
      case 'MAJOR':
        mat.roughness = Math.min(1.0, mat.roughness + 0.5);
        mat.bumpScale = 0.05;
        mat.opacity = Math.max(0.2, mat.opacity - 0.2);
        if ((mat as any).userData?.shader) {
           (mat as any).userData.shader.uniforms.crackIntensity = { value: 0.7 };
        }
        break;
      case 'DESTROYED':
        mesh.visible = false;
        // Phase 7: Trigger Fracture Fragment Pool (handled by ImpactEngine/DestructionDirector)
        break;
    }
  }
}
