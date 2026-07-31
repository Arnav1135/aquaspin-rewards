import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Orchestrator, GameEvent } from './Orchestrator';

interface GameState {
  score: number;
  moves: number;
  highestUnlockedLevel: number;
  setHighestUnlockedLevel: (level: number) => void;
  resetGameStats: (moves: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      score: 0,
      moves: 30,
      highestUnlockedLevel: 1,
      setHighestUnlockedLevel: (level: number) => 
        set((state) => ({ highestUnlockedLevel: Math.max(state.highestUnlockedLevel, level) })),
      resetGameStats: (moves: number) =>
        set(() => ({ score: 0, moves }))
    }),
    {
      name: 'candy-crunch-storage',
      partialize: (state) => ({ highestUnlockedLevel: state.highestUnlockedLevel }),
    }
  )
);

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
