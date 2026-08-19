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

  // Phase 3: Universal Impact Solver
  public processImpact(input: ImpactInput) {
    const profile = MaterialReactionEngine.getProfile(input.material);
    const effectiveEnergy = input.impactStrength * input.velocity * (input.mass / 0.5);

    // 1. Particle Response
    const particleCount = Math.min(60, Math.floor(12 * effectiveEnergy));
    if (particleCount > 0) {
      this.vfx.spawnExplosion(input.position.x, input.position.y, 'yellow', particleCount);
    }

    // 2. Camera Response
    const cameraPunch = Math.min(1.2, 0.15 * effectiveEnergy);
    if (cameraPunch > 0.05) {
      this.camera.punchCamera(cameraPunch);
    }
    if (effectiveEnergy > 2.5) {
      this.camera.shakeCamera(0.4, Math.min(1.0, effectiveEnergy * 0.2));
    }

    // 3. Lighting Response
    if (effectiveEnergy > 1.5) {
      this.environment.triggerLightingReaction('MATCH', { x: input.position.x, y: input.position.y });
    }

    // 4. Audio Response
    soundEngine.playPop(Math.min(5, Math.ceil(effectiveEnergy)));
  }
}
