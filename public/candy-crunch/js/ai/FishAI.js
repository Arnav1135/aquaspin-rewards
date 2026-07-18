import { CELL_TYPES, LAYER_TYPES, CANDY_TYPES } from '../core/Constants.js';

export class FishAI {
  /**
   * Finds the best cell target on the board for a fish candy.
   * Evaluates all valid cells and returns the one with the highest score.
   */
  static getBestTarget(board, levelConfig) {
    let bestCell = null;
    let maxScore = -Infinity;

    // Shuffle the cells to resolve equal score ties randomly
    const cells = [...board.cells].sort(() => Math.random() - 0.5);

    for (const cell of cells) {
      if (cell.type === CELL_TYPES.EMPTY || cell.clearing) continue;

      const score = FishAI.scoreCell(cell, board, levelConfig);
      if (score > maxScore) {
        maxScore = score;
        bestCell = cell;
      }
    }

    // Fallback if no cells match, return a random normal candy cell
    if (!bestCell || maxScore <= 0) {
      const normalCells = board.cells.filter(c => c.type === CELL_TYPES.NORMAL && c.candyColor);
      if (normalCells.length > 0) {
        bestCell = normalCells[Math.floor(Math.random() * normalCells.length)];
      }
    }

    return bestCell;
  }

  static scoreCell(cell, board, levelConfig) {
    let score = 0;

    // 1. Objectives (Highest priority)
    if (levelConfig.objective === 'jelly' && cell.layers[LAYER_TYPES.JELLY] > 0) {
      score += 100;
    }
    if (levelConfig.objective === 'blocker' && cell.type === CELL_TYPES.BLOCKER) {
      score += 100;
    }

    // 2. Timer Bombs (High priority to avoid failure)
    if (cell.candyType === CANDY_TYPES.TIMER) {
      // The lower the timer value, the higher the priority
      score += 120 + (10 - Math.min(10, cell.timerVal)) * 10;
    }

    // 3. Blockers in general
    if (cell.type === CELL_TYPES.BLOCKER) {
      score += 70;
    }

    // 4. Jelly in general (when not the primary objective)
    if (cell.layers[LAYER_TYPES.JELLY] > 0) {
      score += 40;
    }

    // 5. Special Candy triggers (creates massive cascades)
    if (cell.candyType === CANDY_TYPES.BOMB) {
      score += 120;
    } else if (cell.candyType === CANDY_TYPES.WRAPPED) {
      score += 65;
    } else if (cell.candyType === CANDY_TYPES.STRIPE_H || cell.candyType === CANDY_TYPES.STRIPE_V) {
      score += 60;
    }

    // 6. Cascade Potential Heuristic
    // Cells lower on the board have higher cascade potential because more candies drop.
    if (cell.type === CELL_TYPES.NORMAL) {
      score += cell.row * 5; // up to +45 score for bottom-most rows (assuming 9-10 rows)
    }

    return score;
  }
}
