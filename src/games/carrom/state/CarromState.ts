import { create } from 'zustand';
import { CarromCoinData, CarromPlayer, TurnState } from '../types/CarromTypes';

interface CarromStore {
  turnState: TurnState;
  isPaused: boolean;
  players: CarromPlayer[];
  currentPlayerIndex: number;
  coins: Record<string, CarromCoinData>;
  strikerPosition: [number, number, number];
  strikerVelocity: [number, number, number];
  aimAngle: number;
  power: number;
  gameMode: 'FREESTYLE' | 'VS_AI' | 'MULTIPLAYER';
  environmentProfile: string;
  strikerVariant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT';
  aimMode: 'CLASSIC' | 'ASSISTED' | 'EXPERT';
  cameraProfile: string;
  colorGradingProfile: string;
  queenCovered: boolean;
  pocketedThisTurn: string[];
  strikerFouled: boolean;
  
  // Replay System
  replays: any[];
  
  // Actions
  setTurnState: (state: TurnState) => void;
  setIsPaused: (val: boolean) => void;
  setStrikerPosition: (pos: [number, number, number]) => void;
  setAimAngle: (angle: number) => void;
  setPower: (power: number) => void;
  setCameraProfile: (profile: string) => void;
  setColorGradingProfile: (profile: string) => void;
  recordReplay: () => void;
  pocketCoin: (id: string) => void;
  addPocketedThisTurn: (id: string) => void;
  clearPocketedThisTurn: () => void;
  updateScore: (playerIndex: number, delta: number) => void;
  setStrikerFouled: (val: boolean) => void;
  resetTurn: () => void;
  initGame: (initialCoins: CarromCoinData[]) => void;
  setEnvironmentProfile: (profile: string) => void;
  setStrikerVariant: (variant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT') => void;
}

export const useCarromStore = create<CarromStore>((set) => ({
  turnState: 'IDLE',
  isPaused: false,
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
  environmentProfile: 'LUXURY_ROOM',
  strikerVariant: 'POLISHED',
  aimMode: 'ASSISTED',
  cameraProfile: 'NORMAL',
  colorGradingProfile: 'CLASSIC',
  replays: [],
  queenCovered: false,
  pocketedThisTurn: [],
  strikerFouled: false,

  setTurnState: (state) => set({ turnState: state }),
  setIsPaused: (val) => set({ isPaused: val }),
  setStrikerPosition: (pos) => set({ strikerPosition: pos }),
  setAimAngle: (angle) => set({ aimAngle: angle }),
  setPower: (power) => set({ power }),
  setEnvironmentProfile: (profile) => set({ environmentProfile: profile }),
  setStrikerVariant: (variant) => set({ strikerVariant: variant }),
  setCameraProfile: (profile) => set({ cameraProfile: profile }),
  setColorGradingProfile: (profile) => set({ colorGradingProfile: profile }),
  
  recordReplay: () => set((state) => {
    const newReplays = [...state.replays, {
      strikerPos: [...state.strikerPosition],
      aimAngle: state.aimAngle,
      power: state.power,
      timestamp: Date.now()
    }];
    if (newReplays.length > 100) {
      newReplays.shift();
    }
    return { replays: newReplays };
  }),

  pocketCoin: (id) => set((state) => ({
    coins: {
      ...state.coins,
      [id]: { ...state.coins[id], isPocketed: true }
    }
  })),
  addPocketedThisTurn: (id) => set((state) => ({
    pocketedThisTurn: [...state.pocketedThisTurn, id]
  })),
  clearPocketedThisTurn: () => set({ pocketedThisTurn: [] }),
  updateScore: (playerIndex, delta) => set((state) => {
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], score: newPlayers[playerIndex].score + delta };
    return { players: newPlayers };
  }),
  setStrikerFouled: (val) => set({ strikerFouled: val }),
  resetTurn: () => set((state) => ({
    turnState: 'PLACING_STRIKER',
  isPaused: false,
    power: 0,
    strikerPosition: [0, 0.008, 0.28], // Reset to baseline for active player
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    pocketedThisTurn: [],
    strikerFouled: false
  })),
  initGame: (initialCoins) => set(() => {
    const coinsObj: Record<string, CarromCoinData> = {};
    initialCoins.forEach(c => { coinsObj[c.id] = c; });
    return {
      coins: coinsObj,
      turnState: 'PLACING_STRIKER',
      currentPlayerIndex: 0,
      pocketedThisTurn: [],
      strikerFouled: false,
      queenCovered: false
    };
  }),
}));
