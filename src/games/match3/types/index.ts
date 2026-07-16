// Match-3 Game Type Definitions

export enum CandyType {
  EMPTY = 0,
  RED = 1,
  BLUE = 2,
  GREEN = 3,
  YELLOW = 4,
  PURPLE = 5,
  ORANGE = 6,
}

export enum SpecialType {
  NONE = 0,
  STRIPED_H = 1,      // Horizontal striped
  STRIPED_V = 2,      // Vertical striped
  WRAPPED = 3,        // Wrapped/bomb
  COLOR_BOMB = 4,     // Color bomb
}

export enum ObstacleType {
  NONE = 0,
  JELLY = 1,          // Needs to be cleared 1-2 times
  CHOCOLATE = 2,      // Spreads when matched nearby, needs clearing
  LICORICE = 3,       // Blocks movement, needs clearing
  FROSTING = 4,       // Thickens over levels, needs clearing
  INGREDIENT = 5,     // Must drop to bottom
}

export interface Cell {
  candyType: CandyType;
  specialType: SpecialType;
  obstacle?: ObstacleType;
  obstacleHealth?: number;  // For jelly, chocolate, frosting
}

export interface Position {
  row: number;
  col: number;
}

export interface Match {
  positions: Position[];
  direction: 'horizontal' | 'vertical';
  matchLength: number;
}

export interface Cascade {
  fallPositions: Map<string, number>; // "row,col" -> new row after fall
  newCandies: Cell[];
}

export interface LevelConfig {
  id: number;
  name: string;
  width: number;
  height: number;
  moveLimit: number;
  objectiveType: 'score' | 'jelly' | 'collect' | 'ingredient' | 'blockers';
  objectiveTarget: number;
  starThresholds: [number, number, number]; // 1-star, 2-star, 3-star score
  initialBoard?: Cell[][];
  obstacles?: Array<{ row: number; col: number; type: ObstacleType; health?: number }>;
  collectTarget?: CandyType;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  world: number; // Visual world 1-6 (10 levels each)
}

export interface GameState {
  levelId: number;
  board: Cell[][];
  score: number;
  movesRemaining: number;
  matches: Match[];
  isAnimating: boolean;
  gameStatus: 'playing' | 'levelComplete' | 'levelFailed';
  starCount: number;
  cascadeCount: number;
}

export interface ComboInfo {
  cascadeCount: number;
  specialsTriggered: SpecialType[];
  isCombo: boolean;
  comboMultiplier: number;
}
