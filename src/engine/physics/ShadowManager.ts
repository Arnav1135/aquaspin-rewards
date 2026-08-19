import * as THREE from 'three';
import { QualityPreset } from '../../games/candy-crunch/rendering/managers/QualityManager';

export class ShadowManager {
  private renderer: THREE.WebGLRenderer;
  private dirLight: THREE.DirectionalLight;

  constructor(renderer: THREE.WebGLRenderer, dirLight: THREE.DirectionalLight) {
    this.renderer = renderer;
    this.dirLight = dirLight;
  }

  // Phase 18 & 19: Dynamic Contact Shadows & Soft Shadow Quality Tiers
  public setQualityTier(preset: QualityPreset) {
    switch (preset) {
      case 'LOW':
        this.renderer.shadowMap.enabled = false;
        this.dirLight.castShadow = false;
        break;
      case 'MEDIUM':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 512;
        this.dirLight.shadow.mapSize.height = 512;
        break;
      case 'HIGH':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        break;
      case 'ULTRA':
      case 'AUTO':
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        break;
    }
  }
}
