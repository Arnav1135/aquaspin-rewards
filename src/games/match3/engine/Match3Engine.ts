// Enhanced Match-3 Engine - Complete Rulebook Implementation
import {
  CandyType,
  SpecialType,
  ObstacleType,
  Cell,
  Position,
  Match,
  LevelConfig,
} from '@/games/match3/types';

export class Match3Engine {
  private static readonly MIN_MATCH = 3;
  private static readonly CANDY_COLORS = 6;

  /**
   * Initialize board from level config
   */
  static initializeBoard(config: LevelConfig): Cell[][] {
    const { width, height, obstacles = [] } = config;
    
    if (config.initialBoard) {
      return config.initialBoard.map(row => [...row]);
    }

    const board: Cell[][] = Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({
            candyType: Math.floor(Math.random() * this.CANDY_COLORS) + 1 as CandyType,
            specialType: SpecialType.NONE,
            obstacle: ObstacleType.NONE,
          }))
      );

    // Place obstacles
    obstacles.forEach(({ row, col, type, health }) => {
      if (board[row]?.[col]) {
        board[row][col].obstacle = type;
        if (health) board[row][col].obstacleHealth = health;
      }
    });

    // Remove initial matches
    return this.removeInitialMatches(board);
  }

  /**
   * Remove any pre-existing matches (Rulebook 11: Fairness)
   */
  private static removeInitialMatches(board: Cell[][]): Cell[][] {
    let matches = this.findMatches(board);
    let iterations = 0;

    while (matches.length > 0 && iterations < 100) {
      matches.forEach(match => {
        match.positions.forEach(({ row, col }) => {
          board[row][col] = {
            candyType: Math.floor(Math.random() * this.CANDY_COLORS) + 1 as CandyType,
            specialType: SpecialType.NONE,
            obstacle: board[row][col].obstacle,
            obstacleHealth: board[row][col].obstacleHealth,
          };
        });
      });
      matches = this.findMatches(board);
      iterations++;
    }

    return board;
  }

  /**
   * Rulebook 2: Validate swap creates at least one match
   */
  static isValidSwap(board: Cell[][], pos1: Position, pos2: Position): boolean {
    const distance = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
    if (distance !== 1) return false;

    const tempBoard = board.map(row => [...row]);
    [tempBoard[pos1.row][pos1.col], tempBoard[pos2.row][pos2.col]] = [
      tempBoard[pos2.row][pos2.col],
      tempBoard[pos1.row][pos1.col],
    ];

    return this.findMatches(tempBoard).length > 0;
  }

  /**
   * Rulebook 2: Find all matches (3+ identical candies)
   */
  static findMatches(board: Cell[][]): Match[] {
    const height = board.length;
    const width = board[0].length;
    const matches: Match[] = [];
    const visited = new Set<string>();

    // Horizontal matches
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width - this.MIN_MATCH + 1; col++) {
        const candy = board[row][col].candyType;
        if (candy === CandyType.EMPTY) continue;

        let matchLength = 1;
        let matchCol = col + 1;

        while (matchCol < width && board[row][matchCol].candyType === candy) {
          matchLength++;
          matchCol++;
        }

        if (matchLength >= this.MIN_MATCH) {
          const key = `${row}-${col}-h`;
          if (!visited.has(key)) {
            const positions = Array(matchLength)
              .fill(null)
              .map((_, i) => ({ row, col: col + i }));

            matches.push({
              positions,
              direction: 'horizontal',
              matchLength,
            });

            positions.forEach(p => visited.add(`${p.row}-${p.col}`));
          }
        }
      }
    }

    // Vertical matches
    for (let col = 0; col < width; col++) {
      for (let row = 0; row < height - this.MIN_MATCH + 1; row++) {
        const candy = board[row][col].candyType;
        if (candy === CandyType.EMPTY) continue;

        let matchLength = 1;
        let matchRow = row + 1;

        while (matchRow < height && board[matchRow][col].candyType === candy) {
          matchLength++;
          matchRow++;
        }

        if (matchLength >= this.MIN_MATCH) {
          const key = `${row}-${col}-v`;
          if (!visited.has(key)) {
            const positions = Array(matchLength)
              .fill(null)
              .map((_, i) => ({ row: row + i, col }));

            matches.push({
              positions,
              direction: 'vertical',
              matchLength,
            });

            positions.forEach(p => visited.add(`${p.row}-${p.col}`));
          }
        }
      }
    }

    return matches;
  }

  /**
   * Rulebook 3: Create special candies based on match length
   */
  private static determineSpecial(match: Match): SpecialType {
    if (match.matchLength >= 5) return SpecialType.COLOR_BOMB;
    if (match.matchLength === 4) {
      return match.direction === 'horizontal'
        ? SpecialType.STRIPED_H
        : SpecialType.STRIPED_V;
    }
    return SpecialType.NONE;
  }

  /**
   * Rulebook 2 & 3: Clear matched candies and create specials
   */
  static clearMatches(board: Cell[][], matches: Match[]): {
    board: Cell[][];
    scorePoints: number;
    specialCandies: Array<{ pos: Position; special: SpecialType }>;
  } {
    const boardCopy = board.map(row => [...row]);
    let scorePoints = 0;
    const specialCandies: Array<{ pos: Position; special: SpecialType }> = [];

    matches.forEach(match => {
      const special = this.determineSpecial(match);
      const pivotPos = match.positions[0];

      match.positions.forEach(({ row, col }) => {
        boardCopy[row][col] = {
          candyType: CandyType.EMPTY,
          specialType: SpecialType.NONE,
          obstacle: boardCopy[row][col].obstacle,
        };
        scorePoints += 50;
      });

      if (special !== SpecialType.NONE) {
        boardCopy[pivotPos.row][pivotPos.col].specialType = special;
        specialCandies.push({ pos: pivotPos, special });
      }

      // Bonus points for special creations
      if (match.matchLength === 4) scorePoints += 100;
      if (match.matchLength >= 5) scorePoints += 250;
    });

    return { board: boardCopy, scorePoints, specialCandies };
  }

  /**
   * Rulebook 4: Apply special candy effects (striped, wrapped, color bomb)
   */
  static applySpecialCandies(
    board: Cell[][],
    matches: Match[]
  ): { board: Cell[][]; scorePoints: number } {
    const boardCopy = board.map(row => [...row]);
    let scorePoints = 0;

    matches.forEach(match => {
      const firstCell = boardCopy[match.positions[0].row][match.positions[0].col];

      if (firstCell.specialType === SpecialType.STRIPED_H) {
        // Rulebook 3: Clear entire row
        const { row } = match.positions[0];
        for (let col = 0; col < boardCopy[row].length; col++) {
          if (boardCopy[row][col].candyType !== CandyType.EMPTY) {
            boardCopy[row][col] = {
              candyType: CandyType.EMPTY,
              specialType: SpecialType.NONE,
              obstacle: boardCopy[row][col].obstacle,
            };
            scorePoints += 75;
          }
        }
      } else if (firstCell.specialType === SpecialType.STRIPED_V) {
        // Rulebook 3: Clear entire column
        const { col } = match.positions[0];
        for (let row = 0; row < boardCopy.length; row++) {
          if (boardCopy[row][col].candyType !== CandyType.EMPTY) {
            boardCopy[row][col] = {
              candyType: CandyType.EMPTY,
              specialType: SpecialType.NONE,
              obstacle: boardCopy[row][col].obstacle,
            };
            scorePoints += 75;
          }
        }
      } else if (firstCell.specialType === SpecialType.WRAPPED) {
        // Rulebook 3: Clear 3x3 area twice
        const { row, col } = match.positions[0];
        for (let iteration = 0; iteration < 2; iteration++) {
          for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
              if (r >= 0 && r < boardCopy.length && c >= 0 && c < boardCopy[0].length) {
                if (boardCopy[r][c].candyType !== CandyType.EMPTY) {
                  boardCopy[r][c] = {
                    candyType: CandyType.EMPTY,
                    specialType: SpecialType.NONE,
                    obstacle: boardCopy[r][c].obstacle,
                  };
                  scorePoints += 75;
                }
              }
            }
          }
        }
      } else if (firstCell.specialType === SpecialType.COLOR_BOMB) {
        // Rulebook 3: Clear all candies of target color
        const targetPosition = match.positions[1] ?? match.positions[0];
        const targetColor =
          boardCopy[targetPosition.row][targetPosition.col].candyType || CandyType.RED;
        for (let r = 0; r < boardCopy.length; r++) {
          for (let c = 0; c < boardCopy[r].length; c++) {
            if (boardCopy[r][c].candyType === targetColor) {
              boardCopy[r][c] = {
                candyType: CandyType.EMPTY,
                specialType: SpecialType.NONE,
                obstacle: boardCopy[r][c].obstacle,
              };
              scorePoints += 100;
            }
          }
        }
      }
    });

    return { board: boardCopy, scorePoints };
  }

  /**
   * Rulebook 2: Apply gravity - candies fall down
   */
  static applyGravity(board: Cell[][]): Cell[][] {
    const boardCopy = board.map(row => [...row]);
    const height = boardCopy.length;
    const width = boardCopy[0].length;

    for (let col = 0; col < width; col++) {
      let writePos = height - 1;

      for (let row = height - 1; row >= 0; row--) {
        if (boardCopy[row][col].candyType !== CandyType.EMPTY) {
          if (writePos !== row) {
            boardCopy[writePos][col] = boardCopy[row][col];
            boardCopy[row][col] = {
              candyType: CandyType.EMPTY,
              specialType: SpecialType.NONE,
            };
          }
          writePos--;
        }
      }
    }

    return boardCopy;
  }

  /**
   * Rulebook 2: Refill empty spaces with new candies
   */
  static refillBoard(board: Cell[][]): Cell[][] {
    const boardCopy = board.map(row => [...row]);
    const height = boardCopy.length;
    const width = boardCopy[0].length;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (boardCopy[row][col].candyType === CandyType.EMPTY) {
          boardCopy[row][col].candyType =
            Math.floor(Math.random() * this.CANDY_COLORS) + 1;
          boardCopy[row][col].specialType = SpecialType.NONE;
        }
      }
    }

    return boardCopy;
  }

  /**
   * Rulebook 2: Check if any valid moves exist
   */
  static hasValidMoves(board: Cell[][]): boolean {
    const height = board.length;
    const width = board[0].length;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (col < width - 1) {
          if (this.isValidSwap(board, { row, col }, { row, col: col + 1 })) {
            return true;
          }
        }

        if (row < height - 1) {
          if (this.isValidSwap(board, { row, col }, { row: row + 1, col })) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Rulebook 2: Auto-shuffle when no valid moves
   */
  static shuffleBoard(board: Cell[][]): Cell[][] {
    let attempts = 0;
    const shuffled = board.map(row => [...row]);

    while (!this.hasValidMoves(shuffled) && attempts < 100) {
      for (let row = 0; row < shuffled.length; row++) {
        for (let col = 0; col < shuffled[row].length; col++) {
          const randomRow = Math.floor(Math.random() * shuffled.length);
          const randomCol = Math.floor(Math.random() * shuffled[0].length);

          [shuffled[row][col].candyType, shuffled[randomRow][randomCol].candyType] = [
            shuffled[randomRow][randomCol].candyType,
            shuffled[row][col].candyType,
          ];
        }
      }
      attempts++;
    }

    return shuffled;
  }

  /**
   * Calculate cascade multiplier (Rulebook 8: Scoring)
   */
  static calculateComboMultiplier(cascadeCount: number): number {
    const multipliers = [1, 1.5, 2, 2.5, 3, 4, 5];
    return multipliers[Math.min(cascadeCount - 1, multipliers.length - 1)];
  }

  /**
   * Calculate stars based on score (Rulebook 8: Star Rating)
   */
  static calculateStars(score: number, thresholds: [number, number, number]): number {
    if (score >= thresholds[2]) return 3;
    if (score >= thresholds[1]) return 2;
    if (score >= thresholds[0]) return 1;
    return 0;
  }
}
