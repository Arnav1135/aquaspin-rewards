import { AIDifficulty, GameMode, PieceColor } from '../types';

/**
 * Central Game Mode Controller
 * Controls active game mode (Pass & Play, Online Multiplayer, User vs AI),
 * handles local persistence in localStorage, and manages state isolation.
 */

const STORAGE_KEY_MODE = '3d_chess_last_mode';
const STORAGE_KEY_DIFF = '3d_chess_last_diff';

export class GameModeController {
  private currentMode: GameMode = 'pvp';
  private currentDifficulty: AIDifficulty = 'medium';
  private userColor: PieceColor = 'w';

  constructor() {
    this.loadPersistedSettings();
  }

  private loadPersistedSettings() {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as GameMode | null;
      const savedDiff = localStorage.getItem(STORAGE_KEY_DIFF) as AIDifficulty | null;

      if (savedMode && ['pvp', 'ai', 'online', 'ai-vs-ai'].includes(savedMode)) {
        this.currentMode = savedMode;
      }
      if (savedDiff && ['easy', 'medium', 'hard'].includes(savedDiff)) {
        this.currentDifficulty = savedDiff;
      }
    } catch {
      // Local storage unavailable
    }
  }

  public setMode(mode: GameMode, difficulty?: AIDifficulty, color: PieceColor = 'w') {
    this.currentMode = mode;
    if (difficulty) {
      this.currentDifficulty = difficulty;
    }
    this.userColor = color;

    try {
      localStorage.setItem(STORAGE_KEY_MODE, mode);
      if (difficulty) {
        localStorage.setItem(STORAGE_KEY_DIFF, difficulty);
      }
    } catch {
      // Local storage unavailable
    }
  }

  public getMode(): GameMode {
    return this.currentMode;
  }

  public getDifficulty(): AIDifficulty {
    return this.currentDifficulty;
  }

  public getUserColor(): PieceColor {
    return this.userColor;
  }
}
