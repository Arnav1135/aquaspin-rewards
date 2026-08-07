import { LevelDefinition } from './LevelGenerator';
import { Solver, SolverResult } from './Solver';
import { GameState } from './PuzzleEngine';

export class DifficultyEngine {
  /**
   * Analyze the difficulty of a generated level.
   */
  public static analyzeDifficulty(level: LevelDefinition, solverResult: SolverResult): number {
    if (!solverResult.solvable) return -1;

    let score = 0;

    // Base score from solution length
    score += solverResult.solutionLength * 10;

    // Search complexity (how many nodes explored to find it)
    // Logarithmic scale for search nodes so it doesn't dominate
    score += Math.log2(solverResult.nodesExplored) * 15;

    // Fragmentation penalty (how broken up the colors are initially)
    let fragments = 0;
    level.initialConfiguration.forEach(tube => {
      if (tube.length === 0) return;
      let lastColor = tube[0];
      fragments++;
      for (let i = 1; i < tube.length; i++) {
        if (tube[i] !== lastColor) {
          fragments++;
          lastColor = tube[i];
        }
      }
    });

    score += fragments * 5;

    // Empty space pressure
    if (level.emptyTubeCount === 1) score += 100; // Very restricted
    if (level.emptyTubeCount >= 3) score -= 50;   // Very easy

    return Math.floor(score);
  }

  /**
   * Adaptive target difficulty calculation based on player skill.
   */
  public static getTargetDifficulty(levelNumber: number, playerSkillRating: number): number {
    // Base progression: curve starts slow, scales up
    const baseDifficulty = 50 + (levelNumber * 15);
    
    // Player skill adjustment (e.g. if skill is high, add bonus difficulty)
    const adaptiveBonus = playerSkillRating * 10;
    
    return baseDifficulty + adaptiveBonus;
  }
}
