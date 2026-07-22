import { create } from 'zustand';

type GamePhase = 'idle' | 'aiming' | 'shooting' | 'win' | 'lose';

interface PoolState {
  phase: GamePhase;
  score: number;
  shots: number;
  power: number; // 0 to 1
  aimAngle: number;
  ballsPocketed: number[];
  cueBallPosition: [number, number, number];
  
  setPhase: (phase: GamePhase) => void;
  setPower: (power: number) => void;
  setAimAngle: (angle: number) => void;
  addScore: (points: number) => void;
  incrementShots: () => void;
  pocketBall: (id: number) => void;
  setCueBallPosition: (pos: [number, number, number]) => void;
  resetGame: () => void;
}

export const usePoolStore = create<PoolState>((set) => ({
  phase: 'idle',
  score: 0,
  shots: 0,
  power: 0,
  aimAngle: 0,
  ballsPocketed: [],
  cueBallPosition: [0, 0, 5],

  setPhase: (phase) => set({ phase }),
  setPower: (power) => set({ power }),
  setAimAngle: (aimAngle) => set({ aimAngle }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  incrementShots: () => set((state) => ({ shots: state.shots + 1 })),
  pocketBall: (id) => set((state) => {
    if (!state.ballsPocketed.includes(id)) {
      return { ballsPocketed: [...state.ballsPocketed, id] };
    }
    return state;
  }),
  setCueBallPosition: (pos) => set({ cueBallPosition: pos }),
  resetGame: () => set({
    phase: 'aiming',
    score: 0,
    shots: 0,
    power: 0,
    aimAngle: 0,
    ballsPocketed: [],
    cueBallPosition: [0, 0, 5]
  }),
}));
