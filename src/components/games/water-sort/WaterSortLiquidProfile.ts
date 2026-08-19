import { LiquidProfile } from '../../../engine/rendering/shaders/LiquidVisualEngine';

export enum LiquidType {
  WATER = 'WATER',
  OIL = 'OIL',
  SYRUP = 'SYRUP',
  JUICE = 'JUICE',
  INK = 'INK',
  MAGIC = 'MAGIC',
  ENERGY = 'ENERGY',
  MOLTEN = 'MOLTEN',
  ICE = 'ICE',
}

export class WaterSortLiquidProfile {
  // Phase 26: Liquid Profile Library
  public static getProfileForColor(colorHex: string, type: LiquidType = LiquidType.WATER): LiquidProfile {
    const colorVal = parseInt(colorHex.replace('#', '0x'), 16);
    
    const baseProfile = {
      density: 1.0,
      baseColor: colorVal,
      opacity: 0.85, 
      viscosity: 0.2, 
      surfaceTension: 0.8, 
      foamFactor: 0.1, 
      ior: 1.33, 
    };

    switch (type) {
      case LiquidType.OIL:
        return { ...baseProfile, density: 0.8, viscosity: 0.8, opacity: 0.9, ior: 1.47, surfaceTension: 0.4 };
      case LiquidType.SYRUP:
        return { ...baseProfile, density: 1.3, viscosity: 1.5, opacity: 0.95, ior: 1.49, surfaceTension: 0.9 };
      case LiquidType.JUICE:
        return { ...baseProfile, density: 1.05, viscosity: 0.3, opacity: 0.6, ior: 1.34, foamFactor: 0.3 };
      case LiquidType.INK:
        return { ...baseProfile, density: 1.1, viscosity: 0.4, opacity: 1.0, ior: 1.5, foamFactor: 0.05 };
      case LiquidType.MAGIC:
        return { ...baseProfile, density: 0.5, viscosity: 0.1, opacity: 0.7, ior: 1.2, foamFactor: 0.8 }; 
      case LiquidType.ENERGY:
        return { ...baseProfile, density: 0.9, viscosity: 0.15, opacity: 0.5, ior: 1.35, foamFactor: 0.9, surfaceTension: 1.2 }; 
      case LiquidType.MOLTEN:
        return { ...baseProfile, density: 2.0, viscosity: 2.0, opacity: 1.0, ior: 2.0, foamFactor: 0.0 };
      case LiquidType.ICE:
        return { ...baseProfile, density: 0.92, viscosity: 10.0, opacity: 0.4, ior: 1.31, surfaceTension: 0.0, foamFactor: 0.0 };
      case LiquidType.WATER:
      default:
        return baseProfile;
    }
  }
}
