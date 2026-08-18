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
    if (board.length === 0 || board[0].length === 0) return false;
    
    const rows = board.length;
    const cols = board[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    let validTileCount = 0;
    
    // Find first valid tile to start DFS
    let startR = -1;
    let startC = -1;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isVoid) {
          validTileCount++;
          if (startR === -1) {
            startR = r;
            startC = c;
          }
        }
      }
    }
    
    if (validTileCount === 0) return false;
    
    // DFS to count reachable tiles
    let reachableCount = 0;
    const stack: {r: number, c: number}[] = [{r: startR, c: startC}];
    visited[startR][startC] = true;
    
    while (stack.length > 0) {
      const {r, c} = stack.pop()!;
      reachableCount++;
      
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && !board[nr][nc].isVoid) {
          visited[nr][nc] = true;
          stack.push({r: nr, c: nc});
        }
      }
    }
    
    return reachableCount !== validTileCount;
  }

  private static hasChokePoints(board: any[][]): boolean {
    const rows = board.length;
    const cols = board[0].length;
    if (rows < 3 || cols < 3) return false;

    // Scan for bottlenecks (1-tile wide gaps surrounded by voids)
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (!board[r][c].isVoid) {
          const voidLeft = board[r][c-1].isVoid;
          const voidRight = board[r][c+1].isVoid;
          const voidTop = board[r-1][c].isVoid;
          const voidBottom = board[r+1][c].isVoid;
          
          if ((voidLeft && voidRight) || (voidTop && voidBottom)) {
            // It's a 1-tile choke point
            return true;
          }
        }
      }
    }
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
