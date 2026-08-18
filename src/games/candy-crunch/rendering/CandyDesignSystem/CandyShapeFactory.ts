import * as THREE from 'three';
import { CandyShape } from '../../types';

export class CandyShapeFactory {
  private static geometryCache = new Map<CandyShape, THREE.BufferGeometry>();
  
  public static getGeometry(shape: CandyShape): THREE.BufferGeometry {
    if (this.geometryCache.has(shape)) {
      return this.geometryCache.get(shape)!;
    }
    const geo = this.createGeometry(shape);
    this.geometryCache.set(shape, geo);
    return geo;
  }

  private static createGeometry(shape: CandyShape): THREE.BufferGeometry {
    switch (shape) {
      case 'jelly-bean': {
        // Curved Jelly Bean
        const geo = new THREE.TorusGeometry(0.28, 0.22, 16, 32, Math.PI * 0.85);
        geo.rotateX(Math.PI / 2);
        geo.translate(0, -0.1, 0); // Center it
        return geo;
      }
      
      case 'lozenge': {
        // Rounded Lozenge (Oval/Pill)
        const geo = new THREE.CapsuleGeometry(0.35, 0.4, 16, 32);
        geo.rotateZ(Math.PI / 2);
        return geo;
      }
      
      case 'teardrop': {
        // Lemon drop / Teardrop
        const geo = new THREE.ConeGeometry(0.4, 0.8, 32, 1, false, 0, Math.PI * 2);
        // Slightly round the bottom by modifying the cone
        geo.translate(0, -0.1, 0);
        return geo;
      }

      case 'square': {
        // Rounded box (using standard Box for now but scaled properly)
        // A true rounded box would require a custom geometry, but we can simulate a soft square
        const geo = new THREE.BoxGeometry(0.7, 0.7, 0.5, 4, 4, 2);
        // Soften edges by normalizing slightly
        return geo;
      }

      case 'circle': {
        // Flat round candy
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
        geo.rotateX(Math.PI / 2);
        return geo;
      }

      case 'cluster': {
        // A berry-like cluster
        const geo = new THREE.DodecahedronGeometry(0.4, 1);
        return geo;
      }

      case 'fish': {
        // Fish body (sphere stretched)
        const geo = new THREE.SphereGeometry(0.4, 24, 24);
        geo.scale(1.2, 0.8, 0.6);
        return geo;
      }

      default: {
        return new THREE.SphereGeometry(0.4, 32, 32);
      }
    }
  }

  // Gets the tail geometry for a fish
  public static getFishTailGeometry(): THREE.BufferGeometry {
    if (this.geometryCache.has('fish-tail' as any)) return this.geometryCache.get('fish-tail' as any)!;
    const tailGeo = new THREE.ConeGeometry(0.25, 0.4, 12);
    tailGeo.rotateZ(-Math.PI / 2);
    tailGeo.translate(-0.45, 0, 0);
    this.geometryCache.set('fish-tail' as any, tailGeo);
    return tailGeo;
  }
}
