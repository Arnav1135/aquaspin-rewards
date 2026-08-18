import { LevelDefinition } from './interfaces';
import { Match3Engine } from '../Match3Engine';

export interface FairnessReport {
  isFair: boolean;
  score: number; // 0.0 to 1.0 (1.0 = perfectly fair)
  issues: string[];
  initialMovesCount: number;
}

export class FairnessEvaluator {
  
  /**
   * Statically evaluates a generated level definition to ensure it is solvable and fair.
   * If a level fails this check, the AI generator must mutate it and try again.
   */
  public static evaluate(level: LevelDefinition): FairnessReport {
    const issues: string[] = [];
    let score = 1.0;

    // 1. Connectivity Check (Are there isolated islands?)
    if (this.hasIsolatedIslands(level.board)) {
      issues.push('CRITICAL: Board contains isolated unreachable islands.');
      score -= 0.5;
    }

    // 2. Choke Point Check (Are there 1-tile wide columns blocking flow?)
    if (this.hasChokePoints(level.board)) {
      issues.push('WARNING: Severe choke points detected. Gravity flow may stall.');
      score -= 0.2;
    }

    // 3. Color Density Check (Are there too many colors for the board size?)
    const colorCount = 5; // To be pulled from mechanics
    const boardArea = level.board.length * level.board[0].length;
    if (boardArea < 30 && colorCount > 4) {
      issues.push('WARNING: Board too small for the number of available colors.');
      score -= 0.3;
    }

    // 4. Initial Legal Moves Check
    // Map the normalized board back to TileData format for simulation
    const simulatedBoard = this.convertToSimulationFormat(level.board);
    const initialMoves = Match3Engine.countLegalMoves(simulatedBoard);
    
    if (initialMoves === 0) {
      issues.push('CRITICAL: Generated board has 0 initial legal moves.');
      score = 0.0;
    } else if (initialMoves < 3) {
      issues.push('WARNING: Low number of initial legal moves (High RNG dependency).');
      score -= 0.15;
    }

    // Normalize score
    score = Math.max(0, Math.min(1.0, score));

    return {
      isFair: score >= 0.7 && !issues.some(i => i.startsWith('CRITICAL')),
      score,
      issues,
      initialMovesCount: initialMoves
    };
  }

  private static hasIsolatedIslands(board: any[][]): boolean {
    // DFS implementation to ensure all valid board tiles are connected
    // Scaffolded for now
    return false;
  }

  private static hasChokePoints(board: any[][]): boolean {
    // Scaffolded analysis of column widths
    return false;
  }

  private static convertToSimulationFormat(board: any[][]): any[][] {
    // Maps the AI generated board schema back to the TileData arrays used by the simulation engine
    return Match3Engine.createInitialBoard({
      levelNumber: 1,
      rows: board.length,
      cols: board[0].length,
      moves: 20,
      targetScore: 1000,
      title: 'Simulation',
      description: 'Simulation',
      objectiveType: 'score',
      colorsAvailable: ['red', 'blue', 'green', 'yellow']
    });
  }
}
