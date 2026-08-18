export type MechanicCategory =
  | 'MATCHING'
  | 'SPECIAL_CANDY'
  | 'BLOCKER'
  | 'OBJECTIVE'
  | 'BOARD'
  | 'GRAVITY'
  | 'PORTAL'
  | 'CONVEYOR'
  | 'SPAWN'
  | 'BOOSTER'
  | 'TIME'
  | 'SCORE'
  | 'COMBO'
  | 'BOSS'
  | 'ENVIRONMENT'
  | 'PROGRESSION';

export interface MechanicDefinition {
  id: string;
  category: MechanicCategory[];
  minimumDifficulty: number;
  recommendedDifficulty: number;
  complexityCost: number;
  prerequisites: string[];       // e.g., ['board_size_8x8']
  incompatibilities: string[];   // e.g., ['portal']
  dependencies: string[];
  interactions: string[];
  boardRequirements: any;
  objectiveCompatibility: string[];
  blockerCompatibility: string[];
  specialCandyCompatibility: string[];
  gravityCompatibility: string[];
  portalCompatibility: string[];
  fairnessRules: any;
}

export type EventType =
  | 'SWAP_ATTEMPT'
  | 'SWAP_SUCCESS'
  | 'SWAP_FAILURE'
  | 'MATCH_DETECTED'
  | 'MATCH_RESOLVED'
  | 'SPECIAL_CREATED'
  | 'SPECIAL_ACTIVATED'
  | 'SPECIAL_COMBINATION'
  | 'BLOCKER_DAMAGED'
  | 'BLOCKER_DESTROYED'
  | 'BLOCKER_SPREAD'
  | 'GRAVITY'
  | 'GRAVITY_CHANGED'
  | 'REFILL'
  | 'PORTAL_TRIGGERED'
  | 'CONVEYOR_MOVED'
  | 'CASCADE_CHECK'
  | 'CASCADE_STARTED'
  | 'CASCADE_ENDED'
  | 'OBJECTIVE_PROGRESS'
  | 'OBJECTIVE_COMPLETED'
  | 'LEVEL_COMPLETED'
  | 'LEVEL_FAILED';

export interface RuleEvent {
  type: EventType;
  payload: any;
  timestamp: number;
}

export interface RuleInteraction {
  sourceMechanicId: string;
  targetMechanicId: string;
  condition: (gameState: any, event: RuleEvent) => boolean;
  resolve: (gameState: any, event: RuleEvent) => any;
  priority: number;
}

export interface DifficultyProfile {
  targetDifficulty: number; // 0.0 to 1.0
  complexityBudget: number;
  movePressure: number;
  blockerDensity: number;
  objectiveComplexity: number;
  noveltyTarget: number;
}

export interface LevelDefinition {
  id: string;
  seed: string;
  rulesVersion: string;
  board: any[][];
  objectives: any[];
  mechanics: MechanicDefinition[];
  blockers: any[];
  specialRules: any[];
  gravity: any;
  portals: any[];
  conveyors: any[];
  difficulty: number;
  complexity: number;
  fairness: number;
  world: string;
  metadata: {
    dna: string;
    fingerprint: string;
  };
}
