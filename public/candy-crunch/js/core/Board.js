import { CELL_TYPES, CANDY_TYPES, BLOCKER_TYPES, LAYER_TYPES } from './Constants.js';

export class Cell {
  constructor(idx, row, col) {
    this.idx = idx;
    this.row = row;
    this.col = col;

    // Core Slot Status
    this.type = CELL_TYPES.NORMAL; // normal, blocker, empty
    this.clearing = false;

    // Candy properties
    this.candyColor = null;
    this.candyType = CANDY_TYPES.NORMAL;
    this.timerVal = 0; // for countdown timer bombs

    // Multi-Layer Board support (independent durability)
    this.layers = {
      [LAYER_TYPES.JELLY]: 0,   // 0 = none, 1 = normal, 2 = double jelly
      [LAYER_TYPES.ICE]: 0,     // 0 = none, 1-3 = frosting layers
      [LAYER_TYPES.CHAIN]: 0,   // 0 = none, 1 = locked by chain
      [LAYER_TYPES.LOCK]: 0,    // 0 = none, 1 = locked cell (requires key)
      [LAYER_TYPES.GROUND]: 0   // 0 = none, 1 = solid ground blocker
    };

    // Blocker attributes
    this.blocker = {
      type: null, // frosting, chocolate, licorice
      health: 0,
      armor: 0,
      spreadRate: 0,
      explosionResistance: 0
    };

    // Portals / Routing
    this.portalTarget = null; // index of target cell for portal transmission
    this.portalSource = null; // index of source cell
  }

  isLocked() {
    return this.layers[LAYER_TYPES.CHAIN] > 0 || this.layers[LAYER_TYPES.LOCK] > 0;
  }

  hasCandy() {
    return this.type === CELL_TYPES.NORMAL && this.candyColor !== null;
  }

  damageLayer(layerType, amount = 1) {
    if (this.layers[layerType] > 0) {
      this.layers[layerType] = Math.max(0, this.layers[layerType] - amount);
      return true;
    }
    return false;
  }

  damageBlocker(amount = 1, isExplosion = false) {
    if (this.type === CELL_TYPES.BLOCKER && this.blocker.type) {
      if (isExplosion && this.blocker.explosionResistance > 0) {
        // Reduced or null explosion damage
        amount = Math.max(0, amount - this.blocker.explosionResistance);
      }
      const actualDamage = Math.max(1, amount - this.blocker.armor);
      this.blocker.health = Math.max(0, this.blocker.health - actualDamage);
      
      if (this.blocker.health <= 0) {
        this.type = CELL_TYPES.NORMAL;
        this.blocker.type = null;
      }
      return true;
    }
    return false;
  }
}

export class Board {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.cells = [];
    this.init();
  }

  init() {
    this.cells = [];
    for (let r = 0; r < this.H; r++) {
      for (let c = 0; c < this.W; c++) {
        const idx = r * this.W + c;
        this.cells.push(new Cell(idx, r, c));
      }
    }
  }

  getCell(r, c) {
    if (r < 0 || r >= this.H || c < 0 || c >= this.W) return null;
    return this.cells[r * this.W + c];
  }

  getAdjacent(cell, dir) {
    // dir can be 'up', 'down', 'left', 'right'
    let r = cell.row;
    let c = cell.col;
    if (dir === 'up') r--;
    else if (dir === 'down') r++;
    else if (dir === 'left') c--;
    else if (dir === 'right') c++;
    return this.getCell(r, c);
  }

  serializeState() {
    return this.cells.map(c => ({
      idx: c.idx,
      row: c.row,
      col: c.col,
      type: c.type,
      candyColor: c.candyColor,
      candyType: c.candyType,
      timerVal: c.timerVal,
      layers: { ...c.layers },
      blocker: { ...c.blocker }
    }));
  }

  deserializeState(state) {
    state.forEach((s, idx) => {
      const c = this.cells[idx];
      c.type = s.type;
      c.candyColor = s.candyColor;
      c.candyType = s.candyType;
      c.timerVal = s.timerVal;
      c.layers = { ...s.layers };
      c.blocker = { ...s.blocker };
    });
  }
}
