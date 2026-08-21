import * as THREE from 'three';
import { AnimationEngine } from './AnimationEngine';
import { VFXManager } from './VFXManager';
import { CameraManager } from './CameraManager';
import { EnvironmentManager } from './EnvironmentManager';
import { TileData } from '../../types';

export type CascadePhase = 
  | 'IDLE' 
  | 'MATCH_DETECTED' 
  | 'DESTRUCTION' 
  | 'GAP_FILL' 
  | 'GRAVITY_DROP' 
  | 'CASCADE_CASCADE_RECURSE';

export class CascadeAnimationController {
  private animationEngine: AnimationEngine;
  private vfxManager: VFXManager;
  private cameraManager: CameraManager;
  private environmentManager: EnvironmentManager;

  private currentCascadeStep: number = 0;
  private currentPhase: CascadePhase = 'IDLE';

  constructor(
    animationEngine: AnimationEngine,
    vfxManager: VFXManager,
    cameraManager: CameraManager,
    environmentManager: EnvironmentManager
  ) {
    this.animationEngine = animationEngine;
    this.vfxManager = vfxManager;
    this.cameraManager = cameraManager;
    this.environmentManager = environmentManager;
  }

  public handleMatchResolved(
    matchedTiles: TileData[],
    tileMeshMap: Map<string, THREE.Group>,
    cascadeDepth: number = 1
  ) {
    this.currentCascadeStep = cascadeDepth;
    this.currentPhase = 'MATCH_DETECTED';

    // Phase 7: Cascade Cinematics - Scale intensity with cascade depth
    const intensityMultiplier = Math.min(cascadeDepth, 10);
    const isLegendary = cascadeDepth >= 10;
    
    // Dynamic Camera Response
    if (cascadeDepth > 1) {
      this.cameraManager.punchCamera(0.2 * intensityMultiplier);
    }
    
    // Dynamic Environment Reaction
    if (isLegendary) {
      this.environmentManager.triggerLightingReaction('LEGENDARY_COMBO');
      // trigger legendary audio here
    } else if (cascadeDepth >= 5) {
      this.environmentManager.triggerLightingReaction('MEGA_COMBO');
    } else if (cascadeDepth > 1) {
      this.environmentManager.triggerLightingReaction('COMBO');
    } else {
      this.environmentManager.triggerLightingReaction('MATCH');
    }

    // Choreograph destruction of matched tiles
    matchedTiles.forEach((tile, index) => {
      const meshGroup = tileMeshMap.get(tile.id);
      if (meshGroup) {
        // Staggered destruction pop based on index
        const delay = index * (0.05 / Math.max(1, cascadeDepth * 0.5)); // Faster stagger on high cascades
        
        this.animationEngine.to(meshGroup.scale, 'x', 1.4 + (intensityMultiplier * 0.05), 0.12, undefined, delay, () => {
          // Multiply particles based on cascade
          const particles = 15 + (intensityMultiplier * 5);
          this.vfxManager.spawnExplosion(meshGroup.position.x, meshGroup.position.y, tile.color, particles);
        });
        this.animationEngine.to(meshGroup.scale, 'y', 1.4 + (intensityMultiplier * 0.05), 0.12, undefined, delay);
        this.animationEngine.to(meshGroup.scale, 'z', 1.4 + (intensityMultiplier * 0.05), 0.12, undefined, delay);
      }
    });
  }

  public handleCascadeEnded(cascadeCount: number) {
    this.currentPhase = 'IDLE';
    this.currentCascadeStep = 0;

    if (cascadeCount >= 10) {
      this.cameraManager.punchCamera(1.5);
    } else if (cascadeCount >= 5) {
      this.cameraManager.punchCamera(1.0);
    } else if (cascadeCount >= 3) {
      this.cameraManager.punchCamera(0.6);
    }
  }

  public getPhase(): CascadePhase {
    return this.currentPhase;
  }

  public getCascadeStep(): number {
    return this.currentCascadeStep;
  }
}
