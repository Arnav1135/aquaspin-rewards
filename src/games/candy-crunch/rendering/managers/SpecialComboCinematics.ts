import * as THREE from 'three';
import { VFXManager } from './VFXManager';
import { CameraManager } from './CameraManager';
import { EnvironmentManager } from './EnvironmentManager';
import { SpecialType } from '../../types';

export class SpecialComboCinematics {
  private vfx: VFXManager;
  private camera: CameraManager;
  private environment: EnvironmentManager;

  constructor(vfx: VFXManager, camera: CameraManager, environment: EnvironmentManager) {
    this.vfx = vfx;
    this.camera = camera;
    this.environment = environment;
  }

  // Phase 10: Single Special Candy Activation Visual Sequence
  public triggerSpecialActivation(type: SpecialType, x: number, y: number) {
    switch (type) {
      case 'striped-h':
        this.camera.punchCamera(0.4);
        this.vfx.spawnShockwave(x, y, '#00ffff');
        this.vfx.spawnEnergyRibbon(x, y, true);
        this.environment.triggerLightingReaction('SPECIAL', { x, y }, 0x00ffff);
        break;

      case 'striped-v':
        this.camera.punchCamera(0.4);
        this.vfx.spawnShockwave(x, y, '#00ffff');
        this.vfx.spawnEnergyRibbon(x, y, false);
        this.environment.triggerLightingReaction('SPECIAL', { x, y }, 0x00ffff);
        break;

      case 'wrapped':
        this.camera.punchCamera(0.6);
        this.vfx.spawnShockwave(x, y, '#ff0055');
        this.vfx.spawnExplosion(x, y, 'red', 40);
        this.environment.triggerLightingReaction('SPECIAL', { x, y }, 0xff0055);
        break;

      case 'color-bomb':
        this.camera.punchCamera(1.0);
        this.vfx.spawnShockwave(x, y, '#ffd700');
        this.vfx.spawnCinematicStarburst(x, y);
        this.environment.triggerLightingReaction('MEGA_COMBO', { x, y }, 0xffd700);
        break;

      default:
        this.vfx.spawnExplosion(x, y, 'purple', 25);
        break;
    }
  }

  // Phase 11: Special Combo Cinematics
  public triggerComboSequence(typeA: SpecialType, typeB: SpecialType, x: number, y: number) {
    const key = `${typeA}+${typeB}`;

    if (typeA === 'color-bomb' && typeB === 'color-bomb') {
      // Color Bomb + Color Bomb (Board Wipe Cinematic)
      this.camera.shakeCamera(1.2, 0.8);
      this.vfx.spawnShockwave(x, y, '#ffffff');
      this.vfx.spawnCinematicStarburst(x, y);
      this.environment.triggerLightingReaction('VICTORY', { x, y }, 0xffffff);

    } else if (typeA.startsWith('striped') && typeB.startsWith('striped')) {
      // Striped + Striped (Cross Beam Explosion)
      this.camera.punchCamera(0.7);
      this.vfx.spawnEnergyRibbon(x, y, true);
      this.vfx.spawnEnergyRibbon(x, y, false);
      this.vfx.spawnShockwave(x, y, '#00f0ff');
      this.environment.triggerLightingReaction('MEGA_COMBO', { x, y }, 0x00f0ff);

    } else if (typeA === 'wrapped' && typeB === 'wrapped') {
      // Wrapped + Wrapped (Mega Blast)
      this.camera.shakeCamera(1.0, 0.5);
      this.vfx.spawnShockwave(x, y, '#ffaa00');
      this.vfx.spawnExplosion(x, y, 'orange', 60);
      this.environment.triggerLightingReaction('MEGA_COMBO', { x, y }, 0xffaa00);

    } else if (typeA === 'color-bomb' || typeB === 'color-bomb') {
      // Color Bomb + Special
      this.camera.punchCamera(0.9);
      this.vfx.spawnShockwave(x, y, '#d400ff');
      this.vfx.spawnCinematicStarburst(x, y);
      this.environment.triggerLightingReaction('MEGA_COMBO', { x, y }, 0xd400ff);

    } else {
      // Default Combo
      this.camera.punchCamera(0.5);
      this.vfx.spawnShockwave(x, y, '#00ffff');
      this.environment.triggerLightingReaction('COMBO', { x, y });
    }
  }
}
