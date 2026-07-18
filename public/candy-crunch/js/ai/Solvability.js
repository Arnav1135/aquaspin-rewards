import { MatchDetector } from '../core/MatchDetector.js';
import { CELL_TYPES } from '../core/Constants.js';

export class SolvabilityValidator {
  /**
   * Validates if a board configuration is solvable and playable.
   * Checks for:
   * 1. At least one legal move.
   * 2. No pre-existing matches on startup (classic match-3 rule, matches must only form after player moves).
   */
  static validate(board) {
    // 1. Check for pre-existing matches on board creation
    const matches = MatchDetector.detect(board);
    if (matches.length > 0) {
      return { valid: false, reason: 'pre-existing matches' };
    }

    // 2. Check if at least one legal swap exists
    const legalMoves = SolvabilityValidator.findLegalMoves(board);
    if (legalMoves.length === 0) {
      return { valid: false, reason: 'no legal moves (dead board)' };
    }

    return { valid: true, legalMovesCount: legalMoves.length };
  }

  /**
   * Finds all legal moves on the board.
   * Returns array of swaps: { fromIdx, toIdx }
   */
  static findLegalMoves(board) {
    const legalMoves = [];

    // Temporary serialization to restore board state after trying swaps
    const initialState = board.serializeState();

    for (let r = 0; r < board.H; r++) {
      for (let c = 0; c < board.W; c++) {
        const cell = board.getCell(r, c);
        if (!cell || cell.type !== CELL_TYPES.NORMAL || !cell.candyColor || cell.isLocked()) continue;

        // Try swapping Right and Down
        const neighbors = [
          board.getCell(r, c + 1), // Right
          board.getCell(r + 1, c)  // Down
        ];

        for (const next of neighbors) {
          if (!next || next.type !== CELL_TYPES.NORMAL || !next.candyColor || next.isLocked()) continue;

          // Perform swap on model
          const tempColor = cell.candyColor;
          const tempType = cell.candyType;
          
          cell.candyColor = next.candyColor;
          cell.candyType = next.candyType;
          
          next.candyColor = tempColor;
          next.candyType = tempType;

          // Check if match is created
          const matches = MatchDetector.detect(board, cell, next);
          
          // Restore state
          board.deserializeState(initialState);

          if (matches.length > 0) {
            legalMoves.push({
              fromIdx: cell.idx,
              toIdx: next.idx
            });
          }
        }
      }
    }

    return legalMoves;
  }
}
