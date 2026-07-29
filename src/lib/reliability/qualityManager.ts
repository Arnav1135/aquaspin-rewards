// src/lib/reliability/qualityManager.ts
import { reliabilityCore } from './reliabilityCore';

export type RenderQualityTier = 1 | 2 | 3 | 4;

class QualityManager {
  private activeTier: RenderQualityTier = 1;
  private frameTimes: number[] = [];
  private lastFrameTime = performance.now();
  private maxFrameSamples = 60;
  private targetFrameTime = 16.6; // 60fps
  
  private monitorActive = false;
  private checkInterval: number | null = null;
  private manualOverride: RenderQualityTier | null = null;
  private activeGameId: string = 'unknown';

  constructor() {}

  public setManualOverride(tier: RenderQualityTier | null) {
    this.manualOverride = tier;
    if (tier !== null) {
       this.activeTier = tier;
    }
  }

  public getActiveTier(): RenderQualityTier {
    return this.manualOverride ?? this.activeTier;
  }

  public startGameSession(gameId: string) {
    this.activeGameId = gameId;
    this.activeTier = 1; // Start optimistic unless overriden
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
    this.monitorActive = true;
    
    // Initial warmup
    this.recordFrame();
    
    // Check every 3 seconds if we need to downgrade
    this.checkInterval = window.setInterval(() => this.evaluatePerformance(), 3000);
  }

  public recordFrame() {
    if (!this.monitorActive) return;
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.maxFrameSamples) {
      this.frameTimes.shift();
    }
  }

  public endGameSession() {
    this.monitorActive = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private evaluatePerformance() {
    if (this.manualOverride !== null) return;
    if (this.frameTimes.length < 30) return; // Wait for enough samples

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    
    if (avgFrameTime > this.targetFrameTime * 1.5) { // 25ms+ average (sub 40fps)
      if (this.activeTier < 4) {
        const oldTier = this.activeTier;
        this.activeTier = (this.activeTier + 1) as RenderQualityTier;
        
        reliabilityCore.logEvent({
          gameId: this.activeGameId,
          category: 'render_lag',
          severity: 'medium',
          details: `Frame time degraded to ${avgFrameTime.toFixed(1)}ms. Dropping to Quality Tier ${this.activeTier}.`,
          autoCorrected: true,
          correctionApplied: `Quality downgrade ${oldTier} -> ${this.activeTier}`
        });
        
        this.frameTimes = []; // Reset samples to give the new tier a chance
      }
    } else if (avgFrameTime < this.targetFrameTime * 1.1) {
      // Stable, could step up? 
      // In a real system, stepping back up needs a long stabilization window. We'll keep it simple here.
    }
  }
}

export const qualityManager = new QualityManager();
