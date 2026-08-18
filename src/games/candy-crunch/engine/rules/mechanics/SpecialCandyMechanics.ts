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

    // Detect if any of the matched tiles are special candies being caught in the crossfire
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

    if (special === 'striped-h') {
      await this.activateStripedHorizontal(board, row, cols);
    } else if (special === 'striped-v') {
      await this.activateStripedVertical(board, col, rows);
    } else if (special === 'wrapped') {
      await this.activateWrapped(board, row, col, rows, cols);
    } else if (special === 'color-bomb') {
      await this.activateColorBomb(board, color, rows, cols);
    } else if (special === 'jelly-fish') {
      await this.activateJellyFish(board, rows, cols);
    }
  }

  private async activateStripedHorizontal(board: TileData[][], row: number, cols: number) {
    for (let c = 0; c < cols; c++) {
      const target = board[row][c];
      if (!target.isMatched) {
        target.isMatched = true;
        // Chain reaction
        if (target.special !== 'none' && (row !== target.row || c !== target.col)) {
          await this.eventBus.emit({
            type: 'SPECIAL_ACTIVATED',
            payload: { row: target.row, col: target.col, special: target.special, color: target.color, board },
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private async activateStripedVertical(board: TileData[][], col: number, rows: number) {
    for (let r = 0; r < rows; r++) {
      const target = board[r][col];
      if (!target.isMatched) {
        target.isMatched = true;
        if (target.special !== 'none' && (r !== target.row || col !== target.col)) {
          await this.eventBus.emit({
            type: 'SPECIAL_ACTIVATED',
            payload: { row: target.row, col: target.col, special: target.special, color: target.color, board },
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private async activateWrapped(board: TileData[][], row: number, col: number, rows: number, cols: number) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const target = board[nr][nc];
          if (!target.isMatched) {
            target.isMatched = true;
            if (target.special !== 'none' && (nr !== row || nc !== col)) {
              await this.eventBus.emit({
                type: 'SPECIAL_ACTIVATED',
                payload: { row: nr, col: nc, special: target.special, color: target.color, board },
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
  }

  private async activateColorBomb(board: TileData[][], color: CandyColor, rows: number, cols: number) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].color === color) {
          board[r][c].isMatched = true;
          const target = board[r][c];
          if (target.special !== 'none') {
            await this.eventBus.emit({
              type: 'SPECIAL_ACTIVATED',
              payload: { row: target.row, col: target.col, special: target.special, color: target.color, board },
              timestamp: Date.now()
            });
          }
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
          tile.isMatched = true;
          targeted++;
        }
      }
    }
  }
}
