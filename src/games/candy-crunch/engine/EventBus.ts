import { TileData, SpecialType, CandyColor, CandyShape } from '../types';

export type GameplayEventType = 
  | 'MATCH_CREATED'
  | 'SPECIAL_CREATED'
  | 'SPECIAL_ACTIVATED'
  | 'CASCADE_STARTED'
  | 'CASCADE_ENDED'
  | 'OBJECTIVE_PROGRESS'
  | 'COMBO_UPDATED'
  | 'LEVEL_COMPLETED'
  | 'LEVEL_FAILED'
  | 'BOARD_SHUFFLED';

export interface GameplayEvent {
  type: GameplayEventType;
  payload: any;
}

type EventHandler = (event: GameplayEvent) => void;

export class EventBus {
  private static listeners: Map<GameplayEventType, EventHandler[]> = new Map();

  public static subscribe(type: GameplayEventType, handler: EventHandler): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }

  public static unsubscribe(type: GameplayEventType, handler: EventHandler): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      this.listeners.set(type, handlers.filter(h => h !== handler));
    }
  }

  public static emit(type: GameplayEventType, payload: any = {}): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach(handler => handler({ type, payload }));
    }
  }

  public static clearAll(): void {
    this.listeners.clear();
  }
}
