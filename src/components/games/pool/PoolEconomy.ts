import { create } from 'zustand';

export type GameMode = 'MENU' | 'MATCHMAKING' | 'PLAYING' | 'GAMEOVER';
export type TableTier = 'LONDON' | 'SYDNEY' | 'MOSCOW' | 'TOKYO' | 'LAS_VEGAS';

export interface TierConfig {
  id: TableTier;
  name: string;
  entryFee: number;
  prize: number;
}

export const TABLE_TIERS: TierConfig[] = [
  { id: 'LONDON', name: 'London Pub', entryFee: 50, prize: 100 },
  { id: 'SYDNEY', name: 'Sydney Marina', entryFee: 100, prize: 200 },
  { id: 'MOSCOW', name: 'Moscow Winter', entryFee: 500, prize: 1000 },
  { id: 'TOKYO', name: 'Tokyo Neon', entryFee: 2500, prize: 5000 },
  { id: 'LAS_VEGAS', name: 'Las Vegas High Roller', entryFee: 10000, prize: 20000 },
];

interface PoolEconomyState {
  mode: GameMode;
  selectedTier: TableTier;
  setMode: (mode: GameMode) => void;
  selectTier: (tier: TableTier) => void;
}

export const usePoolEconomy = create<PoolEconomyState>((set) => ({
  mode: 'MENU',
  selectedTier: 'LONDON',
  setMode: (mode) => set({ mode }),
  selectTier: (tier) => set({ selectedTier: tier }),
}));
