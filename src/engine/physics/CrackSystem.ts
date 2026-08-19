import * as THREE from 'three';

export type CrackMaterialKind = 'GLASS' | 'ICE' | 'CRYSTAL' | 'STONE' | 'CHOCOLATE';

export class CrackSystem {
  // Phase 11: Deterministic Procedural Crack Generator
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

    switch (stage) {
      case 'MINOR':
        mat.roughness = 0.35;
        break;
      case 'VISIBLE':
        mat.roughness = 0.55;
        mat.bumpScale = 0.02;
        break;
      case 'MAJOR':
        mat.roughness = 0.85;
        mat.bumpScale = 0.05;
        mat.opacity = 0.75;
        break;
      case 'DESTROYED':
        mesh.visible = false;
        break;
    }
  }
}
