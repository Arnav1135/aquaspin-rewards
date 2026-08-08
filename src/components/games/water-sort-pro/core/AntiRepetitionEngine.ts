import { LevelDefinition } from './LevelGenerator';
import { useGameState } from '../state/useGameState';

export class AntiRepetitionEngine {
  private maxHistory = 100;

  /**
   * Register a played level's DNA into the persistent history.
   */
  public recordLevel(dna: string) {
    const s = useGameState.getState();
    const history = [...s.stats.dnaHistory, dna];
    
    if (history.length > this.maxHistory) {
      history.shift();
    }
    
    s.updateStats({ dnaHistory: history });
  }

  /**
   * Check if a candidate level's DNA is too similar to recent persistent history.
   */
  public isNovel(candidateDNA: string): boolean {
    const history = useGameState.getState().stats.dnaHistory || [];
    
    // 1. Exact duplicate check
    if (history.includes(candidateDNA)) {
      return false;
    }
    
    return true; 
  }
}
