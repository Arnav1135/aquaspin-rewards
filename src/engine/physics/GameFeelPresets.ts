export type GameFeelPreset = 'SOFT' | 'ARCADE' | 'CINEMATIC' | 'HYPER' | 'HEAVY';

export interface GameFeelConfig {
  preset: GameFeelPreset;
  animationStiffness: number;
  cameraResponse: number;
  vfxIntensity: number;
  audioIntensity: number;
  impactDurationMs: number;
}

export const GAME_FEEL_PRESETS: Record<GameFeelPreset, GameFeelConfig> = {
  SOFT: {
    preset: 'SOFT',
    animationStiffness: 120,
    cameraResponse: 0.3,
    vfxIntensity: 0.5,
    audioIntensity: 0.6,
    impactDurationMs: 250,
  },
  ARCADE: {
    preset: 'ARCADE',
    animationStiffness: 220,
    cameraResponse: 0.7,
    vfxIntensity: 1.0,
    audioIntensity: 1.0,
    impactDurationMs: 150,
  },
  CINEMATIC: {
    preset: 'CINEMATIC',
    animationStiffness: 160,
    cameraResponse: 1.0,
    vfxIntensity: 1.2,
    audioIntensity: 1.1,
    impactDurationMs: 350,
  },
  HYPER: {
    preset: 'HYPER',
    animationStiffness: 300,
    cameraResponse: 1.4,
    vfxIntensity: 1.8,
    audioIntensity: 1.3,
    impactDurationMs: 100,
  },
  HEAVY: {
    preset: 'HEAVY',
    animationStiffness: 100,
    cameraResponse: 1.5,
    vfxIntensity: 1.4,
    audioIntensity: 1.4,
    impactDurationMs: 500,
  },
};
