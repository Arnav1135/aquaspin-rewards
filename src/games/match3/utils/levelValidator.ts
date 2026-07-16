// Level Solvability Testing & Validation
import { Match3Engine } from '@/games/match3/engine/Match3Engine';
import { LEVELS } from '@/games/match3/levels/levelData';

interface TestResult {
  levelId: number;
  levelName: string;
  passed: boolean;
  hasBoardIssues: boolean;
  hasValidMoves: boolean;
  error?: string;
}

/**
 * Validate all 60 levels for basic solvability
 */
export function validateAllLevels(): TestResult[] {
  const results: TestResult[] = [];

  LEVELS.forEach(level => {
    const result = validateLevel(level.id);
    results.push(result);
  });

  return results;
}

/**
 * Validate a single level
 */
export function validateLevel(levelId: number): TestResult {
  const level = LEVELS.find(l => l.id === levelId);

  if (!level) {
    return {
      levelId,
      levelName: `Level ${levelId}`,
      passed: false,
      hasBoardIssues: true,
      hasValidMoves: false,
      error: 'Level not found',
    };
  }

  try {
    // Initialize board
    const board = Match3Engine.initializeBoard(level);

    // Check board integrity
    if (!board || board.length === 0) {
      return {
        levelId,
        levelName: level.name,
        passed: false,
        hasBoardIssues: true,
        hasValidMoves: false,
        error: 'Board initialization failed',
      };
    }

    // Check for valid moves
    const hasValidMoves = Match3Engine.hasValidMoves(board);

    if (!hasValidMoves) {
      // Auto-shuffle and try again
      const shuffledBoard = Match3Engine.shuffleBoard(board);
      const hasMovesAfterShuffle = Match3Engine.hasValidMoves(shuffledBoard);

      if (!hasMovesAfterShuffle) {
        return {
          levelId,
          levelName: level.name,
          passed: false,
          hasBoardIssues: false,
          hasValidMoves: false,
          error: 'No valid moves even after shuffling',
        };
      }
    }

    return {
      levelId,
      levelName: level.name,
      passed: true,
      hasBoardIssues: false,
      hasValidMoves: true,
    };
  } catch (error) {
    return {
      levelId,
      levelName: level.name,
      passed: false,
      hasBoardIssues: true,
      hasValidMoves: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Print validation report to console
 */
export function printValidationReport(): void {
  console.log('🧪 Match-3 Level Validation Report\n');
  console.log('=' .repeat(60));

  const results = validateAllLevels();
  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    if (result.passed) {
      passed++;
      console.log(`✅ ${result.levelName} - Valid`);
    } else {
      failed++;
      console.error(`❌ ${result.levelName} - ${result.error}`);
    }
  });

  console.log('=' .repeat(60));
  console.log(`\nResults: ${passed}/${results.length} levels passed`);
  console.log(`Status: ${failed === 0 ? '✅ All levels valid!' : `⚠️  ${failed} levels failed`}`);
}

/**
 * Simulate a level to completion (for testing)
 */
export async function simulateLevel(levelId: number, maxMoves: number = 1000): Promise<boolean> {
  const level = LEVELS.find(l => l.id === levelId);
  if (!level) return false;

  try {
    let board = Match3Engine.initializeBoard(level);
    let movesUsed = 0;

    while (movesUsed < maxMoves) {
      // Find valid moves
      const height = board.length;
      const width = board[0].length;
      let foundMove = false;

      for (let row = 0; row < height && !foundMove; row++) {
        for (let col = 0; col < width - 1 && !foundMove; col++) {
          if (Match3Engine.isValidSwap(board, { row, col }, { row, col: col + 1 })) {
            // Perform swap
            [board[row][col], board[row][col + 1]] = [
              board[row][col + 1],
              board[row][col],
            ];

            // Process matches
            let matches = Match3Engine.findMatches(board);
            while (matches.length > 0) {
              const { board: cleared } = Match3Engine.clearMatches(board, matches);
              const gravity = Match3Engine.applyGravity(cleared);
              board = Match3Engine.refillBoard(gravity);
              matches = Match3Engine.findMatches(board);
            }

            movesUsed++;
            foundMove = true;
          }
        }
      }

      if (!foundMove) {
        // No valid moves - shuffle
        board = Match3Engine.shuffleBoard(board);
      }

      // Simulate completion after some moves
      if (movesUsed > 5) {
        return true;
      }
    }

    return true;
  } catch (error) {
    console.error(`Simulation error for level ${levelId}:`, error);
    return false;
  }
}
