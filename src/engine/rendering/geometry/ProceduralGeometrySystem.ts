import * as THREE from 'three';

export type ProceduralShapeType = 'ROUNDED_BOX' | 'GUMMY_SPHERE' | 'JELLY_BLOB' | 'CRYSTAL_PRISM' | 'ROCK_CHUNK';

export interface ProceduralGeometryParams {
  radius?: number;
  width?: number;
  height?: number;
  depth?: number;
  radius0?: number; // bevel
  smoothness?: number; // 0-1
  segments?: number;
  detail?: number;
}

export class ProceduralGeometrySystem {
  // Global geometry cache to prevent duplicate WebGL buffer uploads
  private static cache: Map<string, THREE.BufferGeometry> = new Map();

  // Phase 1: Procedural Geometry Caching & Generation
  public static getGeometry(type: ProceduralShapeType, params: ProceduralGeometryParams): THREE.BufferGeometry {
    const cacheKey = this.generateCacheKey(type, params);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'ROUNDED_BOX':
        // A placeholder for a true rounded box (using standard Box for now, in a full implementation we'd use RoundedBoxGeometry from three/examples or a custom shader)
        geometry = new THREE.BoxGeometry(
          params.width || 1, 
          params.height || 1, 
          params.depth || 1,
          params.segments || 4,
          params.segments || 4,
          params.segments || 4
        );
        this.applyBevelDisplacement(geometry, params.radius0 || 0.1);
        break;
      
      case 'GUMMY_SPHERE':
        geometry = new THREE.SphereGeometry(
          params.radius || 0.5, 
          params.segments || 32, 
          params.segments || 32
        );
        this.applyGummyDeformation(geometry, params.smoothness || 0.5);
        break;

      case 'JELLY_BLOB':
        geometry = new THREE.IcosahedronGeometry(params.radius || 0.5, params.detail || 4);
        this.applyBlobDeformation(geometry);
        break;

      case 'CRYSTAL_PRISM':
        geometry = new THREE.CylinderGeometry(
          params.radius || 0.5, 
          params.radius0 || 0.1, 
          params.height || 1, 
          params.segments || 6, 
          1
        );
        break;

      case 'ROCK_CHUNK':
        geometry = new THREE.DodecahedronGeometry(params.radius || 0.5, params.detail || 1);
        this.applyNoiseDisplacement(geometry, 0.2);
        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    geometry.computeVertexNormals();
    this.cache.set(cacheKey, geometry);
    return geometry;
  }

  private static generateCacheKey(type: ProceduralShapeType, params: ProceduralGeometryParams): string {
    return `${type}_${params.radius}_${params.width}_${params.height}_${params.depth}_${params.radius0}_${params.segments}_${params.detail}`;
  }

  // Phase 4: Procedural Silhouette Variation (Modifiers)
  private static applyBevelDisplacement(geometry: THREE.BufferGeometry, amount: number) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Simulate rounding corners slightly
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Actual rounded box logic requires edge distance calculation. We skip complex procedural math for brevity,
      // assuming proper RoundedBoxGeometry injection in production.
    }
    pos.needsUpdate = true;
  }

  private static applyGummyDeformation(geometry: THREE.BufferGeometry, smoothness: number) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      // Flatten bottom slightly for a gummy look
      if (y < -0.3) {
         pos.setY(i, -0.3 + (y + 0.3) * (1.0 - smoothness));
      }
    }
    pos.needsUpdate = true;
  }

  private static applyBlobDeformation(geometry: THREE.BufferGeometry) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      // Wavy low frequency noise
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const offset = Math.sin(x * 5) * Math.cos(z * 5) * 0.05;
      pos.setXYZ(i, x + offset, y + offset, z + offset);
    }
    pos.needsUpdate = true;
  }

  private static applyNoiseDisplacement(geometry: THREE.BufferGeometry, intensity: number) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i, 
        pos.getX(i) + (Math.random() - 0.5) * intensity,
        pos.getY(i) + (Math.random() - 0.5) * intensity,
        pos.getZ(i) + (Math.random() - 0.5) * intensity
      );
    }
    pos.needsUpdate = true;
  }
}
