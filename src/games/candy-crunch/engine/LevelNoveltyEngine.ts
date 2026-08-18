import { LevelConfig } from '../types';
import { createHash } from 'crypto';

export interface LevelFingerprint {
  hash: string;
  boardTopology: string;
  objectivePattern: string;
  blockerDensity: number;
}

export class LevelNoveltyEngine {
  private recentFingerprints: LevelFingerprint[] = [];
  private maxHistory = 50;

  // Phase 27: Level Novelty Engine
  public generateFingerprint(config: LevelConfig, seed: string): LevelFingerprint {
    const topology = `${config.rows}x${config.cols}`;
    const objective = `${config.objectiveType}_${config.targetScore}`;
    
    let blockerCount = 0;
    if (config.blockerMap) {
      for (const row of config.blockerMap) {
        for (const b of row) {
          if (b !== 'none') blockerCount++;
        }
      }
    }
    const blockerDensity = blockerCount / (config.rows * config.cols);

    // Hash the core structure so we can do strict equality checks
    const dataString = `${topology}_${objective}_${blockerCount}_${seed}`;
    
    // In a browser environment, crypto.subtle is preferred, but for synchronous logic 
    // we can use a simple string hashing function if crypto module isn't strictly polyfilled.
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return {
      hash: hash.toString(16),
      boardTopology: topology,
      objectivePattern: objective,
      blockerDensity
    };
  }

  public isNovel(config: LevelConfig, seed: string): boolean {
    const fp = this.generateFingerprint(config, seed);

    // Check strict exact match
    if (this.recentFingerprints.some(r => r.hash === fp.hash)) {
      return false;
    }

    // Check similarity (if 3 out of last 5 levels had exact same topology & objective)
    let similarCount = 0;
    const lookback = Math.min(5, this.recentFingerprints.length);
    for (let i = 0; i < lookback; i++) {
      const past = this.recentFingerprints[this.recentFingerprints.length - 1 - i];
      if (past.boardTopology === fp.boardTopology && past.objectivePattern === fp.objectivePattern) {
        similarCount++;
      }
    }

    if (similarCount >= 3) {
      return false; // Too repetitive!
    }

    // Register novel level
    this.recentFingerprints.push(fp);
    if (this.recentFingerprints.length > this.maxHistory) {
      this.recentFingerprints.shift();
    }

    return true;
  }
}
