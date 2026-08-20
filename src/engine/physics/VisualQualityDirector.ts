import { QualityPreset } from '../../games/candy-crunch/rendering/managers/QualityManager';
import { LevelPrediction } from './SimulatorPrewarmer';

export class VisualQualityDirector {
  
  // Phase 29: AI Visual Quality Director
  public static recommendQuality(deviceTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA', prediction: LevelPrediction): QualityPreset {
    
    // Base recommendation on device
    let recommended: QualityPreset = deviceTier;

    // AI heuristic: If the device is HIGH but the level is extremely dense and high-VFX, 
    // proactively step down to MEDIUM to ensure 60fps stable during cascades.
    if (deviceTier === 'HIGH' && (prediction.expectedVfxIntensity > 0.85 || prediction.mechanicDensity > 0.8)) {
      recommended = 'MEDIUM';
    }

    // If device is ULTRA, but prediction is insane, drop to HIGH
    if (deviceTier === 'ULTRA' && prediction.expectedVfxIntensity > 0.95) {
      recommended = 'HIGH';
    }

    // LOW devices stay LOW.
    return recommended;
  }

  // Phase 30: AI Auto-Repair Placeholder
  public static detectAndRepair(errorLog: string): boolean {
    const retries = 0;
    const maxRetries = 3;

    if (errorLog.includes('WebGL context lost') || errorLog.includes('Out of memory')) {
      console.warn("VisualQualityDirector: Critical resource exhaustion detected. Forcing LOW quality fallback.");
      // Trigger emergency repair logic...
      return true; 
    }

    return false;
  }
}
