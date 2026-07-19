import { CANDY_TYPES, CELL_TYPES } from './Constants.js';

export class SpecialEngine {
  /**
   * Evaluates if a swap between c1 and c2 is a special combo.
   * Returns a list of cells to destroy if it's a combo, or null if no combo applies.
   */
  static resolveSwap(board, c1, c2) {
    const specials = [
      CANDY_TYPES.BOMB, CANDY_TYPES.WRAPPED, CANDY_TYPES.STRIPE_H, CANDY_TYPES.STRIPE_V, CANDY_TYPES.FISH
    ];

    const isSpecial1 = specials.includes(c1.candyType);
    const isSpecial2 = specials.includes(c2.candyType);

    // If neither are special, or only one is special but not a Color Bomb
    if (!isSpecial1 && !isSpecial2) return null;
    if (c1.candyType !== CANDY_TYPES.BOMB && c2.candyType !== CANDY_TYPES.BOMB && (!isSpecial1 || !isSpecial2)) {
      return null; 
    }

    // 1. Color Bomb + Color Bomb
    if (c1.candyType === CANDY_TYPES.BOMB && c2.candyType === CANDY_TYPES.BOMB) {
      return this._clearEntireBoard(board);
    }

    // 2. Color Bomb + Any Candy
    if (c1.candyType === CANDY_TYPES.BOMB || c2.candyType === CANDY_TYPES.BOMB) {
      const bombCell = c1.candyType === CANDY_TYPES.BOMB ? c1 : c2;
      const targetCell = bombCell === c1 ? c2 : c1;

      // Color Bomb + Striped/Wrapped -> Convert all of that color then detonate
      if (targetCell.candyType === CANDY_TYPES.STRIPE_H || targetCell.candyType === CANDY_TYPES.STRIPE_V || targetCell.candyType === CANDY_TYPES.WRAPPED) {
        return this._convertAndClearColor(board, targetCell.candyColor, targetCell.candyType);
      } else {
        // Normal Color Bomb clear
        return this._clearColor(board, targetCell.candyColor, bombCell);
      }
    }

    // 3. Striped + Wrapped
    const hasStriped = c1.candyType === CANDY_TYPES.STRIPE_H || c1.candyType === CANDY_TYPES.STRIPE_V || c2.candyType === CANDY_TYPES.STRIPE_H || c2.candyType === CANDY_TYPES.STRIPE_V;
    const hasWrapped = c1.candyType === CANDY_TYPES.WRAPPED || c2.candyType === CANDY_TYPES.WRAPPED;
    if (hasStriped && hasWrapped) {
      // Big Cross (3 rows, 3 cols) centered on the target cell
      // The blast originates from the cell being moved into
      return this._getCrossBlast(board, c2, 3);
    }

    // 4. Wrapped + Wrapped
    if (c1.candyType === CANDY_TYPES.WRAPPED && c2.candyType === CANDY_TYPES.WRAPPED) {
      // Giant blast (5x5)
      return this._getSquareBlast(board, c2, 5);
    }

    // 5. Striped + Striped
    const c1Stripe = c1.candyType === CANDY_TYPES.STRIPE_H || c1.candyType === CANDY_TYPES.STRIPE_V;
    const c2Stripe = c2.candyType === CANDY_TYPES.STRIPE_H || c2.candyType === CANDY_TYPES.STRIPE_V;
    if (c1Stripe && c2Stripe) {
      // Clears 1 row and 1 col (cross)
      return this._getCrossBlast(board, c2, 1);
    }

    return null;
  }

  /**
   * Evaluates the blast radius of a single special candy.
   * Returns a list of cells to destroy.
   */
  static getBlastRadius(board, cell) {
    if (cell.candyType === CANDY_TYPES.STRIPE_H) {
      return this._getRow(board, cell.row);
    }
    if (cell.candyType === CANDY_TYPES.STRIPE_V) {
      return this._getCol(board, cell.col);
    }
    if (cell.candyType === CANDY_TYPES.WRAPPED) {
      // 3x3 explosion
      return this._getSquareBlast(board, cell, 3);
    }
    return [];
  }

  static _clearEntireBoard(board) {
    const toClear = [];
    for (let r = 0; r < board.H; r++) {
      for (let c = 0; c < board.W; c++) {
        toClear.push(board.getCell(r, c));
      }
    }
    return toClear;
  }

  static _clearColor(board, color, bombCell) {
    const toClear = [bombCell];
    for (let r = 0; r < board.H; r++) {
      for (let c = 0; c < board.W; c++) {
        const cell = board.getCell(r, c);
        if (cell.candyColor === color && cell.type === CELL_TYPES.NORMAL) {
          toClear.push(cell);
        }
      }
    }
    return toClear;
  }

  static _convertAndClearColor(board, color, specialTypeToConvert) {
    const toClear = [];
    for (let r = 0; r < board.H; r++) {
      for (let c = 0; c < board.W; c++) {
        const cell = board.getCell(r, c);
        if (cell.candyColor === color && cell.type === CELL_TYPES.NORMAL) {
          // Temporarily convert it so when it's destroyed, it blasts
          cell.candyType = specialTypeToConvert;
          // It will be triggered in the blast cascade
          toClear.push(cell);
        }
      }
    }
    return toClear;
  }

  static _getCrossBlast(board, centerCell, thickness) {
    const toClear = [];
    const offset = Math.floor(thickness / 2);
    
    // Rows
    for (let r = centerCell.row - offset; r <= centerCell.row + offset; r++) {
      if (r >= 0 && r < board.H) {
        toClear.push(...this._getRow(board, r));
      }
    }

    // Cols
    for (let c = centerCell.col - offset; c <= centerCell.col + offset; c++) {
      if (c >= 0 && c < board.W) {
        toClear.push(...this._getCol(board, c));
      }
    }
    
    // Deduplicate
    return [...new Set(toClear)];
  }

  static _getSquareBlast(board, centerCell, size) {
    const toClear = [];
    const offset = Math.floor(size / 2);

    for (let r = centerCell.row - offset; r <= centerCell.row + offset; r++) {
      for (let c = centerCell.col - offset; c <= centerCell.col + offset; c++) {
        const cell = board.getCell(r, c);
        if (cell) toClear.push(cell);
      }
    }
    return toClear;
  }

  static _getRow(board, r) {
    const toClear = [];
    for (let c = 0; c < board.W; c++) {
      toClear.push(board.getCell(r, c));
    }
    return toClear;
  }

  static _getCol(board, c) {
    const toClear = [];
    for (let r = 0; r < board.H; r++) {
      toClear.push(board.getCell(r, c));
    }
    return toClear;
  }
}
