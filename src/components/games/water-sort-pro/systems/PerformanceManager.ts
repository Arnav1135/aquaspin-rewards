import { Application } from 'pixi.js';
import { useGameState } from '../state/useGameState';

export class PerformanceManager {
  private app: Application;
  private fpsBuffer: number[] = [];
  private lastTime = 0;
  
  private downgradeTimer = 0;
  private upgradeTimer = 0;
  
  // Quality presets mapped to numeric tiers for easy fallback
  private static QUALITY_TIERS = ['Low', 'Medium', 'High', 'Ultra'];

  constructor(app: Application) {
    this.app = app;
    this.lastTime = performance.now();
    
    // Auto-detect capability immediately if set to Auto (simulated here by checking initial FPS after 1 second)
    const currentQuality = useGameState.getState().quality;
    if (currentQuality === 'Auto' || !this.isQualityTier(currentQuality)) {
      this.detectHardwareCapability();
    }
    
    app.ticker.add(this.measurePerformance.bind(this));
  }

  private isQualityTier(quality: string) {
    return PerformanceManager.QUALITY_TIERS.includes(quality);
  }

  private detectHardwareCapability() {
    // Basic heuristic: hardware concurrency
    const cores = navigator.hardwareConcurrency || 2;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let target = 'High';
    if (isMobile) {
      target = cores > 4 ? 'Medium' : 'Low';
    } else {
      target = cores >= 8 ? 'Ultra' : 'High';
    }
    
    useGameState.getState().setQuality(target);
  }

  private measurePerformance(ticker: any) {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    
    // Convert dt to FPS
    const fps = 1000 / dt;
    this.fpsBuffer.push(fps);
    
    if (this.fpsBuffer.length > 60) {
      this.fpsBuffer.shift();
      
      const avgFps = this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length;
      this.evaluateGovernor(avgFps);
    }
  }

  private evaluateGovernor(avgFps: number) {
    const currentQuality = useGameState.getState().quality;
    if (currentQuality === 'Low') return; // Cannot downgrade further
    
    const currentTierIdx = PerformanceManager.QUALITY_TIERS.indexOf(currentQuality);
    
    // Degradation trigger
    if (avgFps < 45) {
      this.downgradeTimer++;
      this.upgradeTimer = 0;
      
      // If sustained low FPS for ~2 seconds (120 frames at 60fps evaluation rate)
      if (this.downgradeTimer > 120 && currentTierIdx > 0) {
        this.downgradeTimer = 0;
        const newTier = PerformanceManager.QUALITY_TIERS[currentTierIdx - 1];
        useGameState.getState().setQuality(newTier);
        console.warn(`[PerformanceManager] FPS Governor triggered. Downgraded quality to ${newTier}. Avg FPS was ${avgFps.toFixed(1)}`);
      }
    } else if (avgFps > 58 && currentTierIdx < PerformanceManager.QUALITY_TIERS.length - 1) {
      // Hysteresis: only upgrade if sustained perfectly for ~10 seconds
      this.upgradeTimer++;
      this.downgradeTimer = 0;
      
      if (this.upgradeTimer > 600) {
        this.upgradeTimer = 0;
        const newTier = PerformanceManager.QUALITY_TIERS[currentTierIdx + 1];
        useGameState.getState().setQuality(newTier);
        console.log(`[PerformanceManager] FPS Governor recovered. Upgraded quality to ${newTier}.`);
      }
    } else {
      // Stable
      this.downgradeTimer = 0;
    }
  }
}
