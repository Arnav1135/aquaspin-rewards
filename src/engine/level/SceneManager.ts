// src/engine/level/SceneManager.ts

export type SceneState = 'idle' | 'loading' | 'active' | 'unloading';

export interface SceneChunk {
  id: string;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  isLoaded: boolean;
}

export class SceneManager {
  private static instance: SceneManager;
  private currentSceneId: string | null = null;
  private sceneState: SceneState = 'idle';
  private chunks: Map<string, SceneChunk> = new Map();
  private listeners: Set<(state: SceneState, sceneId: string | null) => void> = new Set();

  private constructor() {}

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  public async transitionToScene(sceneId: string, loaderFn: () => Promise<void>) {
    if (this.sceneState === 'loading') return;

    this.sceneState = 'loading';
    this.notify();

    try {
      if (this.currentSceneId) {
        this.sceneState = 'unloading';
        this.notify();
      }

      await loaderFn();
      this.currentSceneId = sceneId;
      this.sceneState = 'active';
    } catch {
      this.sceneState = 'idle';
    } finally {
      this.notify();
    }
  }

  public updatePlayerPosition(x: number, z: number, loadDistance: number = 50) {
    this.chunks.forEach((chunk) => {
      const inRange =
        x >= chunk.bounds.minX - loadDistance &&
        x <= chunk.bounds.maxX + loadDistance &&
        z >= chunk.bounds.minZ - loadDistance &&
        z <= chunk.bounds.maxZ + loadDistance;

      if (inRange && !chunk.isLoaded) {
        chunk.isLoaded = true;
      } else if (!inRange && chunk.isLoaded) {
        chunk.isLoaded = false; // Stream out chunk
      }
    });
  }

  public registerChunk(chunk: SceneChunk) {
    this.chunks.set(chunk.id, chunk);
  }

  public subscribe(fn: (state: SceneState, sceneId: string | null) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.sceneState, this.currentSceneId));
  }
}

export const sceneManager = SceneManager.getInstance();
