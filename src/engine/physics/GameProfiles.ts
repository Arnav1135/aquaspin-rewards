import { UniversalMaterialType } from './InteractionEvents';

export interface GameInteractionProfile {
  gameId: string;
  primaryMaterial: UniversalMaterialType;
  feelPreset: 'SOFT' | 'ARCADE' | 'CINEMATIC' | 'HYPER' | 'HEAVY';
  impactMultiplier: number;
  cameraShakeScale: number;
}

export const GAME_INTERACTION_PROFILES: Record<string, GameInteractionProfile> = {
  CandyCrunch: {
    gameId: 'CandyCrunch',
    primaryMaterial: 'CANDY',
    feelPreset: 'ARCADE',
    impactMultiplier: 1.2,
    cameraShakeScale: 1.0,
  },
  WaterSort: {
    gameId: 'WaterSort',
    primaryMaterial: 'WATER',
    feelPreset: 'CINEMATIC',
    impactMultiplier: 0.8,
    cameraShakeScale: 0.5,
  },
  Plinko: {
    gameId: 'Plinko',
    primaryMaterial: 'METAL',
    feelPreset: 'HYPER',
    impactMultiplier: 1.5,
    cameraShakeScale: 1.2,
  },
  Crash: {
    gameId: 'Crash',
    primaryMaterial: 'METAL',
    feelPreset: 'HEAVY',
    impactMultiplier: 2.0,
    cameraShakeScale: 2.0,
  },
};
