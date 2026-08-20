import * as THREE from 'three';
import { CandyColor, CandyShape, BlockerType } from '../../types';

export class ResourceManager {
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private materialCache = new Map<string, THREE.Material>();
  private textureCache = new Map<string, THREE.Texture>();

  constructor() {
    // Pre-initialize common geometries to prevent stutter
    this.getGeometry('jelly-bean');
    this.getGeometry('lozenge');
    this.getGeometry('teardrop');
    this.getGeometry('square');
    this.getGeometry('circle');
    this.getGeometry('cluster');
    this.getGeometry('fish');
  }

  // --- Geometries ---
  public getGeometry(shape: CandyShape): THREE.BufferGeometry {
    const key = `geo_${shape}`;
    if (this.geometryCache.has(key)) {
      return this.geometryCache.get(key)!;
    }

    let geo: THREE.BufferGeometry;
    switch (shape) {
      case 'jelly-bean':
        geo = new THREE.CapsuleGeometry(0.35, 0.4, 4, 16);
        break;
      case 'lozenge':
        geo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
        geo.rotateX(Math.PI / 2);
        break;
      case 'teardrop':
        geo = new THREE.ConeGeometry(0.4, 0.8, 16);
        geo.translate(0, -0.2, 0);
        break;
      case 'square':
        geo = new THREE.BoxGeometry(0.7, 0.7, 0.5);
        break;
      case 'circle':
        geo = new THREE.SphereGeometry(0.45, 32, 32);
        break;
      case 'cluster':
        geo = new THREE.DodecahedronGeometry(0.45, 1);
        break;
      case 'fish':
        // Simplified placeholder for Fish Geometry
        geo = new THREE.ConeGeometry(0.4, 0.9, 4);
        geo.rotateZ(-Math.PI / 2);
        break;
      default:
        geo = new THREE.SphereGeometry(0.4, 16, 16);
    }

    this.geometryCache.set(key, geo);
    return geo;
  }

  public getBlockerGeometry(blocker: BlockerType): THREE.BufferGeometry {
    const key = `geo_blocker_${blocker}`;
    if (this.geometryCache.has(key)) return this.geometryCache.get(key)!;
    
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.4); // default
    this.geometryCache.set(key, geo);
    return geo;
  }

  // --- Materials ---
  public getCandyMaterial(color: CandyColor, isSpecial: boolean = false): THREE.Material {
    const key = `mat_${color}_${isSpecial ? 'special' : 'normal'}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const hexColor = this.getHexColor(color);
    
    // Phase 8: PBR Material System
    const mat = new THREE.MeshPhysicalMaterial({
      color: hexColor,
      metalness: 0.1,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.6, // Gummy translucency effect
      ior: 1.5,
      thickness: 0.5,
    });

    if (isSpecial) {
      mat.emissive = new THREE.Color(hexColor);
      mat.emissiveIntensity = 0.5;
    }

    this.materialCache.set(key, mat);
    return mat;
  }

  public getBlockerMaterial(blocker: BlockerType): THREE.Material {
    const key = `mat_blocker_${blocker}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    let mat: THREE.Material;
    if (blocker.startsWith('frosting')) {
      mat = new THREE.MeshStandardMaterial({
        color: 0xfaf5ff,
        roughness: 0.9,
        bumpScale: 0.05,
      });
    } else if (blocker === 'chocolate') {
      mat = new THREE.MeshStandardMaterial({
        color: 0x2e180c,
        roughness: 0.4,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    }

    this.materialCache.set(key, mat);
    return mat;
  }

  private getHexColor(color: CandyColor): number {
    switch (color) {
      case 'red': return 0xff2a2a;
      case 'orange': return 0xffa500;
      case 'yellow': return 0xffd700;
      case 'green': return 0x32cd32;
      case 'blue': return 0x1e90ff;
      case 'purple': return 0x9370db;
      default: return 0xffffff;
    }
  }

  // Proper disposal logic (Phase 6)
  public disposeAll() {
    this.geometryCache.forEach((geo) => geo.dispose());
    this.materialCache.forEach((mat) => mat.dispose());
    this.textureCache.forEach((tex) => tex.dispose());
    
    this.geometryCache.clear();
    this.materialCache.clear();
    this.textureCache.clear();
  }
}
