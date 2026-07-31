import { Orchestrator, CandyColor, SpecialType, GridPosition, GameEvent } from './Orchestrator';

export interface Candy {
  id: string;
  color: CandyColor;
  special: SpecialType;
  row: number;
  col: number;
}

const COLORS: CandyColor[] = ["red", "orange", "yellow", "green", "blue", "purple"];

export class CandyEngine {
  width: number;
  height: number;
  board: (Candy | null)[][];
  
  constructor(width = 8, height = 8) {
    this.width = width;
    this.height = height;
    this.board = Array(height).fill(null).map(() => Array(width).fill(null));
  }

  emit(type: GameEvent["type"], payload: any) {
    Orchestrator.emit("game_event", {
      eventId: Orchestrator.generateId(),
      timestamp: Date.now(),
      type,
      payload
    });
  }

  fillBoard() {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!this.board[r][c]) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
    // Remove initial matches silently
    while (this.findMatches().length > 0) {
      this.board = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
    this.emit("board_settled", { board: this.board });
  }

  createRandomCandy(row: number, col: number): Candy {
    return {
      id: Math.random().toString(36).substring(2, 9),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      special: 'none',
      row,
      col
    };
  }

  async attemptSwap(r1: number, c1: number, r2: number, c2: number) {
    this.emit("swap_attempted", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 } });

    const cnd1 = this.board[r1][c1];
    const cnd2 = this.board[r2][c2];
    if (!cnd1 || !cnd2) return;

    // Swap
    this.board[r1][c1] = cnd2;
    this.board[r2][c2] = cnd1;
    cnd1.row = r2; cnd1.col = c2;
    cnd2.row = r1; cnd2.col = c1;

    const matches = this.findMatches();
    if (matches.length === 0 && cnd1.special !== 'color_bomb' && cnd2.special !== 'color_bomb') {
      this.emit("swap_invalid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
      await new Promise(r => setTimeout(r, 300));
      // Revert swap
      this.board[r1][c1] = cnd1;
      this.board[r2][c2] = cnd2;
      cnd1.row = r1; cnd1.col = c1;
      cnd2.row = r2; cnd2.col = c2;
      this.emit("swap_invalid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
      this.emit("board_settled", { board: this.board });
      return;
    }

    this.emit("swap_valid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
    this.emit("moves_changed", { change: -1 });
    await new Promise(r => setTimeout(r, 300));
    
    // Process matches
    await this.processCascades();
  }

  findMatches(): { r: number, c: number }[] {
    const matched = new Set<string>();
    
    // Horizontal
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width - 2; c++) {
        const c1 = this.board[r][c];
        const c2 = this.board[r][c+1];
        const c3 = this.board[r][c+2];
        if (c1 && c2 && c3 && c1.color === c2.color && c2.color === c3.color) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c+1}`);
          matched.add(`${r},${c+2}`);
        }
      }
    }

    // Vertical
    for (let c = 0; c < this.width; c++) {
      for (let r = 0; r < this.height - 2; r++) {
        const c1 = this.board[r][c];
        const c2 = this.board[r+1][c];
        const c3 = this.board[r+2][c];
        if (c1 && c2 && c3 && c1.color === c2.color && c2.color === c3.color) {
          matched.add(`${r},${c}`);
          matched.add(`${r+1},${c}`);
          matched.add(`${r+2},${c}`);
        }
      }
    }

    return Array.from(matched).map(s => {
      const [r, c] = s.split(',').map(Number);
      return { r, c };
    });
  }

  async processCascades() {
    let matches = this.findMatches();
    
    while (matches.length > 0) {
      this.emit("match_found", { cells: matches });
      
      const scoreGain = matches.length * 10;
      this.emit("score_changed", { change: scoreGain });

      matches.forEach(({r, c}) => {
        this.board[r][c] = null;
      });
      
      this.emit("cascade_step", { board: this.board });
      await new Promise(r => setTimeout(r, 300));

      // Apply gravity
      for (let c = 0; c < this.width; c++) {
        let emptySlots = 0;
        for (let r = this.height - 1; r >= 0; r--) {
          if (this.board[r][c] === null) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const candy = this.board[r][c]!;
            this.board[r + emptySlots][c] = candy;
            candy.row = r + emptySlots;
            this.board[r][c] = null;
          }
        }
  
        for (let r = emptySlots - 1; r >= 0; r--) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }

      this.emit("cascade_step", { board: this.board });
      await new Promise(r => setTimeout(r, 400));
      matches = this.findMatches();
    }
    
    this.emit("board_settled", { board: this.board });
  }
}
