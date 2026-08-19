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
  private particleCount = 1000; // Increased for Phase 11-13
  private activeSplashes = 0;

  // Phase 12: Liquid Mixing State
  private mixTargetColor: THREE.Color = new THREE.Color();
  private mixCurrentColor: THREE.Color = new THREE.Color();
  private isMixing = false;
  private mixProgress = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Pooled particle system for droplets and splash
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    // Add velocity and life attributes for Phase 13 Droplet Physics
    const velocities = new Float32Array(this.particleCount * 3);
    const lifetimes = new Float32Array(this.particleCount);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.splashParticles = new THREE.Points(geo, mat);
    this.scene.add(this.splashParticles);
  }

  // Phase 11 & 13: Liquid Visual Engine & Droplet Physics
  public triggerPourImpact(params: LiquidImpactParams) {
    const posAttr = this.splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.splashParticles.geometry.attributes.color as THREE.BufferAttribute;
    const velAttr = this.splashParticles.geometry.attributes.velocity as THREE.BufferAttribute;
    const lifeAttr = this.splashParticles.geometry.attributes.lifetime as THREE.BufferAttribute;
    
    const color = new THREE.Color(params.colorHex || 0x00f0ff);
    const dropCount = Math.floor(Math.min(50, params.volume * 20));

    for (let i = 0; i < dropCount; i++) {
      const idx = (this.activeSplashes * 50 + i) % this.particleCount;
      
      posAttr.setXYZ(
        idx,
        params.position.x + (Math.random() - 0.5) * 0.4,
        params.position.y + (Math.random() - 0.5) * 0.4,
        params.position.z + Math.random() * 0.5
      );

      // Radial splash velocity + upward bounce
      velAttr.setXYZ(
        idx,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        Math.random() * 3.0 + 1.0
      );

      colAttr.setXYZ(idx, color.r, color.g, color.b);
      lifeAttr.setX(idx, 1.0); // 1.0 = alive
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    this.activeSplashes++;
  }

  // Phase 12: Gradual Mixing
  public mixLiquids(currentColorHex: number, targetColorHex: number) {
    this.mixCurrentColor.setHex(currentColorHex);
    this.mixTargetColor.setHex(targetColorHex);
    this.isMixing = true;
    this.mixProgress = 0;
  }

  public update(delta: number) {
    // 1. Update mixing gradient
    if (this.isMixing) {
      this.mixProgress += delta * 0.5; // 2 seconds to mix
      if (this.mixProgress >= 1.0) {
        this.isMixing = false;
        this.mixProgress = 1.0;
      }
      this.mixCurrentColor.lerp(this.mixTargetColor, this.mixProgress);
    }

    // 2. Update droplet physics
    const posAttr = this.splashParticles.geometry.attributes.position as THREE.BufferAttribute;
    const velAttr = this.splashParticles.geometry.attributes.velocity as THREE.BufferAttribute;
    const lifeAttr = this.splashParticles.geometry.attributes.lifetime as THREE.BufferAttribute;
    
    const posArray = posAttr.array as Float32Array;
    const velArray = velAttr.array as Float32Array;
    const lifeArray = lifeAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      if (lifeArray[i] > 0) {
        // Gravity
        velArray[i * 3 + 2] -= delta * 9.8; 
        
        // Drag
        velArray[i * 3 + 0] *= 0.98;
        velArray[i * 3 + 1] *= 0.98;

        // Velocity integration
        posArray[i * 3 + 0] += velArray[i * 3 + 0] * delta;
        posArray[i * 3 + 1] += velArray[i * 3 + 1] * delta;
        posArray[i * 3 + 2] += velArray[i * 3 + 2] * delta;

        // Floor collision
        if (posArray[i * 3 + 2] <= 0) {
          posArray[i * 3 + 2] = 0;
          velArray[i * 3 + 2] *= -0.3; // bounce
          lifeArray[i] -= delta * 2.0; // fade quickly on floor
        }
      }
    }
    posAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }

  public dispose() {
    this.scene.remove(this.splashParticles);
    this.splashParticles.geometry.dispose();
    (this.splashParticles.material as THREE.Material).dispose();
  }
}
