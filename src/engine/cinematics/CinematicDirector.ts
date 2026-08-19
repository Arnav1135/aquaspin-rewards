import * as THREE from 'three';
import { CinematicTimeline } from './CinematicTimeline';
import { CameraManager } from '../../games/candy-crunch/rendering/managers/CameraManager';
import { EnvironmentManager } from '../../games/candy-crunch/rendering/managers/EnvironmentManager';
import { VFXManager } from '../../games/candy-crunch/rendering/managers/VFXManager';
import { soundEngine } from '../../games/candy-crunch/soundEngine';
import { CinematicTimeDirector } from './CinematicTimeDirector';

export type CinematicPreset = 'MEGA_COMBO' | 'LEVEL_COMPLETE' | 'SPECIAL_ACTIVATION' | 'BOSS_IMPACT';
export type EventPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export class CinematicDirector {
  private cameraManager: CameraManager;
  private environmentManager: EnvironmentManager;
  private vfxManager: VFXManager;
  private timeDirector: CinematicTimeDirector;

  private activePriority: EventPriority = 'LOW';
  private activeTimeline: CinematicTimeline | null = null;

  private priorityMap: Record<EventPriority, number> = {
    'LOW': 1,
    'MEDIUM': 2,
    'HIGH': 3,
    'CRITICAL': 4
  };

  constructor(
    cameraManager: CameraManager,
    environmentManager: EnvironmentManager,
    vfxManager: VFXManager,
    timeDirector: CinematicTimeDirector
  ) {
    this.cameraManager = cameraManager;
    this.environmentManager = environmentManager;
    this.vfxManager = vfxManager;
    this.timeDirector = timeDirector;
  }

  // Phase 20: Priority Timeline Orchestration
  public triggerSequence(preset: CinematicPreset, priority: EventPriority, position?: THREE.Vector3) {
    // If active event is higher priority, suppress this one
    if (this.priorityMap[priority] < this.priorityMap[this.activePriority]) {
      return;
    }

    if (this.activeTimeline) {
      this.activeTimeline.cancel();
    }

    this.activePriority = priority;
    const pos = position || new THREE.Vector3(0, 0, 0);
    const timeline = new CinematicTimeline();

    // Phase 24: Temporal Visual Polish (deliberate offsets for anticipation, peak, recovery)
    switch (preset) {
      case 'MEGA_COMBO':
        timeline
          .addStep(0, () => this.timeDirector.triggerTimeDilation(0.75, 400)) // Anticipation
          .addStep(50, () => this.cameraManager.punchCamera(0.8))
          .addStep(80, () => this.environmentManager.triggerLightingReaction('MEGA_COMBO', pos, 0xffd700))
          .addStep(100, () => this.vfxManager.spawnCinematicStarburst(pos.x, pos.y)) // Peak VFX
          .addStep(120, () => soundEngine.playPop(5)) // Peak Audio
          .addStep(140, () => this.cameraManager.shakeCamera(0.5, 0.6)) // Impact Recovery
          .addStep(600, () => this.activePriority = 'LOW')
          .play();
        break;

      case 'LEVEL_COMPLETE':
        timeline
          .addStep(0, () => this.cameraManager.triggerVictoryCamera())
          .addStep(100, () => this.environmentManager.triggerLightingReaction('VICTORY', pos, 0xffffff))
          .addStep(200, () => soundEngine.playFanfare())
          .addStep(300, () => this.vfxManager.spawnCinematicStarburst(0, 0))
          .addStep(2000, () => this.activePriority = 'LOW')
          .play();
        break;

      case 'SPECIAL_ACTIVATION':
        timeline
          .addStep(0, () => this.cameraManager.punchCamera(0.5))
          .addStep(50, () => this.vfxManager.spawnShockwave(pos.x, pos.y, '#00ffff'))
          .addStep(100, () => soundEngine.playLaser())
          .addStep(400, () => this.activePriority = 'LOW')
          .play();
        break;

      case 'BOSS_IMPACT':
        timeline
          .addStep(0, () => this.timeDirector.triggerTimeDilation(0.5, 300))
          .addStep(50, () => this.cameraManager.shakeCamera(1.0, 1.2))
          .addStep(100, () => this.environmentManager.triggerLightingReaction('SPECIAL', pos, 0xff0000))
          .addStep(120, () => soundEngine.playExplosion())
          .addStep(1000, () => this.activePriority = 'LOW')
          .play();
        break;
    }

    this.activeTimeline = timeline;
  }
}
