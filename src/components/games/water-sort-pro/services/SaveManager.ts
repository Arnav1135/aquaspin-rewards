import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface GameSaveState {
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
  };
}

const defaultState: GameSaveState = {
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
    timePlayed: 0
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
    this.dbPromise = openDB<GameDB>('WaterSortProDB', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('saveData');
        }
        if (oldVersion === 1) {
          // No structural changes, just data changes, so nothing needed here.
        }
      },
    });
  }

  async save(state: Partial<GameSaveState>) {
    try {
      const db = await this.dbPromise;
      const existing = await this.load();
      await db.put('saveData', { ...existing, ...state }, 'gameState');
    } catch (e) {
      console.warn('Could not save to IndexedDB', e);
    }
  }

  async load(): Promise<GameSaveState> {
    try {
      const db = await this.dbPromise;
      const data = await db.get('saveData', 'gameState');
      return data ? { ...defaultState, ...data } : defaultState;
    } catch (e) {
      console.warn('Could not load from IndexedDB', e);
      return defaultState;
    }
  }
}

export const saveManager = new SaveManager();
