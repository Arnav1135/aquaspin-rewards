import { Orchestrator, AnimationEvent, GameEvent, GridPosition } from './Orchestrator';

export class AnimationEngineImpl {
  constructor() {
    Orchestrator.subscribe("game_event", this.handleGameEvent.bind(this));
  }

  private handleGameEvent(event: GameEvent) {
    if (event.type === "swap_attempted") {
      this.emitAnimation(event.eventId, "swap", [event.payload.from, event.payload.to], 1);
    } else if (event.type === "swap_invalid") {
      this.emitAnimation(event.eventId, "swap_revert", [event.payload.from, event.payload.to], 2);
    } else if (event.type === "match_found") {
      this.emitAnimation(event.eventId, "match_pop", event.payload.cells, 3);
    } else if (event.type === "cascade_step") {
      // Just notify that board changed for simple cascades
      this.emitAnimation(event.eventId, "cascade_fall", [], 0);
    }
  }

  private emitAnimation(sourceId: string, key: string, cells: GridPosition[], priority: number) {
    Orchestrator.emit("animation_event", {
      eventId: Orchestrator.generateId(),
      sourceGameEventId: sourceId,
      animationKey: key,
      phase: "primary",
      startTime: Date.now(),
      duration: 300,
      affectedCells: cells,
      priority
    });
  }
}

export const AnimationEngine = new AnimationEngineImpl();
