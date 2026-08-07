import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface GameDB extends DBSchema {
  saveData: {
    key: string;
    value: {
      level: number;
      score: number;
    };
  };
}

export class SaveManager {
  private dbPromise: Promise<IDBPDatabase<GameDB>>;

  constructor() {
    this.dbPromise = openDB<GameDB>('WaterSortProDB', 1, {
      upgrade(db) {
        db.createObjectStore('saveData');
      },
    });
  }

  async save(level: number, score: number) {
    const db = await this.dbPromise;
    await db.put('saveData', { level, score }, 'gameState');
  }

  async load() {
    const db = await this.dbPromise;
    const data = await db.get('saveData', 'gameState');
    return data || { level: 1, score: 0 };
  }
}

export const saveManager = new SaveManager();
