import * as THREE from 'three';

export type CandyMaterialType = 'JELLY' | 'GLASS' | 'CRYSTAL' | 'CANDY' | 'GUMMY' | 'GEM' | 'GLAZED';

export class CandyMaterialFactory {
  public static createMaterial(type: CandyMaterialType, colorHex: number): THREE.Material {
    switch (type) {
      case 'JELLY':
        return new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.2,
          transmission: 0.9,
          thickness: 1.5,
          ior: 1.33,
          clearcoat: 0.5,
          clearcoatRoughness: 0.1
        });
      case 'GLASS':
        return new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.05,
          transmission: 1.0,
          thickness: 0.5,
          ior: 1.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0
        });
      case 'CRYSTAL':
        return new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.1,
          transmission: 0.8,
          thickness: 2.0,
          ior: 2.4, // Diamond-like
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
          iridescence: 0.3
        });
      case 'CANDY':
        return new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.4,
          metalness: 0.1,
          envMapIntensity: 0.5
        });
      case 'GUMMY':
        return new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.6,
          transmission: 0.5,
          thickness: 3.0,
          ior: 1.2,
          clearcoat: 0.2,
          clearcoatRoughness: 0.5
        });
      case 'GEM':
        return new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.0,
          transmission: 0.95,
          thickness: 1.0,
          ior: 2.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          metalness: 0.2
        });
      default:
        return new THREE.MeshStandardMaterial({ color: colorHex });
    }
  }
}
