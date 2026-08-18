import { RuleEvent } from '../interfaces';
import { EventBus } from '../RulesEngine';
import { Match3Engine } from '../../Match3Engine';
import { TileData } from '../../../types';
import { interactionRegistry } from './SpecialInteractionRegistry';

export class SwapMechanic {
  constructor(private eventBus: EventBus) {
    this.registerListeners();
  }

  private registerListeners() {
    this.eventBus.subscribe('SWAP_ATTEMPT', this.onSwapAttempt.bind(this));
  }

  private async onSwapAttempt(event: RuleEvent) {
    const { r1, c1, r2, c2, board, availableColors } = event.payload;

    if (!Match3Engine.isAdjacent(r1, c1, r2, c2)) {
      await this.eventBus.emit({
        type: 'SWAP_FAILURE',
        payload: { reason: 'Not adjacent' },
        timestamp: Date.now()
      });
      return;
    }

    // Clone board and simulate swap
    const tempBoard = Match3Engine.cloneBoard(board);
    const tile1 = tempBoard[r1][c1];
    const tile2 = tempBoard[r2][c2];

    tempBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
    tempBoard[r2][c2] = { ...tile1, row: r2, col: c2 };

    const type1 = tempBoard[r1][c1].special;
    const type2 = tempBoard[r2][c2].special;

    if (interactionRegistry.hasInteraction(type1, type2)) {
      await interactionRegistry.executeInteraction(type1, type2, tempBoard, r1, c1, r2, c2, this.eventBus);
      
      await this.eventBus.emit({
        type: 'SWAP_SUCCESS',
        payload: { board: tempBoard, cascadeLevel: 1, isSpecialCombo: true, availableColors },
        timestamp: Date.now()
      });
      return;
    }

    const isSpecialCombo = Match3Engine.handleSpecialSwapCombo(tempBoard, r1, c1, r2, c2);
    const matchesResult = Match3Engine.findMatches(tempBoard);

    if (matchesResult.matchedTiles.length > 0 || isSpecialCombo) {
      // Valid Swap!
      await this.eventBus.emit({
        type: 'SWAP_SUCCESS',
        payload: { board: tempBoard, cascadeLevel: 1, isSpecialCombo, availableColors },
        timestamp: Date.now()
      });
    } else {
      // Invalid Swap
      await this.eventBus.emit({
        type: 'SWAP_FAILURE',
        payload: { reason: 'No match formed' },
        timestamp: Date.now()
      });
    }
  }
}
