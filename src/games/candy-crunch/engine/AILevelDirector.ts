import { LevelConfig, CandyColor } from '../types';
import { LevelSimulator } from './LevelSimulator';
import { LevelNoveltyEngine } from './LevelNoveltyEngine';
import { LevelGenerator } from './LevelGenerator'; // Existing legacy generator

export class AILevelDirector {
  private noveltyEngine: LevelNoveltyEngine;

  constructor() {
    this.noveltyEngine = new LevelNoveltyEngine();
  }

  // Phase 30: AI Level Director
  public async generateTargetedLevel(
    levelNumber: number,
    targetDifficulty: number // 0.1 to 1.0
  ): Promise<LevelConfig> {
    
    let bestConfig: LevelConfig | null = null;
    let bestDifficultyDiff = 999;
    let attempts = 0;
    const maxAttempts = 15;

    // AI iterative design loop
    while (attempts < maxAttempts) {
      attempts++;
      
      // 1. Propose parameters based on target difficulty
      const rows = Math.floor(6 + Math.random() * (targetDifficulty * 6));
      const cols = Math.floor(6 + Math.random() * (targetDifficulty * 6));
      const moves = Math.floor(30 - (targetDifficulty * 15));
      const colorsCount = targetDifficulty > 0.7 ? 6 : 5;
      
      const allColors: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
      const colorsAvailable = allColors.slice(0, colorsCount);

      // We fallback to the existing LevelGenerator to build the raw data structure
      const rawConfig = LevelGenerator.getScaledLevelConfig(levelNumber);
      
      // Inject our targeted parameters
      rawConfig.rows = Math.max(5, Math.min(12, rows));
      rawConfig.cols = Math.max(5, Math.min(12, cols));
      rawConfig.moves = Math.max(10, moves);
      rawConfig.colorsAvailable = colorsAvailable;
      
      const seed = Math.random().toString();

      // 2. Compatibility & Novelty Check
      if (!this.noveltyEngine.isNovel(rawConfig, seed)) {
        continue; // Reject boring/repetitive levels
      }

      // 3. Simulator & Fairness Check (Phase 24 & 26)
      const simulation = LevelSimulator.runMonteCarloSimulation(rawConfig, 10);
      
      if (!simulation.isWinnable && targetDifficulty < 0.95) {
        continue; // Reject literally impossible levels unless it's meant to be ultra-hard
      }

      // 4. Evaluate actual difficulty vs target
      const diff = Math.abs(simulation.estimatedDifficulty - targetDifficulty);
      
      if (diff < bestDifficultyDiff) {
        bestDifficultyDiff = diff;
        bestConfig = rawConfig;
        if (bestConfig) {
          bestConfig.aiTips = `AI Simulated Difficulty: ${(simulation.estimatedDifficulty * 100).toFixed(0)}%. Average moves required: ${simulation.averageMovesRequired}.`;
        }
      }

      // If we are within 10% of target difficulty, we accept it immediately
      if (diff <= 0.1) {
        break;
      }
    }

    if (!bestConfig) {
      // Fallback if the simulator couldn't find a perfect match
      bestConfig = LevelGenerator.getScaledLevelConfig(levelNumber);
      if (bestConfig) {
        bestConfig.aiTips = "Fallback level generated. The Director couldn't perfectly calibrate this one!";
      }
    }

    return bestConfig as LevelConfig;
  }
}
