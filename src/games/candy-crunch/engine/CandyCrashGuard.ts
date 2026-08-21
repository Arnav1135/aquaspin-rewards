// Phase 18: Performance Guard
export class CandyCrashGuard {
  public limitParticles(currentFPS: number, requested: number) {
    if (currentFPS < 30) return Math.floor(requested * 0.2);
    if (currentFPS < 45) return Math.floor(requested * 0.5);
    return requested;
  }
}
