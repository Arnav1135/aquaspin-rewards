import { LevelConfig, TileData, LevelValidationResult } from '../types';
import { Match3Engine } from './Match3Engine';

export interface SimulationResult {
  isWinnable: boolean;
  estimatedDifficulty: number; // 0.0 to 1.0
  averageMovesRequired: number;
  deadlockProbability: number;
  fairnessScore: number; // 0.0 to 1.0
  metrics: {
    totalCascades: number;
    specialCandiesCreated: number;
    blockersDestroyed: number;
  };
}

export class LevelSimulator {
  /**
   * Phase 22: Level Simulator
   * Runs a Monte Carlo simulation (headless) to evaluate level difficulty and win probability.
   * Completely decoupled from Three.js and rendering.
   */
  public static runMonteCarloSimulation(
    config: LevelConfig,
    iterations: number = 20
  ): SimulationResult {
    let wins = 0;
    let totalMovesUsed = 0;
    let deadlocks = 0;
    
    let totalCascades = 0;
    let specialCandiesCreated = 0;
    let blockersDestroyed = 0;

    for (let i = 0; i < iterations; i++) {
      const result = this.simulateSinglePlaythrough(config);
      
      if (result.won) wins++;
      if (result.deadlocked) deadlocks++;
      
      totalMovesUsed += result.movesUsed;
      totalCascades += result.cascades;
      specialCandiesCreated += result.specialsCreated;
      blockersDestroyed += result.blockersDestroyed;
    }

    const winRate = wins / iterations;
    const deadlockRate = deadlocks / iterations;
    
    // Phase 25: Difficulty Engine calculation
    // Lower win rate = higher difficulty. Higher deadlocks = higher difficulty.
    let difficulty = 1.0 - winRate;
    difficulty += (deadlockRate * 0.5);
    difficulty = Math.min(1.0, Math.max(0.1, difficulty)); // Clamp between 0.1 and 1.0

    return {
      isWinnable: wins > 0,
      estimatedDifficulty: parseFloat(difficulty.toFixed(2)),
      averageMovesRequired: Math.round(totalMovesUsed / iterations),
      deadlockProbability: parseFloat(deadlockRate.toFixed(2)),
      fairnessScore: parseFloat((1.0 - deadlockRate).toFixed(2)),
      metrics: {
        totalCascades: Math.round(totalCascades / iterations),
        specialCandiesCreated: Math.round(specialCandiesCreated / iterations),
        blockersDestroyed: Math.round(blockersDestroyed / iterations)
      }
    };
  }

  private static simulateSinglePlaythrough(config: LevelConfig) {
    let board = Match3Engine.createInitialBoard(config);
    let movesLeft = config.moves;
    let movesUsed = 0;
    let score = 0;
    
    let cascades = 0;
    let specialsCreated = 0;
    let blockersDestroyed = 0;
    
    let won = false;
    let deadlocked = false;

    // Simulate up to max moves or until win
    while (movesLeft > 0 && !won && !deadlocked) {
      if (!Match3Engine.hasLegalMoves(board)) {
        // Shuffle (simulated)
        board = Match3Engine.shuffleBoard(board, config.colorsAvailable);
        if (!Match3Engine.hasLegalMoves(board)) {
          deadlocked = true;
          break;
        }
      }

      // 1. Ask the fallback AI for a move (simulating a player)
      const advice = Match3Engine.getBestMoveAdvice(board);
      const swap = advice.recommendedSwap;
      
      // 2. Perform Swap
      const t1 = board[swap.fromRow][swap.fromCol];
      const t2 = board[swap.toRow][swap.toCol];
      board[swap.fromRow][swap.fromCol] = { ...t2, row: swap.fromRow, col: swap.fromCol };
      board[swap.toRow][swap.toCol] = { ...t1, row: swap.toRow, col: swap.toCol };
      
      movesLeft--;
      movesUsed++;

      // 3. Process matches and gravity in a tight loop
      let isStabilized = false;
      let cascadeDepth = 0;

      while (!isStabilized) {
        const matchResult = Match3Engine.findMatches(board);
        if (matchResult.matchedTiles.length === 0) {
          isStabilized = true;
          break;
        }

        cascadeDepth++;
        cascades++;
        specialsCreated += matchResult.specialCreations.length;
        
        // Count blockers
        const beforeBlockers = this.countBlockers(board);
        Match3Engine.damageAdjacentBlockers(board);
        const afterBlockers = this.countBlockers(board);
        blockersDestroyed += Math.max(0, beforeBlockers - afterBlockers);

        // Apply matches and gravity
        matchResult.matchedTiles.forEach(t => t.isMatched = true);
        score += matchResult.matchedTiles.length * 50 * cascadeDepth;
        
        const gravResult = Match3Engine.applyGravity(board, config.colorsAvailable);
        board = gravResult.board;
      }

      // Check win condition (score for now, expand to jelly/ingredients later)
      if (score >= config.targetScore) {
        won = true;
      }
    }

    return {
      won,
      deadlocked,
      movesUsed,
      cascades,
      specialsCreated,
      blockersDestroyed
    };
  }

  private static countBlockers(board: TileData[][]): number {
    let count = 0;
    for (const row of board) {
      for (const t of row) {
        if (t.blocker !== 'none') count++;
      }
    }
    return count;
  }
}
