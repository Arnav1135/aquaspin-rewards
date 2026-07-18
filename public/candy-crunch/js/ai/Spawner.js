import { COLORS } from '../core/Constants.js';

export class Spawner {
  /**
   * Generates a candy color using adaptive probability weights.
   */
  static getSpawnColor(board, levelConfig, movesLeft, currentScore, colorCount) {
    const activeColors = COLORS.slice(0, colorCount);
    
    // 1. Calculate base weights
    const weights = {};
    activeColors.forEach(c => {
      weights[c] = 100 / colorCount; // uniform starting weight
    });

    // 2. Adjust based on remaining moves and score progression
    const progress = currentScore / levelConfig.target;
    if (movesLeft <= 5 && progress >= 0.8) {
      // Player is close to victory and running out of moves!
      // Boost colors that are already highly represented on the board to trigger cascades.
      const boardColorCounts = Spawner._getColorRepresentation(board, activeColors);
      const totalCandies = Object.values(boardColorCounts).reduce((a, b) => a + b, 0);
      
      if (totalCandies > 0) {
        activeColors.forEach(c => {
          const ratio = boardColorCounts[c] / totalCandies;
          weights[c] += ratio * 40; // Add boost based on representation
        });
      }
    }

    // 3. Adjust based on objectives
    if (levelConfig.objective === 'jelly') {
      // Find colors that are near active jelly layers to help clear them
      const nearJellyColors = Spawner._getColorsNearLayer(board, 'jelly', activeColors);
      activeColors.forEach(c => {
        if (nearJellyColors[c]) {
          weights[c] += 15;
        }
      });
    } else if (levelConfig.objective === 'blocker') {
      // Boost colors near blockers
      const nearBlockerColors = Spawner._getColorsNearBlocker(board, activeColors);
      activeColors.forEach(c => {
        if (nearBlockerColors[c]) {
          weights[c] += 15;
        }
      });
    }

    // 4. Normalize weights and choose a color
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (const c of activeColors) {
      rand -= weights[c];
      if (rand <= 0) return c;
    }

    return activeColors[activeColors.length - 1];
  }

  static _getColorRepresentation(board, colors) {
    const counts = {};
    colors.forEach(c => counts[c] = 0);
    board.cells.forEach(cell => {
      if (cell.candyColor && counts[cell.candyColor] !== undefined) {
        counts[cell.candyColor]++;
      }
    });
    return counts;
  }

  static _getColorsNearLayer(board, layerType, colors) {
    const near = {};
    colors.forEach(c => near[c] = false);

    board.cells.forEach(cell => {
      if (cell.layers[layerType] > 0) {
        // Look around this cell
        const adjacents = [
          board.getCell(cell.row - 1, cell.col),
          board.getCell(cell.row + 1, cell.col),
          board.getCell(cell.row, cell.col - 1),
          board.getCell(cell.row, cell.col + 1)
        ];
        adjacents.forEach(adj => {
          if (adj && adj.candyColor) {
            near[adj.candyColor] = true;
          }
        });
      }
    });
    return near;
  }

  static _getColorsNearBlocker(board, colors) {
    const near = {};
    colors.forEach(c => near[c] = false);

    board.cells.forEach(cell => {
      if (cell.type === 'blocker') {
        const adjacents = [
          board.getCell(cell.row - 1, cell.col),
          board.getCell(cell.row + 1, cell.col),
          board.getCell(cell.row, cell.col - 1),
          board.getCell(cell.row, cell.col + 1)
        ];
        adjacents.forEach(adj => {
          if (adj && adj.candyColor) {
            near[adj.candyColor] = true;
          }
        });
      }
    });
    return near;
  }
}
