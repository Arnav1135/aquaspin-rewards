import * as THREE from 'three';

export class CandyVFXProfile {
  private static particleMaterialCache = new Map<number, THREE.Material>();

  public static createMatchParticles(color: number, position: THREE.Vector3, scene: THREE.Group) {
    if (!this.particleMaterialCache.has(color)) {
      this.particleMaterialCache.set(
        color,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
      );
    }
    
    const mat = this.particleMaterialCache.get(color)!;
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      );
      
      mesh.userData = { velocity, life: 1.0 };
      scene.add(mesh);
    }
  }

  public static updateParticles(scene: THREE.Group, delta: number) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i] as THREE.Mesh;
      if (child.userData.life !== undefined) {
        child.userData.life -= delta * 2; // half second life
        if (child.userData.life <= 0) {
          scene.remove(child);
        } else {
          child.position.add(child.userData.velocity);
          child.userData.velocity.y -= delta * 0.1; // gravity
          const mat = child.material as THREE.Material;
          mat.opacity = child.userData.life;
        }
      }
    }
  }
}
