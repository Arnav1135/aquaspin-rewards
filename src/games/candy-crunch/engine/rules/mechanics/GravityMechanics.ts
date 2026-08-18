import { RuleEvent } from '../interfaces';
import { EventBus } from '../RulesEngine';
import { TileData, CandyColor } from '../../../types';
import { Match3Engine } from '../../Match3Engine';

export class GravityMechanics {
  constructor(private eventBus: EventBus) {
    this.registerListeners();
  }

  private registerListeners() {
    this.eventBus.subscribe('GRAVITY', this.onGravity.bind(this));
    this.eventBus.subscribe('GRAVITY_CHANGED', this.onGravityDirectionChanged.bind(this));
  }

  private async onGravity(event: RuleEvent) {
    const { board, availableColors, gravityDir } = event.payload;
    
    // Defer to the current implementation for array transformations,
    // but now it's isolated to an event response rather than a monolithic loop.
    const result = Match3Engine.applyGravity(board, availableColors, gravityDir || 'DOWN');

    if (result.droppedCount > 0) {
      await this.eventBus.emit({
        type: 'REFILL',
        payload: { board: result.board },
        timestamp: Date.now()
      });
    } else {
      await this.eventBus.emit({
        type: 'CASCADE_CHECK',
        payload: { board: result.board },
        timestamp: Date.now()
      });
    }
  }

  private async onGravityDirectionChanged(event: RuleEvent) {
    // This allows mechanics like Gravity Shifts to instantly trigger a re-drop
    const { board, availableColors, newGravityDir } = event.payload;
    await this.eventBus.emit({
      type: 'GRAVITY',
      payload: { board, availableColors, gravityDir: newGravityDir },
      timestamp: Date.now()
    });
  }
}
