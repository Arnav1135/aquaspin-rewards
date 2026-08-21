import { RuleEvent } from '../interfaces';
import { EventBus } from '../RulesEngine';
import { SpecialType, CandyColor, TileData } from '../../../types';

export class SpecialCandyMechanics {
  constructor(private eventBus: EventBus) {
    this.registerListeners();
  }

  private registerListeners() {
    this.eventBus.subscribe('MATCH_RESOLVED', this.onMatchResolved.bind(this));
    this.eventBus.subscribe('SPECIAL_ACTIVATED', this.onSpecialActivated.bind(this));
  }

  private async onMatchResolved(event: RuleEvent) {
    const { matchedTiles, board } = event.payload;

    for (const tile of matchedTiles) {
      if (tile.special !== 'none') {
        await this.eventBus.emit({
          type: 'SPECIAL_ACTIVATED',
          payload: {
            row: tile.row,
            col: tile.col,
            special: tile.special,
            color: tile.color,
            board,
            isCombination: false
          },
          timestamp: Date.now()
        });
      }
    }
  }

  private async onSpecialActivated(event: RuleEvent) {
    const { row, col, special, color, board } = event.payload;
    const rows = board.length;
    const cols = board[0].length;

    // Phase 8: Expanded Special Mechanics Rework
    switch (special) {
      case 'striped-h':
        await this.activateStripedHorizontal(board, row, cols);
        break;
      case 'striped-v':
        await this.activateStripedVertical(board, col, rows);
        break;
      case 'wrapped':
        await this.activateWrapped(board, row, col, rows, cols);
        break;
      case 'color-bomb':
        await this.activateColorBomb(board, color, rows, cols);
        break;
      case 'rainbow-bomb':
        await this.activateRainbowBomb(board, rows, cols);
        break;
      case 'lightning':
        await this.activateLightning(board, row, col, rows, cols);
        break;
      case 'galaxy':
        await this.activateGalaxy(board, row, col, rows, cols);
        break;
      case 'jelly-fish':
        await this.activateJellyFish(board, rows, cols);
        break;
    }
  }

  private async activateStripedHorizontal(board: TileData[][], row: number, cols: number) {
    for (let c = 0; c < cols; c++) {
      this.triggerTile(board, row, c);
    }
  }

  private async activateStripedVertical(board: TileData[][], col: number, rows: number) {
    for (let r = 0; r < rows; r++) {
      this.triggerTile(board, r, col);
    }
  }

  private async activateWrapped(board: TileData[][], row: number, col: number, rows: number, cols: number) {
    // Wrapped explosion hits 3x3 area
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          this.triggerTile(board, nr, nc);
        }
      }
    }
  }

  private async activateColorBomb(board: TileData[][], color: CandyColor, rows: number, cols: number) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].color === color) {
          this.triggerTile(board, r, c);
        }
      }
    }
  }

  private async activateRainbowBomb(board: TileData[][], rows: number, cols: number) {
    // Rainbow Bomb hits all colors of the most abundant candy type
    const colorCounts: Record<string, number> = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const clr = board[r][c].color;
        if (clr !== 'none') {
          colorCounts[clr] = (colorCounts[clr] || 0) + 1;
        }
      }
    }
    const targetColor = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a])[0];
    await this.activateColorBomb(board, targetColor as CandyColor, rows, cols);
  }

  private async activateLightning(board: TileData[][], row: number, col: number, rows: number, cols: number) {
    // Lightning hits in a cross shape spanning the entire board (both H and V)
    for (let c = 0; c < cols; c++) this.triggerTile(board, row, c);
    for (let r = 0; r < rows; r++) this.triggerTile(board, r, col);
  }

  private async activateGalaxy(board: TileData[][], row: number, col: number, rows: number, cols: number) {
    // Galaxy sucks in and destroys a massive 5x5 area
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          this.triggerTile(board, nr, nc);
        }
      }
    }
  }

  private async activateJellyFish(board: TileData[][], rows: number, cols: number) {
    let targeted = 0;
    for (let r = 0; r < rows && targeted < 3; r++) {
      for (let c = 0; c < cols && targeted < 3; c++) {
        const tile = board[r][c];
        if (tile.jellyLayers > 0 || tile.blocker !== 'none') {
          this.triggerTile(board, r, c);
          targeted++;
        }
      }
    }
  }

  private triggerTile(board: TileData[][], row: number, col: number) {
    const target = board[row][col];
    if (!target.isMatched) {
      target.isMatched = true;
      if (target.special !== 'none') {
        this.eventBus.emit({
          type: 'SPECIAL_ACTIVATED',
          payload: { row: target.row, col: target.col, special: target.special, color: target.color, board },
          timestamp: Date.now()
        });
      }
    }
  }
}
