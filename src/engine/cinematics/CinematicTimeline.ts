export interface TimelineStep {
  delayMs: number;
  action: () => void;
}

export class CinematicTimeline {
  private steps: TimelineStep[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];

  public addStep(delayMs: number, action: () => void): CinematicTimeline {
    this.steps.push({ delayMs, action });
    return this;
  }

  public play() {
    this.steps.forEach(step => {
      const timer = setTimeout(() => {
        step.action();
      }, step.delayMs);
      this.timers.push(timer);
    });
  }

  public cancel() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }
}
