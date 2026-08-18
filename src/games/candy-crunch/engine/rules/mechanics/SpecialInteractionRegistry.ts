import { TileData, SpecialType, CandyColor } from '../../../types';
import { EventBus } from '../RulesEngine';

export type ComboHandler = (board: TileData[][], r1: number, c1: number, r2: number, c2: number, eventBus: EventBus) => Promise<void>;

export class SpecialInteractionRegistry {
  private handlers: Map<string, ComboHandler> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private getComboKey(typeA: SpecialType, typeB: SpecialType): string {
    const sorted = [typeA, typeB].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  public register(typeA: SpecialType, typeB: SpecialType, handler: ComboHandler) {
    this.handlers.set(this.getComboKey(typeA, typeB), handler);
  }

  public hasInteraction(typeA: SpecialType, typeB: SpecialType): boolean {
    return typeA !== 'none' && typeB !== 'none' && this.handlers.has(this.getComboKey(typeA, typeB));
  }

  public async executeInteraction(
    typeA: SpecialType, typeB: SpecialType, 
    board: TileData[][], r1: number, c1: number, r2: number, c2: number, 
    eventBus: EventBus
  ) {
    const handler = this.handlers.get(this.getComboKey(typeA, typeB));
    if (handler) {
      // Clear the tiles being swapped so they don't trigger recursively
      board[r1][c1].special = 'none';
      board[r2][c2].special = 'none';
      board[r1][c1].isMatched = true;
      board[r2][c2].isMatched = true;
      
      await handler(board, r1, c1, r2, c2, eventBus);
    }
  }

  private registerDefaults() {
    // 1. Striped + Striped
    this.register('striped-h', 'striped-h', async (board, r1, c1, r2, c2, eventBus) => this.executeCross(board, r1, c1, eventBus, 1));
    this.register('striped-h', 'striped-v', async (board, r1, c1, r2, c2, eventBus) => this.executeCross(board, r1, c1, eventBus, 1));
    this.register('striped-v', 'striped-v', async (board, r1, c1, r2, c2, eventBus) => this.executeCross(board, r1, c1, eventBus, 1));

    // 2. Wrapped + Wrapped
    this.register('wrapped', 'wrapped', async (board, r1, c1, r2, c2, eventBus) => {
      const rows = board.length;
      const cols = board[0].length;
      const matched = [];
      for (let r = Math.max(0, r1 - 2); r <= Math.min(rows - 1, r1 + 2); r++) {
        for (let c = Math.max(0, c1 - 2); c <= Math.min(cols - 1, c1 + 2); c++) {
          board[r][c].isMatched = true;
          matched.push(board[r][c]);
        }
      }
      await eventBus.emit({ type: 'MATCH_RESOLVED', payload: { board, matchedTiles: matched, cascadeLevel: 1 }, timestamp: Date.now() });
    });

    // 3. Striped + Wrapped (Giant 3x3 cross)
    const stripedWrapped = async (board: TileData[][], r1: number, c1: number, r2: number, c2: number, eventBus: EventBus) => {
      await this.executeCross(board, r1, c1, eventBus, 3);
    };
    this.register('striped-h', 'wrapped', stripedWrapped);
    this.register('striped-v', 'wrapped', stripedWrapped);

    // 4. Color Bomb + Striped
    const colorBombStriped = async (board: TileData[][], r1: number, c1: number, r2: number, c2: number, eventBus: EventBus) => {
      const stripedTile = board[r1][c1].special.startsWith('striped') ? board[r1][c1] : board[r2][c2];
      const targetColor = stripedTile.color;
      const matched = [];
      for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
          if (board[r][c].color === targetColor) {
            board[r][c].special = Math.random() > 0.5 ? 'striped-h' : 'striped-v';
            board[r][c].isMatched = true;
            matched.push(board[r][c]);
          }
        }
      }
      await eventBus.emit({ type: 'MATCH_RESOLVED', payload: { board, matchedTiles: matched, cascadeLevel: 1 }, timestamp: Date.now() });
    };
    this.register('color-bomb', 'striped-h', colorBombStriped);
    this.register('color-bomb', 'striped-v', colorBombStriped);

    // 5. Color Bomb + Wrapped
    this.register('color-bomb', 'wrapped', async (board, r1, c1, r2, c2, eventBus) => {
      const wrappedTile = board[r1][c1].special === 'wrapped' ? board[r1][c1] : board[r2][c2];
      const targetColor = wrappedTile.color;
      const matched = [];
      for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
          if (board[r][c].color === targetColor) {
            board[r][c].special = 'wrapped';
            board[r][c].isMatched = true;
            matched.push(board[r][c]);
          }
        }
      }
      await eventBus.emit({ type: 'MATCH_RESOLVED', payload: { board, matchedTiles: matched, cascadeLevel: 1 }, timestamp: Date.now() });
    });

    // 6. Color Bomb + Color Bomb (Total Board Clear)
    this.register('color-bomb', 'color-bomb', async (board, r1, c1, r2, c2, eventBus) => {
      const matched = [];
      for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[0].length; c++) {
          board[r][c].isMatched = true;
          matched.push(board[r][c]);
        }
      }
      await eventBus.emit({ type: 'MATCH_RESOLVED', payload: { board, matchedTiles: matched, cascadeLevel: 1 }, timestamp: Date.now() });
    });
  }

  private async executeCross(board: TileData[][], row: number, col: number, eventBus: EventBus, thickness: number) {
    const rows = board.length;
    const cols = board[0].length;
    const matched = [];
    const offset = Math.floor(thickness / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = Math.max(0, col - offset); c <= Math.min(cols - 1, col + offset); c++) {
        board[r][c].isMatched = true;
        matched.push(board[r][c]);
      }
    }
    
    for (let c = 0; c < cols; c++) {
      for (let r = Math.max(0, row - offset); r <= Math.min(rows - 1, row + offset); r++) {
        if (!board[r][c].isMatched) { // avoid double-counting
          board[r][c].isMatched = true;
          matched.push(board[r][c]);
        }
      }
    }

    await eventBus.emit({ type: 'MATCH_RESOLVED', payload: { board, matchedTiles: matched, cascadeLevel: 1 }, timestamp: Date.now() });
  }
}

export const interactionRegistry = new SpecialInteractionRegistry();
