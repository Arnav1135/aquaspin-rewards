import { RuleEvent } from './interfaces';
import { RulePriorityManager } from './RulesEngine';

export interface PendingEvent {
  event: RuleEvent;
  priority: number;
}

/**
 * Ensures determinism when multiple mechanics try to fire simultaneously.
 * e.g., If a Color Bomb and a Wrapper explode in the exact same frame, which resolves first?
 */
export class ConflictResolver {
  private queue: PendingEvent[] = [];

  constructor(private priorityManager: RulePriorityManager) {}

  public enqueue(event: RuleEvent, category: string) {
    this.queue.push({
      event,
      priority: this.priorityManager.getPriority(category)
    });
  }

  public hasPending(): boolean {
    return this.queue.length > 0;
  }

  public resolveNext(): RuleEvent | null {
    if (this.queue.length === 0) return null;

    // Sort by priority (lowest number = highest priority)
    this.queue.sort((a, b) => a.priority - b.priority);
    
    // Dequeue and return the highest priority event
    return this.queue.shift()!.event;
  }

  public flush(): RuleEvent[] {
    const sorted = [...this.queue].sort((a, b) => a.priority - b.priority);
    this.queue = [];
    return sorted.map(p => p.event);
  }
}
