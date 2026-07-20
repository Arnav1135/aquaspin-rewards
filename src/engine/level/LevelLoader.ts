// src/engine/level/LevelLoader.ts

export interface LevelObjectData {
  id: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  properties?: Record<string, any>;
}

export interface LevelConfig {
  id: string;
  name: string;
  environmentPreset?: string;
  objects: LevelObjectData[];
}

export class LevelLoader {
  public static async loadFromUrl(url: string): Promise<LevelConfig | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  public static parse(jsonString: string): LevelConfig | null {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}
