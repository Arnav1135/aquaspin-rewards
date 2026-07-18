import { CELL_TYPES } from './Constants.js';

export class GravityEngine {
  /**
   * Applies Gravity 2.0 to the board.
   * Returns an array of shifts: { fromCellIdx, toCellIdx, sourceRow, sourceCol }
   * And spawns: { cellIdx, sourceRow, sourceCol }
   */
  static resolve(board, levelConfig, spawnerFn) {
    const shifts = [];
    const spawns = [];
    const gravityDir = levelConfig.gravityDir || 'down'; // 'down', 'up', 'left', 'right'

    // We process cells in an order depending on gravity direction to ensure cascading works correctly.
    // e.g. for 'down', we start from bottom row H-1 up to 0.
    const order = [];
    if (gravityDir === 'down') {
      for (let r = board.H - 1; r >= 0; r--) {
        for (let c = 0; c < board.W; c++) {
          order.push(board.getCell(r, c));
        }
      }
    } else if (gravityDir === 'up') {
      for (let r = 0; r < board.H; r++) {
        for (let c = 0; c < board.W; c++) {
          order.push(board.getCell(r, c));
        }
      }
    } else if (gravityDir === 'left') {
      for (let c = 0; c < board.W; c++) {
        for (let r = 0; r < board.H; r++) {
          order.push(board.getCell(r, c));
        }
      }
    } else if (gravityDir === 'right') {
      for (let c = board.W - 1; c >= 0; c--) {
        for (let r = 0; r < board.H; r++) {
          order.push(board.getCell(r, c));
        }
      }
    }

    let BoardChanged = true;
    let iterations = 0;
    const maxIterations = board.W * board.H; // prevent infinite loops

    while (BoardChanged && iterations < maxIterations) {
      BoardChanged = false;
      iterations++;

      for (const cell of order) {
        if (cell.type === CELL_TYPES.BLOCKER || cell.type === CELL_TYPES.EMPTY) continue;
        if (cell.hasCandy() || cell.isLocked()) continue; // Cell already occupied or locked by chain/lock

        // This cell is NORMAL but has no candy. We need to pull one in!
        // 1. Check portal source
        if (cell.portalSource !== null) {
          const sourceCell = board.cells[cell.portalSource];
          if (sourceCell && sourceCell.hasCandy() && !sourceCell.clearing) {
            MatchDetector_moveCandy(sourceCell, cell);
            shifts.push({
              fromCellIdx: sourceCell.idx,
              toCellIdx: cell.idx,
              sourceRow: sourceCell.row,
              sourceCol: sourceCell.col
            });
            BoardChanged = true;
            continue;
          }
        }

        // 2. Check standard directional pull
        const sourceCell = GravityEngine._findSourceCell(board, cell, gravityDir);
        if (sourceCell) {
          if (sourceCell.hasCandy() && !sourceCell.clearing) {
            MatchDetector_moveCandy(sourceCell, cell);
            shifts.push({
              fromCellIdx: sourceCell.idx,
              toCellIdx: cell.idx,
              sourceRow: sourceCell.row,
              sourceCol: sourceCell.col
            });
            BoardChanged = true;
            continue;
          }
        }

        // 3. Diagonal Sliding (if source directly opposite gravity is blocked)
        const diagonalSource = GravityEngine._findDiagonalSource(board, cell, gravityDir);
        if (diagonalSource && diagonalSource.hasCandy() && !diagonalSource.clearing) {
          MatchDetector_moveCandy(diagonalSource, cell);
          shifts.push({
            fromCellIdx: diagonalSource.idx,
            toCellIdx: cell.idx,
            sourceRow: diagonalSource.row,
            sourceCol: diagonalSource.col
          });
          BoardChanged = true;
          continue;
        }

        // 4. Spawning (if we are at a boundary or have no valid sources left)
        if (GravityEngine._isSpawnerSlot(board, cell, gravityDir)) {
          spawnerFn(cell);
          spawns.push({
            cellIdx: cell.idx,
            sourceRow: cell.row + (gravityDir === 'down' ? -1 : gravityDir === 'up' ? 1 : 0),
            sourceCol: cell.col + (gravityDir === 'right' ? -1 : gravityDir === 'left' ? 1 : 0)
          });
          BoardChanged = true;
        }
      }
    }

    return { shifts, spawns };
  }

  static _findSourceCell(board, cell, gravityDir) {
    let r = cell.row;
    let c = cell.col;

    // Opposite of gravity direction
    if (gravityDir === 'down') r--;
    else if (gravityDir === 'up') r++;
    else if (gravityDir === 'left') c++;
    else if (gravityDir === 'right') c--;

    const source = board.getCell(r, c);
    if (!source || source.type === CELL_TYPES.BLOCKER) return null;
    return source;
  }

  static _findDiagonalSource(board, cell, gravityDir) {
    if (gravityDir !== 'down') return null; // Diagonal slide typically only down

    const above = board.getCell(cell.row - 1, cell.col);
    // Only slide diagonally if directly above is blocked (blocker, chain, lock, etc.)
    if (above && (above.type === CELL_TYPES.BLOCKER || above.isLocked())) {
      const diagLeft = board.getCell(cell.row - 1, cell.col - 1);
      const diagRight = board.getCell(cell.row - 1, cell.col + 1);

      // Randomize diagonal direction to prevent left/right bias
      const options = [];
      if (diagLeft && diagLeft.hasCandy() && !diagLeft.clearing) options.push(diagLeft);
      if (diagRight && diagRight.hasCandy() && !diagRight.clearing) options.push(diagRight);

      if (options.length > 0) {
        return options[Math.floor(Math.random() * options.length)];
      }
    }
    return null;
  }

  static _isSpawnerSlot(board, cell, gravityDir) {
    // A cell is a spawner slot if there is no board cell above/below/left/right of it
    // relative to the opposite of gravity.
    if (cell.portalSource !== null) return false;

    let r = cell.row;
    let c = cell.col;

    if (gravityDir === 'down') r--;
    else if (gravityDir === 'up') r++;
    else if (gravityDir === 'left') c++;
    else if (gravityDir === 'right') c--;

    const source = board.getCell(r, c);
    return source === null || source.type === CELL_TYPES.EMPTY;
  }
}

// Helper to copy candy properties
function MatchDetector_moveCandy(from, to) {
  to.candyColor = from.candyColor;
  to.candyType = from.candyType;
  to.timerVal = from.timerVal;
  
  from.candyColor = null;
  from.candyType = null;
  from.timerVal = 0;
}
