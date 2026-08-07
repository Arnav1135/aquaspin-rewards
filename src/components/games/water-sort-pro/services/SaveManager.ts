import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface GameSaveState {
  saveVersion: number;
  level: number;
  score: number;
  moves: number;
  theme: string;
  quality: string;
  colorBlindMode: boolean;
  gameMode: string;
  volumeMaster: number;
  volumeMusic: number;
  volumeEffects: number;
  
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
}

const defaultState: GameSaveState = {
  saveVersion: 3, // Upgraded for Prompt 16 requirements
  level: 1,
  score: 0,
  moves: 0,
  theme: 'Ocean',
  quality: 'High',
  colorBlindMode: false,
  gameMode: 'classic',
  volumeMaster: 0.8,
  volumeMusic: 0.5,
  volumeEffects: 0.7,
  stats: {
    totalSolved: 0,
    totalMoves: 0,
    timePlayed: 0,
    playerSkillRating: 1000,
    winStreak: 0,
    lossStreak: 0,
    highestDifficultyCleared: 0,
    dnaHistory: []
  }
};

interface GameDB extends DBSchema {
  saveData: {
    key: string;
    value: GameSaveState;
  };
}

export class SaveManager {
  private dbPromise: Promise<IDBPDatabase<GameDB>>;

  constructor() {
    this.dbPromise = openDB<GameDB>('WaterSortProDB', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('saveData');
        }
        // Migrations would happen here if we change schema drastically
      },
    });
  }

  async save(state: Partial<GameSaveState>) {
    try {
      const db = await this.dbPromise;
      const existing = await this.load();
      await db.put('saveData', { ...existing, ...state }, 'gameState');
      
      // Optional Cloud Hook:
      // this.syncToCloud(state);
    } catch (e) {
      console.warn('Could not save to IndexedDB', e);
    }
  }

  async load(): Promise<GameSaveState> {
    try {
      const db = await this.dbPromise;
      const data = await db.get('saveData', 'gameState');
      if (!data) return defaultState;
      
      // Data Migration check
      if (!data.saveVersion || data.saveVersion < 3) {
        console.log('[SaveManager] Migrating legacy save data to v3');
        return { ...defaultState, ...data, saveVersion: 3, stats: { ...defaultState.stats, ...data.stats } };
      }
      return { ...defaultState, ...data };
    } catch (e) {
      console.warn('Could not load from IndexedDB', e);
      return defaultState;
    }
  }

  // --- LEVEL SHARING ENGINE ---

  public exportLevelCode(level: number, diff: number, seed: string): string {
    const payload = JSON.stringify({ l: level, d: diff, s: seed, v: '1.0' });
    return btoa(payload); // Basic Base64 for shareable string
  }

  public importLevelCode(code: string): { level: number, diff: number, seed: string } | null {
    try {
      const decoded = atob(code);
      const parsed = JSON.parse(decoded);
      if (parsed.v === '1.0' && typeof parsed.l === 'number' && typeof parsed.d === 'number' && typeof parsed.s === 'string') {
        return { level: parsed.l, diff: parsed.d, seed: parsed.s };
      }
      return null;
    } catch (e) {
      console.error('Invalid level code format.');
      return null;
    }
  }

  // Cloud hook stub
  private async syncToCloud(state: Partial<GameSaveState>) {
    // If user is authenticated, post state payload to backend endpoint
    // fetch('/api/saves', { method: 'POST', body: JSON.stringify(state) })
  }
}

export const saveManager = new SaveManager();
