import { CandyMaterialType } from '../../games/candy-crunch/rendering/CandyDesignSystem/CandyMaterialFactory';

export interface DeformationConfig {
  squashFactor: number;
  stretchFactor: number;
  wobbleDecay: number;
  settleDuration: number;
}

export class CandyDeformationProfile {
  private static profiles: Record<CandyMaterialType, DeformationConfig> = {
    HARD_CANDY: { squashFactor: 0.85, stretchFactor: 1.15, wobbleDecay: 15, settleDuration: 0.15 },
    GUMMY: { squashFactor: 0.6, stretchFactor: 1.4, wobbleDecay: 6, settleDuration: 0.35 },
    JELLY: { squashFactor: 0.5, stretchFactor: 1.5, wobbleDecay: 4, settleDuration: 0.45 },
    GLAZED: { squashFactor: 0.8, stretchFactor: 1.2, wobbleDecay: 12, settleDuration: 0.2 },
    CHOCOLATE: { squashFactor: 0.9, stretchFactor: 1.1, wobbleDecay: 18, settleDuration: 0.12 },
    CRYSTAL: { squashFactor: 0.95, stretchFactor: 1.05, wobbleDecay: 25, settleDuration: 0.08 },
    WRAPPER: { squashFactor: 0.75, stretchFactor: 1.25, wobbleDecay: 10, settleDuration: 0.25 },
    STRIPE: { squashFactor: 0.8, stretchFactor: 1.2, wobbleDecay: 14, settleDuration: 0.18 },
  };

  public static getConfig(type: CandyMaterialType): DeformationConfig {
    return this.profiles[type] || this.profiles.HARD_CANDY;
  }

  // Phase 4 & 5: Procedural Deformation and Secondary Motion solver
  public static calculateDeformation(type: CandyMaterialType, impactEnergy: number, directionY: number): { scaleX: number, scaleY: number, scaleZ: number } {
    const config = this.getConfig(type);
    
    // Normalize impact energy (assume 0.0 to 1.0)
    const energy = Math.min(1.0, impactEnergy);
    
    // Lerp from 1.0 to squash/stretch factor based on energy
    let sx = 1.0 + (config.stretchFactor - 1.0) * energy;
    let sy = 1.0 - (1.0 - config.squashFactor) * energy;
    let sz = sx; // Uniform stretch on X and Z
    
    // If hitting from side, swap axes
    if (Math.abs(directionY) < 0.5) {
      const temp = sx;
      sx = sy;
      sy = temp;
    }
    
    return { scaleX: sx, scaleY: sy, scaleZ: sz };
  }
}
