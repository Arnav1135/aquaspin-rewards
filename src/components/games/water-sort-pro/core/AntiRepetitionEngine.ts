import { LevelDefinition } from './LevelGenerator';

export class AntiRepetitionEngine {
  private history: string[] = [];
  private maxHistory = 100;

  /**
   * Register a played level's DNA into the history.
   */
  public recordLevel(dna: string) {
    this.history.push(dna);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Check if a candidate level's DNA is too similar to recent history.
   * Returns true if it is safe to use (not a duplicate).
   */
  public isNovel(candidateDNA: string): boolean {
    // 1. Exact duplicate check
    if (this.history.includes(candidateDNA)) {
      return false;
    }

    // 2. Structural similarity check
    // In a full implementation, we'd compare the string distances or parsed structures.
    // For now, we enforce exact string mismatch since canonicalization handles color re-mapping.
    
    return true; // Passed
  }
}
