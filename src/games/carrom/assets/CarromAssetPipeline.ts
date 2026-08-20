import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three-stdlib';

export interface AssetVersion {
  assetVersion: number;
  materialVersion: number;
  colliderVersion: number;
}

export interface CachedAsset {
  group: THREE.Group;
  version: AssetVersion;
}

/**
 * System 2-4, 46-48: Asset Ingestion Pipeline
 */
export class CarromAssetPipeline {
  private static gltfLoader = new GLTFLoader();
  private static dracoLoader = new DRACOLoader();
  private static cache: Map<string, CachedAsset> = new Map();

  public static initialize() {
    this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  public static async loadAsset(url: string, id: string, version: AssetVersion = { assetVersion: 1, materialVersion: 1, colliderVersion: 1 }): Promise<CachedAsset | null> {
    if (this.cache.has(id)) {
      const cached = this.cache.get(id)!;
      return { group: cached.group.clone(), version: cached.version };
    }

    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      const optimized = this.validateAndNormalize(gltf.scene, id);
      if (optimized) {
        this.auditAsset(optimized, id);
        const cachedAsset = { group: optimized, version };
        this.cache.set(id, cachedAsset);
        return { group: optimized.clone(), version };
      }
      return null;
    } catch (e) {
      console.warn(`[AssetPipeline] Failed to load ${url}:`, e);
      return null;
    }
  }

  public static auditAsset(scene: THREE.Group, id: string) {
    let polyCount = 0;
    let materialCount = 0;
    let hasUV = false;
    
    const bbox = new THREE.Box3();
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        polyCount += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
        materialCount++;
        if (child.geometry.attributes.uv) hasUV = true;
      }
    });
    
    bbox.setFromObject(scene);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    console.log(`[AssetAudit] ${id}: polys=${polyCount}, materials=${materialCount}, UVs=${hasUV}, size=[${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)}]`);
  }

  private static validateAndNormalize(scene: THREE.Group, id: string): THREE.Group | null {
    let isValid = true;
    
    // System 3: Asset Validation & System 4: Normalization
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        if (!geometry || !geometry.attributes.position) {
          console.error(`[AssetPipeline] ${id} missing geometry positions.`);
          isValid = false;
        }

        // Check for NaN
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i++) {
          if (isNaN(positions[i])) {
            console.error(`[AssetPipeline] ${id} contains NaN geometry.`);
            isValid = false;
            break;
          }
        }

        // Center pivot based on type
        if (id.includes('coin') || id.includes('striker')) {
          geometry.computeBoundingBox();
          const center = new THREE.Vector3();
          geometry.boundingBox?.getCenter(center);
          geometry.translate(-center.x, -center.y, -center.z);
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return isValid ? scene : null;
  }
}

CarromAssetPipeline.initialize();
