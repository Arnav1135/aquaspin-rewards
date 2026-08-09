/**
 * AQUA SPIN FACTORY - GAME SPECIFICATION DSL
 * Milestone 5
 */

export type GameGenre = 'Casino' | 'Arcade' | 'Board' | 'Quiz' | 'Puzzle' | 'Simulation' | 'RPG' | 'Action';
export type VisualQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
export type RendererMode = 'WebGL2' | 'WebGPU' | 'Canvas2D' | 'DOM';

export interface GameSpec {
  name: string;
  slug: string;
  genre: GameGenre;
  subgenre?: string;
  description: string;

  coreMechanics: string[];

  camera?: {
    type: '2D' | '3D_Perspective' | '3D_Orthographic' | 'Static';
    position?: [number, number, number];
    fov?: number;
  };

  world?: {
    size: 'small' | 'medium' | 'large' | 'infinite';
    bounds: boolean;
  };

  environment?: {
    atmosphere: 'day' | 'night' | 'space' | 'underwater' | 'neon';
    gravity: number;
  };

  graphics: {
    style: 'realistic' | 'low-poly' | 'pixel-art' | 'abstract' | 'minimalist';
    quality: VisualQuality;
    renderer: RendererMode;
    postProcessing: {
      bloom?: boolean;
      dof?: boolean;
      ssao?: boolean;
      antiAliasing?: boolean;
    };
  };

  physics?: {
    engine: 'Rapier' | 'Cannon' | 'Havok' | 'MatterJS' | 'None';
    rigidBodies: boolean;
  };

  animation?: {
    skeletal: boolean;
    particles: boolean;
  };

  audio?: {
    spatial: boolean;
    musicStyle?: string;
    soundEvents: string[];
  };

  controls: {
    mouse: boolean;
    keyboard: boolean;
    gamepad: boolean;
    touch: boolean;
  };

  mobile: {
    supported: boolean;
    orientation: 'portrait' | 'landscape' | 'both';
  };

  levels?: {
    generation: 'static' | 'procedural';
    count: number;
  };

  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';

  progression?: {
    saveState: boolean;
    achievements: string[];
  };

  economy?: {
    rewardTokens: number;
    costToPlay: number;
  };

  ui: {
    theme: 'dark' | 'light' | 'custom';
    overlay: boolean;
  };

  accessibility: {
    colorblindMode: boolean;
    highContrast: boolean;
  };

  performance: {
    targetFPS: number;
    maxDrawCalls?: number;
  };

  assets: {
    models: string[];
    textures: string[];
    audio: string[];
  };

  deployment: {
    codeSplitting: boolean;
    lazyLoad: boolean;
  };
}
