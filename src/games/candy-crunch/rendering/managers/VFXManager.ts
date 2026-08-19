import * as THREE from 'three';
import { CandyColor } from '../../types';

export class VFXManager {
  private scene: THREE.Scene;
  private particleGroup: THREE.Group;
  
  // Layered Particle Systems
  private impactMesh: THREE.InstancedMesh;
  private maxImpactParticles = 2000;
  private activeImpactCount = 0;

  // Atmospheric Environmental Particles (Sugar Dust / Sparkles)
  private ambientParticles: THREE.Points;
  private ambientCount = 300;

  // Shockwave Rings Pool
  private shockwaveMeshes: THREE.Mesh[] = [];

  private dummy = new THREE.Object3D();
  private lifetimes = new Float32Array(this.maxImpactParticles);
  private ages = new Float32Array(this.maxImpactParticles);
  private velocities = [] as THREE.Vector3[];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = "VFXGroup";
    this.scene.add(this.particleGroup);

    // 1. IMPACT TIER: Pooled Instanced Mesh for candy fragments
    const boxGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const boxMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    this.impactMesh = new THREE.InstancedMesh(boxGeo, boxMat, this.maxImpactParticles);
    this.impactMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleGroup.add(this.impactMesh);

    for (let i = 0; i < this.maxImpactParticles; i++) {
      this.velocities.push(new THREE.Vector3());
    }

    // 2. CINEMATIC TIER: Shockwave Mesh Pool (Torus Geometry)
    const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 16, 32);
    for (let i = 0; i < 5; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        wireframe: true,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.visible = false;
      this.particleGroup.add(ring);
      this.shockwaveMeshes.push(ring);
    }

    // 3. ATMOSPHERIC TIER: Floating Sugar Dust
    const ambGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ambientCount * 3);
    for (let i = 0; i < this.ambientCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    ambGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const ambMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.ambientParticles = new THREE.Points(ambGeo, ambMat);
    this.particleGroup.add(this.ambientParticles);
  }

  public getHexColor(color: CandyColor): THREE.Color {
    switch (color) {
      case 'red': return new THREE.Color(0xff2a4b);
      case 'orange': return new THREE.Color(0xff8c00);
      case 'yellow': return new THREE.Color(0xffd700);
      case 'green': return new THREE.Color(0x00e676);
      case 'blue': return new THREE.Color(0x00b0ff);
      case 'purple': return new THREE.Color(0xd500f9);
      default: return new THREE.Color(0xffffff);
    }
  }

  // Phase 14: Color-Reactive Particle Explosions
  public spawnExplosion(x: number, y: number, color: CandyColor, count: number = 18) {
    const c = this.getHexColor(color);

    for (let i = 0; i < count; i++) {
      if (this.activeImpactCount >= this.maxImpactParticles) break;

      const idx = this.activeImpactCount;
      this.dummy.position.set(x, y, 0.2);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.dummy.updateMatrix();

      this.impactMesh.setMatrixAt(idx, this.dummy.matrix);
      this.impactMesh.setColorAt(idx, c);

      this.velocities[idx].set(
        (Math.random() - 0.5) * 7.5,
        (Math.random() - 0.5) * 7.5,
        (Math.random() - 0.2) * 4.0
      );

      this.lifetimes[idx] = 0.35 + Math.random() * 0.45;
      this.ages[idx] = 0;
      this.activeImpactCount++;
    }

    this.impactMesh.instanceMatrix.needsUpdate = true;
    if (this.impactMesh.instanceColor) this.impactMesh.instanceColor.needsUpdate = true;
  }

  // Phase 12: Shockwave VFX
  public spawnShockwave(x: number, y: number, colorHex: string) {
    const ring = this.shockwaveMeshes.find(m => !m.visible);
    if (ring) {
      ring.position.set(x, y, 0.1);
      ring.scale.set(0.1, 0.1, 0.1);
      (ring.material as THREE.MeshBasicMaterial).color.setStyle(colorHex);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9;
      ring.visible = true;
    }
  }

  // Phase 10: Energy Ribbon Beam for Striped Candies
  public spawnEnergyRibbon(x: number, y: number, isHorizontal: boolean) {
    const beamGeo = new THREE.BoxGeometry(isHorizontal ? 12 : 0.2, isHorizontal ? 0.2 : 12, 0.1);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(x, y, 0.3);
    this.particleGroup.add(beam);

    // Fade out ribbon quickly
    let elapsed = 0;
    const fadeTimer = setInterval(() => {
      elapsed += 0.03;
      beamMat.opacity -= 0.1;
      if (beamMat.opacity <= 0) {
        clearInterval(fadeTimer);
        this.particleGroup.remove(beam);
        beamGeo.dispose();
        beamMat.dispose();
      }
    }, 30);
  }

  // Phase 11: Cinematic Starburst for Color Bomb Combos
  public spawnCinematicStarburst(x: number, y: number) {
    const colors: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    colors.forEach(col => {
      this.spawnExplosion(x, y, col, 25);
    });
  }

  public update(delta: number) {
    // 1. Update Impact Particles
    if (this.activeImpactCount > 0) {
      let alive = 0;
      for (let i = 0; i < this.activeImpactCount; i++) {
        this.ages[i] += delta;
        if (this.ages[i] < this.lifetimes[i]) {
          this.impactMesh.getMatrixAt(i, this.dummy.matrix);
          this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

          this.dummy.position.addScaledVector(this.velocities[i], delta);
          this.velocities[i].y -= 9.8 * delta;

          const lifeScale = 1 - (this.ages[i] / this.lifetimes[i]);
          this.dummy.scale.set(lifeScale, lifeScale, lifeScale);
          this.dummy.rotation.x += delta * 6;

          this.dummy.updateMatrix();
          this.impactMesh.setMatrixAt(alive, this.dummy.matrix);

          if (alive !== i) {
            const col = new THREE.Color();
            this.impactMesh.getColorAt(i, col);
            this.impactMesh.setColorAt(alive, col);
            this.velocities[alive].copy(this.velocities[i]);
            this.lifetimes[alive] = this.lifetimes[i];
            this.ages[alive] = this.ages[i];
          }
          alive++;
        }
      }
      this.activeImpactCount = alive;
      this.impactMesh.instanceMatrix.needsUpdate = true;
      if (this.impactMesh.instanceColor) this.impactMesh.instanceColor.needsUpdate = true;
    }

    // 2. Update Shockwave Rings
    this.shockwaveMeshes.forEach(ring => {
      if (ring.visible) {
        ring.scale.addScalar(delta * 8.0);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity -= delta * 2.5;
        if (mat.opacity <= 0) {
          ring.visible = false;
        }
      }
    });

    // 3. Update Ambient Floating Sugar Dust
    const posAttr = this.ambientParticles.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    for (let i = 0; i < this.ambientCount; i++) {
      array[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.003;
      array[i * 3] += Math.cos(Date.now() * 0.001 + i) * 0.002;
    }
    posAttr.needsUpdate = true;
  }

  public dispose() {
    this.scene.remove(this.particleGroup);
    this.impactMesh.geometry.dispose();
    (this.impactMesh.material as THREE.Material).dispose();
    this.ambientParticles.geometry.dispose();
    (this.ambientParticles.material as THREE.Material).dispose();
  }
}
