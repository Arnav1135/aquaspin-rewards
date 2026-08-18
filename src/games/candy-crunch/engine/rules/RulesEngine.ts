import { RuleEvent, EventType, RuleInteraction } from './interfaces';
import { BaseMatchingRule } from './mechanics/MatchingMechanics';
import { SpecialCandyMechanics } from './mechanics/SpecialCandyMechanics';
import { BlockerMechanics } from './mechanics/BlockerMechanics';
import { GravityMechanics } from './mechanics/GravityMechanics';
import { SwapMechanic } from './mechanics/SwapMechanic';

export class EventBus {
  private listeners: Map<EventType, Array<(event: RuleEvent) => Promise<void> | void>> = new Map();

  subscribe(eventType: EventType, callback: (event: RuleEvent) => Promise<void> | void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  async emit(event: RuleEvent): Promise<void> {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      for (const cb of callbacks) {
        await cb(event);
      }
    }
  }
}

export class RulePriorityManager {
  // Configurable order of operations for mechanic resolution
  private executionOrder = [
    'PLAYER_ACTION',
    'MATCH_DETECTION',
    'SPECIAL_CREATION',
    'SPECIAL_ACTIVATION',
    'BLOCKER_REACTION',
    'BOARD_MECHANIC',
    'GRAVITY',
    'REFILL',
    'CASCADE_CHECK',
    'OBJECTIVE_CHECK',
    'VICTORY_DEFEAT'
  ];

  public getPriority(category: string): number {
    const index = this.executionOrder.indexOf(category);
    return index !== -1 ? index : 999;
  }
}

export type GameStatePhase =
  | 'IDLE'
  | 'INPUT'
  | 'SWAP'
  | 'MATCH_RESOLUTION'
  | 'SPECIAL_RESOLUTION'
  | 'BLOCKER_RESOLUTION'
  | 'GRAVITY'
  | 'REFILL'
  | 'CASCADE_CHECK'
  | 'OBJECTIVE_CHECK'
  | 'VICTORY_DEFEAT';

export class StateTransitionManager {
  private currentPhase: GameStatePhase = 'IDLE';

  public transitionTo(newPhase: GameStatePhase): void {
    // Determine if transition is valid
    const validTransitions: Record<GameStatePhase, GameStatePhase[]> = {
      'IDLE': ['INPUT'],
      'INPUT': ['SWAP', 'IDLE'],
      'SWAP': ['MATCH_RESOLUTION', 'IDLE'],
      'MATCH_RESOLUTION': ['SPECIAL_RESOLUTION', 'BLOCKER_RESOLUTION', 'GRAVITY'],
      'SPECIAL_RESOLUTION': ['BLOCKER_RESOLUTION', 'GRAVITY'],
      'BLOCKER_RESOLUTION': ['GRAVITY'],
      'GRAVITY': ['REFILL'],
      'REFILL': ['CASCADE_CHECK'],
      'CASCADE_CHECK': ['MATCH_RESOLUTION', 'OBJECTIVE_CHECK'],
      'OBJECTIVE_CHECK': ['VICTORY_DEFEAT', 'IDLE'],
      'VICTORY_DEFEAT': ['IDLE']
    };

    const allowed = validTransitions[this.currentPhase];
    if (allowed && allowed.includes(newPhase)) {
      this.currentPhase = newPhase;
    } else {
      console.warn(`Invalid state transition attempted: ${this.currentPhase} -> ${newPhase}`);
    }
  }

  public getPhase(): GameStatePhase {
    return this.currentPhase;
  }
}

export class RulesEngine {
  public eventBus: EventBus;
  public priorityManager: RulePriorityManager;
  public stateManager: StateTransitionManager;

  private matchingRule: BaseMatchingRule;
  private specialCandyRule: SpecialCandyMechanics;
  private blockerRule: BlockerMechanics;
  private gravityRule: GravityMechanics;
  private swapRule: SwapMechanic;

  constructor() {
    this.eventBus = new EventBus();
    this.priorityManager = new RulePriorityManager();
    this.stateManager = new StateTransitionManager();

    // Initialize core mechanics
    this.matchingRule = new BaseMatchingRule(this.eventBus);
    this.specialCandyRule = new SpecialCandyMechanics(this.eventBus);
    this.blockerRule = new BlockerMechanics(this.eventBus);
    this.gravityRule = new GravityMechanics(this.eventBus);
    this.swapRule = new SwapMechanic(this.eventBus);
  }

  // Future integration point for hooking up existing Match3Engine functions
  public async processPlayerSwap(r1: number, c1: number, r2: number, c2: number, board: any[][], availableColors: string[]) {
    this.stateManager.transitionTo('INPUT');
    await this.eventBus.emit({
      type: 'SWAP_ATTEMPT',
      payload: { r1, c1, r2, c2, board, availableColors },
      timestamp: Date.now()
    });
    this.stateManager.transitionTo('SWAP');
  }
}

export const rulesEngine = new RulesEngine();
