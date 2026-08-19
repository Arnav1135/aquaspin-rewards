import * as THREE from 'three';
import { CinematicTimeline } from './CinematicTimeline';
import { CameraManager } from '../../games/candy-crunch/rendering/managers/CameraManager';
import { EnvironmentManager } from '../../games/candy-crunch/rendering/managers/EnvironmentManager';
import { VFXManager } from '../../games/candy-crunch/rendering/managers/VFXManager';
import { soundEngine } from '../../games/candy-crunch/soundEngine';

export type CinematicPreset = 'MEGA_COMBO' | 'LEVEL_COMPLETE' | 'SPECIAL_ACTIVATION' | 'BOSS_IMPACT';

export class CinematicDirector {
  private cameraManager: CameraManager;
  private environmentManager: EnvironmentManager;
  private vfxManager: VFXManager;

  constructor(
    cameraManager: CameraManager,
    environmentManager: EnvironmentManager,
    vfxManager: VFXManager
  ) {
    this.cameraManager = cameraManager;
    this.environmentManager = environmentManager;
    this.vfxManager = vfxManager;
  }

  // Phase 17: Unified Cinematic Sequence Orchestrator
  public triggerSequence(preset: CinematicPreset, position?: THREE.Vector3) {
    const pos = position || new THREE.Vector3(0, 0, 0);

    const timeline = new CinematicTimeline();

    switch (preset) {
      case 'MEGA_COMBO':
        timeline
          .addStep(0, () => this.cameraManager.punchCamera(0.8))
          .addStep(50, () => this.environmentManager.triggerLightingReaction('MEGA_COMBO', pos, 0xffd700))
          .addStep(100, () => this.vfxManager.spawnCinematicStarburst(pos.x, pos.y))
          .addStep(150, () => soundEngine.playPop(5))
          .addStep(400, () => this.cameraManager.shakeCamera(0.5, 0.6))
          .play();
        break;

      case 'LEVEL_COMPLETE':
        timeline
          .addStep(0, () => this.cameraManager.triggerVictoryCamera())
          .addStep(100, () => this.environmentManager.triggerLightingReaction('VICTORY', pos, 0xffffff))
          .addStep(200, () => soundEngine.playFanfare())
          .addStep(300, () => this.vfxManager.spawnCinematicStarburst(0, 0))
          .play();
        break;

      case 'SPECIAL_ACTIVATION':
        timeline
          .addStep(0, () => this.cameraManager.punchCamera(0.5))
          .addStep(50, () => this.vfxManager.spawnShockwave(pos.x, pos.y, '#00ffff'))
          .addStep(100, () => soundEngine.playLaser())
          .play();
        break;

      case 'BOSS_IMPACT':
        timeline
          .addStep(0, () => this.cameraManager.shakeCamera(1.0, 1.2))
          .addStep(50, () => this.environmentManager.triggerLightingReaction('SPECIAL', pos, 0xff0000))
          .addStep(100, () => soundEngine.playExplosion())
          .play();
        break;
    }
  }
}
