import * as THREE from 'three';

export type WeatherType = 'CLEAR' | 'SNOW' | 'RAIN' | 'EMBER' | 'DUST' | 'MIST';

interface WeatherLayer {
  points: THREE.Points;
  speed: number;
  depth: 'NEAR' | 'MID' | 'FAR';
}

export class AtmosphereSystem {
  private scene: THREE.Scene;
  private weatherLayers: WeatherLayer[] = [];
  private currentWeather: WeatherType = 'CLEAR';

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Phase 15 & 16: Pooled Weather & Atmospheric Depth Layers (NEAR, MID, FAR)
  public setWeather(type: WeatherType) {
    if (this.currentWeather === type) return;
    this.clearWeather();
    this.currentWeather = type;
    if (type === 'CLEAR') return;

    this.createLayer(type, 'NEAR', 100, 0.15, 3.0);
    this.createLayer(type, 'MID', 300, 0.08, 1.5);
    this.createLayer(type, 'FAR', 500, 0.04, 0.5);
  }

  private clearWeather() {
    this.weatherLayers.forEach(layer => {
      this.scene.remove(layer.points);
      layer.points.geometry.dispose();
      (layer.points.material as THREE.Material).dispose();
    });
    this.weatherLayers = [];
  }

  private createLayer(type: WeatherType, depth: 'NEAR' | 'MID' | 'FAR', count: number, size: number, speedMultiplier: number) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = depth === 'NEAR' ? Math.random() * 5 + 5 : depth === 'MID' ? Math.random() * 10 - 5 : Math.random() * 20 - 25;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    let colorHex = 0xffffff;
    let opacity = 0.6;
    if (type === 'EMBER') { colorHex = 0xff4500; opacity = 0.9; }
    if (type === 'DUST') { colorHex = 0xddccaa; opacity = 0.4; }
    if (type === 'MIST') { colorHex = 0xcccccc; opacity = 0.2; size *= 3; }

    const mat = new THREE.PointsMaterial({
      size: size,
      color: colorHex,
      transparent: true,
      opacity: depth === 'FAR' ? opacity * 0.4 : opacity,
      blending: type === 'MIST' || type === 'DUST' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.weatherLayers.push({ points, speed: speedMultiplier, depth });
  }

  public update(delta: number) {
    this.weatherLayers.forEach(layer => {
      const posAttr = layer.points.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      const fallSpeed = this.currentWeather === 'SNOW' ? 2.0 : this.currentWeather === 'RAIN' ? 15.0 : 0.5;
      const windDrift = this.currentWeather === 'RAIN' ? 2.0 : 1.0;

      for (let i = 0; i < array.length / 3; i++) {
        array[i * 3 + 1] -= delta * fallSpeed * layer.speed; // Y (Fall)
        array[i * 3 + 0] += delta * windDrift * layer.speed; // X (Wind)

        if (array[i * 3 + 1] < -20) {
          array[i * 3 + 1] = 20;
          array[i * 3 + 0] = (Math.random() - 0.5) * 40;
        }
      }
      posAttr.needsUpdate = true;
    });
  }
}
