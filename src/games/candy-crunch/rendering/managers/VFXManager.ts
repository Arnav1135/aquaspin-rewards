import * as THREE from 'three';
import { CandyColor } from '../../types';

export class VFXManager {
  private particleGroup: THREE.Group;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshBasicMaterial;
  private mesh: THREE.InstancedMesh;
  
  private maxParticles = 2000;
  private activeCount = 0;
  
  // Particle Data arrays for InstancedMesh
  private dummy = new THREE.Object3D();
  private lifetimes = new Float32Array(this.maxParticles);
  private ages = new Float32Array(this.maxParticles);
  private velocities = [] as THREE.Vector3[];
  private colors = new Float32Array(this.maxParticles * 3);
  
  constructor(scene: THREE.Scene) {
    this.particleGroup = new THREE.Group();
    scene.add(this.particleGroup);

    // Phase 17: Pooled Instanced Particles
    this.geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleGroup.add(this.mesh);

    for(let i=0; i<this.maxParticles; i++) {
      this.velocities.push(new THREE.Vector3());
    }
  }

  public getHexColor(color: CandyColor): THREE.Color {
    switch (color) {
      case 'red': return new THREE.Color(0xff2a2a);
      case 'orange': return new THREE.Color(0xffa500);
      case 'yellow': return new THREE.Color(0xffd700);
      case 'green': return new THREE.Color(0x32cd32);
      case 'blue': return new THREE.Color(0x1e90ff);
      case 'purple': return new THREE.Color(0x9370db);
      default: return new THREE.Color(0xffffff);
    }
  }

  // Phase 18: Color-Aware VFX
  public spawnExplosion(x: number, y: number, color: CandyColor, count: number = 15) {
    const c = this.getHexColor(color);
    
    for (let i = 0; i < count; i++) {
      if (this.activeCount >= this.maxParticles) break;
      
      const idx = this.activeCount;
      
      this.dummy.position.set(x, y, 0.2);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();
      
      this.mesh.setMatrixAt(idx, this.dummy.matrix);
      
      this.mesh.setColorAt(idx, c);
      
      // Explosion physics
      this.velocities[idx].set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3
      );
      
      this.lifetimes[idx] = 0.4 + Math.random() * 0.4;
      this.ages[idx] = 0;
      
      this.activeCount++;
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public update(delta: number) {
    if (this.activeCount === 0) return;

    let alive = 0;
    
    for (let i = 0; i < this.activeCount; i++) {
      this.ages[i] += delta;
      
      if (this.ages[i] < this.lifetimes[i]) {
        this.mesh.getMatrixAt(i, this.dummy.matrix);
        this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);
        
        // Apply velocity & drag
        this.dummy.position.addScaledVector(this.velocities[i], delta);
        this.velocities[i].y -= 9.8 * delta; // Gravity
        
        // Shrink over time
        const lifeScale = 1 - (this.ages[i] / this.lifetimes[i]);
        this.dummy.scale.set(lifeScale, lifeScale, lifeScale);
        
        this.dummy.rotation.x += delta * 5;
        this.dummy.updateMatrix();
        
        this.mesh.setMatrixAt(alive, this.dummy.matrix);
        
        // If we compacted the array, move color and velocity
        if (alive !== i) {
          const c = new THREE.Color();
          this.mesh.getColorAt(i, c);
          this.mesh.setColorAt(alive, c);
          this.velocities[alive].copy(this.velocities[i]);
          this.lifetimes[alive] = this.lifetimes[i];
          this.ages[alive] = this.ages[i];
        }
        
        alive++;
      }
    }
    
    this.activeCount = alive;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
