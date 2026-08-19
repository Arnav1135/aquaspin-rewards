import * as THREE from 'three';

export type SpecialState = 'NORMAL' | 'SELECTED' | 'CHARGING' | 'ACTIVATING' | 'OVERLOADED' | 'EXPLODING';

export class SpecialCandyStateSystem {
  // Phase 9: Animate Special Candy Material States
  public static applyState(meshGroup: THREE.Group, state: SpecialState) {
    const mesh = meshGroup.children.find(c => c.name === "CandyMesh") as THREE.Mesh;
    if (!mesh || !mesh.material) return;

    const mat = mesh.material as THREE.MeshPhysicalMaterial;

    switch (state) {
      case 'NORMAL':
        mat.emissiveIntensity = 0.1;
        meshGroup.scale.set(1, 1, 1);
        break;
      case 'SELECTED':
        mat.emissiveIntensity = 0.4;
        meshGroup.scale.set(1.15, 1.15, 1.15);
        break;
      case 'CHARGING':
        mat.emissiveIntensity = 0.8;
        meshGroup.scale.set(1.25, 1.25, 1.25);
        break;
      case 'ACTIVATING':
        mat.emissiveIntensity = 1.5;
        meshGroup.scale.set(1.4, 1.4, 1.4);
        break;
      case 'OVERLOADED':
        mat.emissiveIntensity = 2.5;
        meshGroup.scale.set(1.6, 1.6, 1.6);
        break;
      case 'EXPLODING':
        mat.emissiveIntensity = 4.0;
        meshGroup.scale.set(2.0, 2.0, 2.0);
        break;
    }
  }
}
