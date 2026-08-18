import * as THREE from 'three';

export class EnvironmentManager {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private pointLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Phase 9: Dynamic Environment Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(5, 10, 8);
    this.dirLight.castShadow = true;
    
    // Better shadow resolution for PBR rendering
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 25;
    
    this.scene.add(this.dirLight);

    this.pointLight = new THREE.PointLight(0xffffff, 0.8, 15);
    this.pointLight.position.set(-4, -4, 5);
    this.scene.add(this.pointLight);
    
    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0f1a, 0.015);
  }

  public setEnvironmentColor(colorHex: number, intensity: number = 1.0) {
    this.ambientLight.color.setHex(colorHex);
    this.ambientLight.intensity = intensity * 0.6;
    
    this.dirLight.color.setHex(colorHex);
    // Tint the fog to match the world theme
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.setHex(colorHex);
    }
  }

  public dispose() {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.dirLight);
    this.scene.remove(this.pointLight);
  }
}
