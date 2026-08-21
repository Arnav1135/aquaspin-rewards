import { EventBus } from '../RulesEngine';
import { TileData } from '../../../types';
import { SpecialComboCinematics } from '../../../rendering/managers/SpecialComboCinematics';

export class SpecialInteractionRegistry {
  constructor(private eventBus: EventBus, private cinematics: SpecialComboCinematics) {
    this.eventBus.subscribe('SPECIAL_SWAP', this.handleSpecialSwap.bind(this));
  }

  private async handleSpecialSwap(event: any) {
    const { tileA, tileB, board } = event.payload;
    const typeA = tileA.special;
    const typeB = tileB.special;

    // Phase 9: Dedicated Combination Logic & Visuals
    if (this.isCombo(typeA, typeB, 'striped-h', 'wrapped') || this.isCombo(typeA, typeB, 'striped-v', 'wrapped')) {
      await this.cinematics.playMegaCombo('STRIPED_WRAPPED', tileA.row, tileA.col);
      this.clearGiantCross(board, tileA.row, tileA.col);
    } 
    else if (this.isCombo(typeA, typeB, 'color-bomb', 'wrapped')) {
      await this.cinematics.playMegaCombo('COLOR_WRAPPED', tileA.row, tileA.col);
      this.convertAllToWrapped(board, tileB.color);
    }
    else if (this.isCombo(typeA, typeB, 'color-bomb', 'rainbow-bomb')) {
      await this.cinematics.playMegaCombo('COLOR_RAINBOW', tileA.row, tileA.col);
      this.clearEntireBoard(board);
    }
    else if (this.isCombo(typeA, typeB, 'galaxy', 'color-bomb')) {
      await this.cinematics.playMegaCombo('GALAXY_COLOR', tileA.row, tileA.col);
      this.blackHoleClear(board, tileA.row, tileA.col);
    }
  }

  private isCombo(a: string, b: string, targetA: string, targetB: string) {
    return (a === targetA && b === targetB) || (a === targetB && b === targetA);
  }

  private clearGiantCross(board: TileData[][], row: number, col: number) {
    // 3x3 horizontal and 3x3 vertical laser
    for(let r=0; r<board.length; r++) {
      for(let c=-1; c<=1; c++) if(board[r][col+c]) board[r][col+c].isMatched = true;
    }
    for(let c=0; c<board[0].length; c++) {
      for(let r=-1; r<=1; r++) if(board[row+r]?.[c]) board[row+r][c].isMatched = true;
    }
  }

  private convertAllToWrapped(board: TileData[][], color: string) {
    board.forEach(row => row.forEach(tile => {
      if(tile.color === color) {
        tile.special = 'wrapped';
        tile.isMatched = true; // Trigger them next frame
      }
    }));
  }

  private clearEntireBoard(board: TileData[][]) {
    board.forEach(row => row.forEach(tile => tile.isMatched = true));
  }

  private blackHoleClear(board: TileData[][], row: number, col: number) {
    board.forEach(r => r.forEach(tile => tile.isMatched = true));
  }
}
