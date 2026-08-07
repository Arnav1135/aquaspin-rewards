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
    playerSkillRating: number;
    winStreak: number;
    lossStreak: number;
    highestDifficultyCleared: number;
    dnaHistory: string[];
  };
  
  // Actions
  setLevel: (l: number) => void;
  setScore: (s: number) => void;
  setMoves: (m: number) => void;
  setSelectedTube: (t: number) => void;
  setAnimating: (a: boolean) => void;
  setWon: (w: boolean) => void;
  setPaused: (p: boolean) => void;
  handleRestart: () => void;
  
  setVolumeMaster: (v: number) => void;
  setVolumeMusic: (v: number) => void;
  setVolumeEffects: (v: number) => void;
  
  setTheme: (t: string) => void;
  setQuality: (q: string) => void;
  setColorBlindMode: (c: boolean) => void;
  setShowSettings: (s: boolean) => void;
  setGameMode: (m: string) => void;
  
  updateStats: (partial: Partial<GameState['stats']>) => void;
  
  activeHint: { message: string, source?: number, dest?: number } | null;
  setActiveHint: (hint: { message: string, source?: number, dest?: number } | null) => void;
  
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
    timePlayed: 0,
    playerSkillRating: 1000, // ELO-style baseline
    winStreak: 0,
    lossStreak: 0,
    highestDifficultyCleared: 0,
    dnaHistory: []
  },
  
  setLevel: (level) => { set({ level }); get().saveCurrentState(); },
  setScore: (score) => { set({ score }); get().saveCurrentState(); },
  setMoves: (moves) => { set({ moves }); },
  setSelectedTube: (selectedTube) => set({ selectedTube }),
  setAnimating: (isAnimating) => set({ isAnimating }),
  setWon: (isWon) => {
    set({ isWon });
    if (isWon) {
      const s = get();
      
      // Calculate dynamic ELO gains based on current rating and streak
      const currentElo = s.stats.playerSkillRating;
      const winStreak = s.stats.winStreak + 1;
      const streakBonus = Math.min(winStreak * 2, 20); // Cap streak bonus
      const eloGain = 10 + streakBonus; // Base gain + streak
      
      // Assume the level's actual difficulty (in a full integration, we'd pull the exact level def difficulty)
      // For now, we estimate the difficulty cleared based on the level index
      const estimatedDifficulty = 50 + (s.level * 15);
      const newHighest = Math.max(s.stats.highestDifficultyCleared, estimatedDifficulty);

      s.updateStats({ 
        totalSolved: s.stats.totalSolved + 1,
        playerSkillRating: currentElo + eloGain,
        winStreak: winStreak,
        lossStreak: 0,
        highestDifficultyCleared: newHighest
      });
      // Handle score increments / coins separately
    }
  },
  setPaused: (isPaused) => set({ isPaused }),
  
  handleRestart: () => {
    const s = get();
    // Penalize ELO for giving up / restarting
    const currentElo = s.stats.playerSkillRating;
    const penalty = Math.max(5, Math.floor(currentElo * 0.01)); // Lose 1% of ELO or 5 points minimum
    
    s.updateStats({
      playerSkillRating: Math.max(100, currentElo - penalty), // Floor at 100
      winStreak: 0,
      lossStreak: s.stats.lossStreak + 1
    });
  },

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
  
  activeHint: null,
  setActiveHint: (hint) => set({ activeHint: hint }),
  
  loadState: async () => {
    const data = await saveManager.load();
    set({
      level: data.level || 1,
      score: data.score || 0,
      theme: data.theme || 'Ocean',
      quality: data.quality || 'High',
      colorBlindMode: data.colorBlindMode || false,
      gameMode: data.gameMode || 'classic',
      volumeMaster: data.volumeMaster ?? 0.8,
      volumeMusic: data.volumeMusic ?? 0.5,
      volumeEffects: data.volumeEffects ?? 0.7,
      stats: {
        totalSolved: data.stats?.totalSolved || 0,
        totalMoves: data.stats?.totalMoves || 0,
        timePlayed: data.stats?.timePlayed || 0,
        playerSkillRating: data.stats?.playerSkillRating || 1000,
        winStreak: data.stats?.winStreak || 0,
        lossStreak: data.stats?.lossStreak || 0,
        highestDifficultyCleared: data.stats?.highestDifficultyCleared || 0,
        dnaHistory: data.stats?.dnaHistory || []
      }
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
