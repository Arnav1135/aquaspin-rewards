import * as THREE from 'three';
import { QualityPreset } from '../../games/candy-crunch/rendering/managers/QualityManager';
import { MaterialKind } from './MaterialReactionEngine';

export interface HeroObjectConfig {
  materialType: MaterialKind;
  importance: 'PRIMARY' | 'SECONDARY';
}

export class HeroObjectManager {
  private heroObjects: Map<THREE.Object3D, HeroObjectConfig> = new Map();
  private qualityPreset: QualityPreset = 'HIGH';

  public setQuality(preset: QualityPreset) {
    this.qualityPreset = preset;
    this.applyAll();
  }

  // Phase 8 & 9: Material-Aware Hero Object Quality & Micro-Surface
  public registerHeroObject(object: THREE.Object3D, config: HeroObjectConfig) {
    this.heroObjects.set(object, config);
    this.applyTreatment(object, config);
  }

  public unregisterHeroObject(object: THREE.Object3D) {
    this.heroObjects.delete(object);
  }

  private applyAll() {
    this.heroObjects.forEach((config, obj) => this.applyTreatment(obj, config));
  }

  private applyTreatment(object: THREE.Object3D, config: HeroObjectConfig) {
    if (this.qualityPreset === 'LOW') return; // No hero treatment on low

    const isPrimary = config.importance === 'PRIMARY';
    const isUltra = this.qualityPreset === 'ULTRA';

    object.traverse(child => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshPhysicalMaterial;
        if (!mat.isMeshPhysicalMaterial) return;

        // Reset first
        mat.envMapIntensity = 1.0;
        mat.clearcoat = 0.0;
        mat.clearcoatRoughness = 0.0;
        mat.iridescence = 0.0;

        switch (config.materialType) {
          case 'GLASS':
          case 'WATER':
          case 'ICE':
          case 'CRYSTAL':
            mat.envMapIntensity = isPrimary ? (isUltra ? 2.5 : 1.5) : 1.2;
            if (isUltra) {
              mat.clearcoat = 1.0;
              mat.clearcoatRoughness = 0.05;
              mat.iridescence = config.materialType === 'CRYSTAL' ? 0.3 : 0.0;
            }
            break;
            
          case 'METAL':
            mat.envMapIntensity = isPrimary ? 2.0 : 1.2;
            if (isUltra) {
              mat.clearcoat = 0.5;
              mat.clearcoatRoughness = 0.2;
            }
            break;
            
          case 'CANDY':
          case 'GUMMY':
          case 'JELLY':
            mat.envMapIntensity = isUltra ? 1.5 : 1.0;
            mat.clearcoat = 1.0; // Sugar glaze
            mat.clearcoatRoughness = config.materialType === 'GUMMY' ? 0.3 : 0.1;
            break;

          default:
            mat.envMapIntensity = 1.1;
            break;
        }
      }
    });
  }
}
