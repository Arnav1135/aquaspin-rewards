export type QualityPreset = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'AUTO';
export type QualitySettings = {
  preset: QualityPreset;
  resolutionScale: number;
  pixelRatio: number;
  shadowQuality: number; // 0 = none, 1 = basic, 2 = soft, 3 = high-res
  shadowMapSize: number;
  particleCountMultiplier: number;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  enableReflections: boolean;
  geometryDetail: number; // 1 = low poly, 2 = normal, 3 = high
};

const QUALITY_PROFILES: Record<Exclude<QualityPreset, 'AUTO'>, QualitySettings> = {
  LOW: {
    preset: 'LOW',
    resolutionScale: 0.7,
    pixelRatio: 1,
    shadowQuality: 0,
    shadowMapSize: 0,
    particleCountMultiplier: 0.25,
    enablePostProcessing: false,
    enableBloom: false,
    enableReflections: false,
    geometryDetail: 1,
  },
  MEDIUM: {
    preset: 'MEDIUM',
    resolutionScale: 1.0,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    shadowQuality: 1,
    shadowMapSize: 512,
    particleCountMultiplier: 0.5,
    enablePostProcessing: false,
    enableBloom: false,
    enableReflections: false,
    geometryDetail: 2,
  },
  HIGH: {
    preset: 'HIGH',
    resolutionScale: 1.0,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    shadowQuality: 2,
    shadowMapSize: 1024,
    particleCountMultiplier: 1.0,
    enablePostProcessing: true,
    enableBloom: true,
    enableReflections: true,
    geometryDetail: 3,
  },
  ULTRA: {
    preset: 'ULTRA',
    resolutionScale: 1.0,
    pixelRatio: window.devicePixelRatio,
    shadowQuality: 3,
    shadowMapSize: 2048,
    particleCountMultiplier: 2.0,
    enablePostProcessing: true,
    enableBloom: true,
    enableReflections: true,
    geometryDetail: 3,
  },
};

export class QualityManager {
  private currentSettings: QualitySettings;
  private fpsBuffer: number[] = [];
  private fpsLastEvaluation: number = 0;
  private autoMode: boolean = true;
  private isMobile: boolean = false;

  constructor(initialPreset: QualityPreset = 'AUTO') {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (initialPreset === 'AUTO') {
      this.currentSettings = this.evaluateDeviceCapability();
      this.autoMode = true;
    } else {
      this.currentSettings = QUALITY_PROFILES[initialPreset];
      this.autoMode = false;
    }
  }

  private evaluateDeviceCapability(): QualitySettings {
    // Basic heuristic: Mobile defaults to MEDIUM, Desktop defaults to HIGH.
    // Adaptive rendering (Phase 5) will tune this at runtime.
    return this.isMobile ? QUALITY_PROFILES.MEDIUM : QUALITY_PROFILES.HIGH;
  }

  public getSettings(): QualitySettings {
    return this.currentSettings;
  }

  public setPreset(preset: QualityPreset) {
    if (preset === 'AUTO') {
      this.autoMode = true;
      this.currentSettings = this.evaluateDeviceCapability();
    } else {
      this.autoMode = false;
      this.currentSettings = QUALITY_PROFILES[preset];
    }
  }

  // Phase 5: Adaptive Rendering runtime check
  public updateAdaptiveQuality(currentFps: number, timeNow: number): boolean {
    if (!this.autoMode) return false;

    this.fpsBuffer.push(currentFps);
    if (this.fpsBuffer.length > 60) this.fpsBuffer.shift();

    if (timeNow - this.fpsLastEvaluation > 5000) { // Evaluate every 5 seconds (hysteresis)
      this.fpsLastEvaluation = timeNow;
      
      const avgFps = this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length;
      
      if (avgFps < 40 && this.currentSettings.preset !== 'LOW') {
        this.downgradeQuality();
        return true; // Requires renderer update
      } else if (avgFps > 58 && this.currentSettings.preset !== 'ULTRA' && this.currentSettings.preset !== 'HIGH') {
        // Only upgrade if we're perfectly stable for a long time to prevent oscillation
        this.upgradeQuality();
        return true;
      }
    }
    return false;
  }

  private downgradeQuality() {
    if (this.currentSettings.preset === 'ULTRA') this.currentSettings = QUALITY_PROFILES.HIGH;
    else if (this.currentSettings.preset === 'HIGH') this.currentSettings = QUALITY_PROFILES.MEDIUM;
    else if (this.currentSettings.preset === 'MEDIUM') this.currentSettings = QUALITY_PROFILES.LOW;
  }

  private upgradeQuality() {
    if (this.currentSettings.preset === 'LOW') this.currentSettings = QUALITY_PROFILES.MEDIUM;
    else if (this.currentSettings.preset === 'MEDIUM') this.currentSettings = QUALITY_PROFILES.HIGH;
  }
}
