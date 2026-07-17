// src/games/LevelRegistry.ts
export type GameId = 'archery' | 'carrom' | 'chess' | 'chicken' | 'chickenjump' | 'clicker' | 'coinflip' | 'crash' | 'darts' | 'dotsandboxes' | 'dragontiger' | 'flappybird' | 'flip' | 'knifethrower' | 'limbo' | 'ludo' | 'mathsquiz' | 'memory' | 'mines' | 'ninjafruit' | 'plinko' | 'pool' | 'quiz' | 'roulette' | 'solitaire' | 'sudoku' | 'tapchallenge' | 'tictactoe';

export interface LevelConfig {
  level: number;
  name: string;
  physics: {
    gravity: number;
    friction: number;
    property: 'normal' | 'wind' | 'magnetic' | 'elastic' | 'quantum';
  };
  visuals: {
    theme: string;
    particleDensity: number;
    aberration: boolean;
  };
  difficultyMultiplier: number;
}

const PHYSICS_PROPS = ['normal', 'wind', 'magnetic', 'elastic', 'quantum'] as const;

export const LevelRegistry: Record<GameId, LevelConfig[]> = {} as any;

const ALL_GAMES: GameId[] = [
  'archery', 'carrom', 'chess', 'chicken', 'chickenjump', 'clicker', 'coinflip', 'crash', 
  'darts', 'dotsandboxes', 'dragontiger', 'flappybird', 'flip', 'knifethrower', 'limbo', 
  'ludo', 'mathsquiz', 'memory', 'mines', 'ninjafruit', 'plinko', 'pool', 'quiz', 
  'roulette', 'solitaire', 'sudoku', 'tapchallenge', 'tictactoe'
];

// Autonomous Level Generator Function (Part 7)
function generateLevelsForGame(gameId: GameId) {
  const levels: LevelConfig[] = [];
  for (let i = 1; i <= 5; i++) {
    levels.push({
      level: i,
      name: `Level ${i} - ${PHYSICS_PROPS[i - 1].toUpperCase()} ZONE`,
      physics: {
        gravity: 9.8 * (1 + (i * 0.1)),
        friction: 0.9 - (i * 0.05),
        property: PHYSICS_PROPS[i - 1],
      },
      visuals: {
        theme: `pastel-glass-tier-${i}`,
        particleDensity: i * 50,
        aberration: i >= 3, // Enable chromatic aberration on higher levels
      },
      difficultyMultiplier: 1.0 + (i * 0.25)
    });
  }
  LevelRegistry[gameId] = levels;
}

// Generate 5+ levels for all 29 games automatically
ALL_GAMES.forEach(generateLevelsForGame);

export function getLevelsForGame(gameId: GameId): LevelConfig[] {
  return LevelRegistry[gameId] || [];
}
