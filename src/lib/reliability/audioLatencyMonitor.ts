// src/lib/reliability/audioLatencyMonitor.ts
import { reliabilityCore } from './reliabilityCore';

export type AudioQualityTier = 'full' | 'reduced' | 'minimal';

class AudioLatencyMonitor {
  private activeTier: AudioQualityTier = 'full';
  private latencyThresholdMs = 80;
  private polyphonyLimit = 16;
  private activeSounds = 0;

  constructor() {
    // Initial polyphony set based on assumed capability
  }

  public getActiveTier() {
    return this.activeTier;
  }

  public canPlaySound(): boolean {
    if (this.activeSounds >= this.polyphonyLimit) {
      // Auto-mixing safeguard: duck or drop
      return false; 
    }
    return true;
  }

  public trackSoundStart() {
    this.activeSounds++;
  }

  public trackSoundEnd() {
    this.activeSounds = Math.max(0, this.activeSounds - 1);
  }

  /**
   * Tracks the delay between JS execution and AudioContext scheduling execution.
   */
  public reportLatency(gameId: string, latencyMs: number) {
    if (latencyMs > this.latencyThresholdMs) {
      const oldTier = this.activeTier;
      
      // Step down quality
      if (this.activeTier === 'full') {
        this.activeTier = 'reduced';
        this.polyphonyLimit = 8;
      } else if (this.activeTier === 'reduced') {
        this.activeTier = 'minimal';
        this.polyphonyLimit = 4;
      }

      if (oldTier !== this.activeTier) {
        reliabilityCore.logEvent({
          gameId,
          category: 'audio_latency',
          severity: 'high',
          details: `Audio latency spiked to ${latencyMs.toFixed(1)}ms. Downgrading to ${this.activeTier}.`,
          autoCorrected: true,
          correctionApplied: `Set AudioQualityTier from ${oldTier} to ${this.activeTier}`
        });
      }
    }
  }
}

export const audioLatencyMonitor = new AudioLatencyMonitor();
