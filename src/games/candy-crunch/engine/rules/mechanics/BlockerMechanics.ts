import { RuleEvent } from '../interfaces';
import { EventBus } from '../RulesEngine';
import { TileData } from '../../../types';

export class BlockerMechanics {
  constructor(private eventBus: EventBus) {
    this.registerListeners();
  }

  private registerListeners() {
    this.eventBus.subscribe('MATCH_RESOLVED', this.onMatchResolved.bind(this));
    this.eventBus.subscribe('SPECIAL_ACTIVATED', this.onExplosion.bind(this));
    this.eventBus.subscribe('CASCADE_ENDED', this.onTurnEnd.bind(this));
  }

  // Damage blockers adjacent to matches
  private async onMatchResolved(event: RuleEvent) {
    const { matchedTiles, board } = event.payload;
    let damagedAny = false;

    matchedTiles.forEach((tile: TileData) => {
      damagedAny = this.damageAdjacentBlockers(board, tile.row, tile.col) || damagedAny;
    });

    if (damagedAny) {
      await this.eventBus.emit({
        type: 'BLOCKER_DAMAGED',
        payload: { board },
        timestamp: Date.now()
      });
    }
  }

  // Special candies also damage blockers in their blast radius
  private async onExplosion(event: RuleEvent) {
    const { row, col, board } = event.payload;
    if (this.damageBlockerAt(board, row, col)) {
      await this.eventBus.emit({
        type: 'BLOCKER_DAMAGED',
        payload: { board },
        timestamp: Date.now()
      });
    }
  }

  private damageAdjacentBlockers(board: TileData[][], r: number, c: number): boolean {
    const rows = board.length;
    const cols = board[0].length;
    const neighbors = [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 }
    ];

    let damaged = false;
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
        damaged = this.damageBlockerAt(board, n.r, n.c) || damaged;
      }
    }
    return damaged;
  }

  private damageBlockerAt(board: TileData[][], r: number, c: number): boolean {
    const b = board[r][c];
    if (b.blocker === 'frosting-3') {
      b.blocker = 'frosting-2';
      return true;
    } else if (b.blocker === 'frosting-2') {
      b.blocker = 'frosting-1';
      return true;
    } else if (b.blocker === 'frosting-1' || b.blocker === 'chocolate' || b.blocker === 'licorice-swirl') {
      b.blocker = 'none';
      this.eventBus.emit({
        type: 'BLOCKER_DESTROYED',
        payload: { row: r, col: c, blockerType: b.blocker },
        timestamp: Date.now()
      });
      return true;
    }
    return false;
  }

  // Chocolate spreads at the end of the cascade if no blockers were destroyed
  private async onTurnEnd(event: RuleEvent) {
    // In a full implementation, we'd check if BLOCKER_DESTROYED fired this turn.
    // For now, we simulate chocolate spread logic.
    const { board } = event.payload;
    // this.processChocolateSpread(board);
  }
}
