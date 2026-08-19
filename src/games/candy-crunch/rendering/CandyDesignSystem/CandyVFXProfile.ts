import * as THREE from 'three';
import { CandyIdentityRegistry } from './CandyIdentityRegistry';
import { CandyColor } from '../../types';

export class CandyVFXProfile {
  private static particleMaterialCache = new Map<number, THREE.Material>();
  private static geometryCache = new Map<string, THREE.BufferGeometry>();

  private static getGeometry(type: string): THREE.BufferGeometry {
    if (this.geometryCache.has(type)) return this.geometryCache.get(type)!;
    let geo;
    switch(type) {
      case 'water_droplets':
      case 'gummy_burst':
        geo = new THREE.SphereGeometry(0.08, 6, 6);
        break;
      case 'leaf_fragments':
        geo = new THREE.PlaneGeometry(0.12, 0.08);
        break;
      case 'crystal_sparkle':
      case 'jewel_shards':
        geo = new THREE.TetrahedronGeometry(0.08);
        break;
      case 'glaze_crack':
      default:
        geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        break;
    }
    this.geometryCache.set(type, geo);
    return geo;
  }

  public static createMatchParticles(colorName: CandyColor, position: THREE.Vector3, scene: THREE.Group) {
    const identity = CandyIdentityRegistry.getIdentityForColor(colorName);
    const vfx = identity.vfxProfile;
    
    if (!this.particleMaterialCache.has(vfx.particleColor)) {
      this.particleMaterialCache.set(
        vfx.particleColor,
        new THREE.MeshPhysicalMaterial({ 
          color: vfx.particleColor, 
          transparent: true, 
          opacity: 0.9,
          roughness: vfx.destructionType.includes('crystal') ? 0.1 : 0.4,
          transmission: vfx.destructionType.includes('water') ? 0.9 : 0.0
        })
      );
    }
    
    const mat = this.particleMaterialCache.get(vfx.particleColor)!;
    const geo = this.getGeometry(vfx.destructionType);
    
    for (let i = 0; i < vfx.particleCount; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      
      const speed = vfx.destructionType === 'gummy_burst' ? 0.06 : 0.12;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed + (speed * 0.5), // slight upward bias
        (Math.random() - 0.5) * speed
      );
      
      mesh.userData = { 
        velocity, 
        life: 1.0, 
        rotSpeed: new THREE.Vector3(Math.random()*0.2, Math.random()*0.2, Math.random()*0.2) 
      };
      scene.add(mesh);
    }
  }

  public static updateParticles(scene: THREE.Group, delta: number) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i] as THREE.Mesh;
      if (child.userData.life !== undefined) {
        child.userData.life -= delta * 1.5; 
        if (child.userData.life <= 0) {
          scene.remove(child);
        } else {
          child.position.add(child.userData.velocity);
          child.userData.velocity.y -= delta * 0.15; // gravity
          
          child.rotation.x += child.userData.rotSpeed.x;
          child.rotation.y += child.userData.rotSpeed.y;
          child.rotation.z += child.userData.rotSpeed.z;
          
          // Shrink over time
          const scale = Math.max(0.01, child.userData.life);
          child.scale.set(scale, scale, scale);
        }
      }
    }
  }
}
