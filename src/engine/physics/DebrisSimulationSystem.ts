import * as THREE from 'three';
import { MaterialKind } from './MaterialReactionEngine';
import { ProceduralGeometrySystem, ProceduralShapeType } from '../rendering/geometry/ProceduralGeometrySystem';

interface DebrisInstance {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  scale: number;
  life: number;
  material: MaterialKind;
}

export class DebrisSimulationSystem {
  private instancedMeshes: Map<MaterialKind, THREE.InstancedMesh> = new Map();
  private maxDebris: number = 500;
  private debrisData: DebrisInstance[] = [];
  private dummy: THREE.Object3D = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    // Pre-allocate debris array
    for (let i = 0; i < this.maxDebris; i++) {
      this.debrisData.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        angularVelocity: new THREE.Vector3(),
        scale: 1,
        life: 0,
        material: 'CANDY'
      });
    }

    // Example material setup
    this.setupInstancedMesh('CANDY', scene, 'ROUNDED_BOX', new THREE.MeshPhysicalMaterial({ color: 0xff0000 }));
    this.setupInstancedMesh('GLASS', scene, 'CRYSTAL_PRISM', new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    this.setupInstancedMesh('ICE', scene, 'ROCK_CHUNK', new THREE.MeshPhysicalMaterial({ color: 0xaaddff, roughness: 0.1 }));
    this.setupInstancedMesh('STONE', scene, 'ROCK_CHUNK', new THREE.MeshStandardMaterial({ color: 0x888888 }));
  }

  private setupInstancedMesh(kind: MaterialKind, scene: THREE.Scene, shape: ProceduralShapeType, mat: THREE.Material) {
    const geo = ProceduralGeometrySystem.getGeometry(shape, { radius: 0.1, detail: 1 });
    const mesh = new THREE.InstancedMesh(geo, mat, this.maxDebris);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    this.instancedMeshes.set(kind, mesh);
  }

  // Phase 19 & 20: Instanced Fracture Geometry & Pooled Debris Sim
  public spawnDebris(position: THREE.Vector3, count: number, material: MaterialKind) {
    let spawned = 0;
    for (let i = 0; i < this.maxDebris && spawned < count; i++) {
      const debris = this.debrisData[i];
      if (!debris.active) {
        debris.active = true;
        debris.position.copy(position);
        debris.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
        
        debris.velocity.set(
          (Math.random() - 0.5) * 10,
          Math.random() * 10 + 5,
          (Math.random() - 0.5) * 10
        );
        debris.angularVelocity.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        debris.scale = Math.random() * 0.5 + 0.2;
        debris.life = 2.0 + Math.random(); // 2-3 seconds life
        debris.material = material;
        spawned++;
      }
    }
  }

  public update(delta: number) {
    const counts: Map<MaterialKind, number> = new Map();
    this.instancedMeshes.forEach((_, key) => counts.set(key, 0));

    for (let i = 0; i < this.maxDebris; i++) {
      const d = this.debrisData[i];
      if (d.active) {
        d.life -= delta;
        if (d.life <= 0) {
          d.active = false;
          continue;
        }

        // Gravity
        d.velocity.y -= 15 * delta;
        
        // Drag
        d.velocity.multiplyScalar(0.99);

        d.position.addScaledVector(d.velocity, delta);
        d.rotation.x += d.angularVelocity.x * delta;
        d.rotation.y += d.angularVelocity.y * delta;
        d.rotation.z += d.angularVelocity.z * delta;

        // Floor bounce
        if (d.position.y < -5) {
          d.position.y = -5;
          d.velocity.y *= -0.5;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }

        this.dummy.position.copy(d.position);
        this.dummy.rotation.copy(d.rotation);
        
        // Shrink at end of life
        const scale = d.life < 0.5 ? d.scale * (d.life * 2) : d.scale;
        this.dummy.scale.set(scale, scale, scale);
        
        this.dummy.updateMatrix();

        const mesh = this.instancedMeshes.get(d.material);
        if (mesh) {
          const idx = counts.get(d.material)!;
          mesh.setMatrixAt(idx, this.dummy.matrix);
          counts.set(d.material, idx + 1);
        }
      }
    }

    this.instancedMeshes.forEach((mesh, key) => {
      mesh.count = counts.get(key) || 0;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}
