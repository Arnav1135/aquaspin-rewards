export class CinematicTimeDirector {
  private visualTimeScale: number = 1.0;
  private targetTimeScale: number = 1.0;
  private dilationTimer: ReturnType<typeof setTimeout> | null = null;

  // Phase 21: Cancellable Timeline Time Dilation
  public triggerTimeDilation(scale: number = 0.5, durationMs: number = 600) {
    this.visualTimeScale = scale;
    this.targetTimeScale = scale;

    if (this.dilationTimer) {
      clearTimeout(this.dilationTimer);
    }

    this.dilationTimer = setTimeout(() => {
      this.targetTimeScale = 1.0;
      this.dilationTimer = null;
    }, durationMs);
  }

  public cancel() {
    if (this.dilationTimer) {
      clearTimeout(this.dilationTimer);
      this.dilationTimer = null;
    }
    this.targetTimeScale = 1.0;
  }

  public update(deltaSeconds: number): number {
    // Ease transition back to target scale
    this.visualTimeScale += (this.targetTimeScale - this.visualTimeScale) * Math.min(1, deltaSeconds * 8);
    // Never affect deterministic gameplay, only visual systems
    return deltaSeconds * this.visualTimeScale;
  }

  public getVisualTimeScale(): number {
    return this.visualTimeScale;
  }
}
