// Core Match-3 Game Engine
import {
  CandyType,
  SpecialType,
  ObstacleType,
  Cell,
  Position,
  Match,
  GameState,
  LevelConfig,
  ComboInfo,
} from '@/games/match3/types';

export class Match3Engine {
  private static readonly MIN_MATCH = 3;
  private static readonly CANDY_COLORS = 6;

  /**
   * Initialize a new game board from level config
   */
  static initializeBoard(config: LevelConfig): Cell[][] {
    const { width, height, obstacles = [] } = config;
    
    // If custom board provided, use it
    if (config.initialBoard) {
      return config.initialBoard.map(row => [...row]);
    }

    // Generate random board
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
      if (board[row] && board[row][col]) {
        board[row][col].obstacle = type;
        if (health) board[row][col].obstacleHealth = health;
      }
    });

    // Remove initial matches
    return this.removeInitialMatches(board);
  }

  /**
   * Remove any pre-existing matches on a generated board
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
   * Check if a swap would create a valid match
   */
  static isValidSwap(board: Cell[][], pos1: Position, pos2: Position): boolean {
    // Swaps must be adjacent
    const distance = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
    if (distance !== 1) return false;

    // Perform swap
    const tempBoard = board.map(row => [...row]);
    [tempBoard[pos1.row][pos1.col], tempBoard[pos2.row][pos2.col]] = [
      tempBoard[pos2.row][pos2.col],
      tempBoard[pos1.row][pos1.col],
    ];

    // Check if matches exist after swap
    const matches = this.findMatches(tempBoard);
    return matches.length > 0;
  }

  /**
   * Find all matches on the board
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
   * Determine special candy type from match length and shape
   */
  private static determineSpecial(
    board: Cell[][],
    match: Match
  ): SpecialType {
    if (match.matchLength >= 5) return SpecialType.COLOR_BOMB;
    if (match.matchLength === 4) {
      return match.direction === 'horizontal'
        ? SpecialType.STRIPED_H
        : SpecialType.STRIPED_V;
    }
    return SpecialType.NONE;
  }

  /**
   * Clear matches and update board
   */
  static clearMatches(board: Cell[][], matches: Match[]): {
    board: Cell[][];
    scorePoints: number;
  } {
    const boardCopy = board.map(row => [...row]);
    let scorePoints = 0;

    // Mark all matched cells as empty
    matches.forEach(match => {
      match.positions.forEach(({ row, col }) => {
        const special = this.determineSpecial(boardCopy, match);
        boardCopy[row][col] = {
          candyType: CandyType.EMPTY,
          specialType: special,
          obstacle: boardCopy[row][col].obstacle,
        };
        scorePoints += 50; // Base points per candy
      });
    });

    // Award bonus for special candies created
    matches.forEach(match => {
      if (match.matchLength === 4) scorePoints += 100;
      if (match.matchLength >= 5) scorePoints += 250;
    });

    return { board: boardCopy, scorePoints };
  }

  /**
   * Apply special candy effects
   */
  static applySpecialCandies(
    board: Cell[][],
    matches: Match[]
  ): { board: Cell[][]; scorePoints: number } {
    let boardCopy = board.map(row => [...row]);
    let scorePoints = 0;

    matches.forEach(match => {
      const firstCell = boardCopy[match.positions[0].row][match.positions[0].col];

      if (firstCell.specialType === SpecialType.STRIPED_H) {
        // Clear entire row
        const { row } = match.positions[0];
        for (let col = 0; col < boardCopy[row].length; col++) {
          boardCopy[row][col] = {
            candyType: CandyType.EMPTY,
            specialType: SpecialType.NONE,
            obstacle: boardCopy[row][col].obstacle,
          };
          scorePoints += 75;
        }
      } else if (firstCell.specialType === SpecialType.STRIPED_V) {
        // Clear entire column
        const { col } = match.positions[0];
        for (let row = 0; row < boardCopy.length; row++) {
          boardCopy[row][col] = {
            candyType: CandyType.EMPTY,
            specialType: SpecialType.NONE,
            obstacle: boardCopy[row][col].obstacle,
          };
          scorePoints += 75;
        }
      } else if (firstCell.specialType === SpecialType.WRAPPED) {
        // Clear 3x3 area
        const { row, col } = match.positions[0];
        for (let r = row - 1; r <= row + 1; r++) {
          for (let c = col - 1; c <= col + 1; c++) {
            if (r >= 0 && r < boardCopy.length && c >= 0 && c < boardCopy[0].length) {
              boardCopy[r][c] = {
                candyType: CandyType.EMPTY,
                specialType: SpecialType.NONE,
                obstacle: boardCopy[r][c].obstacle,
              };
              scorePoints += 75;
            }
          }
        }
      } else if (firstCell.specialType === SpecialType.COLOR_BOMB) {
        // Clear all candies of target color
        const targetColor = match.positions[1]?.candyType || CandyType.RED;
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
   * Apply gravity - candies fall down
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
   * Refill empty spaces with new candies
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
   * Check if there are any valid moves on the board
   */
  static hasValidMoves(board: Cell[][]): boolean {
    const height = board.length;
    const width = board[0].length;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        // Try right swap
        if (col < width - 1) {
          if (
            this.isValidSwap(board, { row, col }, { row, col: col + 1 })
          ) {
            return true;
          }
        }

        // Try down swap
        if (row < height - 1) {
          if (
            this.isValidSwap(board, { row, col }, { row: row + 1, col })
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Shuffle board to create valid moves (auto-shuffle when stuck)
   */
  static shuffleBoard(board: Cell[][]): Cell[][] {
    let attempts = 0;
    let shuffled = board.map(row => [...row]);

    while (!this.hasValidMoves(shuffled) && attempts < 100) {
      // Fisher-Yates shuffle
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
}
