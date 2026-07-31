export type CandyType = 0 | 1 | 2 | 3 | 4 | 5; // Red, Orange, Yellow, Green, Blue, Purple
export type SpecialType = 'NONE' | 'STRIPED_H' | 'STRIPED_V' | 'WRAPPED' | 'BOMB' | 'FISH';

export interface Candy {
  id: string;
  type: CandyType;
  special: SpecialType;
  row: number;
  col: number;
}

export class CandyEngine {
  width: number;
  height: number;
  board: (Candy | null)[][];
  
  constructor(width = 8, height = 8) {
    this.width = width;
    this.height = height;
    this.board = Array(height).fill(null).map(() => Array(width).fill(null));
  }

  fillBoard() {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!this.board[r][c]) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
    // Remove initial matches
    while (this.findMatches().length > 0) {
      this.board = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
  }

  createRandomCandy(row: number, col: number): Candy {
    return {
      id: Math.random().toString(36).substring(2, 9),
      type: Math.floor(Math.random() * 6) as CandyType,
      special: 'NONE',
      row,
      col
    };
  }

  swap(r1: number, c1: number, r2: number, c2: number): boolean {
    const cnd1 = this.board[r1][c1];
    const cnd2 = this.board[r2][c2];
    if (!cnd1 || !cnd2) return false;

    // Swap
    this.board[r1][c1] = cnd2;
    this.board[r2][c2] = cnd1;
    cnd1.row = r2; cnd1.col = c2;
    cnd2.row = r1; cnd2.col = c1;

    const matches = this.findMatches();
    if (matches.length === 0 && cnd1.special !== 'BOMB' && cnd2.special !== 'BOMB') {
      // Revert swap
      this.board[r1][c1] = cnd1;
      this.board[r2][c2] = cnd2;
      cnd1.row = r1; cnd1.col = c1;
      cnd2.row = r2; cnd2.col = c2;
      return false;
    }
    return true;
  }

  findMatches(): { r: number, c: number }[] {
    const matched = new Set<string>();
    
    // Horizontal
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width - 2; c++) {
        const c1 = this.board[r][c];
        const c2 = this.board[r][c+1];
        const c3 = this.board[r][c+2];
        if (c1 && c2 && c3 && c1.type === c2.type && c2.type === c3.type) {
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
        if (c1 && c2 && c3 && c1.type === c2.type && c2.type === c3.type) {
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

  resolveMatches(matches: { r: number, c: number }[]) {
    matches.forEach(({r, c}) => {
      this.board[r][c] = null;
    });
  }

  applyGravity(): { updates: Candy[], newCandies: Candy[] } {
    const updates: Candy[] = [];
    const newCandies: Candy[] = [];

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
          updates.push(candy);
        }
      }

      for (let r = emptySlots - 1; r >= 0; r--) {
        const newC = this.createRandomCandy(r, c);
        this.board[r][c] = newC;
        newCandies.push(newC);
      }
    }

    return { updates, newCandies };
  }
}
