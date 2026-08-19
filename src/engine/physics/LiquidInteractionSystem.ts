import * as THREE from 'three';

export interface LiquidImpactParams {
  position: THREE.Vector3;
  velocity: number;
  volume: number;
  colorHex?: number;
}

export class LiquidInteractionSystem {
  private scene: THREE.Scene;
  private splashParticles: THREE.Points;
  private particleCount = 400;
  private activeSplashes = 0;

  private dummyPos: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Pooled particle system for splashes and droplets
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.splashParticles = new THREE.Points(geo, mat);
    this.scene.add(this.splashParticles);
  }

  // Phase 10: Pour, Impact, Splash, & Droplet Simulation
  public triggerPourImpact(params: LiquidImpactParams) {
    const posAttr = this.splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.splashParticles.geometry.attributes.color as THREE.BufferAttribute;
    
    const color = new THREE.Color(params.colorHex || 0x00f0ff);

    for (let i = 0; i < 20; i++) {
      const idx = (this.activeSplashes * 20 + i) % this.particleCount;
      
      posAttr.setXYZ(
        idx,
        params.position.x + (Math.random() - 0.5) * 0.4,
        params.position.y + (Math.random() - 0.5) * 0.4,
        params.position.z + Math.random() * 0.5
      );

      colAttr.setXYZ(idx, color.r, color.g, color.b);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.activeSplashes++;
  }

  public update(delta: number) {
    const posAttr = this.splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      if (array[i * 3 + 2] > 0) {
        array[i * 3 + 2] -= delta * 1.5; // droplets fall down
      }
    }
    posAttr.needsUpdate = true;
  }

  public dispose() {
    this.scene.remove(this.splashParticles);
    this.splashParticles.geometry.dispose();
    (this.splashParticles.material as THREE.Material).dispose();
  }
}
