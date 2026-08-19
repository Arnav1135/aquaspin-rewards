import * as THREE from 'three';
import { MaterialKind, MaterialReactionEngine } from './MaterialReactionEngine';
import { VFXManager } from '../../games/candy-crunch/rendering/managers/VFXManager';
import { CameraManager } from '../../games/candy-crunch/rendering/managers/CameraManager';
import { EnvironmentManager } from '../../games/candy-crunch/rendering/managers/EnvironmentManager';
import { soundEngine } from '../../games/candy-crunch/soundEngine';

export interface ImpactInput {
  position: THREE.Vector3;
  direction?: THREE.Vector3;
  velocity: number;
  mass: number;
  material: MaterialKind;
  impactStrength: number;
}

export class ImpactEngine {
  private vfx: VFXManager;
  private camera: CameraManager;
  private environment: EnvironmentManager;

  constructor(vfx: VFXManager, camera: CameraManager, environment: EnvironmentManager) {
    this.vfx = vfx;
    this.camera = camera;
    this.environment = environment;
  }

  // Phase 1, 2 & 3: Material-Aware Impact Physics & Directional Bias
  public processImpact(input: ImpactInput) {
    const profile = MaterialReactionEngine.getProfile(input.material);
    
    // Kinetic Energy E = 0.5 * m * v^2 * impactStrength
    const kineticEnergy = 0.5 * input.mass * Math.pow(input.velocity, 2) * input.impactStrength;
    
    // Energy normalized to 0.0 - 1.0 curve sampling range
    const normalizedEnergy = Math.min(1.0, kineticEnergy / 5.0);
    
    // Evaluate curve
    const evalCurve = (curve: { subtle: number, visible: number, strong: number, cinematic: number }, e: number) => {
      if (e < 0.2) return curve.subtle + (curve.visible - curve.subtle) * (e / 0.2);
      if (e < 0.5) return curve.visible + (curve.strong - curve.visible) * ((e - 0.2) / 0.3);
      if (e < 0.8) return curve.strong + (curve.cinematic - curve.strong) * ((e - 0.5) / 0.3);
      return curve.cinematic;
    };

    const particleScale = evalCurve(profile.particleCurve, normalizedEnergy);
    const cameraScale = evalCurve(profile.cameraCurve, normalizedEnergy);
    const soundScale = evalCurve(profile.soundCurve, normalizedEnergy);
    const lightScale = evalCurve(profile.lightCurve, normalizedEnergy);

    // Directional Bias
    let biasX = 0;
    let biasY = 0;
    if (input.direction) {
      biasX = input.direction.x;
      biasY = input.direction.y;
    }

    // 1. Particle Response
    const particleCount = Math.floor(20 * particleScale);
    if (particleCount > 0) {
      // In a full implementation, we pass biasX, biasY to VFXManager to steer particles
      this.vfx.spawnExplosion(input.position.x + biasX * 0.1, input.position.y + biasY * 0.1, 'yellow', particleCount);
    }

    // 2. Camera Response
    if (cameraScale > 0.1) {
      this.camera.punchCamera(cameraScale * 0.5);
    }
    if (cameraScale > 0.8) {
      this.camera.shakeCamera(0.4, cameraScale * 0.3);
    }

    // 3. Lighting Response
    if (lightScale > 0.5) {
      this.environment.triggerLightingReaction('MATCH', { x: input.position.x, y: input.position.y });
    }

    // 4. Audio Response
    soundEngine.playPop(Math.min(5, Math.ceil(soundScale * 4)));
  }
}
