import * as THREE from 'three';

export type CandyMaterialType = 'JELLY' | 'GLASS' | 'CRYSTAL' | 'CANDY' | 'GUMMY' | 'GEM' | 'GLAZED' | 'HARD_CANDY' | 'STRIPE' | 'WRAPPER' | 'CHOCOLATE';

export class CandyMaterialFactory {
  public static createMaterial(type: CandyMaterialType, colorHex: number | any): THREE.Material {
    return new THREE.MeshStandardMaterial({ color: typeof colorHex === 'number' ? colorHex : 0xffffff });
  }
}
