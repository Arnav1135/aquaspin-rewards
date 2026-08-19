import { CandyMaterialType } from '../../games/candy-crunch/rendering/CandyDesignSystem/CandyMaterialFactory';

export interface DeformationConfig {
  squashFactor: number;
  stretchFactor: number;
  wobbleDecay: number;
  settleDuration: number;
}

export class CandyDeformationProfile {
  private static profiles: Record<CandyMaterialType, DeformationConfig> = {
    HARD_CANDY: {
      squashFactor: 0.85,
      stretchFactor: 1.15,
      wobbleDecay: 15,
      settleDuration: 0.15,
    },
    GUMMY: {
      squashFactor: 0.6,
      stretchFactor: 1.4,
      wobbleDecay: 6,
      settleDuration: 0.35,
    },
    JELLY: {
      squashFactor: 0.5,
      stretchFactor: 1.5,
      wobbleDecay: 4,
      settleDuration: 0.45,
    },
    GLAZED: {
      squashFactor: 0.8,
      stretchFactor: 1.2,
      wobbleDecay: 12,
      settleDuration: 0.2,
    },
    CHOCOLATE: {
      squashFactor: 0.9,
      stretchFactor: 1.1,
      wobbleDecay: 18,
      settleDuration: 0.12,
    },
    CRYSTAL: {
      squashFactor: 0.95,
      stretchFactor: 1.05,
      wobbleDecay: 25,
      settleDuration: 0.08,
    },
    WRAPPER: {
      squashFactor: 0.75,
      stretchFactor: 1.25,
      wobbleDecay: 10,
      settleDuration: 0.25,
    },
    STRIPE: {
      squashFactor: 0.8,
      stretchFactor: 1.2,
      wobbleDecay: 14,
      settleDuration: 0.18,
    },
  };

  public static getConfig(type: CandyMaterialType): DeformationConfig {
    return this.profiles[type] || this.profiles.HARD_CANDY;
  }
}
