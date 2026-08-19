import { VFXManager } from '../../games/candy-crunch/rendering/managers/VFXManager';

export interface LevelPrediction {
  cascadeDepth: number;
  specialCount: number;
  expectedVfxIntensity: number;
  mechanicDensity: number;
}

export class SimulatorPrewarmer {
  private vfx: VFXManager;

  constructor(vfx: VFXManager) {
    this.vfx = vfx;
  }

  // Phase 27 & 28: Predictive Performance & Simulator-Driven Prewarm
  public prewarm(prediction: LevelPrediction) {
    // If prediction shows a high-intensity level is coming, pre-allocate pools
    // BEFORE the actual gameplay event triggers a frame drop.
    
    if (prediction.expectedVfxIntensity > 0.7 || prediction.specialCount > 5) {
      // High intensity expected, prewarm large particle pools
      this.vfx.spawnExplosion(-1000, -1000, 'yellow', 100); // Trigger GPU compile/alloc off-screen
    }

    if (prediction.cascadeDepth > 4) {
      // Deep cascades expected, warm up starbursts
      this.vfx.spawnCinematicStarburst(-1000, -1000); // Off-screen compile
    }
  }
}
