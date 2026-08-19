import { UniversalMaterialType } from './InteractionEvents';

export interface MaterialReaction {
  materialType: UniversalMaterialType;
  crackThreshold: number;
  fractureThreshold: number;
  splashMultiplier: number;
  particleType: string;
  soundCue: string;
}

export class MaterialReactionSystem {
  private static reactions: Record<UniversalMaterialType, MaterialReaction> = {
    GLASS: {
      materialType: 'GLASS',
      crackThreshold: 0.4,
      fractureThreshold: 0.85,
      splashMultiplier: 0.0,
      particleType: 'glass_shards',
      soundCue: 'glass_shatter',
    },
    WATER: {
      materialType: 'WATER',
      crackThreshold: 1.0,
      fractureThreshold: 1.0,
      splashMultiplier: 1.5,
      particleType: 'water_droplets',
      soundCue: 'water_splash',
    },
    ICE: {
      materialType: 'ICE',
      crackThreshold: 0.3,
      fractureThreshold: 0.75,
      splashMultiplier: 0.2,
      particleType: 'ice_crystals',
      soundCue: 'ice_crunch',
    },
    CANDY: {
      materialType: 'CANDY',
      crackThreshold: 0.6,
      fractureThreshold: 0.9,
      splashMultiplier: 0.0,
      particleType: 'sugar_dust',
      soundCue: 'candy_crunch',
    },
    METAL: {
      materialType: 'METAL',
      crackThreshold: 1.0,
      fractureThreshold: 1.0,
      splashMultiplier: 0.0,
      particleType: 'metal_sparks',
      soundCue: 'metal_ping',
    },
    STONE: {
      materialType: 'STONE',
      crackThreshold: 0.5,
      fractureThreshold: 0.9,
      splashMultiplier: 0.0,
      particleType: 'stone_debris',
      soundCue: 'stone_impact',
    },
    WOOD: {
      materialType: 'WOOD',
      crackThreshold: 0.45,
      fractureThreshold: 0.8,
      splashMultiplier: 0.0,
      particleType: 'splinters',
      soundCue: 'wood_clack',
    },
    SAND: {
      materialType: 'SAND',
      crackThreshold: 1.0,
      fractureThreshold: 1.0,
      splashMultiplier: 0.5,
      particleType: 'sand_cloud',
      soundCue: 'sand_rustle',
    },
  };

  public static getReaction(material: UniversalMaterialType): MaterialReaction {
    return this.reactions[material] || this.reactions.CANDY;
  }
}
