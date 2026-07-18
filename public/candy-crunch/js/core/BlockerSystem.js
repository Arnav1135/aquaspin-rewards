import { CELL_TYPES, BLOCKER_TYPES } from './Constants.js';

export const BLOCKER_PROFILES = {
  [BLOCKER_TYPES.FROSTING]: {
    defaultHealth: 1,
    armor: 0,
    explosionResistance: 0,
    spreadRate: 0,
    weakness: []
  },
  [BLOCKER_TYPES.CHOCOLATE]: {
    defaultHealth: 2,
    armor: 0,
    explosionResistance: 1, // chocolate resists explosion somewhat
    spreadRate: 1, // spreads if no chocolate was cleared in the turn
    weakness: ['special'] // weak vs special match activations
  },
  [BLOCKER_TYPES.LICORICE]: {
    defaultHealth: 1,
    armor: 0,
    explosionResistance: 0,
    spreadRate: 0,
    weakness: []
  }
};

export class BlockerSystem {
  static initBlocker(cell, type, customHealth = null) {
    const profile = BLOCKER_PROFILES[type];
    if (!profile) return;

    cell.type = CELL_TYPES.BLOCKER;
    cell.blocker.type = type;
    cell.blocker.health = customHealth !== null ? customHealth : profile.defaultHealth;
    cell.blocker.armor = profile.armor;
    cell.blocker.spreadRate = profile.spreadRate;
    cell.blocker.explosionResistance = profile.explosionResistance;
    cell.candyColor = null;
    cell.candyType = null;
  }

  /**
   * Spreads chocolate to an adjacent normal cell if no chocolate was cleared this turn.
   */
  static spreadChocolate(board, clearedChocolateThisTurn) {
    if (clearedChocolateThisTurn) return [];

    // Find all chocolate cells
    const chocolates = board.cells.filter(
      c => c.type === CELL_TYPES.BLOCKER && c.blocker.type === BLOCKER_TYPES.CHOCOLATE
    );

    if (chocolates.length === 0) return [];

    // Shuffle chocolates to select one randomly
    chocolates.sort(() => Math.random() - 0.5);

    for (const ch of chocolates) {
      // Find adjacent normal slots that can be consumed by chocolate
      const adjacents = [
        board.getCell(ch.row - 1, ch.col),
        board.getCell(ch.row + 1, ch.col),
        board.getCell(ch.row, ch.col - 1),
        board.getCell(ch.row, ch.col + 1)
      ].filter(
        c => c && c.type === CELL_TYPES.NORMAL && !c.isLocked() && c.candyColor !== null
      );

      if (adjacents.length > 0) {
        const target = adjacents[Math.floor(Math.random() * adjacents.length)];
        BlockerSystem.initBlocker(target, BLOCKER_TYPES.CHOCOLATE);
        return [target.idx]; // Return index of newly spread chocolate cell
      }
    }

    return [];
  }
}
