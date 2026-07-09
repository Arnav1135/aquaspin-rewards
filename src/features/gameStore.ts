// src/features/gameStore.ts
// Zustand store for game state, spin cooldowns, and reward history

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SpinResult, GameResult, WheelSegment } from '@/types/database';

// ── Wheel segment definitions (visual config — server generates actual reward) ──
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: '20 Tokens',   tokens: 20,   color: '#0D2847', glowColor: '#00F0FF' },
  { label: '50 Tokens',   tokens: 50,   color: '#0A1E3D', glowColor: '#00D4E8' },
  { label: '10 Tokens',   tokens: 10,   color: '#061529', glowColor: '#006080' },
  { label: '100 Tokens',  tokens: 100,  color: '#102A50', glowColor: '#00F0FF' },
  { label: '30 Tokens',   tokens: 30,   color: '#0D2847', glowColor: '#00AACC' },
  { label: '75 Tokens',   tokens: 75,   color: '#122E57', glowColor: '#00D4E8' },
  { label: '150 Tokens',  tokens: 150,  color: '#0F2650', glowColor: '#FFD700' },
  { label: '200 Tokens',  tokens: 200,  color: '#0C2244', glowColor: '#FFD700' },
  { label: 'JACKPOT 500', tokens: 500,  color: '#1A0F00', glowColor: '#FFD700', isJackpot: true },
  { label: '25 Tokens',   tokens: 25,   color: '#0D2847', glowColor: '#00C8D4' },
  { label: '60 Tokens',   tokens: 60,   color: '#0A1E3D', glowColor: '#00D4E8' },
  { label: '250 Tokens',  tokens: 250,  color: '#12284E', glowColor: '#FFD700' },
];

// ── Wheel themes ──────────────────────────────────────────────────────────────
export const WHEEL_THEMES = {
  aqua: {
    name: 'Aqua Blue',
    borderColor: '#00F0FF',
    centerColor: '#0A1428',
    pointerColor: '#00F0FF',
  },
  gold: {
    name: 'Gold Rush',
    borderColor: '#FFD700',
    centerColor: '#1A0F00',
    pointerColor: '#FFD700',
  },
  neon: {
    name: 'Neon Night',
    borderColor: '#FF00FF',
    centerColor: '#0A0014',
    pointerColor: '#FF00FF',
  },
  fire: {
    name: 'Fire Storm',
    borderColor: '#FF4500',
    centerColor: '#1A0500',
    pointerColor: '#FF4500',
  },
};

export type WheelThemeName = keyof typeof WHEEL_THEMES;

interface GameState {
  // Spin state
  isSpinning: boolean;
  spinCooldownEndsAt: number | null;    // Unix timestamp ms
  lastSpinResult: SpinResult | null;
  spinHistory: SpinResult[];

  // Mini-game state
  activeGame: string | null;
  lastGameResult: GameResult | null;
  gameHistory: GameResult[];

  // Wheel config
  wheelTheme: WheelThemeName;
  wheelRotation: number;    // Current rotation in degrees (persisted for visual continuity)

  // Sound / haptics
  soundEnabled: boolean;
  vibrationEnabled: boolean;

  // Actions
  setSpinning: (spinning: boolean) => void;
  setCooldown: (endsAtMs: number) => void;
  clearCooldown: () => void;
  setLastSpinResult: (result: SpinResult) => void;
  addSpinToHistory: (result: SpinResult) => void;
  setActiveGame: (game: string | null) => void;
  setLastGameResult: (result: GameResult) => void;
  setWheelTheme: (theme: WheelThemeName) => void;
  setWheelRotation: (rotation: number) => void;
  toggleSound: () => void;
  toggleVibration: () => void;
  getCooldownRemaining: () => number;    // seconds remaining
  isCoolingDown: () => boolean;
}

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      isSpinning: false,
      spinCooldownEndsAt: null,
      lastSpinResult: null,
      spinHistory: [],
      activeGame: null,
      lastGameResult: null,
      gameHistory: [],
      wheelTheme: 'aqua',
      wheelRotation: 0,
      soundEnabled: true,
      vibrationEnabled: true,

      setSpinning: (spinning) => set({ isSpinning: spinning }),

      setCooldown: (endsAtMs) => set({ spinCooldownEndsAt: endsAtMs }),

      clearCooldown: () => set({ spinCooldownEndsAt: null }),

      setLastSpinResult: (result) => set({ lastSpinResult: result }),

      addSpinToHistory: (result) =>
        set((state) => ({
          spinHistory: [result, ...state.spinHistory].slice(0, 50), // Keep last 50
        })),

      setActiveGame: (game) => set({ activeGame: game }),

      setLastGameResult: (result) =>
        set((state) => ({
          lastGameResult: result,
          gameHistory: [result, ...state.gameHistory].slice(0, 50),
        })),

      setWheelTheme: (theme) => set({ wheelTheme: theme }),

      setWheelRotation: (rotation) => set({ wheelRotation: rotation }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      toggleVibration: () => set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),

      getCooldownRemaining: () => {
        const { spinCooldownEndsAt } = get();
        if (!spinCooldownEndsAt) return 0;
        return Math.max(0, Math.ceil((spinCooldownEndsAt - Date.now()) / 1000));
      },

      isCoolingDown: () => {
        const { spinCooldownEndsAt } = get();
        return spinCooldownEndsAt != null && spinCooldownEndsAt > Date.now();
      },
    }),
    { name: 'GameStore' }
  )
);
