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
        const geo = new THREE.TorusGeometry(0.28, 0.22, 24, 48, Math.PI * 0.85);
        geo.rotateX(Math.PI / 2);
        geo.translate(0, -0.1, 0); 
        return geo;
      }
      
      case 'lozenge': {
        // High quality rounded pill
        const geo = new THREE.CapsuleGeometry(0.35, 0.4, 24, 48);
        geo.rotateZ(Math.PI / 2);
        return geo;
      }
      
      case 'teardrop': {
        // Sculpted teardrop
        const geo = new THREE.ConeGeometry(0.4, 0.8, 32, 16, true, 0, Math.PI * 2);
        // Soften tip and base
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          if (y > 0.2) {
             const factor = 1.0 - Math.pow((y - 0.2) / 0.6, 2);
             pos.setX(i, pos.getX(i) * factor);
             pos.setZ(i, pos.getZ(i) * factor);
          }
        }
        geo.computeVertexNormals();
        geo.translate(0, -0.1, 0);
        return geo;
      }

      case 'square': {
        // Phase 4: Procedural Beveled Box
        const shape = new THREE.Shape();
        const width = 0.7;
        const height = 0.7;
        const radius = 0.15;
        shape.moveTo(-width / 2 + radius, -height / 2);
        shape.lineTo(width / 2 - radius, -height / 2);
        shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
        shape.lineTo(width / 2, height / 2 - radius);
        shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
        shape.lineTo(-width / 2 + radius, height / 2);
        shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
        shape.lineTo(-width / 2, -height / 2 + radius);
        shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
        
        const extrudeSettings = {
          depth: 0.3,
          bevelEnabled: true,
          bevelSegments: 6,
          steps: 2,
          bevelSize: 0.08,
          bevelThickness: 0.1
        };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.center();
        return geo;
      }

      case 'circle': {
        // Flattened spheroid
        const geo = new THREE.SphereGeometry(0.45, 32, 32);
        geo.scale(1, 0.5, 1);
        return geo;
      }

      case 'cluster': {
        const geo = new THREE.DodecahedronGeometry(0.4, 2); // Higher detail
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for(let i=0; i<pos.count; i++) {
           const l = new THREE.Vector3().fromBufferAttribute(pos, i).length();
           pos.setXYZ(i, pos.getX(i)*(1 + Math.sin(l*10)*0.1), pos.getY(i)*(1 + Math.sin(l*10)*0.1), pos.getZ(i)*(1 + Math.sin(l*10)*0.1));
        }
        geo.computeVertexNormals();
        return geo;
      }

      case 'fish': {
        const geo = new THREE.SphereGeometry(0.4, 32, 32);
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
