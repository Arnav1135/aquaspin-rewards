import { useGameState } from '../state/useGameState';

export enum GameMode {
  CLASSIC = 'CLASSIC',
  ENDLESS = 'ENDLESS',
  DAILY = 'DAILY',
  CHALLENGE = 'CHALLENGE',
  PRACTICE = 'PRACTICE',
  ZEN = 'ZEN',
  SPEED = 'SPEED',
  HARDCORE = 'HARDCORE'
}

export interface DailyResult {
  date: string; // YYYY-MM-DD
  completed: boolean;
  moves: number;
  time: number;
  hints: number;
  undos: number;
}

export class GameModeManager {
  /**
   * Retrieves the current game mode.
   */
  static getCurrentMode(): GameMode {
    const m = useGameState.getState().gameMode;
    return m.toUpperCase() as GameMode;
  }

  /**
   * Derives a deterministic seed for the Daily Challenge
   * Format: YYYY-MM-DD-Version
   */
  static getDailySeed(): string {
    const today = new Date();
    // Use UTC date to ensure global consistency
    const dateStr = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;
    return `DAILY-${dateStr}-v1`;
  }

  /**
   * Calculate dynamic difficulty based on the selected game mode and player stats.
   */
  static calculateDifficulty(): number {
    const mode = this.getCurrentMode();
    const stats = useGameState.getState().stats;
    const currentLevel = useGameState.getState().level;

    switch (mode) {
      case GameMode.DAILY:
        // Daily is curated based on the day of the week (e.g. Sunday is hardest)
        const day = new Date().getUTCDay();
        return 60 + (day * 5); // Ranges from ~60 to 90

      case GameMode.ENDLESS:
        // Infinite progressive scaling based on endless streak/level
        return Math.min(100, 30 + (currentLevel * 2));

      case GameMode.CHALLENGE:
        return 85;

      case GameMode.HARDCORE:
        return Math.min(100, 50 + (currentLevel * 2)); // Hardcore starts harder

      case GameMode.SPEED:
        return Math.min(100, 40 + (currentLevel * 1.5)); // Slightly harder than classic

      case GameMode.ZEN:
        return 30; // Easy practice / relaxing

      case GameMode.PRACTICE:
        return 40; 

      case GameMode.CLASSIC:
      default:
        // Standard progressive curve up to 100
        return Math.min(100, 20 + (currentLevel * 1.5));
    }
  }

  /**
   * Determines starting time for SPEED mode based on difficulty
   * Returns time in seconds
   */
  static getStartingTime(): number {
    const diff = this.calculateDifficulty();
    // High difficulty = more tubes/colors = needs more time.
    // e.g. diff 20 -> 45s, diff 100 -> 180s
    return Math.floor(30 + (diff * 1.5));
  }

  /**
   * Checks if current mode allows hints
   */
  static allowsHints(): boolean {
    const mode = this.getCurrentMode();
    if (mode === GameMode.CHALLENGE || mode === GameMode.HARDCORE) {
      return false;
    }
    return true;
  }
  
  /**
   * Checks if current mode penalizes mistakes (undos/restarts)
   */
  static isPenalized(): boolean {
    const mode = this.getCurrentMode();
    return mode !== GameMode.ZEN && mode !== GameMode.PRACTICE;
  }

  /**
   * Records daily challenge results in local stats
   */
  static recordDailyResult(moves: number, time: number, hints: number, undos: number) {
    const stats = useGameState.getState().stats;
    const today = new Date().toISOString().split('T')[0];
    
    // In a real app this might save to IndexedDB or a Backend. 
    // For now we assume local storage/stats persistence manages it.
    
    // Update streak
    const newStreak = stats.winStreak + 1;
    useGameState.getState().updateStats({ winStreak: newStreak });
    
    console.log(`[GameModeManager] Daily challenge completed: ${today}`);
  }
}
