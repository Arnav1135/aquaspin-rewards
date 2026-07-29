// src/lib/reliability/renderSanityCheck.ts
import { reliabilityCore } from './reliabilityCore';

class RenderSanityCheck {
  private activeChecks: Map<string, () => boolean> = new Map();
  private gameId: string = 'unknown';

  constructor() {
    if (typeof window !== 'undefined') {
      // Run sanity checks sparingly so it doesn't cause lag
      window.setInterval(() => this.runChecks(), 2000);
    }
  }

  public setGameContext(gameId: string) {
    this.gameId = gameId;
  }

  public registerCheck(id: string, validationFn: () => boolean, fallbackFn: () => void) {
    this.activeChecks.set(id, () => {
      const isValid = validationFn();
      if (!isValid) {
        fallbackFn();
        reliabilityCore.logEvent({
          gameId: this.gameId,
          category: 'rendering_bug',
          severity: 'medium',
          details: `Visual sanity check failed for [${id}].`,
          autoCorrected: true,
          correctionApplied: `Applied fallback renderer for ${id}`
        });
      }
      return isValid;
    });
  }

  public removeCheck(id: string) {
    this.activeChecks.delete(id);
  }

  public clearAll() {
    this.activeChecks.clear();
  }

  private runChecks() {
    this.activeChecks.forEach((checkFn) => {
      try {
        checkFn();
      } catch (e) {
        // Ignore internal errors in the checks themselves to prevent looping
      }
    });
  }
}

export const renderSanityCheck = new RenderSanityCheck();
