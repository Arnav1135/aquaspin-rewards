import * as THREE from 'three';

export type WeatherType = 'CLEAR' | 'SNOW' | 'RAIN' | 'EMBER' | 'DUST';

export class AtmosphereSystem {
  private scene: THREE.Scene;
  private weatherParticles: THREE.Points | null = null;
  private currentWeather: WeatherType = 'CLEAR';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Phase 24 & 34: Atmospheric Depth & Dynamic Weather
  public setWeather(type: WeatherType) {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles.geometry.dispose();
      (this.weatherParticles.material as THREE.Material).dispose();
      this.weatherParticles = null;
    }

    this.currentWeather = type;
    if (type === 'CLEAR') return;

    const count = 300;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const colorHex = type === 'SNOW' ? 0xffffff : type === 'EMBER' ? 0xff4500 : 0x00f0ff;
    const mat = new THREE.PointsMaterial({
      size: type === 'SNOW' ? 0.15 : 0.08,
      color: colorHex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.weatherParticles = new THREE.Points(geo, mat);
    this.scene.add(this.weatherParticles);
  }

  public update(delta: number) {
    if (!this.weatherParticles) return;
    const posAttr = this.weatherParticles.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < 300; i++) {
      array[i * 3 + 1] -= delta * (this.currentWeather === 'SNOW' ? 1.0 : 3.0);
      if (array[i * 3 + 1] < -10) {
        array[i * 3 + 1] = 10;
      }
    }
    posAttr.needsUpdate = true;
  }
}
