import { CANDY_TYPES, CELL_TYPES } from './Constants.js';

export class MatchDetector {
  /**
   * Detects all match patterns on the board.
   * Returns a list of match groups. Each group contains:
   * - cells: Array of Cell objects in the match
   * - color: Color of the match
   * - spawnSpecial: The type of special candy to spawn (if any)
   * - spawnCell: Cell where the special candy should spawn
   */
  static detect(board, swapFrom = null, swapTo = null) {
    const horizontalMatches = MatchDetector._findLines(board, true);
    const verticalMatches = MatchDetector._findLines(board, false);
    const squares2x2 = MatchDetector._find2x2Squares(board);

    const merged = MatchDetector._mergeMatches(
      board,
      horizontalMatches,
      verticalMatches,
      squares2x2,
      swapFrom,
      swapTo
    );

    return merged;
  }

  static _findLines(board, isHorizontal) {
    const lines = [];
    const mainLimit = isHorizontal ? board.H : board.W;
    const subLimit = isHorizontal ? board.W : board.H;

    for (let main = 0; main < mainLimit; main++) {
      let currentMatch = [];
      let lastColor = null;

      for (let sub = 0; sub < subLimit; sub++) {
        const r = isHorizontal ? main : sub;
        const c = isHorizontal ? sub : main;
        const cell = board.getCell(r, c);

        const hasColor = cell && cell.type === CELL_TYPES.NORMAL && cell.candyColor && !cell.clearing;
        const color = hasColor ? cell.candyColor : null;

        if (color && color === lastColor) {
          currentMatch.push(cell);
        } else {
          if (currentMatch.length >= 3) {
            lines.push(currentMatch);
          }
          currentMatch = color ? [cell] : [];
        }
        lastColor = color;
      }

      if (currentMatch.length >= 3) {
        lines.push(currentMatch);
      }
    }

    return lines;
  }

  static _find2x2Squares(board) {
    const squares = [];
    const checked = new Set();

    for (let r = 0; r < board.H - 1; r++) {
      for (let c = 0; c < board.W - 1; c++) {
        const c1 = board.getCell(r, c);
        const c2 = board.getCell(r, c + 1);
        const c3 = board.getCell(r + 1, c);
        const c4 = board.getCell(r + 1, c + 1);

        if (!c1 || !c2 || !c3 || !c4) continue;
        if (c1.clearing || c2.clearing || c3.clearing || c4.clearing) continue;
        if (c1.type !== CELL_TYPES.NORMAL || c2.type !== CELL_TYPES.NORMAL || c3.type !== CELL_TYPES.NORMAL || c4.type !== CELL_TYPES.NORMAL) continue;

        const color = c1.candyColor;
        if (color && c2.candyColor === color && c3.candyColor === color && c4.candyColor === color) {
          // Add to squares list
          squares.push([c1, c2, c3, c4]);
        }
      }
    }
    return squares;
  }

  static _mergeMatches(board, hLines, vLines, squares, swapFrom, swapTo) {
    const groups = [];
    const cellToGroup = new Map();

    const addToGroup = (cell, group) => {
      group.cells.add(cell);
      cellToGroup.set(cell, group);
    };

    // First process horizontal and vertical lines
    const allLines = [...hLines, ...vLines];
    for (const line of allLines) {
      let existingGroup = null;
      for (const cell of line) {
        if (cellToGroup.has(cell)) {
          existingGroup = cellToGroup.get(cell);
          break;
        }
      }

      if (!existingGroup) {
        existingGroup = {
          cells: new Set(),
          color: line[0].candyColor,
          type: 'line',
          hLength: 0,
          vLength: 0,
          spawnSpecial: null,
          spawnCell: null
        };
        groups.push(existingGroup);
      }

      for (const cell of line) {
        addToGroup(cell, existingGroup);
      }
    }

    // Process 2x2 squares (Fish Booster)
    for (const square of squares) {
      let existingGroup = null;
      for (const cell of square) {
        if (cellToGroup.has(cell)) {
          existingGroup = cellToGroup.get(cell);
          break;
        }
      }

      if (!existingGroup) {
        existingGroup = {
          cells: new Set(),
          color: square[0].candyColor,
          type: 'square',
          spawnSpecial: CANDY_TYPES.FISH,
          spawnCell: null
        };
        groups.push(existingGroup);
      } else {
        existingGroup.type = 'square-mixed';
        if (!existingGroup.spawnSpecial) {
          existingGroup.spawnSpecial = CANDY_TYPES.FISH;
        }
      }

      for (const cell of square) {
        addToGroup(cell, existingGroup);
      }
    }

    // Now resolve each group's characteristics
    for (const group of groups) {
      const arr = Array.from(group.cells);
      
      // Separate row & col coordinates
      const rows = arr.map(c => c.row);
      const cols = arr.map(c => c.col);
      const minR = Math.min(...rows), maxR = Math.max(...rows);
      const minC = Math.min(...cols), maxC = Math.max(...cols);

      // Determine dimensions
      const hSpan = maxC - minC + 1;
      const vSpan = maxR - minR + 1;

      // Determine spawnSpecial candy type based on geometry
      if (group.type === 'square' || group.type === 'square-mixed') {
        group.spawnSpecial = CANDY_TYPES.FISH;
      } else {
        // Line-based or intersections
        const isIntersection = (hSpan >= 3 && vSpan >= 3);
        const maxLen = Math.max(hSpan, vSpan);

        if (maxLen >= 5) {
          group.spawnSpecial = CANDY_TYPES.BOMB;
        } else if (isIntersection) {
          group.spawnSpecial = CANDY_TYPES.WRAPPED;
        } else if (maxLen === 4) {
          // If vertical line of 4 -> Striped H (clears row). If horizontal line of 4 -> Striped V (clears col).
          // Classic Candy Crush logic: Stripe orientation is opposite to the match direction.
          group.spawnSpecial = hSpan === 4 ? CANDY_TYPES.STRIPE_V : CANDY_TYPES.STRIPE_H;
        }
      }

      // Determine where the special candy should spawn
      // Priority: Player's swap target (swapTo), or swap source (swapFrom), or center of match
      let targetSpawnCell = null;
      if (swapTo && group.cells.has(swapTo)) {
        targetSpawnCell = swapTo;
      } else if (swapFrom && group.cells.has(swapFrom)) {
        targetSpawnCell = swapFrom;
      } else {
        // Fallback to central cell in match
        let bestCell = arr[0];
        let minDist = Infinity;
        const avgR = rows.reduce((s, x) => s + x, 0) / arr.length;
        const avgC = cols.reduce((s, x) => s + x, 0) / arr.length;
        for (const c of arr) {
          const dist = Math.abs(c.row - avgR) + Math.abs(c.col - avgC);
          if (dist < minDist) {
            minDist = dist;
            bestCell = c;
          }
        }
        targetSpawnCell = bestCell;
      }

      group.spawnCell = targetSpawnCell;
      group.cells = arr; // convert Set back to Array for easy consumption
    }

    return groups;
  }
}
