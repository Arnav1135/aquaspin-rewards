import { SolvabilityValidator } from './Solvability.js';
import { MatchDetector } from '../core/MatchDetector.js';
import { CELL_TYPES, CANDY_TYPES } from '../core/Constants.js';

export class HintSystem {
  /**
   * Finds the best move on the board for the AI Hint System.
   * Returns: { fromIdx, toIdx, score }
   */
  static getBestHint(board, levelConfig) {
    const legalMoves = SolvabilityValidator.findLegalMoves(board);
    if (legalMoves.length === 0) return null;

    let bestMove = null;
    let highestScore = -Infinity;

    const initialState = board.serializeState();

    for (const move of legalMoves) {
      const fromCell = board.cells[move.fromIdx];
      const toCell = board.cells[move.toIdx];

      // Simulate swap
      const tempColor = fromCell.candyColor;
      const tempType = fromCell.candyType;

      fromCell.candyColor = toCell.candyColor;
      fromCell.candyType = toCell.candyType;

      toCell.candyColor = tempColor;
      toCell.candyType = tempType;

      // Score the swap
      const score = HintSystem._scoreSwap(board, fromCell, toCell, levelConfig);

      // Restore state
      board.deserializeState(initialState);

      if (score > highestScore) {
        highestScore = score;
        bestMove = {
          fromIdx: fromCell.idx,
          toIdx: toCell.idx,
          score
        };
      }
    }

    return bestMove;
  }

  static _scoreSwap(board, fromCell, toCell, levelConfig) {
    let score = 0;

    // Detect match group
    const matches = MatchDetector.detect(board, fromCell, toCell);
    
    for (const group of matches) {
      // 1. Match Size & Special Candy Creation
      const size = group.cells.length;
      score += size * 10;

      if (group.spawnSpecial === CANDY_TYPES.BOMB) {
        score += 250; // High value for Color Bomb creation
      } else if (group.spawnSpecial === CANDY_TYPES.WRAPPED) {
        score += 150; // Wrapped
      } else if (group.spawnSpecial === CANDY_TYPES.STRIPE_H || group.spawnSpecial === CANDY_TYPES.STRIPE_V) {
        score += 100; // Striped
      } else if (group.spawnSpecial === CANDY_TYPES.FISH) {
        score += 80;  // Fish
      }

      // 2. Objective progress
      group.cells.forEach(c => {
        if (levelConfig.objective === 'jelly' && c.layers.jelly > 0) {
          score += 40;
        }
        
        // Clearing adjacent blockers
        const adjacents = [
          board.getCell(c.row - 1, c.col),
          board.getCell(c.row + 1, c.col),
          board.getCell(c.row, c.col - 1),
          board.getCell(c.row, c.col + 1)
        ];
        adjacents.forEach(adj => {
          if (adj && adj.type === CELL_TYPES.BLOCKER) {
            score += 30;
            if (levelConfig.objective === 'blocker') {
              score += 50;
            }
          }
        });
      });
    }

    return score;
  }
}
