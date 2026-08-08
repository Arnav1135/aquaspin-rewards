import { useGameState } from '../state/useGameState';

export enum GameMode {
  CLASSIC = 'CLASSIC',
  ENDLESS = 'ENDLESS',
  DAILY = 'DAILY',
  CHALLENGE = 'CHALLENGE',
  PRACTICE = 'PRACTICE'
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
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
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
        const day = new Date().getDay();
        return 60 + (day * 5); // Ranges from ~60 to 90

      case GameMode.ENDLESS:
        // Infinite progressive scaling based on endless streak/level
        return Math.min(100, 30 + (currentLevel * 2));

      case GameMode.CHALLENGE:
        // Specific modifiers apply. We'll use a fixed hard difficulty.
        return 85;

      case GameMode.PRACTICE:
        return 40; // Easy practice

      case GameMode.CLASSIC:
      default:
        // Standard progressive curve up to 100
        return Math.min(100, 20 + (currentLevel * 1.5));
    }
  }

  /**
   * Checks if current mode allows hints
   */
  static allowsHints(): boolean {
    const mode = this.getCurrentMode();
    if (mode === GameMode.CHALLENGE) {
      // Example Challenge Modifier: No Hints
      return false;
    }
    return true;
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
