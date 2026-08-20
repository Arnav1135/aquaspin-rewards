import { CarromAssetPipeline, CachedAsset, AssetVersion } from './CarromAssetPipeline';
import * as THREE from 'three';
import { useCarromStore } from '../state/CarromState';

/**
 * System 5, 52, 67: Hero Asset System
 */
export class CarromHeroAssetManager {
  private static assets: Record<string, CachedAsset | null> = {
    'BOARD': null,
    'STRIKER': null,
    'QUEEN': null,
    'COIN_WHITE': null,
    'COIN_BLACK': null,
  };

  public static async prewarmAssets() {
    // Attempt to load from expected path. Will fail gracefully if missing (System 52).
    const basePath = '/models/carrom/';
    
    const v1: AssetVersion = { assetVersion: 1, materialVersion: 1, colliderVersion: 1 };
    
    const promises = [
      this.loadHero('BOARD', `${basePath}board.glb`, v1),
      this.loadHero('STRIKER', `${basePath}striker.glb`, v1),
      this.loadHero('QUEEN', `${basePath}queen.glb`, v1),
      this.loadHero('COIN_WHITE', `${basePath}coin_white.glb`, v1),
      this.loadHero('COIN_BLACK', `${basePath}coin_black.glb`, v1),
    ];

    await Promise.allSettled(promises);
    console.log('[HeroAssetManager] Prewarm complete.', this.assets);
  }

  private static async loadHero(key: string, url: string, version: AssetVersion) {
    const asset = await CarromAssetPipeline.loadAsset(url, key, version);
    if (asset) {
      this.assets[key] = asset;
    }
  }

  public static getHeroAsset(key: string): THREE.Group | null {
    return this.assets[key] ? this.assets[key]!.group.clone() : null;
  }
  
  public static getAssetVersion(key: string): AssetVersion | null {
    return this.assets[key] ? this.assets[key]!.version : null;
  }
}
