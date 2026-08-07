import { create } from 'zustand';

export interface GameState {
  level: number;
  score: number;
  moves: number;
  selectedTube: number;
  isAnimating: boolean;
  isWon: boolean;
  isPaused: boolean;
  volume: number;
  
  // Settings & Polish State
  theme: string;
  quality: string;
  colorBlindMode: boolean;
  showSettings: boolean;
  
  // Actions
  setLevel: (l: number) => void;
  setScore: (s: number) => void;
  setMoves: (m: number) => void;
  setSelectedTube: (t: number) => void;
  setAnimating: (a: boolean) => void;
  setWon: (w: boolean) => void;
  setPaused: (p: boolean) => void;
  setVolume: (v: number) => void;
  
  setTheme: (t: string) => void;
  setQuality: (q: string) => void;
  setColorBlindMode: (c: boolean) => void;
  setShowSettings: (s: boolean) => void;
}

export const useGameState = create<GameState>((set) => ({
  level: 1,
  score: 0,
  moves: 0,
  selectedTube: -1,
  isAnimating: false,
  isWon: false,
  isPaused: false,
  volume: 0.5,
  
  theme: 'Ocean',
  quality: 'High',
  colorBlindMode: false,
  showSettings: false,
  
  setLevel: (level) => set({ level }),
  setScore: (score) => set({ score }),
  setMoves: (moves) => set({ moves }),
  setSelectedTube: (selectedTube) => set({ selectedTube }),
  setAnimating: (isAnimating) => set({ isAnimating }),
  setWon: (isWon) => set({ isWon }),
  setPaused: (isPaused) => set({ isPaused }),
  setVolume: (volume) => set({ volume }),
  
  setTheme: (theme) => set({ theme }),
  setQuality: (quality) => set({ quality }),
  setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
  setShowSettings: (showSettings) => set({ showSettings }),
}));
