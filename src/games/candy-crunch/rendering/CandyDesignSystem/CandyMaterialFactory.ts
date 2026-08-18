import * as THREE from 'three';
import { CandyColorProfile } from './CandyColorPalette';

export type CandyMaterialType = 
  | 'GUMMY'
  | 'HARD_CANDY'
  | 'JELLY'
  | 'GLAZED'
  | 'CHOCOLATE'
  | 'CRYSTAL'
  | 'WRAPPER'
  | 'STRIPE';

export class CandyMaterialFactory {
  private static materialCache = new Map<string, THREE.Material>();

  public static getMaterial(type: CandyMaterialType, colorProfile: CandyColorProfile): THREE.Material {
    const key = `${type}_${colorProfile.name}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const material = this.createMaterial(type, colorProfile);
    this.materialCache.set(key, material);
    return material;
  }

  private static createMaterial(type: CandyMaterialType, cp: CandyColorProfile): THREE.Material {
    switch (type) {
      case 'HARD_CANDY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.1,
          metalness: 0.05,
          roughness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          transmission: 0.2, // Slightly translucent
          ior: 1.5,
          thickness: 0.8,
        });

      case 'GUMMY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.2,
          metalness: 0.0,
          roughness: 0.35,
          clearcoat: 0.3, // duller coat
          clearcoatRoughness: 0.4,
          transmission: 0.6, // Very translucent
          ior: 1.3,
          thickness: 1.5,
        });

      case 'JELLY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.glowColor,
          emissiveIntensity: 0.15,
          metalness: 0.0,
          roughness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission: 0.9, // Almost like glass
          ior: 1.4,
          thickness: 2.0,
          transparent: true,
        });

      case 'GLAZED':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.05,
          metalness: 0.1,
          roughness: 0.2,
          clearcoat: 1.0, // thick sugar glaze
          clearcoatRoughness: 0.2,
          transmission: 0.0, // Opaque
        });

      case 'CHOCOLATE':
        return new THREE.MeshPhysicalMaterial({
          color: 0x3d2314, // dark chocolate base
          metalness: 0.05,
          roughness: 0.4,
          clearcoat: 0.1,
          clearcoatRoughness: 0.5,
        });

      case 'CRYSTAL':
        return new THREE.MeshPhysicalMaterial({
          color: cp.highlightColor, // light
          emissive: cp.baseColor,
          emissiveIntensity: 0.3,
          metalness: 0.2,
          roughness: 0.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          transmission: 0.95,
          ior: 2.0,
          thickness: 1.0,
        });
        
      case 'WRAPPER':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          metalness: 0.1,
          roughness: 0.2,
          clearcoat: 0.8,
          clearcoatRoughness: 0.2,
          transmission: 0.7,
          ior: 1.2,
          thickness: 0.1,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });
        
      case 'STRIPE':
        return new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.1,
          roughness: 0.2,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission: 0.1,
        });

      default:
        return new THREE.MeshStandardMaterial({ color: cp.baseColor });
    }
  }
}
