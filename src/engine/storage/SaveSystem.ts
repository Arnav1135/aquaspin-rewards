// src/engine/storage/SaveSystem.ts

export interface SaveDataHeader {
  version: number;
  timestamp: string;
  gameId: string;
}

export interface SavePayload<T = Record<string, any>> {
  header: SaveDataHeader;
  data: T;
}

export class SaveSystem {
  private static currentVersion = 1;

  public static save<T>(gameId: string, data: T): boolean {
    try {
      const payload: SavePayload<T> = {
        header: {
          version: this.currentVersion,
          timestamp: new Date().toISOString(),
          gameId,
        },
        data,
      };
      const key = `engine_save_${gameId}`;
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  public static load<T>(gameId: string): T | null {
    try {
      const key = `engine_save_${gameId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const payload: SavePayload<T> = JSON.parse(raw);
      if (!payload.header || typeof payload.header.version !== 'number') {
        return null; // Invalid save format
      }

      // Migrations logic can be plugged in here based on version
      if (payload.header.version < this.currentVersion) {
        // Upgrade legacy save format
      }

      return payload.data;
    } catch {
      return null;
    }
  }

  public static clear(gameId: string): void {
    const key = `engine_save_${gameId}`;
    localStorage.removeItem(key);
  }
}
