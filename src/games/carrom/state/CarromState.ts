import { create } from 'zustand';
import { CarromCoinData, CarromPlayer, TurnState } from '../types/CarromTypes';

interface CarromStore {
  turnState: TurnState;
  players: CarromPlayer[];
  currentPlayerIndex: number;
  coins: Record<string, CarromCoinData>;
  strikerPosition: [number, number, number];
  strikerVelocity: [number, number, number];
  aimAngle: number;
  power: number;
  gameMode: 'FREESTYLE' | 'VS_AI' | 'MULTIPLAYER';
  
  // Replay System
  replays: any[];
  
  // Actions
  setTurnState: (state: TurnState) => void;
  setStrikerPosition: (pos: [number, number, number]) => void;
  setAimAngle: (angle: number) => void;
  setPower: (power: number) => void;
  pocketCoin: (id: string) => void;
  resetTurn: () => void;
  initGame: (initialCoins: CarromCoinData[]) => void;
}

export const useCarromStore = create<CarromStore>((set) => ({
  turnState: 'IDLE',
  players: [
    { id: 'p1', name: 'Player 1', color: 'white', score: 0 },
    { id: 'p2', name: 'Player 2', color: 'black', score: 0 },
  ],
  currentPlayerIndex: 0,
  coins: {},
  strikerPosition: [0, 0.008, 0.28], // Initial baseline
  strikerVelocity: [0, 0, 0],
  aimAngle: 0,
  power: 0,
  gameMode: 'FREESTYLE',
  replays: [],

  setTurnState: (state) => set({ turnState: state }),
  setStrikerPosition: (pos) => set({ strikerPosition: pos }),
  setAimAngle: (angle) => set({ aimAngle: angle }),
  setPower: (power) => set({ power }),
  
  recordReplay: () => set((state) => ({
    replays: [...state.replays, {
      strikerPos: [...state.strikerPosition],
      aimAngle: state.aimAngle,
      power: state.power,
      timestamp: Date.now()
    }]
  })),

  pocketCoin: (id) => set((state) => ({
    coins: {
      ...state.coins,
      [id]: { ...state.coins[id], isPocketed: true }
    }
  })),
  resetTurn: () => set((state) => ({
    turnState: 'PLACING_STRIKER',
    power: 0,
    strikerPosition: [0, 0.008, 0.28], // Reset to baseline for active player
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length
  })),
  initGame: (initialCoins) => set(() => {
    const coinsObj: Record<string, CarromCoinData> = {};
    initialCoins.forEach(c => { coinsObj[c.id] = c; });
    return {
      coins: coinsObj,
      turnState: 'PLACING_STRIKER',
      currentPlayerIndex: 0,
    };
  }),
}));
