import { create } from 'zustand';
import { saveManager } from '../services/SaveManager';

export interface GameState {
  level: number;
  score: number;
  moves: number;
  selectedTube: number;
  isAnimating: boolean;
  isWon: boolean;
  isPaused: boolean;
  
  volumeMaster: number;
  volumeMusic: number;
  volumeEffects: number;
  
  // Settings & Polish State
  theme: string;
  quality: string;
  colorBlindMode: boolean;
  showSettings: boolean;
  gameMode: string;
  
  // Stats
  stats: {
    totalSolved: number;
    totalMoves: number;
    timePlayed: number;
  };
  
  // Actions
  setLevel: (l: number) => void;
  setScore: (s: number) => void;
  setMoves: (m: number) => void;
  setSelectedTube: (t: number) => void;
  setAnimating: (a: boolean) => void;
  setWon: (w: boolean) => void;
  setPaused: (p: boolean) => void;
  
  setVolumeMaster: (v: number) => void;
  setVolumeMusic: (v: number) => void;
  setVolumeEffects: (v: number) => void;
  
  setTheme: (t: string) => void;
  setQuality: (q: string) => void;
  setColorBlindMode: (c: boolean) => void;
  setShowSettings: (s: boolean) => void;
  setGameMode: (m: string) => void;
  
  updateStats: (partial: Partial<GameState['stats']>) => void;
  
  loadState: () => Promise<void>;
  saveCurrentState: () => void;
}

export const useGameState = create<GameState>((set, get) => ({
  level: 1,
  score: 0,
  moves: 0,
  selectedTube: -1,
  isAnimating: false,
  isWon: false,
  isPaused: false,
  
  volumeMaster: 0.8,
  volumeMusic: 0.5,
  volumeEffects: 0.7,
  
  theme: 'Ocean',
  quality: 'High',
  colorBlindMode: false,
  showSettings: false,
  gameMode: 'classic',
  
  stats: {
    totalSolved: 0,
    totalMoves: 0,
    timePlayed: 0
  },
  
  setLevel: (level) => { set({ level }); get().saveCurrentState(); },
  setScore: (score) => { set({ score }); get().saveCurrentState(); },
  setMoves: (moves) => { set({ moves }); },
  setSelectedTube: (selectedTube) => set({ selectedTube }),
  setAnimating: (isAnimating) => set({ isAnimating }),
  setWon: (isWon) => {
    set({ isWon });
    if (isWon) {
      get().updateStats({ totalSolved: get().stats.totalSolved + 1 });
    }
  },
  setPaused: (isPaused) => set({ isPaused }),
  
  setVolumeMaster: (volumeMaster) => { set({ volumeMaster }); get().saveCurrentState(); },
  setVolumeMusic: (volumeMusic) => { set({ volumeMusic }); get().saveCurrentState(); },
  setVolumeEffects: (volumeEffects) => { set({ volumeEffects }); get().saveCurrentState(); },
  
  setTheme: (theme) => { set({ theme }); get().saveCurrentState(); },
  setQuality: (quality) => { set({ quality }); get().saveCurrentState(); },
  setColorBlindMode: (colorBlindMode) => { set({ colorBlindMode }); get().saveCurrentState(); },
  setShowSettings: (showSettings) => set({ showSettings }),
  setGameMode: (gameMode) => { set({ gameMode }); get().saveCurrentState(); },
  
  updateStats: (partial) => {
    set((state) => ({ stats: { ...state.stats, ...partial } }));
    get().saveCurrentState();
  },
  
  loadState: async () => {
    const data = await saveManager.load();
    set({
      level: data.level,
      score: data.score,
      theme: data.theme,
      quality: data.quality,
      colorBlindMode: data.colorBlindMode,
      gameMode: data.gameMode,
      volumeMaster: data.volumeMaster,
      volumeMusic: data.volumeMusic,
      volumeEffects: data.volumeEffects,
      stats: data.stats
    });
  },
  
  saveCurrentState: () => {
    const s = get();
    saveManager.save({
      level: s.level,
      score: s.score,
      theme: s.theme,
      quality: s.quality,
      colorBlindMode: s.colorBlindMode,
      gameMode: s.gameMode,
      volumeMaster: s.volumeMaster,
      volumeMusic: s.volumeMusic,
      volumeEffects: s.volumeEffects,
      stats: s.stats
    });
  }
}));
