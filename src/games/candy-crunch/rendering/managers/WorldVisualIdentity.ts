import { EnvironmentManager } from './EnvironmentManager';

export type WorldTheme = 'SUGAR_KINGDOM' | 'JELLY_LAGOON' | 'CHOCOLATE_MOUNTAIN' | 'CRYSTAL_CAVERN';

export interface WorldDefinition {
  theme: WorldTheme;
  name: string;
  environmentType: 'SUGAR' | 'JELLY' | 'CHOCOLATE' | 'CRYSTAL';
  backgroundColor: string;
  fogColor: number;
  audioTrack: string;
}

export class WorldVisualIdentity {
  private environmentManager: EnvironmentManager;
  private currentWorld: WorldDefinition;

  private static worlds: Record<WorldTheme, WorldDefinition> = {
    SUGAR_KINGDOM: {
      theme: 'SUGAR_KINGDOM',
      name: 'Sugar Kingdom',
      environmentType: 'SUGAR',
      backgroundColor: '#0a1628',
      fogColor: 0x0e172a,
      audioTrack: 'sugar_world_ambience',
    },
    JELLY_LAGOON: {
      theme: 'JELLY_LAGOON',
      name: 'Jelly Lagoon',
      environmentType: 'JELLY',
      backgroundColor: '#160a28',
      fogColor: 0x1a0e2a,
      audioTrack: 'jelly_world_ambience',
    },
    CHOCOLATE_MOUNTAIN: {
      theme: 'CHOCOLATE_MOUNTAIN',
      name: 'Chocolate Mountain',
      environmentType: 'CHOCOLATE',
      backgroundColor: '#1c0f0a',
      fogColor: 0x1a0f0a,
      audioTrack: 'chocolate_world_ambience',
    },
    CRYSTAL_CAVERN: {
      theme: 'CRYSTAL_CAVERN',
      name: 'Crystal Cavern',
      environmentType: 'CRYSTAL',
      backgroundColor: '#0a051c',
      fogColor: 0x0a051c,
      audioTrack: 'crystal_world_ambience',
    },
  };

  constructor(environmentManager: EnvironmentManager) {
    this.environmentManager = environmentManager;
    this.currentWorld = WorldVisualIdentity.worlds.SUGAR_KINGDOM;
  }

  // Phase 18: World Visual Identity & Transitions
  public setWorld(theme: WorldTheme) {
    const worldDef = WorldVisualIdentity.worlds[theme] || WorldVisualIdentity.worlds.SUGAR_KINGDOM;
    this.currentWorld = worldDef;
    this.environmentManager.setEnvironmentWorld(worldDef.environmentType);
  }

  public getCurrentWorld(): WorldDefinition {
    return this.currentWorld;
  }
}
