import { LevelConfig, TileData } from '../types';
import { Match3Engine } from './Match3Engine';

export class LevelValidator {
  /**
   * Evaluates if a given generated level config is physically winnable
   * and playable (i.e. has possible moves, target isn't too high).
   */
  public static validate(config: LevelConfig): boolean {
    // Basic structural checks
    if (config.rows < 5 || config.cols < 5) return false;
    if (config.moves < 5) return false;
    
    // Check if target score is mathematically possible
    // A heuristic: Avg 150 points per move minimum
    if (config.objectiveType === 'score') {
      const maxPossibleScore = config.moves * 1000; // rough upper bound
      if (config.targetScore > maxPossibleScore) return false;
    }

    // Try generating an initial board 
    // Match3Engine.createInitialBoard ensures no immediate matches 
    // but does it ensure legal moves? Yes, it falls back if no legal moves.
    try {
      const initialBoard = Match3Engine.createInitialBoard(config);
      const legalMoves = Match3Engine.countLegalMoves(initialBoard);
      
      // If the engine couldn't even generate a board with legal moves, it's invalid.
      if (legalMoves === 0) return false;

      // Count jellies to ensure they match objective
      if (config.objectiveType === 'jelly') {
        let totalJellies = 0;
        config.jellyMap?.forEach(row => row.forEach(j => totalJellies += j));
        if (totalJellies === 0) return false; // Can't win a jelly level with 0 jellies
      }

    } catch (e) {
      return false; // Any generation crash means invalid
    }

    return true;
  }
}
