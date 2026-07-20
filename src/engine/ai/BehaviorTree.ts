// src/engine/ai/BehaviorTree.ts

export type AIState = 'patrol' | 'chase' | 'attack' | 'flee';

export interface AIContext {
  position: [number, number, number];
  targetPosition?: [number, number, number];
  health: number;
  distanceToTarget?: number;
}

export class EnemyStateMachine {
  private currentState: AIState = 'patrol';

  public update(context: AIContext): AIState {
    const dist = context.distanceToTarget ?? Infinity;

    if (context.health < 20) {
      this.currentState = 'flee';
    } else if (dist < 2.0) {
      this.currentState = 'attack';
    } else if (dist < 10.0) {
      this.currentState = 'chase';
    } else {
      this.currentState = 'patrol';
    }

    return this.currentState;
  }

  public getState(): AIState {
    return this.currentState;
  }
}
