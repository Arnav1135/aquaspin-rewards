import {
  TileData,
  CandyColor,
  CandyShape,
  SpecialType,
  BlockerType,
  IngredientType,
  LevelConfig,
  LevelValidationResult,
} from '../types';
import { LevelValidator } from './LevelValidator';
import { MatchDetector } from './MatchDetector';

export class Match3Engine {
  // Shape mapper based on color
  public static getColorShape(color: CandyColor): CandyShape {
    switch (color) {
      case 'red':
        return 'jelly-bean';
      case 'orange':
        return 'lozenge';
      case 'yellow':
        return 'teardrop';
      case 'green':
        return 'square';
      case 'blue':
        return 'circle';
      case 'purple':
        return 'cluster';
      default:
        return 'fish';
    }
  }

  // Create random tile respecting initial no-match condition
  public static createRandomTile(
    row: number,
    col: number,
    availableColors: CandyColor[],
    forbiddenColors: CandyColor[] = [],
    isStitchFishLevel: boolean = false
  ): TileData {
    const validColors = availableColors.filter((c) => !forbiddenColors.includes(c));
    const colors = validColors.length > 0 ? validColors : availableColors;
    const color = colors[Math.floor(Math.random() * colors.length)];

    // If level has high Stitch Candies theme or random chance, make it a Stitch Fish!
    const isFish = isStitchFishLevel || Math.random() < 0.25;
    const shape = isFish ? 'fish' : this.getColorShape(color);

    return {
      id: `tile_${row}_${col}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      row,
      col,
      color,
      shape,
      special: 'none',
      blocker: 'none',
      jellyLayers: 0,
      ingredient: 'none',
      isWrappedCellophane: isFish && Math.random() < 0.15,
    };
  }

  // Generate Initial Board ensuring legal moves exist and NO initial 3-in-a-row matches
  public static createInitialBoard(config: LevelConfig): TileData[][] {
    const { rows, cols, colorsAvailable, jellyMap, blockerMap, ingredientCount } = config;
    let board: TileData[][] = [];
    let isValidStartingBoard = false;
    let attempts = 0;

    while (!isValidStartingBoard && attempts < 100) {
      attempts++;
      board = Array.from({ length: rows }, () => Array(cols));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const forbidden: CandyColor[] = [];

          // Prevent horizontal 3-in-a-row
          if (c >= 2 && board[r][c - 1] && board[r][c - 2]) {
            if (board[r][c - 1].color === board[r][c - 2].color) {
              forbidden.push(board[r][c - 1].color);
            }
          }
          // Prevent vertical 3-in-a-row
          if (r >= 2 && board[r - 1][c] && board[r - 2][c]) {
            if (board[r - 1][c].color === board[r - 2][c].color) {
              forbidden.push(board[r - 1][c].color);
            }
          }

          const tile = this.createRandomTile(r, c, colorsAvailable, forbidden, true);

          // Apply level jelly map
          if (jellyMap && jellyMap[r] && jellyMap[r][c]) {
            tile.jellyLayers = jellyMap[r][c];
          }

          // Apply level blocker map
          if (blockerMap && blockerMap[r] && blockerMap[r][c]) {
            tile.blocker = blockerMap[r][c];
          }

          board[r][c] = tile;
        }
      }

      // Add ingredients if level requires
      if (ingredientCount && ingredientCount > 0) {
        let placed = 0;
        while (placed < ingredientCount) {
          const c = Math.floor(Math.random() * cols);
          if (board[0][c].ingredient === 'none' && board[0][c].blocker === 'none') {
            board[0][c].ingredient = placed % 2 === 0 ? 'cherry' : 'hazelnut';
            placed++;
          }
        }
      }

      // Verify that at least 1 legal move exists
      if (this.hasLegalMoves(board)) {
        isValidStartingBoard = true;
      }
    }

    return board;
  }

  // Check adjacency (Up, Down, Left, Right ONLY - NO diagonals!)
  public static isAdjacent(
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): boolean {
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  // Clone board deep
  public static cloneBoard(board: TileData[][]): TileData[][] {
    return board.map((row) => row.map((tile) => ({ ...tile })));
  }

  // Find all matches on board using the new MatchDetector
  public static findMatches(board: TileData[][]): {
    matchedTiles: TileData[];
    specialCreations: { row: number; col: number; special: SpecialType; color: CandyColor; shape: CandyShape }[];
  } {
    const results = MatchDetector.detectMatches(board);
    
    const matchedSet = new Set<string>();
    const matchedTiles: TileData[] = [];
    const specialCreations: { row: number; col: number; special: SpecialType; color: CandyColor; shape: CandyShape }[] = [];

    for (const match of results) {
      for (const cell of match.cells) {
        const tile = board[cell.row][cell.col];
        if (!matchedSet.has(tile.id)) {
          matchedSet.add(tile.id);
          matchedTiles.push(tile);
        }
      }

      if (match.specialCreation !== 'none' && match.specialCreationCoords) {
        specialCreations.push({
          row: match.specialCreationCoords.row,
          col: match.specialCreationCoords.col,
          special: match.specialCreation,
          color: match.specialCreationColor!,
          shape: match.specialCreationShape!
        });
      }
    }

    return { matchedTiles, specialCreations };
  }

  // Handle Special Candy Activations & Chain Explosions
  public static activateSpecialCandy(
    board: TileData[][],
    r: number,
    c: number,
    special: SpecialType,
    color: CandyColor
  ): void {
    const rows = board.length;
    const cols = board[0].length;

    if (special === 'striped-h') {
      // Clear entire row
      for (let col = 0; col < cols; col++) {
        const target = board[r][col];
        if (!target.isMatched) {
          target.isMatched = true;
          if (target.special !== 'none' && (r !== target.row || col !== target.col)) {
            this.activateSpecialCandy(board, r, col, target.special, target.color);
          }
        }
      }
    } else if (special === 'striped-v') {
      // Clear entire column
      for (let row = 0; row < rows; row++) {
        const target = board[row][c];
        if (!target.isMatched) {
          target.isMatched = true;
          if (target.special !== 'none' && (row !== target.row || c !== target.col)) {
            this.activateSpecialCandy(board, row, c, target.special, target.color);
          }
        }
      }
    } else if (special === 'wrapped') {
      // 3x3 region explosion
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const target = board[nr][nc];
            if (!target.isMatched) {
              target.isMatched = true;
              if (target.special !== 'none' && (nr !== r || nc !== c)) {
                this.activateSpecialCandy(board, nr, nc, target.special, target.color);
              }
            }
          }
        }
      }
    } else if (special === 'color-bomb') {
      // Clear all tiles matching specified color
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (board[row][col].color === color) {
            board[row][col].isMatched = true;
          }
        }
      }
    } else if (special === 'jelly-fish') {
      // Swim and target 3 high value objective tiles
      let targeted = 0;
      for (let row = 0; row < rows && targeted < 3; row++) {
        for (let col = 0; col < cols && targeted < 3; col++) {
          const tile = board[row][col];
          if (tile.jellyLayers > 0 || tile.blocker !== 'none') {
            tile.isMatched = true;
            targeted++;
          }
        }
      }
    }
  }

  // Handle Swap between 2 Special Candies (Double Special Combo!)
  public static handleSpecialSwapCombo(
    board: TileData[][],
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): boolean {
    const tile1 = board[r1][c1];
    const tile2 = board[r2][c2];
    const s1 = tile1.special;
    const s2 = tile2.special;

    if (s1 === 'none' && s2 === 'none') return false;

    const rows = board.length;
    const cols = board[0].length;

    // 1. Color Bomb + Color Bomb -> Nuke entire board!
    if (s1 === 'color-bomb' && s2 === 'color-bomb') {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          board[r][c].isMatched = true;
        }
      }
      return true;
    }

    // 2. Color Bomb + Striped / Wrapped / Regular
    if (s1 === 'color-bomb' || s2 === 'color-bomb') {
      const targetColor = s1 === 'color-bomb' ? tile2.color : tile1.color;
      const otherSpecial = s1 === 'color-bomb' ? s2 : s1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c].color === targetColor) {
            board[r][c].isMatched = true;
            if (otherSpecial === 'striped-h' || otherSpecial === 'striped-v') {
              board[r][c].special = Math.random() < 0.5 ? 'striped-h' : 'striped-v';
              this.activateSpecialCandy(board, r, c, board[r][c].special, targetColor);
            } else if (otherSpecial === 'wrapped') {
              board[r][c].special = 'wrapped';
              this.activateSpecialCandy(board, r, c, 'wrapped', targetColor);
            }
          }
        }
      }
      tile1.isMatched = true;
      tile2.isMatched = true;
      return true;
    }

    // 3. Striped + Striped -> Cross Blast (1 row + 1 col)
    if (
      (s1 === 'striped-h' || s1 === 'striped-v') &&
      (s2 === 'striped-h' || s2 === 'striped-v')
    ) {
      this.activateSpecialCandy(board, r1, c1, 'striped-h', tile1.color);
      this.activateSpecialCandy(board, r1, c1, 'striped-v', tile1.color);
      return true;
    }

    // 4. Striped + Wrapped -> Giant Cross Blast (3 rows + 3 cols)
    if (
      ((s1 === 'striped-h' || s1 === 'striped-v') && s2 === 'wrapped') ||
      (s1 === 'wrapped' && (s2 === 'striped-h' || s2 === 'striped-v'))
    ) {
      for (let dr = -1; dr <= 1; dr++) {
        const row = r1 + dr;
        if (row >= 0 && row < rows) {
          for (let col = 0; col < cols; col++) board[row][col].isMatched = true;
        }
      }
      for (let dc = -1; dc <= 1; dc++) {
        const col = c1 + dc;
        if (col >= 0 && col < cols) {
          for (let row = 0; row < rows; row++) board[row][col].isMatched = true;
        }
      }
      return true;
    }

    // Single Special Candy Activation on Swap
    if (s1 !== 'none') this.activateSpecialCandy(board, r1, c1, s1, tile2.color || tile1.color);
    if (s2 !== 'none') this.activateSpecialCandy(board, r2, c2, s2, tile1.color || tile2.color);

    return true;
  }

  // Damage Adjacent Blockers (Frosting, Chocolate, Licorice, Marmalade)
  public static damageAdjacentBlockers(board: TileData[][]): void {
    const rows = board.length;
    const cols = board[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].isMatched) {
          const neighbors = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 },
          ];

          for (const n of neighbors) {
            if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
              const b = board[n.r][n.c];
              if (b.blocker === 'frosting-3') b.blocker = 'frosting-2';
              else if (b.blocker === 'frosting-2') b.blocker = 'frosting-1';
              else if (b.blocker === 'frosting-1' || b.blocker === 'chocolate' || b.blocker === 'licorice-swirl') {
                b.blocker = 'none';
              }
            }
          }
        }
      }
    }
  }

  // Fallback Tactical AI Move Recommendation Engine
  public static getBestMoveAdvice(board: TileData[][]): {
    recommendedSwap: { fromRow: number; fromCol: number; toRow: number; toCol: number };
    explanation: string;
    comboForecast: string;
    strategicRating: number;
  } {
    const rows = board.length;
    const cols = board[0].length;
    let bestMove = { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1 };
    let maxMatchLen = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Try Right
        if (c < cols - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r][c + 1];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r][c + 1] = { ...t1, row: r, col: c + 1 };
          const matches = this.findMatches(temp).matchedTiles;
          if (matches.length > maxMatchLen || t1.special !== 'none' || t2.special !== 'none') {
            maxMatchLen = matches.length || 5;
            bestMove = { fromRow: r, fromCol: c, toRow: r, toCol: c + 1 };
          }
        }
        // Try Down
        if (r < rows - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r + 1][c];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r + 1][c] = { ...t1, row: r, col: c + 1 };
          const matches = this.findMatches(temp).matchedTiles;
          if (matches.length > maxMatchLen || t1.special !== 'none' || t2.special !== 'none') {
            maxMatchLen = matches.length || 5;
            bestMove = { fromRow: r, fromCol: c, toRow: r + 1, toCol: c };
          }
        }
      }
    }

    return {
      recommendedSwap: bestMove,
      explanation: maxMatchLen >= 4
        ? `Swapping at (${bestMove.fromRow + 1},${bestMove.fromCol + 1}) creates a powerful Special Candy combo!`
        : `Swapping at (${bestMove.fromRow + 1},${bestMove.fromCol + 1}) triggers a high-value Match-3 gravity cascade!`,
      comboForecast: maxMatchLen >= 5 ? 'Generates Color Bomb Rainbow Explosion!' : maxMatchLen >= 4 ? 'Generates Striped Candy Blast!' : 'Clears 3 candies and triggers cascade',
      strategicRating: Math.min(99, 75 + maxMatchLen * 5),
    };
  }

  // Check if board has any legal moves
  public static hasLegalMoves(board: TileData[][]): boolean {
    const rows = board.length;
    const cols = board[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Try swap right
        if (c < cols - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r][c + 1];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r][c + 1] = { ...t1, row: r, col: c + 1 };
          if (this.findMatches(temp).matchedTiles.length > 0 || t1.special !== 'none' || t2.special !== 'none') {
            return true;
          }
        }

        // Try swap down
        if (r < rows - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r + 1][c];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r + 1][c] = { ...t1, row: r, col: c + 1 };
          if (this.findMatches(temp).matchedTiles.length > 0 || t1.special !== 'none' || t2.special !== 'none') {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Shuffle board while maintaining blockers & objectives
  public static shuffleBoard(board: TileData[][], availableColors: CandyColor[]): TileData[][] {
    const rows = board.length;
    const cols = board[0].length;
    let newBoard = this.cloneBoard(board);
    let attempts = 0;

    while (attempts < 50) {
      attempts++;
      const tilesToShuffle: TileData[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (newBoard[r][c].blocker === 'none') {
            tilesToShuffle.push(newBoard[r][c]);
          }
        }
      }

      // Fisher-Yates shuffle
      for (let i = tilesToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempColor = tilesToShuffle[i].color;
        const tempShape = tilesToShuffle[i].shape;
        const tempSpecial = tilesToShuffle[i].special;

        tilesToShuffle[i].color = tilesToShuffle[j].color;
        tilesToShuffle[i].shape = tilesToShuffle[j].shape;
        tilesToShuffle[i].special = tilesToShuffle[j].special;

        tilesToShuffle[j].color = tempColor;
        tilesToShuffle[j].shape = tempShape;
        tilesToShuffle[j].special = tempSpecial;
      }

      if (this.hasLegalMoves(newBoard) && this.findMatches(newBoard).matchedTiles.length === 0) {
        break;
      }
    }

    return newBoard;
  }

  // Process Gravity & Drop Candies
  public static applyGravity(
    board: TileData[][],
    availableColors: CandyColor[],
    gravityDir: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT' = 'DOWN'
  ): {
    board: TileData[][];
    droppedCount: number;
  } {
    const rows = board.length;
    const cols = board[0].length;
    const newBoard = this.cloneBoard(board);
    let droppedCount = 0;

    if (gravityDir === 'DOWN') {
      for (let c = 0; c < cols; c++) {
        let emptySlots = 0;
        for (let r = rows - 1; r >= 0; r--) {
          if (newBoard[r][c].isMatched) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const tile = newBoard[r][c];
            newBoard[r + emptySlots][c] = { ...tile, row: r + emptySlots, col: c, isFalling: true, fallOffset: emptySlots };
            newBoard[r][c] = { ...tile, isMatched: true };
            droppedCount++;
          }
        }
        for (let r = 0; r < emptySlots; r++) {
          const newTile = this.createRandomTile(r, c, availableColors, [], true);
          newTile.isFalling = true;
          newTile.fallOffset = emptySlots;
          newBoard[r][c] = newTile;
          droppedCount++;
        }
      }
    } else if (gravityDir === 'UP') {
      for (let c = 0; c < cols; c++) {
        let emptySlots = 0;
        for (let r = 0; r < rows; r++) {
          if (newBoard[r][c].isMatched) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const tile = newBoard[r][c];
            newBoard[r - emptySlots][c] = { ...tile, row: r - emptySlots, col: c, isFalling: true, fallOffset: emptySlots };
            newBoard[r][c] = { ...tile, isMatched: true };
            droppedCount++;
          }
        }
        for (let r = rows - 1; r >= rows - emptySlots; r--) {
          const newTile = this.createRandomTile(r, c, availableColors, [], true);
          newTile.isFalling = true;
          newTile.fallOffset = emptySlots;
          newBoard[r][c] = newTile;
          droppedCount++;
        }
      }
    } else if (gravityDir === 'LEFT') {
      for (let r = 0; r < rows; r++) {
        let emptySlots = 0;
        for (let c = 0; c < cols; c++) {
          if (newBoard[r][c].isMatched) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const tile = newBoard[r][c];
            newBoard[r][c - emptySlots] = { ...tile, row: r, col: c - emptySlots, isFalling: true, fallOffset: emptySlots };
            newBoard[r][c] = { ...tile, isMatched: true };
            droppedCount++;
          }
        }
        for (let c = cols - 1; c >= cols - emptySlots; c--) {
          const newTile = this.createRandomTile(r, c, availableColors, [], true);
          newTile.isFalling = true;
          newTile.fallOffset = emptySlots;
          newBoard[r][c] = newTile;
          droppedCount++;
        }
      }
    } else if (gravityDir === 'RIGHT') {
      for (let r = 0; r < rows; r++) {
        let emptySlots = 0;
        for (let c = cols - 1; c >= 0; c--) {
          if (newBoard[r][c].isMatched) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const tile = newBoard[r][c];
            newBoard[r][c + emptySlots] = { ...tile, row: r, col: c + emptySlots, isFalling: true, fallOffset: emptySlots };
            newBoard[r][c] = { ...tile, isMatched: true };
            droppedCount++;
          }
        }
        for (let c = 0; c < emptySlots; c++) {
          const newTile = this.createRandomTile(r, c, availableColors, [], true);
          newTile.isFalling = true;
          newTile.fallOffset = emptySlots;
          newBoard[r][c] = newTile;
          droppedCount++;
        }
      }
    }

    return { board: newBoard, droppedCount };
  }

  // Chocolate Spreading Logic (if no chocolate destroyed in turn, grow into adjacent empty/candy)
  public static processChocolateSpread(board: TileData[][]): TileData[][] {
    const rows = board.length;
    const cols = board[0].length;
    const newBoard = this.cloneBoard(board);
    const chocolatePositions: { r: number; c: number }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c].blocker === 'chocolate') {
          chocolatePositions.push({ r, c });
        }
      }
    }

    if (chocolatePositions.length === 0) return newBoard;

    // Pick random chocolate to spread
    const source = chocolatePositions[Math.floor(Math.random() * chocolatePositions.length)];
    const neighbors = [
      { r: source.r - 1, c: source.c },
      { r: source.r + 1, c: source.c },
      { r: source.r, c: source.c - 1 },
      { r: source.r, c: source.c + 1 },
    ].filter(
      (n) =>
        n.r >= 0 &&
        n.r < rows &&
        n.c >= 0 &&
        n.c < cols &&
        newBoard[n.r][n.c].blocker === 'none' &&
        newBoard[n.r][n.c].ingredient === 'none'
    );

    if (neighbors.length > 0) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      newBoard[target.r][target.c].blocker = 'chocolate';
    }

    return newBoard;
  }

  /**
   * Automated Difficulty Scaler
   * Programmatically adjusts board dimensions, move limits, blocker density, color complexity,
   * and target score based on level number (1 through 300+) to guarantee a smooth, fun,
   * error-free progression curve.
   */
  public static getScaledLevelConfig(levelNum: number, baseConfig?: LevelConfig): LevelConfig {
    const config = baseConfig ? { ...baseConfig } : {
      levelNumber: levelNum,
      title: `Level ${levelNum}`,
      description: `Complete level targets!`,
      rows: 8,
      cols: 8,
      moves: 25,
      targetScore: 10000,
      objectiveType: 'score' as const,
      colorsAvailable: ['red', 'orange', 'yellow', 'green', 'blue'] as CandyColor[],
    };

    const tier = Math.min(300, Math.max(1, levelNum));
    const progressFactor = (tier - 1) / 299; // Normalized 0.0 to 1.0

    // 1. Programmatically calculate Board Dimensions (rows & cols)
    let rows = config.rows || 8;
    let cols = config.cols || 8;

    if (!baseConfig) {
      if (tier <= 25) {
        rows = 8;
        cols = 8;
      } else if (tier <= 80) {
        rows = tier % 3 === 0 ? 9 : 8;
        cols = tier % 2 === 0 ? 9 : 8;
      } else if (tier <= 180) {
        rows = tier % 4 === 0 ? 10 : tier % 2 === 0 ? 9 : 8;
        cols = tier % 4 === 0 ? 10 : tier % 2 === 0 ? 9 : 8;
      } else {
        rows = tier % 5 === 0 ? 10 : tier % 2 === 0 ? 9 : 10;
        cols = tier % 5 === 0 ? 10 : tier % 2 === 0 ? 10 : 9;
      }
    }

    // 2. Programmatically calculate Available Colors
    let colorsAvailable: CandyColor[] = [...(config.colorsAvailable || ['red', 'orange', 'yellow', 'green', 'blue'])];
    if (tier > 40 && !colorsAvailable.includes('purple')) {
      colorsAvailable.push('purple');
    }

    // 3. Programmatically calculate Move Budget & Target Score
    const cellCount = rows * cols;
    const baseMoves = Math.max(18, Math.round(32 - progressFactor * 12 + (cellCount > 64 ? 3 : 0)));
    const objectiveBonus = config.objectiveType === 'jelly' ? 5 : config.objectiveType === 'ingredients' ? 4 : config.objectiveType === 'orders' ? 3 : 0;
    const moves = baseConfig?.moves ? Math.max(15, baseConfig.moves) : baseMoves + objectiveBonus;

    const targetScore = baseConfig?.targetScore || Math.round(5000 + tier * 2500 + Math.pow(tier, 1.3) * 60);

    // 4. Programmatically calculate Blocker Density & Maps
    let blockerMap = config.blockerMap;
    let jellyMap = config.jellyMap;

    if (!baseConfig) {
      const blockerDensity = Math.min(0.32, 0.05 + progressFactor * 0.27);
      const blockerTypesList: BlockerType[] = [
        'frosting-1',
        'frosting-2',
        'frosting-3',
        'marmalade',
        'licorice-lock',
        'licorice-swirl',
        'chocolate',
        'candy-cane-fence',
      ];

      const maxBlockerIdx = Math.min(blockerTypesList.length - 1, Math.floor(1 + progressFactor * 7));
      const activeBlockers = blockerTypesList.slice(0, maxBlockerIdx + 1);

      let validConfigFound = false;
      let seedOffset = 0;
      let generatedConfig: any;

      while (!validConfigFound && seedOffset < 20) {
        blockerMap = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const midR = Math.floor(rows / 2);
            const midC = Math.floor(cols / 2);
            if (Math.abs(r - midR) <= 0 && Math.abs(c - midC) <= 0) {
              return 'none';
            }

            const rand = (Math.sin(r * 12.9898 + c * 78.233 + tier * 43.12 + seedOffset * 10) + 1) / 2;
            if (rand < blockerDensity) {
              const bIdx = Math.floor(rand * 100) % activeBlockers.length;
              return activeBlockers[bIdx];
            }
            return 'none';
          })
        );

        if (config.objectiveType === 'jelly') {
          jellyMap = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const rand = (Math.cos(r * 31.11 + c * 17.89 + tier * 91.3 + seedOffset * 10) + 1) / 2;
              if (tier > 80 && rand > 0.65) return 2;
              if (rand > 0.3) return 1;
              return 0;
            })
          );
        }

        generatedConfig = {
          ...config,
          rows,
          cols,
          moves,
          targetScore,
          colorsAvailable,
          blockerMap,
          jellyMap,
        };

        if (LevelValidator.validate(generatedConfig)) {
          validConfigFound = true;
        } else {
          seedOffset++;
        }
      }
      return generatedConfig || { ...config, rows, cols, moves, targetScore, colorsAvailable, blockerMap, jellyMap };
    }
    return { ...config, rows, cols, moves, targetScore, colorsAvailable, blockerMap, jellyMap };
  }

  /**
   * Count total number of available legal swaps on the current board
   */
  public static countLegalMoves(board: TileData[][]): number {
    const rows = board.length;
    if (!rows) return 0;
    const cols = board[0].length;
    let count = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Swap Right
        if (c < cols - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r][c + 1];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r][c + 1] = { ...t1, row: r, col: c + 1 };
          if (this.findMatches(temp).matchedTiles.length > 0 || t1.special !== 'none' || t2.special !== 'none') {
            count++;
          }
        }
        // Swap Down
        if (r < rows - 1) {
          const temp = this.cloneBoard(board);
          const t1 = temp[r][c];
          const t2 = temp[r + 1][c];
          temp[r][c] = { ...t2, row: r, col: c };
          temp[r + 1][c] = { ...t1, row: r, col: c + 1 };
          if (this.findMatches(temp).matchedTiles.length > 0 || t1.special !== 'none' || t2.special !== 'none') {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Validates a level configuration by simulating initial board generation and checking legal moves and win condition criteria
   */
  public static validateLevel(config: LevelConfig): LevelValidationResult {
    const issues: string[] = [];
    const sanitizedConfig = { ...config };

    if (!sanitizedConfig.levelNumber || sanitizedConfig.levelNumber < 1) {
      issues.push('Invalid level number');
      sanitizedConfig.levelNumber = 1;
    }

    if (sanitizedConfig.rows < 5 || sanitizedConfig.rows > 12) {
      issues.push(`Rows (${sanitizedConfig.rows}) out of range [5-12]`);
      sanitizedConfig.rows = Math.max(5, Math.min(12, sanitizedConfig.rows));
    }

    if (sanitizedConfig.cols < 5 || sanitizedConfig.cols > 12) {
      issues.push(`Cols (${sanitizedConfig.cols}) out of range [5-12]`);
      sanitizedConfig.cols = Math.max(5, Math.min(12, sanitizedConfig.cols));
    }

    if (sanitizedConfig.moves < 5) {
      issues.push('Moves budget too low (minimum 5 moves required)');
      sanitizedConfig.moves = Math.max(15, sanitizedConfig.moves);
    }

    if (sanitizedConfig.targetScore <= 0) {
      issues.push('Target score must be positive');
      sanitizedConfig.targetScore = 10000;
    }

    if (!sanitizedConfig.colorsAvailable || sanitizedConfig.colorsAvailable.length < 3) {
      issues.push('Insufficient colors available (minimum 3 required)');
      sanitizedConfig.colorsAvailable = ['red', 'orange', 'yellow', 'green', 'blue'];
    }

    // Objective target checks
    if (sanitizedConfig.objectiveType === 'jelly') {
      const hasJelly = sanitizedConfig.jellyMap?.some((row) => row.some((layer) => layer > 0));
      if (!hasJelly) {
        issues.push('Jelly objective level missing jelly tiles in jellyMap; auto-generating jelly tiles');
        sanitizedConfig.jellyMap = Array.from({ length: sanitizedConfig.rows }, () =>
          Array.from({ length: sanitizedConfig.cols }, () => 1)
        );
      }
    } else if (sanitizedConfig.objectiveType === 'ingredients') {
      if (!sanitizedConfig.ingredientCount || sanitizedConfig.ingredientCount <= 0) {
        issues.push('Ingredients level missing ingredientCount; setting default count of 3');
        sanitizedConfig.ingredientCount = 3;
      }
    } else if (sanitizedConfig.objectiveType === 'orders') {
      if (!sanitizedConfig.orderTargets || sanitizedConfig.orderTargets.length === 0) {
        issues.push('Orders level missing orderTargets; setting default order targets');
        sanitizedConfig.orderTargets = [
          { color: 'red', required: 30, current: 0 },
          { color: 'blue', required: 25, current: 0 },
        ];
      }
    }

    // Simulate initial board and check initial legal moves
    const simulatedBoard = this.createInitialBoard(sanitizedConfig);
    const initialLegalMoves = this.countLegalMoves(simulatedBoard);

    if (initialLegalMoves === 0) {
      issues.push('No initial legal moves found on starting board setup');
    }

    return {
      isValid: issues.length === 0,
      issues,
      initialLegalMoves,
      config: sanitizedConfig,
    };
  }

  /**
   * Persists a level configuration to local storage registry
   */
  public static saveLevelConfig(config: LevelConfig): void {
    try {
      const all = this.getAllSavedLevelConfigs();
      all[config.levelNumber] = config;
      localStorage.setItem('stitch_match3_level_registry', JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to persist level config to registry:', e);
    }
  }

  /**
   * Retrieves a saved level configuration from local storage registry
   */
  public static getSavedLevelConfig(levelNumber: number): LevelConfig | null {
    try {
      const all = this.getAllSavedLevelConfigs();
      return all[levelNumber] || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Returns all saved level configurations stored in local storage registry
   */
  public static getAllSavedLevelConfigs(): Record<number, LevelConfig> {
    try {
      const raw = localStorage.getItem('stitch_match3_level_registry');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Auto-scale difficulty programmatically for levels 1 to 300+
   * Dynamically calculates board size, move budget, blocker density, and objectives,
   * validates playable status, persists configuration in local registry, and returns the LevelConfig.
   */
  public static autoScaleDifficulty(levelNumber: number, baseConfig?: LevelConfig): LevelConfig {
    // 1. Check local storage registry first if no custom baseConfig passed
    if (!baseConfig) {
      const saved = this.getSavedLevelConfig(levelNumber);
      if (saved) {
        return saved;
      }
    }

    // 2. Compute dynamically scaled configuration
    const scaledConfig = this.getScaledLevelConfig(levelNumber, baseConfig);

    // 3. Validate configuration for guaranteed playability & legal moves
    const validation = this.validateLevel(scaledConfig);
    const validatedConfig = validation.config;

    // 4. Persist validated configuration in registry
    this.saveLevelConfig(validatedConfig);

    return validatedConfig;
  }
}

