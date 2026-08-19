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
  private static microBumpMap: THREE.CanvasTexture | null = null;

  // Phase 7: Procedural Micro-Surface Detail Bump Texture
  private static getMicroBumpMap(): THREE.CanvasTexture {
    if (this.microBumpMap) return this.microBumpMap;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 128, 128);
      
      const imgData = ctx.getImageData(0, 0, 128, 128);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20;
        imgData.data[i] = Math.min(255, Math.max(0, 128 + noise));     // R
        imgData.data[i+1] = Math.min(255, Math.max(0, 128 + noise));   // G
        imgData.data[i+2] = 255;                                        // B
      }
      ctx.putImageData(imgData, 0, 0);

      this.microBumpMap = new THREE.CanvasTexture(canvas);
      this.microBumpMap.wrapS = THREE.RepeatWrapping;
      this.microBumpMap.wrapT = THREE.RepeatWrapping;
      this.microBumpMap.repeat.set(4, 4);
    }
    return this.microBumpMap!;
  }

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
    const bumpMap = this.getMicroBumpMap();

    switch (type) {
      case 'HARD_CANDY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.1,
          metalness: 0.05,
          roughness: 0.12,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          transmission: 0.25,
          ior: 1.52,
          thickness: 0.8,
          bumpMap: bumpMap,
          bumpScale: 0.005,
        });

      case 'GUMMY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.2,
          metalness: 0.0,
          roughness: 0.38,
          clearcoat: 0.4,
          clearcoatRoughness: 0.35,
          transmission: 0.65,
          ior: 1.34,
          thickness: 1.6,
          bumpMap: bumpMap,
          bumpScale: 0.01,
        });

      case 'JELLY':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.glowColor,
          emissiveIntensity: 0.18,
          metalness: 0.0,
          roughness: 0.08,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          transmission: 0.88,
          ior: 1.42,
          thickness: 2.2,
          transparent: true,
          opacity: 0.92,
        });

      case 'GLAZED':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          emissive: cp.emissiveAccent,
          emissiveIntensity: 0.05,
          metalness: 0.08,
          roughness: 0.22,
          clearcoat: 1.0,
          clearcoatRoughness: 0.15,
          bumpMap: bumpMap,
          bumpScale: 0.012,
        });

      case 'CHOCOLATE':
        return new THREE.MeshPhysicalMaterial({
          color: 0x3d2314,
          metalness: 0.05,
          roughness: 0.42,
          clearcoat: 0.15,
          clearcoatRoughness: 0.45,
          bumpMap: bumpMap,
          bumpScale: 0.008,
        });

      case 'CRYSTAL':
        return new THREE.MeshPhysicalMaterial({
          color: cp.highlightColor,
          emissive: cp.baseColor,
          emissiveIntensity: 0.35,
          metalness: 0.15,
          roughness: 0.02,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          transmission: 0.92,
          ior: 2.1,
          thickness: 1.2,
        });

      case 'WRAPPER':
        return new THREE.MeshPhysicalMaterial({
          color: cp.baseColor,
          metalness: 0.2,
          roughness: 0.15,
          clearcoat: 0.9,
          clearcoatRoughness: 0.1,
          transmission: 0.7,
          ior: 1.25,
          thickness: 0.1,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
        });

      case 'STRIPE':
        return new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.1,
          roughness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          transmission: 0.1,
        });

      default:
        return new THREE.MeshStandardMaterial({ color: cp.baseColor });
    }
  }

  public static clearCache() {
    this.materialCache.forEach(m => m.dispose());
    this.materialCache.clear();
  }
}
