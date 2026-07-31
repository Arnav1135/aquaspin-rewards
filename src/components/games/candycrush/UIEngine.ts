import { create } from 'zustand';
import { Orchestrator, GameEvent } from './Orchestrator';

interface GameState {
  score: number;
  moves: number;
}

export const useGameStore = create<GameState>(() => ({
  score: 0,
  moves: 30
}));

export class UIEngineImpl {
  constructor() {
    Orchestrator.subscribe("game_event", this.handleGameEvent.bind(this));
  }

  private handleGameEvent(event: GameEvent) {
    if (event.type === "score_changed") {
      useGameStore.setState(state => ({ score: state.score + event.payload.change }));
    } else if (event.type === "moves_changed") {
      useGameStore.setState(state => ({ moves: state.moves + event.payload.change }));
    }
  }
}

export const UIEngine = new UIEngineImpl();
