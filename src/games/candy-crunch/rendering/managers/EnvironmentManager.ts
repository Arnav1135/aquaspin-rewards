import * as THREE from 'three';

export type LightingState = 'IDLE' | 'MATCH' | 'COMBO' | 'MEGA_COMBO' | 'SPECIAL' | 'VICTORY';

export class EnvironmentManager {
  private scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private burstPointLight: THREE.PointLight;
  
  private targetKeyColor: THREE.Color = new THREE.Color(0xffffff);
  private targetKeyIntensity: number = 1.4;
  private currentKeyIntensity: number = 1.4;
  
  private lightingState: LightingState = 'IDLE';

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Phase 3 & 4: 3-Point Cinematic Lighting Pipeline
    // 1. Ambient / Environment Light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    // 2. Key Light (Main Shadow Caster)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.keyLight.position.set(6, 12, 10);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 30;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // 3. Fill Light (Soft side light)
    this.fillLight = new THREE.DirectionalLight(0x80d0ff, 0.4);
    this.fillLight.position.set(-8, -4, 6);
    this.scene.add(this.fillLight);

    // 4. Rim Light (Backlight for edge highlights & separation)
    this.rimLight = new THREE.DirectionalLight(0xffd580, 0.9);
    this.rimLight.position.set(0, 10, -10);
    this.scene.add(this.rimLight);

    // 5. Localized Gameplay Burst Light
    this.burstPointLight = new THREE.PointLight(0x00ffff, 0, 20);
    this.burstPointLight.position.set(0, 0, 3);
    this.scene.add(this.burstPointLight);

    // Environment Fog for visual depth
    this.scene.fog = new THREE.FogExp2(0x0a0f1a, 0.012);

    // Phase 3: Procedural IBL Environment Texture
    this.setupProceduralEnvironmentMap();
  }

  private setupProceduralEnvironmentMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, '#1a2b4c');
      gradient.addColorStop(0.5, '#0d1526');
      gradient.addColorStop(1, '#050a12');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
    }
  }

  public setEnvironmentWorld(worldType: 'SUGAR' | 'JELLY' | 'CHOCOLATE' | 'CRYSTAL') {
    switch (worldType) {
      case 'SUGAR':
        this.targetKeyColor.setHex(0xffffff);
        this.fillLight.color.setHex(0xa0e0ff);
        this.rimLight.color.setHex(0xffe0a0);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x0e172a);
        break;
      case 'JELLY':
        this.targetKeyColor.setHex(0xd0e8ff);
        this.fillLight.color.setHex(0xffa0e0);
        this.rimLight.color.setHex(0x80ffea);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x1a0e2a);
        break;
      case 'CHOCOLATE':
        this.targetKeyColor.setHex(0xffe4ce);
        this.fillLight.color.setHex(0x8c5230);
        this.rimLight.color.setHex(0xffaa55);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x1a0f0a);
        break;
      case 'CRYSTAL':
        this.targetKeyColor.setHex(0xe0ffff);
        this.fillLight.color.setHex(0x7000ff);
        this.rimLight.color.setHex(0x00f0ff);
        if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.setHex(0x0a051c);
        break;
    }
    this.keyLight.color.copy(this.targetKeyColor);
  }

  public triggerLightingReaction(state: LightingState, position?: { x: number; y: number }, colorHex: number = 0x00ffff) {
    this.lightingState = state;
    
    if (position) {
      this.burstPointLight.position.set(position.x, position.y, 3);
    }
    this.burstPointLight.color.setHex(colorHex);

    switch (state) {
      case 'MATCH':
        this.burstPointLight.intensity = 3.0;
        this.currentKeyIntensity = 1.8;
        break;
      case 'COMBO':
        this.burstPointLight.intensity = 6.0;
        this.currentKeyIntensity = 2.2;
        this.rimLight.intensity = 1.8;
        break;
      case 'MEGA_COMBO':
        this.burstPointLight.intensity = 12.0;
        this.currentKeyIntensity = 3.0;
        this.rimLight.intensity = 2.5;
        break;
      case 'SPECIAL':
        this.burstPointLight.intensity = 15.0;
        this.currentKeyIntensity = 2.5;
        break;
      case 'VICTORY':
        this.currentKeyIntensity = 3.5;
        this.rimLight.intensity = 3.0;
        this.fillLight.intensity = 1.5;
        break;
      default:
        break;
    }
  }

  public update(delta: number) {
    // Smoothly decay gameplay lighting bursts back to baseline
    this.burstPointLight.intensity = THREE.MathUtils.lerp(this.burstPointLight.intensity, 0, delta * 4);
    this.currentKeyIntensity = THREE.MathUtils.lerp(this.currentKeyIntensity, 1.4, delta * 3);
    this.keyLight.intensity = this.currentKeyIntensity;
    this.rimLight.intensity = THREE.MathUtils.lerp(this.rimLight.intensity, 0.9, delta * 3);
    this.fillLight.intensity = THREE.MathUtils.lerp(this.fillLight.intensity, 0.4, delta * 3);
  }

  public dispose() {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.keyLight);
    this.scene.remove(this.fillLight);
    this.scene.remove(this.rimLight);
    this.scene.remove(this.burstPointLight);
  }
}
