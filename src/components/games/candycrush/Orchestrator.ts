export type CandyColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple";

export type SpecialType =
  | "none"
  | "striped_h"
  | "striped_v"
  | "wrapped"
  | "color_bomb"
  | "coloring_candy"
  | "fish";

export type GridPosition = { row: number; col: number };

export interface GameEvent {
  eventId: string;
  timestamp: number;
  type:
    | "swap_attempted"
    | "swap_valid"
    | "swap_invalid"
    | "match_found"
    | "special_formed"
    | "special_activated"
    | "combo_triggered"
    | "cascade_step"
    | "board_settled"
    | "score_changed"
    | "moves_changed";
  payload: any;
}

export interface AnimationEvent {
  eventId: string;
  sourceGameEventId: string;
  animationKey: string;
  phase: "charge" | "primary" | "secondary" | "settle";
  startTime: number;
  duration: number;
  affectedCells: GridPosition[];
  priority: number;
}

export interface UIEvent {
  eventId: string;
  type: "hud_update" | "screen_transition";
  payload: any;
}

export interface SoundEvent {
  eventId: string;
  sourceAnimationEventId?: string;
  soundKey: string;
  category: "sfx" | "music" | "stinger" | "ui";
  triggerBeat: "charge" | "primary" | "secondary" | "settle";
  volume: number;
}

type EventMap = {
  "game_event": GameEvent;
  "animation_event": AnimationEvent;
  "ui_event": UIEvent;
  "sound_event": SoundEvent;
}

type Subscriber<T> = (event: T) => void;

class OrchestratorImpl {
  private subscribers: { [K in keyof EventMap]?: Subscriber<EventMap[K]>[] } = {};

  subscribe<K extends keyof EventMap>(channel: K, callback: Subscriber<EventMap[K]>) {
    if (!this.subscribers[channel]) {
      this.subscribers[channel] = [];
    }
    this.subscribers[channel]!.push(callback);
    
    return () => {
      this.subscribers[channel] = this.subscribers[channel]!.filter(cb => cb !== callback);
    };
  }

  emit<K extends keyof EventMap>(channel: K, event: EventMap[K]) {
    if (this.subscribers[channel]) {
      this.subscribers[channel]!.forEach(cb => cb(event));
    }
  }

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const Orchestrator = new OrchestratorImpl();
